import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createClient } from '@supabase/supabase-js';
import { GRADING_SCALE, getGradeInfo, calcSessionalCourseResult, isValidCourseCredits } from '../src/services/gpaEngine.js';
import { isSafeRedirectUrl, isSafePdfUrl, sanitizePlainText } from '../src/utils/sanitize.js';
import { getCommandPaletteResults } from '../src/utils/fuzzySearch.js';
import generateQuizHandler, { parseAndValidateQuiz } from '../api/generate-quiz.js';
import analyzeScreenshotHandler, { parseImageDataUrl, validateOcrPayload } from '../api/analyze-screenshot.js';
import { checkRateLimit, requireUser, reserveAiQuizUsage } from '../api/_lib/security.js';
import { generateQuizWithGemini, AiQuizRequestError } from '../src/services/aiQuizService.js';
import { resolveDisplayMath } from '../src/components/MathText/mathRenderSafety.js';
import { canSubmitAnswer, scoreAnswers, getAnswerState } from '../src/utils/quizSession.js';
import { getPaperKey, hasPaperIdentity } from '../src/utils/paperSelection.js';
import { resolveSubjectFromRoute, getRouteSubjectCode, isPasswordRecoveryUrl } from '../src/utils/routeState.js';
import { DEFAULT_SUBJECTS } from '../src/constants/subjects.js';
import { mergeRemoteActivity, getStudyStreak, getSemesterGpaHistory, getDueFlashcards, exportAllStudentData } from '../src/utils/studyTracker.js';
import { getAnalyticsConsent, setAnalyticsConsent, disableAnalytics } from '../src/utils/analytics.js';
import { updatePassword, getSignupOutcome } from '../src/services/auth.js';

let passed = 0;
let failed = 0;
async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err);
    failed++;
    process.exitCode = 1;
  }
}

console.log('Running COMSATSPrepHub Test Suite...\n');

await runTest('GPA Engine: COMSATS 4.00 grading scale boundaries', () => {
  assert.equal(GRADING_SCALE.length, 11);
  assert.deepEqual(getGradeInfo(85), { letter: 'A', point: 4.0, percentage: 85, color: 'emerald' });
  assert.deepEqual(getGradeInfo(80), { letter: 'A-', point: 3.66, percentage: 80, color: 'emerald' });
  assert.deepEqual(getGradeInfo(75), { letter: 'B+', point: 3.33, percentage: 75, color: 'sky' });
  assert.deepEqual(getGradeInfo(50), { letter: 'D', point: 1.0, percentage: 50, color: 'red' });
  assert.deepEqual(getGradeInfo(49), { letter: 'F', point: 0.0, percentage: 49, color: 'rose' });
});

await runTest('GPA Engine: Sessional & Lab weighted calculation', () => {
  const res = calcSessionalCourseResult({
    quizObtained: 15,
    quizTotal: 15,
    assignObtained: 10,
    assignTotal: 10,
    midObtained: 25,
    midTotal: 25,
    finalObtained: 40,
    finalTotal: 50,
    hasLab: false
  });
  assert.equal(res.theoryPct, 90);
  assert.equal(res.letter, 'A');
  assert.equal(res.point, 4.0);
});

await runTest('Security Sanitize: Redirect & PDF URL validation blocks open redirects and untrusted hosts', () => {
  assert.equal(isSafeRedirectUrl('/dashboard', 'https://comsatsprephub.vercel.app'), true);
  assert.equal(isSafeRedirectUrl('//evil.example.com', 'https://comsatsprephub.vercel.app'), false);
  assert.equal(isSafeRedirectUrl('https://evil.example.com/phish', 'https://comsatsprephub.vercel.app'), false);
  assert.equal(isSafePdfUrl('https://abcxyz.supabase.co/storage/v1/object/public/papers/csc211.pdf'), true);
  assert.equal(isSafePdfUrl('http://abcxyz.supabase.co/insecure.pdf'), false);
  assert.equal(isSafePdfUrl('https://untrusted-site.org/malware.pdf'), false);
});

await runTest('Security Sanitize: Strips HTML/script tags and control characters', () => {
  const dirty = '<script>alert(1)</script>CSC211\x00 Data Structures';
  assert.equal(sanitizePlainText(dirty, 100), 'alert(1)CSC211 Data Structures');
});

await runTest('Fuzzy Search: Matches COMSATS course codes and titles accurately', () => {
  const results = getCommandPaletteResults('CSC211');
  assert.ok(results.length > 0);
  assert.equal(results[0].subjectCode, 'CSC211');
});

await runTest('API Security (/api/generate-quiz): Rejects non-POST and missing subject', async () => {
  let statusCode = 200;
  let bodyPayload = null;
  const mockRes = {
    status(c) { statusCode = c; return this; },
    json(p) { bodyPayload = p; return this; }
  };

  await generateQuizHandler({ method: 'GET', headers: {} }, mockRes);
  assert.equal(statusCode, 405);

  await generateQuizHandler({ method: 'POST', headers: {}, body: { subject: '   ' } }, mockRes);
  assert.equal(statusCode, 400);
  assert.ok(bodyPayload?.error);
});

await runTest('API Security (/api/analyze-screenshot): Enforces 4MB base64 payload limit (HTTP 413)', async () => {
  let statusCode = 200;
  const mockRes = {
    status(c) { statusCode = c; return this; },
    json() { return this; }
  };

  const hugePayload = 'A'.repeat(4 * 1024 * 1024 + 100);
  await analyzeScreenshotHandler({ method: 'POST', headers: {}, body: { imageBase64: hugePayload } }, mockRes);
  assert.equal(statusCode, 413);
});

await runTest('API Security: Rate limiting and authentication fail closed when unconfigured', async () => {
  const saved = {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const limited = await checkRateLimit({ req: { headers: {} }, scope: 'test', limit: 5 });
    assert.equal(limited.allowed, false, 'Missing limiter configuration must deny traffic');
    assert.equal(limited.status, 503);

    const anonymous = await requireUser({ headers: {} });
    assert.equal(anonymous.ok, false, 'Missing auth configuration must deny traffic');
    assert.equal(anonymous.status, 503);

    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    const noToken = await requireUser({ headers: {} });
    assert.equal(noToken.ok, false);
    assert.equal(noToken.status, 401, 'Configured auth without a bearer token must return 401');
  } finally {
    const restore = (key, value) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore('UPSTASH_REDIS_REST_URL', saved.url);
    restore('UPSTASH_REDIS_REST_TOKEN', saved.token);
    restore('SUPABASE_URL', saved.supabaseUrl);
    restore('SUPABASE_SERVICE_ROLE_KEY', saved.serviceKey);
  }
});

await runTest('API Security: AI quota checks fail closed and report exhausted usage', async () => {
  const failed = await reserveAiQuizUsage({
    supabaseAdmin: { rpc: async () => ({ data: null, error: new Error('rpc down') }) },
    userId: 'u1',
    limit: 10
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.status, 503, 'An RPC error must not grant a generation');

  const malformed = await reserveAiQuizUsage({
    supabaseAdmin: { rpc: async () => ({ data: [], error: null }) },
    userId: 'u1',
    limit: 10
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 503, 'A malformed quota response must not grant a generation');

  const exhausted = await reserveAiQuizUsage({
    supabaseAdmin: { rpc: async () => ({ data: [{ allowed: false, used: 10, remaining: 0 }], error: null }) },
    userId: 'u1',
    limit: 10
  });
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.status, 429);
  assert.deepEqual(exhausted.usage, { used: 10, remaining: 0, limit: 10 });

  const granted = await reserveAiQuizUsage({
    supabaseAdmin: { rpc: async () => ({ data: [{ allowed: true, used: 3, remaining: 7 }], error: null }) },
    userId: 'u1',
    limit: 10
  });
  assert.deepEqual(granted, { ok: true, usage: { used: 3, remaining: 7, limit: 10 } });
});

await runTest('API Security: Screenshot handler fails closed before calling the OCR provider', async () => {
  let statusCode = 200;
  const mockRes = {
    status(c) { statusCode = c; return this; },
    json() { return this; }
  };

  await analyzeScreenshotHandler(
    { method: 'POST', headers: {}, body: { imageBase64: 'data:image/png;base64,AAAA' } },
    mockRes
  );
  assert.equal(statusCode, 503, 'No limiter/auth configuration must block the OCR call');
});

await runTest('API Validation: Quiz payloads require complete, unambiguous questions', () => {
  const valid = JSON.stringify({
    title: 'CSC211 <Quiz>',
    questions: [
      { question: 'What is a BST?', options: ['A tree', 'A list', 'A stack', 'A queue'], correctAnswer: 0, explanation: 'Ordered tree' },
      { question: 'Big-O of binary search?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], correctAnswer: 1, explanation: 'Halving' }
    ]
  });
  const parsed = parseAndValidateQuiz(valid, 2);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.title, 'CSC211 Quiz');
  assert.equal(parsed.questions[0].question, 'What is a BST?');

  const cases = {
    'fewer questions than requested': JSON.stringify({ questions: [{ question: 'Q', options: ['1', '2', '3', '4'], correctAnswer: 0 }] }),
    'empty question text': JSON.stringify({ questions: [{ question: '   ', options: ['1', '2', '3', '4'], correctAnswer: 0 }, { question: 'Q2', options: ['1', '2', '3', '4'], correctAnswer: 0 }] }),
    'wrong option count': JSON.stringify({ questions: [{ question: 'Q', options: ['1', '2', '3'], correctAnswer: 0 }, { question: 'Q2', options: ['1', '2', '3', '4'], correctAnswer: 0 }] }),
    'duplicate options': JSON.stringify({ questions: [{ question: 'Q', options: ['1', '1', '3', '4'], correctAnswer: 0 }, { question: 'Q2', options: ['1', '2', '3', '4'], correctAnswer: 0 }] }),
    'out-of-range answer': JSON.stringify({ questions: [{ question: 'Q', options: ['1', '2', '3', '4'], correctAnswer: 4 }, { question: 'Q2', options: ['1', '2', '3', '4'], correctAnswer: 0 }] }),
    'string answer index': JSON.stringify({ questions: [{ question: 'Q', options: ['1', '2', '3', '4'], correctAnswer: '1' }, { question: 'Q2', options: ['1', '2', '3', '4'], correctAnswer: 0 }] })
  };

  for (const [label, payload] of Object.entries(cases)) {
    assert.throws(() => parseAndValidateQuiz(payload, 2), undefined, `Must reject ${label}`);
  }
});

await runTest('API Validation: OCR accepts only real image data URLs and usable marks', () => {
  assert.equal(parseImageDataUrl('').status, 400);
  assert.equal(parseImageDataUrl('data:image/svg+xml;base64,AAAA').status, 415);
  assert.equal(parseImageDataUrl('AAAA').status, 415);
  assert.equal(parseImageDataUrl('data:image/jpeg;base64,AAA').status, 400);

  const png = parseImageDataUrl('data:image/png;base64,AAAA');
  assert.deepEqual(png, { ok: true, mimeType: 'image/png', base64Data: 'AAAA' });

  const validated = validateOcrPayload({
    subjectName: '<script>CSC211</script> Data Structures',
    creditHours: 3,
    theory: {
      quizzes: [
        { obtained: 8, total: 10 },
        { obtained: 12, total: 10 },
        { obtained: 'n/a', total: 10 }
      ],
      assignments: [],
      mid: { obtained: 20, total: 25 },
      final: { obtained: 40, total: 50 }
    }
  });
  assert.equal(validated.subjectName, 'scriptCSC211/script Data Structures');
  assert.equal(validated.creditHours, 3);
  assert.deepEqual(validated.theory.quizzes, [{ obtained: 8, total: 10 }], 'Impossible mark pairs must be dropped');
  assert.deepEqual(validated.theory.mid, { obtained: 20, total: 25 });

  assert.throws(() => validateOcrPayload({ subjectName: '', theory: {} }));
  assert.throws(() => validateOcrPayload({
    subjectName: 'CSC211',
    theory: { quizzes: [{ obtained: 11, total: 10 }], mid: { obtained: 30, total: 25 } }
  }), undefined, 'A payload with no usable marks must be rejected');
});

await runTest('API Client: AI quiz sign-in and quota errors surface instead of silently falling back', async () => {
  const originalFetch = globalThis.fetch;
  const request = () => generateQuizWithGemini({
    subject: 'Data Structures',
    subjectCode: 'CSC211',
    numQuestions: 2,
    difficulty: 'Medium'
  });

  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Please sign in to use AI quiz generation.' })
    });
    await assert.rejects(request, (err) => (
      err instanceof AiQuizRequestError &&
      err.code === 'AUTH_REQUIRED' &&
      err.status === 401 &&
      err.message === 'Please sign in to use AI quiz generation.'
    ));

    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: 'You have reached your 10-quiz generation limit.' })
    });
    await assert.rejects(request, (err) => (
      err instanceof AiQuizRequestError &&
      err.code === 'RATE_LIMITED' &&
      err.status === 429
    ));

    globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({}) });
    const fallback = await request();
    assert.ok(fallback.every((question) => question.provider === 'Curated Bank'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await runTest('MathText Security: Failed KaTeX output is rendered as text, never raw HTML', () => {
  const rendered = resolveDisplayMath({ html: '<span class="katex">ok</span>', formula: 'x^2' });
  assert.equal(rendered.mode, 'html');
  assert.equal(rendered.value, '<span class="katex">ok</span>');

  const payload = '<img src=x onerror="alert(1)">';
  const failed = resolveDisplayMath({ html: null, formula: payload });
  assert.equal(failed.mode, 'text');
  assert.equal(failed.value, payload);

  assert.equal(resolveDisplayMath({ html: '   ', formula: '\\frac{1}{2}' }).mode, 'text');
  assert.equal(resolveDisplayMath({ html: null, formula: undefined }).value, '');
});

await runTest('Quiz Session: Revisiting an answered question cannot double-score it', () => {
  const answers = {
    0: { selected: 1, isCorrect: true },
    1: { selected: 2, isCorrect: true }
  };

  assert.equal(scoreAnswers(answers), 2);
  assert.equal(canSubmitAnswer(answers, 1, 2), false, 'Answered questions must reject another submission');
  assert.equal(canSubmitAnswer(answers, 2, 2), true, 'Unanswered questions still accept a submission');
  assert.equal(canSubmitAnswer(answers, 2, null), false, 'No option selected must not be submitted');

  assert.deepEqual(getAnswerState(answers, 0), { selectedOption: 1, revealed: true });
  assert.deepEqual(getAnswerState(answers, 5), { selectedOption: null, revealed: false });
  assert.equal(scoreAnswers({}), 0);
});

await runTest('Paper View: Missing paper is explicit and loading uses a stable key', () => {
  assert.equal(getPaperKey(null), '');
  assert.equal(getPaperKey({}), '');
  assert.equal(hasPaperIdentity(null), false);
  assert.equal(getPaperKey({ id: 'p1', title: 'Fall 2023' }), 'p1');
  assert.equal(getPaperKey({ title: 'Fall 2023' }), 'Fall 2023');

  const source = readFileSync(new URL('../src/pages/PaperView/PaperView.jsx', import.meta.url), 'utf8');
  assert.equal(source.includes('default-paper'), false, 'PaperView must not fabricate a default paper');
  assert.ok(
    source.includes('[hasPaper, paperKey, reloadKey, authReady]'),
    'Question loading must depend on the stable paper key, not the paper object identity'
  );
});

await runTest('Accessibility: Skip link focuses main content without changing the hash route', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('event.preventDefault()'), 'Skip link must prevent hash navigation');
  assert.ok(source.includes('getElementById(\'main-content\')?.focus()'), 'Skip link must focus main content');
  assert.ok(source.includes('id="main-content" tabIndex={-1}'), 'Main content must be programmatically focusable');
});

await runTest('GPA Calculator: Course credits accept only the declared 1-6 range', () => {
  assert.equal(isValidCourseCredits(1), true);
  assert.equal(isValidCourseCredits(6), true);
  assert.equal(isValidCourseCredits(0), false);
  assert.equal(isValidCourseCredits(7), false);
  assert.equal(isValidCourseCredits(3.5), false);
  assert.equal(isValidCourseCredits(null), false);
  assert.equal(isValidCourseCredits(Number.NaN), false);
});

function installMemoryStorage() {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  });
  return storage;
}

await runTest('Study Tracker: Streak counts consecutive days and does not invent one for stale activity', () => {
  const storage = installMemoryStorage();
  const dayTimestamp = (daysAgo) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date.getTime();
  };

  storage.setItem('pph_study_history', JSON.stringify([{ id: 'old', timestamp: dayTimestamp(30) }]));
  assert.equal(getStudyStreak(), 0, 'Activity 30 days ago must not count as a current streak');

  storage.setItem('pph_study_history', JSON.stringify([
    { id: 'yesterday', timestamp: dayTimestamp(1) },
    { id: 'two-days', timestamp: dayTimestamp(2) }
  ]));
  assert.equal(getStudyStreak(), 2, 'A streak may start yesterday and continue backwards');

  storage.setItem('pph_study_history', JSON.stringify([
    { id: 'today', timestamp: dayTimestamp(0) },
    { id: 'yesterday', timestamp: dayTimestamp(1) },
    { id: 'two-days', timestamp: dayTimestamp(2) }
  ]));
  assert.equal(getStudyStreak(), 3);

  storage.setItem('pph_study_history', '[]');
  assert.equal(getStudyStreak(), 0);
});

await runTest('Study Tracker: Remote activity merges in timestamp order without duplicates', () => {
  const storage = installMemoryStorage();

  storage.setItem('pph_study_history', JSON.stringify([
    { id: 'local-new', timestamp: 200, type: 'quiz' }
  ]));
  let merged = mergeRemoteActivity([
    { id: 'remote-old', timestamp: 100, type: 'paper' },
    { id: 'remote-old', timestamp: 100, type: 'paper' }
  ]);
  assert.deepEqual(merged.map((item) => item.id), ['local-new', 'remote-old']);

  storage.setItem('pph_study_history', JSON.stringify([
    { id: 'local-old', timestamp: 100, type: 'quiz' }
  ]));
  merged = mergeRemoteActivity([{ id: 'remote-new', timestamp: 300, type: 'paper' }]);
  assert.deepEqual(merged.map((item) => item.id), ['remote-new', 'local-old']);

  storage.setItem('pph_study_history', JSON.stringify([]));
  merged = mergeRemoteActivity([]);
  assert.deepEqual(merged, []);
});

await runTest('AI Quiz: Curated fallback carries truthful provenance', async () => {
  const questions = await generateQuizWithGemini({
    subject: 'Data Structures & Algorithms',
    subjectCode: 'CSC211',
    numQuestions: 3,
    difficulty: 'Medium'
  });

  assert.equal(questions.length, 3);
  assert.ok(questions.every((question) => question.provider === 'Curated Bank'));
  assert.ok(questions.every((question) => question.isOfflineFallback === true));
});

await runTest('Accessibility: Contact labels, FAQ disclosure, and mobile nav semantics are correct', () => {
  const faq = readFileSync(new URL('../src/pages/FaqContact/FaqContact.jsx', import.meta.url), 'utf8');
  for (const field of ['name', 'email', 'message']) {
    assert.ok(faq.includes(`htmlFor="contact-${field}"`), `Contact ${field} label must target its input`);
    assert.ok(faq.includes(`id="contact-${field}"`), `Contact ${field} input must have a matching id`);
  }
  assert.ok(faq.includes('aria-expanded={openIdx === i}'));
  assert.ok(faq.includes('aria-controls={`faq-answer-${i}`}'));

  const palette = readFileSync(new URL('../src/components/CommandPalette/CommandPalette.jsx', import.meta.url), 'utf8');
  assert.ok(palette.includes("e.key === 'Tab'"), 'Empty-result Tab must be handled');
  assert.ok(palette.includes('inputRef.current?.focus()'), 'Empty-result Tab must return focus to the search input');

  const navbarCss = readFileSync(new URL('../src/components/Navbar/Navbar.css', import.meta.url), 'utf8');
  assert.ok(navbarCss.includes('grid-template-columns: repeat(4, 1fr)'));
  assert.equal(navbarCss.includes('grid-template-columns: repeat(5, 1fr)'), false);
});

await runTest('Auth: Signup without an immediate session asks for email confirmation', () => {
  assert.deepEqual(getSignupOutcome({ ok: false, error: 'Nope' }), { kind: 'error', error: 'Nope' });
  assert.equal(getSignupOutcome({ ok: false }).kind, 'error');
  assert.equal(getSignupOutcome({ ok: false }).error.length > 0, true);

  assert.deepEqual(
    getSignupOutcome({ ok: true, session: null, user: { id: 'u1' } }),
    { kind: 'confirm-email' },
    'No session must not be treated as a signed-in user'
  );

  assert.deepEqual(
    getSignupOutcome({ ok: true, session: { access_token: 'x' }, user: { id: 'u2' } }),
    { kind: 'signed-in', user: { id: 'u2' } }
  );

  for (const file of ['../src/pages/Auth/Auth.jsx', '../src/components/AuthModal/AuthModal.jsx']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.ok(source.includes('getSignupOutcome(res)'), `${file} must not assume a session after signup`);
    assert.ok(source.includes("outcome.kind === 'confirm-email'"));
  }
});

await runTest('Auth: Password recovery links open the account page and update the password', async () => {
  assert.equal(
    isPasswordRecoveryUrl('#access_token=abc&refresh_token=def&expires_in=3600&type=recovery'),
    true,
    'Supabase recovery hash must be detected'
  );
  assert.equal(isPasswordRecoveryUrl('', '?type=recovery'), true);
  assert.equal(isPasswordRecoveryUrl('#account'), false);
  assert.equal(isPasswordRecoveryUrl('#access_token=abc&type=signup'), false);
  assert.equal(isPasswordRecoveryUrl('', ''), false);

  const weak = await updatePassword('short');
  assert.equal(weak.ok, false);
  assert.ok(weak.error.length > 0, 'Weak passwords must be rejected before calling Supabase');

  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(appSource.includes("event === 'PASSWORD_RECOVERY'"), 'App must react to the Supabase recovery event');
  assert.ok(appSource.includes('passwordRecovery={passwordRecovery}'), 'Account must receive the recovery mode flag');

  const accountSource = readFileSync(new URL('../src/pages/Account/Account.jsx', import.meta.url), 'utf8');
  assert.ok(accountSource.includes('await updatePassword(newPassword)'));
  assert.ok(accountSource.includes('onPasswordUpdated()'));
  assert.ok(accountSource.includes('id="account-new-password"'));
  assert.ok(accountSource.includes('id="account-confirm-password"'));
});

await runTest('Privacy: Revoking analytics consent disables Google Analytics collection', () => {
  const storage = installMemoryStorage();

  storage.setItem('pph_analytics_consent', 'accepted');
  setAnalyticsConsent('declined');
  assert.equal(getAnalyticsConsent(), 'declined', 'Declining must persist the opt-out');

  setAnalyticsConsent(null);
  assert.equal(getAnalyticsConsent(), null, 'Consent reset must remove the stored choice');
  assert.doesNotThrow(() => disableAnalytics());

  const source = readFileSync(new URL('../src/utils/analytics.js', import.meta.url), 'utf8');
  assert.ok(source.includes('window[`ga-disable-${gaMeasurementId}`] = true'), 'Revocation must set the GA disable flag');
  assert.ok(source.includes('gaScriptEl.parentNode.removeChild(gaScriptEl)'), 'Revocation must remove the injected gtag script');
  assert.ok(source.includes('gaInitialized = false'), 'Revocation must allow a later re-opt-in');
  assert.ok(source.includes('window[`ga-disable-${measurementId}`] = false'), 'Re-opting in must clear the GA disable flag');
});

await runTest('Privacy: Export includes flashcards, daily challenge, submissions, and consent', () => {
  installMemoryStorage();

  const empty = exportAllStudentData();
  assert.deepEqual(empty.flashcards, [], 'Defaults must not be exported as if the student created them');
  assert.deepEqual(empty.moderationSubmissions, [], 'Sample moderation entries must not be exported');
  assert.deepEqual(empty.dailyChallenge, {});
  assert.equal(empty.analyticsConsent, null);

  const flashcards = [{ id: 'fc-export', front: 'Q', back: 'A', box: 2, nextReview: 123 }];
  const daily = { lastCompletedDate: '2026-11-16', lastScore: '4/5', dailyStreak: 3 };
  const submissions = [{ id: 'mod-real', title: 'My upload', status: 'pending' }];
  localStorage.setItem('pph_flashcards_srs', JSON.stringify(flashcards));
  localStorage.setItem('pph_daily_challenge', JSON.stringify(daily));
  localStorage.setItem('pph_moderation_queue', JSON.stringify(submissions));
  localStorage.setItem('pph_analytics_consent', 'accepted');

  const data = exportAllStudentData();
  assert.deepEqual(data.flashcards, flashcards);
  assert.deepEqual(data.dailyChallenge, daily);
  assert.deepEqual(data.moderationSubmissions, submissions);
  assert.equal(data.analyticsConsent, 'accepted');
  assert.ok(data.exportedAt);
});

await runTest('Dashboard: Derived summaries recompute when local or remote activity changes', () => {
  const source = readFileSync(new URL('../src/pages/Dashboard/Dashboard.jsx', import.meta.url), 'utf8');

  assert.ok(source.includes('const localStats = useMemo(() => stats || getStudyStats(), [stats, dataVersion]);'));
  assert.ok(source.includes('useMemo(() => getBookmarkedPapers(), [dataVersion])'));
  assert.ok(source.includes('useMemo(() => getWeakTopicsSummary(), [dataVersion])'));
  assert.ok(source.includes('useMemo(() => getQuizHistory(6), [dataVersion])'));
  assert.equal(source.includes('useMemo(() => getQuizHistory(6), [])'), false, 'Quiz history must not be cached forever');
  assert.equal(
    (source.match(/setDataVersion\(\(version\) => version \+ 1\)/g) || []).length,
    4,
    'Local events, initial sync, realtime inserts, and workspace switches must all bump the data version'
  );

  const realtimeBlock = source.slice(source.indexOf("'postgres_changes'"));
  assert.ok(
    realtimeBlock.indexOf('mergeRemoteActivity([item])') < realtimeBlock.indexOf('setLiveActivity'),
    'Realtime inserts must be persisted before rendering'
  );
});

await runTest('Routing: Browser back restores the subject encoded in history state or URL', () => {
  const csc211 = resolveSubjectFromRoute('csc211', DEFAULT_SUBJECTS);
  assert.equal(csc211?.code, 'CSC211');
  assert.equal(resolveSubjectFromRoute('not-a-course', DEFAULT_SUBJECTS), null);
  assert.equal(resolveSubjectFromRoute('', DEFAULT_SUBJECTS), null);
  assert.equal(resolveSubjectFromRoute(null, DEFAULT_SUBJECTS), null);

  assert.equal(getRouteSubjectCode({ state: { path: 'subject-papers', code: 'CSC371' } }, null), 'CSC371');
  assert.equal(getRouteSubjectCode({ state: { path: 'subject-papers' } }, 'MTH104'), 'MTH104');
  assert.equal(getRouteSubjectCode(null, null), null);

  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('const code = getRouteSubjectCode(e, getCourseCodeFromLocation());'));
  assert.ok(source.includes('if (matched) setSelectedSubject(matched);'));
});

await runTest('Study Tracker: Flashcard queue only surfaces cards whose review interval elapsed', () => {
  const now = 1_700_000_000_000;
  const cards = [
    { id: 'due-1', nextReview: now - 1000 },
    { id: 'due-2' },
    { id: 'future-1', nextReview: now + 60_000 }
  ];

  assert.deepEqual(getDueFlashcards(cards, now).map((c) => c.id), ['due-1', 'due-2']);
  assert.deepEqual(getDueFlashcards(cards, now + 120_000).map((c) => c.id), ['due-1', 'due-2', 'future-1']);
  assert.deepEqual(getDueFlashcards(null, now), []);

  const source = readFileSync(new URL('../src/pages/StudyHub/StudyHub.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('getDueFlashcards(cards, now)'), 'StudyHub must filter by due time before rendering');
  assert.ok(source.includes('getDueFlashcards(updated, Date.now())'), 'Rating must re-check the due queue');
});

await runTest('Study Tracker: New users start with no fabricated GPA history', () => {
  const storage = installMemoryStorage();
  assert.deepEqual(getSemesterGpaHistory(), []);

  const entry = { id: 'sem-1', label: 'Sem 1', sgpa: 3.5, credits: 15 };
  storage.setItem('pph_gpa_semesters', JSON.stringify([entry]));
  assert.deepEqual(getSemesterGpaHistory(), [entry]);
});

await runTest('MathText & AdminPaste Regression: Screenshot 1, 2 & 3 LaTeX and English prose cases', () => {
  // 1. Screenshot 1: English prose containing the letter "x" ("explain") must NOT trigger auto-stats math
  const q1Line = 'Classify the following tasks into supervised, unsupervised, or reinforcement learning and explain how?';
  const hasFakeStatsToken = /(?:x\u0304|y\u0304|\u0233|\u2211|\bS(?:xx|yy|xy)\s*=)/i.test(q1Line);
  assert.equal(hasFakeStatsToken, false, 'English prose with letter x must not match stats math regex');

  // 2. Screenshot 2 & 3: Single-escaped JSON with \text, \frac, \textbf, \rightarrow, \sqrt, \approx
  const rawAiJson = `{
    "subject_code": "CSC481",
    "questions": [
      {
        "question_number": 1,
        "question_text": "CLO 1 (5 Marks)\\nClassify the following tasks into supervised, unsupervised, or reinforcement learning and explain how?\\na. Spam email detection",
        "model_answer": "i. Accuracy — Formula: $\\text{Accuracy} = \\frac{TP + TN}{TP + TN + FP + FN}$\\n- $d(S_1, P1) = \\sqrt{(5-2)^2 + (3-4)^2} = \\sqrt{9 + 1} = \\sqrt{10} \\approx 3.162$\\nFinal Answer (Part 1): $S_1 \\rightarrow$ \\textbf{Class B} (Strength Training), $S_2 \\rightarrow$ \\textbf{Class A} (Cardio Training)."
      }
    ]
  }`;

  const protectedLatex = rawAiJson
    .replace(
      /(?<!\\)\\(frac|forall|flat|fbox|text|textbf|textit|textrm|texttt|times|theta|vartheta|tau|tilde|to|top|triangle|begin|bar|beta|binom|big|Big|bigg|Bigg|backslash|bot|bowtie|bullet|right|rightarrow|Rightarrow|leftrightarrow|Leftrightarrow|rho|varrho|rangle|rceil|rfloor|neq|ne|nabla|nu|natural|neg|ni|not|notin)\b/g,
      '\\\\$1'
    )
    .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');

  const parsed = JSON.parse(protectedLatex);
  const ans = parsed.questions[0].model_answer;
  assert.ok(ans.includes('\\text{Accuracy}'), 'Preserves \\text{Accuracy} instead of turning \\t into a Tab character');
  assert.ok(ans.includes('\\frac{TP + TN}'), 'Preserves \\frac instead of turning \\f into FormFeed character');
  assert.ok(ans.includes('\\rightarrow'), 'Preserves \\rightarrow instead of turning \\r into Carriage Return');
  assert.ok(ans.includes('\\textbf{Class B}'), 'Preserves \\textbf{Class B}');
});

await runTest('Quiz: Timer expiry completes through the same recorded finish path', () => {
  const source = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('setTimeLeftSec((prev) => Math.max(0, prev - 1))'));
  assert.ok(source.includes("step === 'playing' && quizMode === 'timed' && timeLeftSec === 0"));
  assert.ok(source.includes('finishQuizRef.current()'));
  assert.ok(source.includes('if (finishedRef.current || questions.length === 0) return;'));
});

await runTest('Navbar: tablet widths keep the bottom nav instead of overflowing the pill', () => {
  const navbarCss = readFileSync(new URL('../src/components/Navbar/Navbar.css', import.meta.url), 'utf8');
  const desktopNavAt = navbarCss.indexOf('.desktop-nav-links {\n    display: flex;');
  const bottomNavAt = navbarCss.indexOf('.mobile-bottom-nav {\n    display: none;');

  assert.ok(desktopNavAt > 0, 'Desktop navigation must have a display rule');
  assert.ok(bottomNavAt > 0, 'Bottom navigation must have a hide rule');
  assert.ok(
    navbarCss.slice(0, desktopNavAt).lastIndexOf('@media (min-width: 1024px)') >
      navbarCss.slice(0, desktopNavAt).lastIndexOf('@media (min-width: 768px)'),
    'The full pill navigation must not appear until 1024px'
  );
  assert.ok(
    navbarCss.slice(0, bottomNavAt).lastIndexOf('@media (min-width: 1024px)') >
      navbarCss.slice(0, bottomNavAt).lastIndexOf('@media (min-width: 768px)'),
    'The bottom navigation must stay visible through tablet widths'
  );

  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
  assert.ok(
    /@media \(min-width: 1024px\) \{\s*\.main-content/.test(appCss),
    'Main content must reserve space for the bottom nav on tablets'
  );
});

await runTest('Service Worker: navigation refreshes the cached shell', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("comsatsprephub-shell-v3"), 'Cache name must be bumped when shell logic changes');
  assert.ok(
    /cache\.put\('\/index\.html', clone\)/.test(sw),
    'Successful navigations must refresh the offline shell'
  );
  assert.ok(sw.includes("url.pathname.startsWith('/api/')"), 'API responses must never be cached');
  assert.ok(sw.includes("url.hostname.includes('supabase.co')"), 'Supabase responses must never be cached');
});

await runTest('AdminPaste: replacing a paper cannot leave it without questions', () => {
  const source = readFileSync(new URL('../src/pages/AdminPaste/AdminPaste.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes("supabase.rpc('replace_paper_questions'"), 'Question replacement must use the transactional RPC');
  assert.ok(!/from\('questions'\)[\s\S]{0,40}\.delete\(\)/.test(source), 'The client must not delete questions before inserting');
  assert.ok(/from\('past_papers'\)\.delete\(\)\.eq\('id', targetPaperId\)/.test(source), 'A failed new-paper upload must roll back the paper row');

  const migration = readFileSync(
    new URL('../supabase/migrations/20261116000001_replace_paper_questions_rpc.sql', import.meta.url),
    'utf8'
  );
  assert.ok(/DELETE FROM public\.questions/.test(migration));
  assert.ok(/INSERT INTO public\.questions/.test(migration));
});

await runTest('Moderation: submissions are bound to the signed-in owner', () => {
  const source = readFileSync(new URL('../src/utils/studyTracker.js', import.meta.url), 'utf8');
  assert.ok(source.includes('user_id: userId'), 'Submission inserts must send the session user id');
  assert.ok(!/\.insert\(\{\s*type: item\.type/.test(source), 'Submission inserts must not omit user_id');

  const migration = readFileSync(
    new URL('../supabase/migrations/20261116000000_bind_submission_owner.sql', import.meta.url),
    'utf8'
  );
  assert.ok(migration.includes('user_id IS NOT DISTINCT FROM auth.uid()'));
});

await runTest('Paper Provenance: sample papers and curated question banks are labelled', async () => {
  const { getOfflineExamQuestions } = await import('../src/services/geminiService.js');
  const curated = getOfflineExamQuestions('Data Structures', 'CSC211', 'Sample Practice Paper A');
  assert.ok(curated.length > 0);
  assert.ok(curated.every((question) => question.source === 'curated'), 'Curated questions must carry their provenance');

  const papersSource = readFileSync(new URL('../src/services/papersService.js', import.meta.url), 'utf8');
  assert.ok(papersSource.includes('isSample: true'), 'Fallback papers must be marked as samples');
  assert.ok(papersSource.includes('Sample Practice Paper'));
  assert.ok(!papersSource.includes("instructorName: 'COMSATS Faculty'"), 'Fallback papers must not invent an instructor');
  assert.ok(!papersSource.includes('Examination (Spring 2024)'), 'Fallback papers must not imitate a real exam');

  const viewSource = readFileSync(new URL('../src/pages/PaperView/PaperView.jsx', import.meta.url), 'utf8');
  assert.ok(viewSource.includes('paperview-provenance'), 'PaperView must disclose sample/curated content');
  assert.ok(viewSource.includes("q?.source === 'curated'"));
});

await runTest('Workspace: switching accounts archives and restores local study data', async () => {
  installMemoryStorage();
  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { dispatchEvent: () => {} }
    });
  }
  const {
    setStudentWorkspaceOwner,
    saveStudentPrefs,
    getStudentPrefs,
    togglePaperBookmark,
    getBookmarkedPapers
  } = await import('../src/utils/studyTracker.js');

  setStudentWorkspaceOwner('user-a');
  saveStudentPrefs({ campus: 'Lahore' });
  togglePaperBookmark({ id: 'paper-1', title: 'Sample', subjectCode: 'CSC211' });

  setStudentWorkspaceOwner('user-b');
  assert.equal(getStudentPrefs().campus, 'Islamabad', 'A second account must not inherit the first account preferences');
  assert.equal(getBookmarkedPapers().length, 0, 'A second account must not inherit the first account bookmarks');

  setStudentWorkspaceOwner('user-a');
  assert.equal(getStudentPrefs().campus, 'Lahore', 'Returning accounts must get their own data back');
  assert.equal(getBookmarkedPapers().length, 1);

  saveStudentPrefs({ campus: 'Sahiwal' });
  setStudentWorkspaceOwner(null);
  assert.equal(getStudentPrefs().campus, 'Islamabad', 'Signing out must not leave account data in the guest workspace');

  setStudentWorkspaceOwner('user-a');
  assert.equal(getStudentPrefs().campus, 'Sahiwal', 'Signing back in must restore the archived workspace');
});

await runTest('Submissions: success messages reflect real server delivery', async () => {
  installMemoryStorage();
  const { addModerationSubmission, getModerationSubmissions } = await import('../src/utils/studyTracker.js');

  const { item, sync } = addModerationSubmission({
    type: 'contact',
    subjectCode: 'SUPPORT',
    title: 'Support Inquiry',
    details: 'Please help'
  });

  assert.ok(item.id);
  assert.ok(getModerationSubmissions().some((entry) => entry.id === item.id), 'Submission must be queued locally');
  assert.deepEqual(await sync, { ok: false, reason: 'unconfigured' }, 'Unconfigured servers must not report success');

  for (const page of ['FaqContact/FaqContact.jsx', 'Upload/Upload.jsx', 'PaperView/PaperView.jsx']) {
    const source = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), 'utf8');
    assert.ok(source.includes('const result = await sync'), `${page} must await the real submission result`);
    assert.ok(source.includes('result.ok'), `${page} must branch on the real submission result`);
  }
});

await runTest('Privacy: clearing data covers archives and synced activity', async () => {
  installMemoryStorage();
  const studyTracker = await import('../src/utils/studyTracker.js');

  studyTracker.setStudentWorkspaceOwner('user-a');
  studyTracker.saveStudentPrefs({ campus: 'Multan' });
  studyTracker.setStudentWorkspaceOwner('user-b');
  studyTracker.setStudentWorkspaceOwner('user-a');
  studyTracker.clearAllStudentData();
  studyTracker.setStudentWorkspaceOwner('user-b');
  studyTracker.setStudentWorkspaceOwner('user-a');

  assert.equal(
    studyTracker.getStudentPrefs().campus,
    'Islamabad',
    'Cleared data must not come back from an archived copy'
  );
  assert.deepEqual(await studyTracker.clearCloudStudyActivity(), { ok: false, reason: 'unconfigured' });

  const migration = readFileSync(
    new URL('../supabase/migrations/20261116000002_user_activity_delete_policy.sql', import.meta.url),
    'utf8'
  );
  assert.ok(/FOR DELETE/.test(migration), 'Users must be able to delete their own synced activity');

  const account = readFileSync(new URL('../src/pages/Account/Account.jsx', import.meta.url), 'utf8');
  assert.ok(account.includes('await clearCloudStudyActivity()'));
  assert.ok(account.includes('All local and synced study data cleared.'));
  assert.ok(account.includes('could not be deleted'), 'A failed cloud deletion must be reported honestly');

  const faq = readFileSync(new URL('../src/pages/FaqContact/FaqContact.jsx', import.meta.url), 'utf8');
  assert.equal(faq.includes('cross-device sync, bookmarks'), false, 'Copy must not promise bookmark sync');
});

await runTest('Subjects: concurrent fetches share one request and failures recover after a short cache', async () => {
  let now = 1_700_000_000_000;
  let requests = 0;
  let finishFetch;
  let signalStarted;
  const started = new Promise((resolve) => { signalStarted = resolve; });
  let respond = () => new Promise((resolve) => {
    finishFetch = resolve;
    signalStarted();
  });
  const client = createClient('https://unit-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async () => {
        requests++;
        return respond();
      }
    }
  });
  const source = readFileSync(new URL('../src/services/papersService.js', import.meta.url), 'utf8')
    .replace(/^import .+;\r?$/gm, '')
    .replace(/^export /gm, '');
  const context = {
    supabase: client,
    isSupabaseConfigured: true,
    DEFAULT_SUBJECTS,
    Date: { now: () => now },
    logger: { warn() {} }
  };
  const service = runInNewContext(
    `${source}\n({ fetchSubjectsFromSupabase, clearPapersCache })`,
    context
  );
  const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
  const rows = [
    { subject_code: ' csc211 ', subject_name: 'Data Structures' },
    { subject_code: 'CSC211', subject_name: 'Data Structures' },
    { subject_code: 'MTH104', subject_name: 'Calculus' }
  ];

  const pending = Array.from({ length: 10 }, () => service.fetchSubjectsFromSupabase());
  await started;
  assert.equal(requests, 1, 'Overlapping page mounts must share the pending query');
  finishFetch(jsonResponse(rows));
  const results = await Promise.all(pending);
  const subjects = results[0];
  assert.ok(results.every((result) => result === subjects));
  assert.equal(subjects.length, 2);
  assert.equal(subjects[0].code, 'CSC211');
  assert.equal(subjects[0].papers, 2, 'Deduplication must preserve paper counts');
  assert.equal(subjects[0].department, 'CS & IT');
  assert.equal(await service.fetchSubjectsFromSupabase(), subjects);
  assert.equal(requests, 1, 'Successful lists must remain cached');

  now += 5 * 60 * 1000;
  respond = () => jsonResponse({ message: 'Service unavailable' }, 503);
  const offline = await Promise.all(Array.from({ length: 10 }, () => service.fetchSubjectsFromSupabase()));
  assert.ok(offline.every((result) => result === DEFAULT_SUBJECTS));
  assert.equal(requests, 2, 'A 503 must not cause SDK retries or duplicate queries');
  now += 29_999;
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 2, 'Offline page revisits must reuse the fallback briefly');

  now += 1;
  respond = () => jsonResponse(rows);
  const recovered = await service.fetchSubjectsFromSupabase();
  assert.equal(recovered[0].code, 'CSC211');
  assert.equal(requests, 3, 'The fallback must expire after 30 seconds so the server can recover');

  service.clearPapersCache();
  respond = () => { throw new TypeError('Network unavailable'); };
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 4, 'Cache clearing must allow a fresh query without network-error retries');
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 4, 'Network failures must also cache the fallback');

  now += 30_000;
  respond = () => jsonResponse([]);
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 5);
  now += 30_000;
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 5, 'A successful empty response must retain the normal cache duration');

  service.clearPapersCache();
  context.isSupabaseConfigured = false;
  assert.equal(await service.fetchSubjectsFromSupabase(), DEFAULT_SUBJECTS);
  assert.equal(requests, 5, 'Unconfigured installations must not attempt a network request');
});

if (failed > 0) {
  console.error(`\n❌ ${failed} of ${passed + failed} test suites failed.`);
} else {
  console.log(`\n🎉 All ${passed} test suites passed!`);
}

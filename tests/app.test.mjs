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
import { mergeRemoteActivity, getStudyStreak, getSemesterGpaHistory, getDueFlashcards, exportAllStudentData, getFlashcardsQueue, getRevisionDeckIds, toggleRevisionCard, quizQuestionToFlashcard, reviewFlashcard, setStudentWorkspaceOwner, clearAllStudentData } from '../src/utils/studyTracker.js';
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
  assert.ok(navbarCss.includes('grid-template-columns: repeat(5, 1fr)'));
  const navbarJsx = readFileSync(new URL('../src/components/Navbar/Navbar.jsx', import.meta.url), 'utf8');
  assert.ok(navbarJsx.includes("id: 'dashboard'"), 'Mobile bottom nav must include one-hand Dashboard access');
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

await runTest('Revision Deck: stars reuse SRS cards and survive export and workspace switches', () => {
  installMemoryStorage();
  setStudentWorkspaceOwner(null);
  assert.deepEqual(getRevisionDeckIds(), []);
  const card = getFlashcardsQueue()[0];
  assert.deepEqual(toggleRevisionCard(card), [card.id]);
  const savedCard = getFlashcardsQueue().find((item) => item.id === card.id);
  reviewFlashcard(card.id, 'good');
  const scheduled = getFlashcardsQueue().find((item) => item.id === card.id);
  toggleRevisionCard(card);
  assert.deepEqual(getRevisionDeckIds(), []);
  toggleRevisionCard(card);
  assert.deepEqual(getFlashcardsQueue().find((item) => item.id === card.id), scheduled, 'Re-starring must not reset the review schedule');
  assert.equal(savedCard.box, 1);
  assert.deepEqual(exportAllStudentData().revisionDeck, [card.id]);
  setStudentWorkspaceOwner('revision-test-user');
  assert.deepEqual(getRevisionDeckIds(), []);
  setStudentWorkspaceOwner(null);
  assert.deepEqual(getRevisionDeckIds(), [card.id], 'Returning to guest must restore the guest deck');
  clearAllStudentData();
  assert.deepEqual(getRevisionDeckIds(), []);
  assert.equal(localStorage.getItem('pph_revision_deck'), null);
});

await runTest('Revision Deck: quiz questions have stable IDs and deduplicate without changing stored card shapes', () => {
  installMemoryStorage();
  const question = { question: 'What is a queue?', options: ['FIFO', 'LIFO', 'Tree', 'Graph'], correct: 0, hint: 'First in, first out.' };
  const card = quizQuestionToFlashcard(question, 'csc211');
  assert.equal(card.id, quizQuestionToFlashcard(question, 'CSC211').id);
  assert.equal(card.back, 'FIFO — First in, first out.');
  toggleRevisionCard(card);
  const queue = getFlashcardsQueue();
  assert.equal(queue.filter((item) => item.id === card.id).length, 1);
  assert.equal(queue[0].box, 1);
  assert.ok(queue[0].nextReview > 0);
  assert.deepEqual(Object.keys(queue[0]).sort(), ['back', 'box', 'front', 'id', 'nextReview', 'subjectCode']);
  toggleRevisionCard(card);
  toggleRevisionCard(card);
  assert.equal(getFlashcardsQueue().filter((item) => item.id === card.id).length, 1);
});

await runTest('Flashcards: all recall ratings preserve the original intervals and boxes', () => {
  const originalNow = Date.now;
  const now = 1700000000000;
  Date.now = () => now;
  try {
    for (const [rating, interval, box] of [['again', 60000, 1], ['hard', 600000, 1], ['good', 86400000, 3], ['easy', 259200000, 3]]) {
      installMemoryStorage();
      localStorage.setItem('pph_flashcards_srs', JSON.stringify([{ id: 'existing', front: 'Q', back: 'A', box: 2, nextReview: 0 }]));
      const result = reviewFlashcard('existing', rating)[0];
      assert.equal(result.nextReview, now + interval);
      assert.equal(result.box, box);
      assert.equal(result.lastRating, rating);
    }
  } finally { Date.now = originalNow; }
});

await runTest('Flashcards: Space flips and 1/2/3 rate without hijacking typing', () => {
  const source = readFileSync(new URL('../src/pages/StudyHub/StudyHub.jsx', import.meta.url), 'utf8');
  const handlerSource = source.match(/const handleFlashcardKeyDown = (\(event\) => \{[\s\S]*?\n    \});/)[1];
  let flipped = false;
  let rating = null;
  const context = {
    document: { activeElement: { closest: () => null } },
    flipped: true,
    setFlipped: (updater) => { flipped = updater(flipped); },
    handleFlashcardRating: (value) => { rating = value; }
  };
  const handler = runInNewContext(`(${handlerSource})`, context);
  const event = (key, extra = {}) => ({ key, preventDefault() {}, ...extra });
  handler(event(' '));
  assert.equal(flipped, true);
  for (const [key, expected] of [['1', 'hard'], ['2', 'good'], ['3', 'easy']]) {
    handler(event(key));
    assert.equal(rating, expected);
  }
  rating = null;
  context.document.activeElement.closest = () => ({});
  handler(event('1'));
  assert.equal(rating, null);
  context.document.activeElement.closest = () => null;
  handler(event('1', { ctrlKey: true }));
  assert.equal(rating, null);
  context.flipped = false;
  handler(event('1'));
  assert.equal(rating, null, 'Rating requires the answer to be revealed');
  const css = readFileSync(new URL('../src/pages/StudyHub/StudyHub.css', import.meta.url), 'utf8');
  assert.ok(css.includes('transform: rotateY(180deg)'));
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(source.includes('onPointerUp={handleSwipeEnd}'));
  assert.ok(source.includes('disabled={!flipped}'));
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

await runTest('Quiz: Exam mode hides site chrome only while a timed exam runs', () => {
  const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const quizSource = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  assert.ok(appSource.includes('const [examActive, setExamActive] = useState(false);'));
  assert.ok(appSource.includes('<Quiz onExamActiveChange={setExamActive} />'));
  assert.ok(appSource.includes('{!examActive && (') && appSource.includes('{!examActive && <Footer'));
  assert.ok(quizSource.includes("const active = step === 'playing' && quizMode === 'timed';"));
  assert.ok(quizSource.includes('onExamActiveChange?.(active);'));
  assert.ok(quizSource.includes('return () => onExamActiveChange?.(false);'), 'Unmount must restore the site chrome');
  assert.ok(quizSource.includes('setConfirmExit(true)'), 'Exiting an exam must require confirmation');
});

await runTest('Quiz: Finish confirmation guards unanswered and flagged questions', () => {
  const source = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  const handlerSource = source.match(/const requestFinish = (\(\) => \{[\s\S]*?\n  \});/)[1];
  let confirmed = false;
  let finished = 0;
  const context = {
    unansweredCount: 2,
    flaggedCount: 0,
    setConfirmFinish: (value) => { confirmed = value; },
    finishQuiz: () => { finished += 1; }
  };
  const handler = runInNewContext(`(${handlerSource})`, context);
  handler();
  assert.equal(confirmed, true, 'Unanswered questions must trigger the submit confirmation');
  assert.equal(finished, 0);
  context.unansweredCount = 0;
  context.flaggedCount = 1;
  handler();
  assert.equal(finished, 0, 'Flagged questions must trigger the submit confirmation');
  context.flaggedCount = 0;
  handler();
  assert.equal(finished, 1, 'A fully answered, unflagged exam submits directly');
  assert.ok(source.includes('Review Remaining') && source.includes('Submit Anyway'));
});

await runTest('Quiz: Navigator states are labelled beyond colour', () => {
  const source = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/pages/Quiz/Quiz.css', import.meta.url), 'utf8');
  assert.ok(source.includes('aria-label={`Question ${idx + 1}: ${statusLabel}`}'));
  for (const label of ['flagged for review', 'answered correctly', 'answered incorrectly', 'unanswered']) {
    assert.ok(source.includes(label), `Navigator must label "${label}"`);
  }
  for (const state of ['correct', 'incorrect', 'flagged', 'unanswered']) {
    assert.ok(css.includes(`.quiz-nav-pill--${state}`), `Navigator needs a ${state} style`);
  }
  assert.ok(source.includes('quiz-nav-legend'), 'A visible legend must explain the states');
  assert.ok(css.includes('overflow-x: auto;'), 'Mobile navigator must scroll instead of covering the question');
});

await runTest('Quiz: Arrow keys navigate but never fire while typing', () => {
  const source = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  const handlerSource = source.match(/const handleKeyDown = (\(e\) => \{[\s\S]*?\n    \});/)[1];
  let next = 0;
  let prev = 0;
  let prevented = 0;
  const context = {
    document: { activeElement: { closest: () => null } },
    questions: [{ options: ['A', 'B', 'C', 'D'] }, { options: ['A', 'B', 'C', 'D'] }],
    currentIdx: 1,
    revealed: true,
    selectedOption: 0,
    handleNextQuestion: () => { next += 1; },
    handlePrevQuestion: () => { prev += 1; },
    handleSubmitAnswer: () => {},
    setSelectedOption: () => {}
  };
  const handler = runInNewContext(`(${handlerSource})`, context);
  const event = (key) => ({ key, preventDefault: () => { prevented += 1; } });
  handler(event('ArrowRight'));
  handler(event('ArrowLeft'));
  assert.equal(next, 1);
  assert.equal(prev, 1);
  assert.equal(prevented, 2, 'Arrow navigation must not scroll the page');
  context.document.activeElement.closest = (selectors) => selectors.includes('input') ? {} : null;
  handler(event('ArrowRight'));
  handler(event('ArrowLeft'));
  assert.equal(next, 1, 'Typing in an input must not navigate');
  assert.equal(prev, 1);
});

await runTest('Quiz: Summary reports time taken and retries wrong plus skipped questions', () => {
  const source = readFileSync(new URL('../src/pages/Quiz/Quiz.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('startedAtRef.current = Date.now();'));
  assert.ok(source.includes('setElapsedSec(Math.max(0, Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000)));'));
  assert.ok(source.includes('Time Taken'));
  assert.ok(source.includes('Retry Missed Questions'));
  const retrySource = source.match(/const handleRetryWrongQuestions = (\(\) => \{[\s\S]*?\n  \});/)[1];
  assert.ok(retrySource.includes('questions.filter((_, idx) => !userAnswers[idx]?.isCorrect)'), 'Retry must keep wrong AND skipped questions');
  assert.ok(source.includes("userAnswers[idx] == null ? 'skipped'"), 'Review must distinguish skipped answers');
  const reviewCss = readFileSync(new URL('../src/pages/Quiz/Quiz.css', import.meta.url), 'utf8');
  for (const status of ['correct', 'incorrect', 'skipped']) {
    assert.ok(reviewCss.includes(`.quiz-review-status--${status}`), `Review needs a ${status} chip style`);
  }
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

await runTest('UI: quiz shortcuts preserve native controls and browser shortcuts', () => {
  for (const page of ['Quiz/Quiz.jsx', 'TakeAiQuiz/TakeAiQuiz.jsx']) {
    const source = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), 'utf8');
    const handlerSource = source.match(/const handleKeyDown = (\(e\) => \{[\s\S]*?\n    \});/)[1];
    let next = 0;
    let submitted = 0;
    let selected = null;
    let prevented = 0;
    const context = {
      document: { activeElement: { closest: () => null } },
      questions: [{ options: ['A', 'B', 'C', 'D'] }],
      currentIdx: 0,
      revealed: true,
      selectedOption: 0,
      handleNextQuestion: () => next++,
      handleSubmitAnswer: () => submitted++,
      setSelectedOption: (value) => { selected = value; }
    };
    const handler = runInNewContext(`(${handlerSource})`, context);
    const event = (key, extra = {}) => ({ key, preventDefault: () => prevented++, ...extra });
    for (const selector of ['button', 'a[href]', 'input', 'textarea', 'select', '[role="button"]', '[role="dialog"]']) {
      context.document.activeElement.closest = (selectors) => selectors.includes(selector) ? {} : null;
      handler(event('Enter'));
      handler(event('1'));
    }
    assert.equal(next, 0, `${page}: native controls must not advance the quiz`);
    assert.equal(selected, null);
    assert.equal(prevented, 0);
    context.document.activeElement.closest = () => null;
    for (const flag of ['defaultPrevented', 'repeat', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      handler(event('Enter', { [flag]: true }));
      handler(event('1', { [flag]: true }));
    }
    assert.equal(next, 0);
    assert.equal(selected, null);
    context.document.activeElement.isContentEditable = true;
    handler(event('Enter'));
    assert.equal(next, 0);
    context.document.activeElement.isContentEditable = false;
    handler(event('Enter'));
    assert.equal(next, 1, 'Unmodified Enter on the page must still advance');
    context.revealed = false;
    handler(event('2'));
    assert.equal(selected, 1, 'Number shortcuts must still select an answer');
    handler(event('Enter'));
    assert.equal(submitted, 1);
  }
});

await runTest('UI: installation banner closes for accepted and dismissed native choices', async () => {
  const source = readFileSync(new URL('../src/components/InstallPrompt/InstallPrompt.jsx', import.meta.url), 'utf8');
  const handlerSource = source.match(/const handleInstall = (async \(\) => \{[\s\S]*?\n  \});/)[1];
  for (const outcome of ['accepted', 'dismissed']) {
    let shown = true;
    let prompt = { prompt() {}, userChoice: Promise.resolve({ outcome }) };
    const handler = runInNewContext(`(${handlerSource})`, {
      deferredPrompt: prompt,
      setShow: (value) => { shown = value; },
      setDeferredPrompt: (value) => { prompt = value; }
    });
    const pending = handler();
    assert.equal(shown, false, 'The banner must stop offering a consumed prompt immediately');
    await pending;
    assert.equal(prompt, null);
  }
});

await runTest('UI: install banner centering survives its motion transform', () => {
  const source = readFileSync(new URL('../src/components/InstallPrompt/InstallPrompt.jsx', import.meta.url), 'utf8');
  assert.match(source, /className="install-prompt"\s+style=\{\{ x: '-50%' \}\}/);
  const css = readFileSync(new URL('../src/components/InstallPrompt/InstallPrompt.css', import.meta.url), 'utf8');
  assert.match(css, /left: 50%;/);
  assert.match(css, /max-width: 420px;\s+width: calc\(100% - 2rem\);/);
});

await runTest('UI: hidden scroll controls and upload picker remain keyboard-safe', () => {
  const scroll = readFileSync(new URL('../src/components/ScrollTop/ScrollTop.jsx', import.meta.url), 'utf8');
  assert.ok(scroll.includes('tabIndex={visible ? 0 : -1}'));
  assert.ok(scroll.includes('aria-hidden={!visible}'));
  assert.ok(scroll.includes('handleScroll();'));
  const upload = readFileSync(new URL('../src/pages/Upload/Upload.jsx', import.meta.url), 'utf8');
  const fileInput = upload.match(/<input\s+id="paper-file-input"[\s\S]*?\/>/)[0];
  assert.ok(fileInput.includes('className="sr-only"'));
  assert.equal(fileInput.includes("display: 'none'"), false);
  assert.ok(fileInput.includes("aria-describedby={fileError ? 'upload-file-error' : undefined}"));
  assert.ok(upload.includes('id="upload-file-error" role="alert"'));
  const css = readFileSync(new URL('../src/pages/Upload/Upload.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.upload-dropzone:focus-within'));
});

await runTest('UI: auth mode changes preserve the original dialog opener', () => {
  const source = readFileSync(new URL('../src/components/AuthModal/AuthModal.jsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const effect = source.match(/useEffect\(\(\) => \{\n    if \(!isOpen\) return;\n    triggerRef.current = document.activeElement;([\s\S]*?)\n  \}, \[isOpen\]\);/);
  assert.ok(effect, 'Opener capture must depend only on whether the dialog is open');
  let restored = 0;
  const opener = { focus: () => restored++ };
  const context = { isOpen: true, triggerRef: { current: null }, document: { activeElement: opener } };
  const capture = runInNewContext(`(() => { if (!isOpen) return; triggerRef.current = document.activeElement; ${effect[1]} })`, context);
  const cleanup = capture();
  context.document.activeElement = { focus: () => assert.fail('Must not restore to a mode-switch control') };
  cleanup();
  assert.equal(restored, 1);
  assert.ok(source.includes('cancelAnimationFrame(frame)'));
});

await runTest('UI: command palette exposes active keyboard selection', () => {
  const source = readFileSync(new URL('../src/components/CommandPalette/CommandPalette.jsx', import.meta.url), 'utf8');
  for (const attribute of ['role="combobox"', 'aria-autocomplete="list"', 'aria-activedescendant=', 'role="listbox"', 'role="option"', 'aria-selected={isSelected}', 'tabIndex={-1}']) {
    assert.ok(source.includes(attribute), `Command palette must include ${attribute}`);
  }
  const handlerSource = source.match(/const handleKeyDown = (\(e\) => \{[\s\S]*?\n  \});/)[1];
  let selected = 0;
  let focused = 0;
  const handler = runInNewContext(`(${handlerSource})`, {
    results: [{}, {}, {}],
    inputRef: { current: { focus: () => focused++ } },
    setSelectedIndex: (value) => { selected = typeof value === 'function' ? value(selected) : value; },
    onClose() {},
    handleSelect() {}
  });
  const key = (value, extra = {}) => handler({ key: value, preventDefault() {}, ...extra });
  key('ArrowUp');
  assert.equal(selected, 2);
  key('ArrowDown');
  assert.equal(selected, 0);
  key('Tab', { shiftKey: true });
  assert.equal(selected, 2);
  key('Home');
  assert.equal(selected, 0);
  key('End');
  assert.equal(selected, 2);
  assert.equal(focused, 5);
});

await runTest('UI: AI radio groups support wrapping arrows and boundary keys', () => {
  const source = readFileSync(new URL('../src/pages/AiQuizGenerator/AiQuizGenerator.jsx', import.meta.url), 'utf8');
  assert.equal((source.match(/tabIndex=\{isSelected \? 0 : -1\}/g) || []).length, 3);
  assert.equal((source.match(/onKeyDown=\{handleRadioKeyDown\}/g) || []).length, 3);
  const handlerSource = source.match(/const handleRadioKeyDown = (\(e\) => \{[\s\S]*?\n  \});/)[1];
  let focused = -1;
  let clicked = -1;
  const radios = Array.from({ length: 3 }, (_, index) => ({
    focus: () => { focused = index; },
    click: () => { clicked = index; },
    closest: () => ({ querySelectorAll: () => radios })
  }));
  const handler = runInNewContext(`(${handlerSource})`);
  const press = (key, index, extra = {}) => handler({ key, currentTarget: radios[index], preventDefault() {}, ...extra });
  press('ArrowLeft', 0);
  assert.equal(clicked, 2);
  assert.equal(focused, 2);
  press('ArrowRight', 2);
  assert.equal(clicked, 0);
  press('End', 0);
  assert.equal(clicked, 2);
  press('Home', 2);
  assert.equal(clicked, 0);
  press('ArrowDown', 0, { ctrlKey: true });
  assert.equal(clicked, 0, 'Modified keys must retain browser behavior');
});

await runTest('UI: study and upload tabs link panels and wrap keyboard navigation', () => {
  for (const page of ['StudyHub/StudyHub.jsx', 'Upload/Upload.jsx']) {
    const source = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), 'utf8');
    assert.ok(source.includes('role="tabpanel"'));
    assert.ok(source.includes('aria-labelledby={`'));
    assert.ok(source.includes('aria-controls="'));
    assert.ok(source.includes('onKeyDown={handleTabKeyDown}'));
    const handlerSource = source.match(/const handleTabKeyDown = (\(e\) => \{[\s\S]*?\n  \});/)[1];
    let selected = -1;
    let focused = -1;
    const tabs = Array.from({ length: page.startsWith('StudyHub') ? 4 : 2 }, (_, index) => ({
      focus: () => { focused = index; },
      click: () => { selected = index; }
    }));
    const handler = runInNewContext(`(${handlerSource})`);
    const key = (value, index) => handler({ key: value, preventDefault() {}, currentTarget: { querySelectorAll: () => tabs }, target: { closest: () => tabs[index] } });
    key('ArrowLeft', 0);
    assert.equal(selected, tabs.length - 1);
    assert.equal(focused, selected);
    key('ArrowRight', tabs.length - 1);
    assert.equal(selected, 0);
    key('End', 0);
    assert.equal(selected, tabs.length - 1);
    key('Home', tabs.length - 1);
    assert.equal(selected, 0);
  }
});

await runTest('UI: notes, report and admin textareas have explicit accessible names', () => {
  for (const page of ['PaperView/PaperView.jsx', 'AdminPaste/AdminPaste.jsx']) {
    const source = readFileSync(new URL(`../src/pages/${page}`, import.meta.url), 'utf8');
    const fields = source.match(/<textarea\b[\s\S]*?\/>/g);
    assert.ok(fields.length > 0);
    for (const field of fields) assert.ok(field.includes('aria-label='), `${page}: textareas must not rely on placeholders`);
  }
});

await runTest('UI: course suggestions stay available when focus moves inside search', () => {
  const source = readFileSync(new URL('../src/pages/Home/Home.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('onFocusCapture={() => setSearchFocused(true)}'));
  assert.ok(source.includes('role="group"'));
  assert.equal(source.includes('role="listbox"'), false);
  assert.equal(source.includes('onMouseDown={() => onSelectSubject(subj)}'), false);
  const blurBody = source.match(/onBlurCapture=\{\(e\) => \{([\s\S]*?)\}\}/)[1];
  let focused = true;
  const handler = runInNewContext(`((e) => {${blurBody}})`, { setSearchFocused: (value) => { focused = value; } });
  const inside = {};
  const container = { contains: (target) => target === inside };
  handler({ currentTarget: container, relatedTarget: inside });
  assert.equal(focused, true);
  handler({ currentTarget: container, relatedTarget: null });
  assert.equal(focused, false);
});

await runTest('UI: contact submission prevents duplicate pending requests and permits retry', async () => {
  const source = readFileSync(new URL('../src/pages/FaqContact/FaqContact.jsx', import.meta.url), 'utf8');
  const handlerSource = source.match(/const handleSubmit = (async \(e\) => \{[\s\S]*?\n  \});/)[1];
  let queued = 0;
  let finish;
  let busy = false;
  let sent = false;
  const context = {
    name: 'Test Student', email: 'test@example.invalid', message: 'Local test only',
    submittingRef: { current: false },
    setSubmitting: (value) => { busy = value; },
    setSent: (value) => { sent = value; },
    toast: { error() {}, success() {} },
    addModerationSubmission: () => { queued++; return { sync: new Promise((resolve) => { finish = resolve; }) }; }
  };
  const handler = runInNewContext(`(${handlerSource})`, context);
  const event = { preventDefault() {} };
  const pending = handler(event);
  await handler(event);
  assert.equal(queued, 1);
  assert.equal(busy, true);
  finish({ ok: false });
  await pending;
  assert.equal(busy, false);
  assert.equal(context.submittingRef.current, false);
  const retry = handler(event);
  assert.equal(queued, 2);
  finish({ ok: true });
  await retry;
  assert.equal(sent, true);
  assert.equal(busy, false);
  assert.ok(source.includes('disabled={submitting}'));
  assert.ok(source.includes('aria-busy={submitting}'));
});

await runTest('UI: paper search matches the advertised year field', () => {
  const source = readFileSync(new URL('../src/pages/SubjectPapers/SubjectPapers.jsx', import.meta.url), 'utf8');
  const predicate = source.match(/papers\.filter\((\(paper\) => \{[\s\S]*?\n    \})\);/)[1];
  const context = { q: '2024', examFilter: 'All', semesterFilter: 'All', yearFilter: 'All', teacherFilter: 'All' };
  const matches = runInNewContext(`(${predicate})`, context);
  const paper = { year: 2024, title: 'Exam', term: 'Terminal', semester: 'Fall' };
  assert.equal(matches(paper), true);
  assert.equal(matches({ ...paper, year: 2023 }), false);
  context.q = 'terminal';
  assert.equal(matches(paper), true);
  context.q = '';
  context.yearFilter = '2023';
  assert.equal(matches(paper), false);
});

await runTest('UI: shared generation button styling is independent of route history', () => {
  const globalCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const pageCss = readFileSync(new URL('../src/pages/AiQuizGenerator/AiQuizGenerator.css', import.meta.url), 'utf8');
  assert.ok(globalCss.includes('.btn-generate-ai {'));
  assert.ok(globalCss.includes('.btn-generate-ai:hover'));
  assert.equal(pageCss.includes('.btn-generate-ai'), false);
});

await runTest('UI: application motion honors the system preference without a DOM wrapper', () => {
  const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('<MotionConfig reducedMotion="user">'));
  assert.ok(source.includes('</MotionConfig>'));
});

await runTest('UI: programmatic scrolling respects reduced motion', () => {
  for (const file of ['App.jsx', 'components/ScrollTop/ScrollTop.jsx', 'components/CommandPalette/CommandPalette.jsx']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.equal(source.includes("behavior: 'smooth'"), false, `${file}: smooth scrolling must be conditional`);
    assert.ok(source.includes("? 'instant' : 'smooth'"));
  }
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*html\s*\{\s*scroll-behavior: auto;/);
});

await runTest('UI: report dialogs raise their existing main stacking context above navigation', () => {
  const css = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8');
  assert.match(css, /\.main-content:has\(\[aria-modal="true"\]\)\s*\{\s*z-index: 1000;/);
});

await runTest('UI: floating notices clear bottom navigation through tablet widths', () => {
  for (const file of ['components/CookieNotice/CookieNotice.css', 'components/InstallPrompt/InstallPrompt.css', 'utils/toast.css']) {
    const css = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.match(css, /@media \(max-width: 1023px\)\s*\{\s*\.[\w-]+\s*\{\s*bottom: calc\(5\.5rem \+ env\(safe-area-inset-bottom, 0px\)\);/, file);
  }
});

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

await runTest('UI: brand control text preserves light colors and passes dark contrast', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const light = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
  const dark = css.match(/html\.dark\s*\{([\s\S]*?)\n\}/)[1];
  assert.match(light, /--on-brand:\s*#ffffff;/);
  assert.match(dark, /--on-brand:\s*#0f172a;/);
  for (const [tokens, backgrounds] of [[light, ['brand', 'brand-2', 'brand-hover']], [dark, ['brand', 'brand-2', 'brand-hover']]]) {
    const foreground = tokens.match(/--on-brand:\s*(#[\da-f]{6});/)[1];
    for (const name of backgrounds) {
      const background = tokens.match(new RegExp(`--${name}:\\s*(#[\\da-f]{6});`))[1];
      assert.ok(contrastRatio(foreground, background) >= 4.5, `${foreground} on ${background}`);
    }
  }
  for (const file of ['components/AuthModal/AuthModal.css', 'components/CookieNotice/CookieNotice.css', 'components/ScrollTop/ScrollTop.css', 'components/ui/EmptyState.jsx', 'pages/Home/Home.jsx', 'pages/Account/Account.jsx', 'pages/Subjects/Subjects.jsx', 'pages/Upload/Upload.jsx', 'pages/FaqContact/FaqContact.jsx', 'pages/StudyHub/StudyHub.jsx', 'pages/StudyHub/StudyHub.css', 'pages/Quiz/Quiz.css', 'pages/Quiz/Quiz.jsx', 'pages/TakeAiQuiz/TakeAiQuiz.css', 'pages/TakeAiQuiz/TakeAiQuiz.jsx', 'pages/PaperView/PaperView.css', 'pages/SubjectPapers/SubjectPapers.css', 'components/ErrorBoundary/ErrorBoundary.css', 'components/InstallPrompt/InstallPrompt.css', 'pages/AdminPaste/AdminPaste.css']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.ok(source.includes('var(--on-brand)'), file);
  }
  const admin = readFileSync(new URL('../src/pages/AdminPaste/AdminPaste.css', import.meta.url), 'utf8');
  for (const selector of ['.btn-copy-prompt:hover', '.btn-parse:hover', '.btn-result-action.primary:hover']) {
    const rule = admin.slice(admin.indexOf(`${selector} {`)).split('}')[0];
    assert.ok(rule.includes('color: #ffffff;'), selector);
  }
});

await runTest('UI: AI generation and selected topic use contrast-safe brand text', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const button = css.slice(css.indexOf('.btn-generate-ai {')).split('}')[0];
  assert.ok(button.includes('color: var(--on-brand);'));
  const hover = css.slice(css.indexOf('.btn-generate-ai:hover {')).split('}')[0];
  assert.ok(hover.includes('background: var(--brand-hover);'));
  const page = readFileSync(new URL('../src/pages/AiQuizGenerator/AiQuizGenerator.css', import.meta.url), 'utf8');
  const chip = page.slice(page.indexOf('.ai-topic-chip.active {')).split('}')[0];
  assert.ok(chip.includes('color: var(--on-brand);'));
});

await runTest('UI: active mobile labels retain their gradient with readable text', () => {
  const css = readFileSync(new URL('../src/components/Navbar/Navbar.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.mobile-nav-item.active {')).split('}')[0];
  assert.ok(rule.includes('background: linear-gradient(135deg, #0ea5e9, #0d9488);'));
  assert.ok(rule.includes('color: #0f172a;'));
  for (const background of ['#0ea5e9', '#0d9488']) {
    assert.ok(contrastRatio('#0f172a', background) >= 4.5);
  }
});

await runTest('UI: offline and reconnected banners retain their colors with readable text', () => {
  const source = readFileSync(new URL('../src/components/ui/OfflineBanner.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes("background: isOffline ? '#ef4444' : '#10b981'"));
  assert.ok(source.includes("color: '#0f172a'"));
  for (const background of ['#ef4444', '#10b981']) {
    assert.ok(contrastRatio('#0f172a', background) >= 4.5);
  }
});

await runTest('UI: enabled AI Next button retains its gradient with readable text', () => {
  const source = readFileSync(new URL('../src/pages/TakeAiQuiz/TakeAiQuiz.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes("style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#0f172a' }}"));
  assert.ok(source.includes('aria-label="Quiz progress"'));
  for (const background of ['#10b981', '#059669']) {
    assert.ok(contrastRatio('#0f172a', background) >= 4.5);
  }
});

await runTest('UI: dashboard guest preview reuses its dark surfaces', () => {
  const css = readFileSync(new URL('../src/pages/Dashboard/Dashboard.css', import.meta.url), 'utf8');
  assert.match(css, /html\.dark \.study-dashboard__preview\s*\{\s*background: linear-gradient\(110deg, var\(--sd-bg\), var\(--sd-surface\)\);\s*border-color: var\(--sd-line\);/);
  assert.ok(css.includes('background: linear-gradient(110deg, #eff6ff, #f0fdfa);'));
  const tokens = css.match(/html\.dark \.study-dashboard\s*\{([\s\S]*?)\n\}/)[1];
  const foreground = tokens.match(/--sd-muted:\s*(#[\da-f]{6});/)[1];
  for (const name of ['bg', 'surface']) {
    const background = tokens.match(new RegExp(`--sd-${name}:\\s*(#[\\da-f]{6});`))[1];
    assert.ok(contrastRatio(foreground, background) >= 4.5);
  }
});

await runTest('UI: account clear-data text reuses brighter danger color only in dark mode', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /\.account-clear-data\s*\{\s*color: var\(--danger\);/);
  assert.match(css, /html\.dark \.account-clear-data\s*\{\s*color: #ef4444;/);
  const source = readFileSync(new URL('../src/pages/Account/Account.jsx', import.meta.url), 'utf8');
  const button = source.slice(source.indexOf('onClick={handleClear}')).split('</button>')[0];
  assert.ok(button.includes('className="account-clear-data"'));
  assert.equal(button.includes("color: 'var(--danger)'"), false);
  assert.ok(contrastRatio('#ef4444', '#111827') >= 4.5);
  assert.ok(contrastRatio('#dc2626', '#ffffff') >= 4.5);
});

await runTest('UI polish: legal and upload phone padding reuses existing spacing', () => {
  for (const page of ['Terms', 'Upload']) {
    const css = readFileSync(new URL(`../src/pages/${page}/${page}.css`, import.meta.url), 'utf8');
    const selector = page.toLowerCase();
    assert.match(css, /padding: 3rem 1\.5rem;/);
    assert.match(css, /padding: 2\.75rem;/);
    assert.match(css, new RegExp(`@media \\(max-width: 639px\\)\\s*\\{\\s*\\.${selector}-container\\s*\\{\\s*padding: var\\(--space-8\\) var\\(--space-4\\);\\s*\\}\\s*\\.${selector}-card\\s*\\{\\s*padding: var\\(--space-6\\);`));
    if (page === 'Upload') assert.match(css, /\.upload-dropzone\s*\{\s*padding: var\(--space-8\) var\(--space-4\);/);
  }
});

await runTest('UI polish: command search keeps its existing focus ring inside the clipped panel', () => {
  const css = readFileSync(new URL('../src/components/CommandPalette/CommandPalette.css', import.meta.url), 'utf8');
  assert.match(css, /\.cmd-palette__input:focus\s*\{\s*outline: none;\s*box-shadow: inset 0 0 0 3px var\(--ring\);\s*border-bottom-color: var\(--brand\);/);
  assert.match(css, /\.cmd-palette-panel\s*\{[^}]*overflow: hidden;/);
});

await runTest('UI polish: header targets grow only within the compact navigation breakpoint', () => {
  const css = readFileSync(new URL('../src/components/Navbar/Navbar.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 399px\)\s*\{\s*\.nav-container\s*\{\s*padding-inline: 0\.5rem;/);
  assert.match(css, /@media \(min-width: 414px\) and \(max-width: 1023px\)\s*\{\s*\.icon-circle-btn,\s*\.cmd-trigger-btn,\s*\.signin-gradient-btn\s*\{\s*min-width: 2\.75rem;\s*min-height: 2\.75rem;/);
  assert.equal(css.includes('WCAG 2.2 AA 44x44px'), false);
});

await runTest('UI polish: internal marks labels target their existing obtained inputs', () => {
  const source = readFileSync(new URL('../src/pages/GpaCalculator/GpaCalculator.jsx', import.meta.url), 'utf8');
  for (const key of ['quizObtained', 'assignObtained', 'midObtained', 'finalObtained']) {
    assert.ok(source.includes('htmlFor={`${componentId}-sessional-' + key + '`}'));
    assert.ok(source.includes('id={`${componentId}-sessional-' + key + '`}'));
  }
  assert.ok(source.includes('htmlFor={`${componentId}-sessional-${obtainedKey}`}'));
  assert.match(source, /id=\{`\$\{componentId\}-sessional-\$\{obtainedKey\}`\}[\s\S]*?value=\{sessionalInputs\[obtainedKey\]\}[\s\S]*?aria-label=\{`\$\{label\} obtained marks`\}/);
  assert.match(source, /value=\{sessionalInputs\[totalKey\]\}[\s\S]*?aria-label=\{`\$\{label\} total marks`\}/);
  assert.equal(source.includes('id={`${componentId}-sessional-${totalKey}`}'), false);
  for (const name of ['Quizzes obtained out of 15', 'Assignments obtained out of 10', 'Midterm obtained out of 25', 'Final exam obtained out of 50']) {
    assert.ok(source.includes(`aria-label="${name}"`));
  }
  assert.match(source, /<label[^>]*>\s*<input\s*type="checkbox"\s*checked=\{sessionalInputs\.hasLab\}/);
});

if (failed > 0) {
  console.error(`\n❌ ${failed} of ${passed + failed} test suites failed.`);
} else {
  console.log(`\n🎉 All ${passed} test suites passed!`);
}

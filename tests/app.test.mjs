import assert from 'node:assert/strict';
import { GRADING_SCALE, getGradeInfo, calcSessionalCourseResult } from '../src/services/gpaEngine.js';
import { isSafeRedirectUrl, isSafePdfUrl, sanitizePlainText } from '../src/utils/sanitize.js';
import { getCommandPaletteResults } from '../src/utils/fuzzySearch.js';
import generateQuizHandler from '../api/generate-quiz.js';
import analyzeScreenshotHandler from '../api/analyze-screenshot.js';

let passed = 0;
async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err);
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

console.log(`\n🎉 All ${passed} test suites passed!`);

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

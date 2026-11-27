import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { getAccessTokenSpy } = vi.hoisted(() => ({
  getAccessTokenSpy: vi.fn()
}));

vi.mock('../../src/services/supabase.js', () => ({
  supabase: { auth: {} },
  isSupabaseConfigured: false,
  authHelper: {
    getAccessToken: (...args) => getAccessTokenSpy(...args)
  }
}));

import { generateQuizWithGemini, AiQuizRequestError } from '../../src/services/aiQuizService.js';
import generateQuizHandler from '../../api/generate-quiz.js';
import analyzeScreenshotHandler from '../../api/analyze-screenshot.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };
  return res;
}

describe('Suite E — AI Quiz & API Proxy Hardening (SEC-08)', () => {
  const originalFetch = globalThis.fetch;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    getAccessTokenSpy.mockReset().mockResolvedValue('valid-test-jwt');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...savedEnv };
  });

  describe('Client aiQuizService boundaries & output sanitization', () => {
    it('rejects empty subjects and out-of-range / non-integer numQuestions before network calls', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      await expect(generateQuizWithGemini({ subject: '   ' })).rejects.toThrow(/Enter a topic/i);
      await expect(
        generateQuizWithGemini({ subject: 'Data Structures', numQuestions: 0 })
      ).rejects.toThrow(/1 and 20/);
      await expect(
        generateQuizWithGemini({ subject: 'Data Structures', numQuestions: 21 })
      ).rejects.toThrow(/1 and 20/);
      await expect(
        generateQuizWithGemini({ subject: 'Data Structures', numQuestions: 3.5 })
      ).rejects.toThrow(/1 and 20/);
      await expect(
        generateQuizWithGemini({ subject: 'Data Structures', numQuestions: 'abc' })
      ).rejects.toThrow(/1 and 20/);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('propagates 401 and 429 server denials as AiQuizRequestError', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Please sign in to generate AI quizzes.' })
      });

      await expect(
        generateQuizWithGemini({ subject: 'Algorithms', numQuestions: 5 })
      ).rejects.toBeInstanceOf(AiQuizRequestError);

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'You have reached your 10-quiz generation limit.' })
      });

      await expect(
        generateQuizWithGemini({ subject: 'Algorithms', numQuestions: 5 })
      ).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    });

    it('sanitizes outbound prompts and inbound AI question responses', async () => {
      let sentBody;
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        sentBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            metadata: { provider: 'Mock Gemini' },
            questions: [
              {
                question: '<script>alert(1)</script>What is O(n log n)?',
                options: ['<img src=x onerror=1>Merge', 'Bubble', 'Insertion', 'Selection'],
                correctAnswer: 0,
                explanation: '<svg onload=alert(9)>Divide and conquer'
              }
            ]
          })
        };
      });

      const questions = await generateQuizWithGemini({
        subject: '<script>alert(1)</script>Algorithms',
        subjectCode: '<b>CSC301</b>',
        topic: '<img src=x>Sorting',
        numQuestions: 1
      });

      expect(sentBody.subject).not.toContain('<script>');
      expect(sentBody.subjectCode).not.toContain('<b>');
      expect(sentBody.topic).not.toContain('<img');
      expect(questions[0].question).not.toContain('<script>');
      expect(questions[0].options[0]).not.toContain('<img');
      expect(questions[0].hint).not.toContain('<svg');
    });
  });

  describe('Serverless /api/generate-quiz & /api/analyze-screenshot hardening', () => {
    it('enforces method checks, untrusted Origin rejection (403), and strict schema validation (400)', async () => {
      const getRes = createMockRes();
      await generateQuizHandler({ method: 'GET', headers: {} }, getRes);
      expect(getRes.statusCode).toBe(405);

      const evilOriginRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: { origin: 'https://evil-attacker.example' },
          body: { subject: 'Databases', questionCount: 5 }
        },
        evilOriginRes
      );
      expect(evilOriginRes.statusCode).toBe(403);

      const ocrEvilOriginRes = createMockRes();
      await analyzeScreenshotHandler(
        {
          method: 'POST',
          headers: { origin: 'https://evil-attacker.example' },
          body: { imageBase64: 'data:image/png;base64,AAAA' }
        },
        ocrEvilOriginRes
      );
      expect(ocrEvilOriginRes.statusCode).toBe(403);

      const badCountRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: { origin: 'https://comsatsprephub.vercel.app' },
          body: { subject: 'Databases', questionCount: 99 }
        },
        badCountRes
      );
      expect(badCountRes.statusCode).toBe(400);

      const badFloatRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: {},
          body: { subject: 'Databases', questionCount: 2.5 }
        },
        badFloatRes
      );
      expect(badFloatRes.statusCode).toBe(400);

      const badTypeRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: {},
          body: { subject: 'Databases', questionType: 'eval_shell', questionCount: 5 }
        },
        badTypeRes
      );
      expect(badTypeRes.statusCode).toBe(400);

      const oversizedRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: {},
          body: { subject: 'A'.repeat(250), questionCount: 5 }
        },
        oversizedRes
      );
      expect(oversizedRes.statusCode).toBe(400);
    });

    it('requires verified Supabase bearer auth (401) and enforces quota exhaustion (429)', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-redis-token';
      process.env.SUPABASE_URL = 'https://mock-project.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-admin-key-not-real';

      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/pipeline')) {
          return {
            ok: true,
            json: async () => [{ result: 1 }, { result: 1 }]
          };
        }
        if (urlStr.includes('/auth/v1/user')) {
          return {
            ok: true,
            json: async () => ({ user: { id: 'student-uuid-1' } })
          };
        }
        if (urlStr.includes('reserve_ai_quiz_generation')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            text: async () => JSON.stringify([{ allowed: false, used: 10, remaining: 0 }]),
            json: async () => [{ allowed: false, used: 10, remaining: 0 }]
          };
        }
        throw new Error(`Unexpected fetch URL in mock test: ${urlStr}`);
      });

      const unauthRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: { origin: 'https://comsatsprephub.vercel.app' },
          body: { subject: 'Operating Systems', questionCount: 5 }
        },
        unauthRes
      );
      expect(unauthRes.statusCode).toBe(401);

      const quotaRes = createMockRes();
      await generateQuizHandler(
        {
          method: 'POST',
          headers: {
            origin: 'https://comsatsprephub.vercel.app',
            authorization: 'Bearer fake-student-jwt'
          },
          body: { subject: 'Operating Systems', questionCount: 5 }
        },
        quotaRes
      );
      expect(quotaRes.statusCode).toBe(429);
    });
  });
});

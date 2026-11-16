import { getOfflineQuestions } from './geminiService.js';
import { authHelper } from './supabase.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import { logger } from '../utils/logger.js';

export class AiQuizRequestError extends Error {
  constructor(message, { status = 0, code = 'AI_REQUEST_FAILED' } = {}) {
    super(message);
    this.name = 'AiQuizRequestError';
    this.status = status;
    this.code = code;
  }
}

async function readServerError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // response body was not JSON
  }
  return fallbackMessage;
}

export async function generateQuizWithGemini({
  subject,
  subjectCode = '',
  topic = '',
  questionType = 'mcq',
  numQuestions = 10,
  difficulty = 'Medium',
  signal
}) {
  const questionCount = Number(numQuestions);

  if (!String(subject || '').trim()) {
    throw new Error('Enter a topic first.');
  }

  if (
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 20
  ) {
    throw new Error('Choose between 1 and 20 questions.');
  }

  try {
    const token = await authHelper.getAccessToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject: sanitizePlainText(subject, 120),
        subjectCode: sanitizePlainText(subjectCode, 20),
        topic: sanitizePlainText(topic, 140),
        questionType,
        difficulty,
        questionCount
      }),
      signal
    });

    if (response.status === 401 || response.status === 429) {
      const fallbackMessage = response.status === 401
        ? 'Please sign in to generate AI quizzes.'
        : 'You have reached the AI quiz limit. Please wait and try again.';
      throw new AiQuizRequestError(await readServerError(response, fallbackMessage), {
        status: response.status,
        code: response.status === 401 ? 'AUTH_REQUIRED' : 'RATE_LIMITED'
      });
    }

    if (response.ok) {
      const payload = await response.json();
      if (
        Array.isArray(payload?.questions) &&
        payload.questions.length === questionCount
      ) {
        return payload.questions.map((item, index) => {
          const valid =
            typeof item.question === 'string' &&
            item.question.trim().length > 0 &&
            Array.isArray(item.options) &&
            item.options.length === 4 &&
            item.options.every(
              (option) => typeof option === 'string' && option.trim().length > 0
            ) &&
            Number.isInteger(item.correctAnswer) &&
            item.correctAnswer >= 0 &&
            item.correctAnswer < 4;

          if (!valid) {
            throw new Error(
              `The AI returned an invalid question at position ${index + 1}.`
            );
          }

          return {
            question: sanitizePlainText(item.question, 500),
            options: item.options.map((option) => sanitizePlainText(option, 240)),
            correct: item.correctAnswer,
            hint:
              typeof item.explanation === 'string'
                ? sanitizePlainText(item.explanation, 600)
                : '',
            provider: payload?.metadata?.provider || 'AI'
          };
        });
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError' || err instanceof AiQuizRequestError) {
      throw err;
    }
    logger.warn(
      'aiQuizService',
      `Server AI quiz endpoint unavailable; using curated COMSATS question bank fallback: ${err?.message || ''}`
    );
  }

  // Graceful fallback to built-in COMSATS question bank when offline or no server API key is configured
  return getOfflineQuestions(subject, subjectCode, questionCount, difficulty).map((question) => ({
    ...question,
    provider: 'Curated Bank'
  }));
}

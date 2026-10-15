import { getOfflineQuestions } from './geminiService.js';

export async function generateQuizWithGemini({
  subject,
  subjectCode = '',
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
    const response = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: String(subject).trim(),
        subjectCode,
        difficulty,
        questionCount
      }),
      signal
    });

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
            question: item.question.trim(),
            options: item.options.map((option) => option.trim()),
            correct: item.correctAnswer,
            hint:
              typeof item.explanation === 'string'
                ? item.explanation.trim()
                : ''
          };
        });
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    console.warn(
      'Server AI quiz endpoint unavailable; using curated COMSATS question bank fallback:',
      err?.message || err
    );
  }

  // Graceful fallback to built-in COMSATS question bank when offline or no server API key is configured
  return getOfflineQuestions(subject, subjectCode, questionCount, difficulty);
}

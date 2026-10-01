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

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `The quiz endpoint returned non-JSON data (HTTP ${response.status}). ` +
      'Check that /api/generate-quiz is deployed and not rewritten to index.html.'
    );
  }

  if (!response.ok) {
    throw new Error(
      payload?.error || `Quiz generation failed (HTTP ${response.status}).`
    );
  }

  if (
    !Array.isArray(payload?.questions) ||
    payload.questions.length !== questionCount
  ) {
    throw new Error('The AI returned an incomplete quiz. Please try again.');
  }

  return payload.questions.map((item, index) => {
    const valid =
      typeof item.question === 'string' &&
      item.question.trim().length > 0 &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      item.options.every(
        option => typeof option === 'string' && option.trim().length > 0
      ) &&
      Number.isInteger(item.correctAnswer) &&
      item.correctAnswer >= 0 &&
      item.correctAnswer < 4;

    if (!valid) {
      throw new Error(`The AI returned an invalid question at position ${index + 1}.`);
    }

    return {
      question: item.question.trim(),
      options: item.options.map(option => option.trim()),
      correct: item.correctAnswer,
      hint:
        typeof item.explanation === 'string'
          ? item.explanation.trim()
          : ''
    };
  });
}

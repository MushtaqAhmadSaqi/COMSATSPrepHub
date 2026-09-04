/**
 * Groq AI service for generating COMSATS-style MCQ quizzes.
 * Uses Llama 3.3 70B via the Groq REST API (free tier).
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Generate MCQ questions for a given subject using Groq AI.
 *
 * @param {object} opts
 * @param {string} opts.subject - Subject name (e.g., "Data Structures & Algorithms")
 * @param {string} opts.subjectCode - Subject code (e.g., "CSC211")
 * @param {number} opts.numQuestions - Number of questions to generate (5-20)
 * @param {string} opts.difficulty - "Easy" | "Medium" | "Hard"
 * @returns {Promise<Array<{question: string, options: string[], correct: number, hint: string}>>}
 */
export async function generateQuizWithGemini({ subject, subjectCode, numQuestions = 10, difficulty = 'Medium' }) {
  if (!GROQ_API_KEY) {
    console.warn('VITE_GROQ_API_KEY is not defined in environment variables. Falling back to built-in quiz questions.');
    return Array.from({ length: numQuestions }, (_, i) => getFallbackQuestion(i));
  }

  const prompt = buildPrompt(subject, subjectCode, numQuestions, difficulty);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert university professor. You always respond with valid JSON only — no markdown, no explanation, just the raw JSON array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Groq API response error:', response.status, errData);
      return Array.from({ length: numQuestions }, (_, i) => getFallbackQuestion(i));
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    return parseQuizFromResponse(text, numQuestions);
  } catch (err) {
    console.error('Groq quiz generation error:', err);
    return Array.from({ length: numQuestions }, (_, i) => getFallbackQuestion(i));
  }
}

/**
 * Build the prompt for Groq to generate a structured MCQ quiz.
 */
function buildPrompt(subject, subjectCode, numQuestions, difficulty) {
  return `You are an expert computer science professor at COMSATS University Islamabad. Generate ${numQuestions} multiple-choice questions (MCQs) for the subject "${subject}" (${subjectCode || 'university-level course'}).

Difficulty level: ${difficulty}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Exactly one option must be correct
3. Include a brief hint for each question (1-2 sentences)
4. Questions should be relevant to ${difficulty} difficulty level for university students
5. Cover different topics within ${subject}
6. Questions should be clear, unambiguous, and educational

Respond with ONLY a valid JSON array. No markdown, no code blocks, no explanation — just the raw JSON array.

Format:
[
  {
    "question": "What is the time complexity of binary search?",
    "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    "correct": 1,
    "hint": "Binary search halves the search space at each step."
  }
]

Generate exactly ${numQuestions} questions now:`;
}

/**
 * Parse the JSON array from Groq's response.
 * Handles markdown code blocks and extracts the first valid JSON array.
 */
function parseQuizFromResponse(text, expectedCount) {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '');
  }

  // Try to find a JSON array in the response
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new Error('No valid JSON array found in AI response');
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Parsed response is not an array');
    }

    // Validate and normalize each question
    const questions = parsed.slice(0, expectedCount).map((item, idx) => {
      if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
        console.warn(`Invalid question format at index ${idx}, using fallback`);
        return getFallbackQuestion(idx);
      }

      // Ensure correct is within bounds (0-3)
      let correct = typeof item.correct === 'number' ? item.correct : 0;
      correct = Math.max(0, Math.min(3, Math.floor(correct)));

      return {
        question: String(item.question).trim(),
        options: item.options.map(opt => String(opt).trim()),
        correct,
        hint: item.hint ? String(item.hint).trim() : 'Think carefully about the concepts involved.',
      };
    });

    // Pad with fallbacks if fewer questions than expected
    while (questions.length < expectedCount) {
      questions.push(getFallbackQuestion(questions.length));
    }

    return questions;
  } catch (parseErr) {
    console.error('Failed to parse AI response:', parseErr);
    return Array.from({ length: expectedCount }, (_, i) => getFallbackQuestion(i));
  }
}

/**
 * Fallback questions if parsing fails.
 */
function getFallbackQuestion(idx) {
  const fallbacks = [
    {
      question: 'Which data structure uses LIFO (Last In, First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correct: 1,
      hint: 'Think about stacking plates — the last one placed is the first one removed.',
    },
    {
      question: 'What is the time complexity of accessing an element in an array by index?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
      correct: 0,
      hint: 'Arrays provide direct memory access using the index.',
    },
    {
      question: 'Which sorting algorithm has the best worst-case time complexity?',
      options: ['Bubble Sort', 'Quick Sort', 'Merge Sort', 'Selection Sort'],
      correct: 2,
      hint: 'This algorithm guarantees O(n log n) even in the worst case.',
    },
    {
      question: 'What does HTML stand for?',
      options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'],
      correct: 0,
      hint: 'It is the standard markup language for creating web pages.',
    },
    {
      question: 'Which keyword is used to declare a constant in JavaScript?',
      options: ['var', 'let', 'const', 'static'],
      correct: 2,
      hint: 'This keyword was introduced in ES6 for constants that cannot be reassigned.',
    },
  ];

  return fallbacks[idx % fallbacks.length];
}

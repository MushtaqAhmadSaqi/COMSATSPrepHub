const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GROQ_MODELS = (process.env.GROQ_MODEL || process.env.GROQ_MODELS || 'llama-3.3-70b-versatile,llama-3.1-70b-versatile,llama-3.1-8b-instant,llama3-70b-8192,llama3-8b-8192,gemma2-9b-it,mixtral-8x7b-32768')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

function getApiKey(name) {
  return String(process.env[name] || '').trim();
}

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(body);
}

function buildPrompt({ subject, subjectCode, difficulty, questionCount }) {
  const subjectLabel = subjectCode ? `${subject} (${subjectCode})` : subject;

  return `You are an expert COMSATS University exam coach.

Create a high-quality ${questionCount}-question multiple-choice quiz for:

Subject: ${subjectLabel}
Difficulty: ${difficulty}

Return ONLY valid JSON. No markdown. No explanation outside JSON.
correctAnswer must be a zero-based integer: 0, 1, 2, or 3.
Return exactly the requested number of questions.

Use this exact format:
{
  "questions": [
    {
      "question": "Clear question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief educational explanation of the correct answer."
    }
  ]
}`;
}

function parseQuizText(text, expectedCount) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('AI returned an empty response.');
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  let payload;

  try {
    payload = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON.');
  }

  const rows = Array.isArray(payload) ? payload : payload?.questions;

  if (!Array.isArray(rows) || rows.length !== expectedCount) {
    throw new Error(`AI must return exactly ${expectedCount} questions.`);
  }

  return rows.map((item, index) => {
    const answer = item?.correctAnswer ?? item?.correct;

    const valid =
      typeof item?.question === 'string' &&
      item.question.trim().length > 0 &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      item.options.every(
        option => typeof option === 'string' && option.trim().length > 0
      ) &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer <= 3;

    if (!valid) {
      throw new Error(`AI returned invalid question ${index + 1}.`);
    }

    return {
      question: item.question.trim(),
      options: item.options.map(option => option.trim()),
      correctAnswer: answer,
      explanation:
        typeof item.explanation === 'string'
          ? item.explanation.trim()
          : ''
    };
  });
}

async function callGemini(prompt) {
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}).`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callGroq(prompt) {
  const apiKey = getApiKey('GROQ_API_KEY');
  if (!apiKey) return null;

  let lastError = null;

  for (const model of GROQ_MODELS) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Respond with valid JSON only. No markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 6000
      })
    });

    if (!response.ok) {
      lastError = new Error(`Groq request failed for ${model} (${response.status}).`);
      continue;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || null;
    if (text) return text;
  }

  throw lastError || new Error('Groq returned an empty response.');
}

async function callOpenRouter(prompt) {
  const apiKey = getApiKey('OPENROUTER_API_KEY');
  if (!apiKey) return null;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'Respond with valid JSON only. No markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}).`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const {
    subject = '',
    subjectCode = '',
    difficulty = 'Medium',
    questionCount = 10
  } = req.body || {};

  if (!String(subject).trim()) {
    return sendJson(res, 400, { error: 'Subject is required.' });
  }

  const safeQuestionCount = Number(questionCount);

  if (
    !Number.isInteger(safeQuestionCount) ||
    safeQuestionCount < 1 ||
    safeQuestionCount > 20
  ) {
    return sendJson(res, 400, {
      error: 'questionCount must be an integer between 1 and 20.'
    });
  }

  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    return sendJson(res, 400, {
      error: 'difficulty must be Easy, Medium, or Hard.'
    });
  }
  const prompt = buildPrompt({
    subject: String(subject).trim(),
    subjectCode: String(subjectCode || '').trim(),
    difficulty,
    questionCount: safeQuestionCount
  });

  const providers = [
    ['Google Gemini', callGemini],
    ['Groq', callGroq],
    ['OpenRouter', callOpenRouter]
  ];

  let lastError = null;

  for (const [provider, callProvider] of providers) {
    try {
      const text = await callProvider(prompt);
      if (!text) continue;
      const questions = parseQuizText(text, safeQuestionCount);

      return sendJson(res, 200, {
        title: `${subject}${subjectCode ? ` (${subjectCode})` : ''} Quiz`,
        questions,
        metadata: {
          provider,
          generatedAt: new Date().toISOString(),
          isAIGenerated: true
        }
      });
    } catch (error) {
      lastError = error;
      console.error(`${provider} quiz generation failed:`, error);
    }
  }

  return sendJson(res, 500, {
    error: lastError?.message || 'No AI API key is configured on the server.'
  });
}

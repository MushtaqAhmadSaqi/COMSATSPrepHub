const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GROQ_MODELS = (process.env.GROQ_MODEL || process.env.GROQ_MODELS || 'llama-3.3-70b-versatile,llama-3.1-70b-versatile,llama-3.1-8b-instant,llama3-70b-8192,llama3-8b-8192,gemma2-9b-it,mixtral-8x7b-32768')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

function getApiKey(name) {
  return process.env[name] || process.env[`VITE_${name}`] || '';
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
  if (!text) throw new Error('AI returned an empty response.');

  const cleaned = String(text).replace(/```json|```/gi, '').trim();
  let payload;

  try {
    payload = JSON.parse(cleaned);
  } catch {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!objectMatch && !arrayMatch) throw new Error('AI did not return valid JSON.');
    payload = JSON.parse((objectMatch || arrayMatch)[0]);
  }

  const sourceQuestions = Array.isArray(payload) ? payload : payload.questions;
  if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
    throw new Error('AI returned no questions.');
  }

  return sourceQuestions.slice(0, expectedCount).map((item, index) => {
    const options = Array.isArray(item.options) ? item.options.slice(0, 4) : [];
    if (!item.question || options.length !== 4) {
      throw new Error(`Question ${index + 1} is missing text or four options.`);
    }

    const rawCorrect = Number.isInteger(item.correctAnswer)
      ? item.correctAnswer
      : Number.isInteger(item.correct)
        ? item.correct
        : 0;

    return {
      question: String(item.question).trim(),
      options: options.map(option => String(option).trim()),
      correctAnswer: Math.max(0, Math.min(3, rawCorrect)),
      explanation: String(item.explanation || item.hint || 'Review the core concept behind this answer.').trim()
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
        max_tokens: 2048
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

  const safeQuestionCount = Math.min(Math.max(Number(questionCount) || 10, 1), 20);
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

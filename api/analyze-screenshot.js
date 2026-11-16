// api/analyze-screenshot.js
// Server-side CUOnline Portal Screenshot OCR Endpoint via Gemini Vision (Native Fetch)

import {
  sanitizeField,
  checkRateLimit,
  requireUser,
  sendError
} from './_lib/security.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // ~3 MB image max
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const TIMEOUT_MS = 9500;
const RATE_LIMIT_PER_MINUTE = 5;
const MAX_MARK_ENTRIES = 20;

export function parseImageDataUrl(rawImage) {
  const value = String(rawImage || '');
  if (!value) {
    return { ok: false, status: 400, error: 'Screenshot image data is required.' };
  }
  if (value.length > MAX_BASE64_LENGTH) {
    return { ok: false, status: 413, error: 'Screenshot image exceeds the 3 MB size limit.' };
  }

  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match || !ALLOWED_MIMES.has(match[1])) {
    return {
      ok: false,
      status: 415,
      error: 'Screenshot must be a PNG, JPEG, or WebP image data URL.'
    };
  }

  const base64Data = match[2].replace(/\s+/g, '');
  if (!base64Data || base64Data.length % 4 !== 0) {
    return { ok: false, status: 400, error: 'Screenshot image data is not valid base64.' };
  }

  return { ok: true, mimeType: match[1], base64Data };
}

function toNumber(value, { min = 0, max = 1000, integer = false } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (integer && !Number.isInteger(number)) return null;
  if (number < min || number > max) return null;
  return number;
}

function parseMarkPair(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const obtained = toNumber(entry.obtained, { min: 0, max: 1000 });
  const total = toNumber(entry.total, { min: 1, max: 1000 });
  if (obtained === null || total === null || obtained > total) return null;
  return { obtained, total };
}

function parseMarkList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_MARK_ENTRIES)
    .map(parseMarkPair)
    .filter(Boolean);
}

export function validateOcrPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('OCR payload is not an object');
  }

  const subjectName = sanitizeField(raw.subjectName, 120);
  if (!subjectName) {
    throw new Error('OCR payload is missing the subject name');
  }

  const theory = raw.theory && typeof raw.theory === 'object' && !Array.isArray(raw.theory)
    ? raw.theory
    : null;
  if (!theory) {
    throw new Error('OCR payload is missing the theory marks section');
  }

  const quizzes = parseMarkList(theory.quizzes);
  const assignments = parseMarkList(theory.assignments);
  const mid = parseMarkPair(theory.mid);
  const final = parseMarkPair(theory.final);

  if (quizzes.length === 0 && assignments.length === 0 && !mid && !final) {
    throw new Error('OCR payload contained no usable marks');
  }

  return {
    subjectName,
    creditHours: toNumber(raw.creditHours, { min: 0, max: 12, integer: true }),
    theory: { quizzes, assignments, mid, final }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const image = parseImageDataUrl(req.body?.imageBase64);
  if (!image.ok) {
    return sendError(res, image.status, image.error);
  }

  const rateStatus = await checkRateLimit({
    req,
    scope: 'ocr',
    limit: RATE_LIMIT_PER_MINUTE,
    tooManyMessage: 'Too many screenshot scans. Please wait a minute and try again.'
  });
  if (!rateStatus.allowed) {
    return sendError(res, rateStatus.status, rateStatus.error);
  }

  const auth = await requireUser(req, 'the AI Screenshot Scanner');
  if (!auth.ok) {
    return sendError(res, auth.status, auth.error);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendError(res, 503, 'GEMINI_API_KEY is not configured on the server.');
  }

  const prompt = `You are an expert COMSATS University student portal (CUOnline) OCR parser.
Analyze this screenshot showing marks details (quizzes, assignments, midterm, or final exam).
Return ONLY valid JSON matching this schema:
{
  "subjectName": "string",
  "creditHours": 3,
  "theory": {
    "quizzes": [{ "obtained": 8, "total": 10 }],
    "assignments": [{ "obtained": 9, "total": 10 }],
    "mid": { "obtained": 20, "total": 25 },
    "final": { "obtained": 40, "total": 50 }
  }
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: image.mimeType, data: image.base64Data } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Upstream OCR HTTP ${response.status}`);
    }

    const result = await response.json();
    const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!responseText) {
      throw new Error('Empty OCR response');
    }

    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    let validated;
    try {
      validated = validateOcrPayload(parsedData);
    } catch (validationError) {
      console.warn('[analyze-screenshot] OCR payload rejected:', validationError?.message || validationError);
      return sendError(
        res,
        422,
        'The marks table could not be read reliably. Please upload a clearer screenshot.'
      );
    }

    return res.status(200).json(validated);
  } catch (err) {
    console.warn('[analyze-screenshot] OCR error:', err?.message || err);
    return sendError(
      res,
      502,
      'Could not extract marks from this screenshot. Please ensure the CUOnline marks table is clearly visible.'
    );
  }
}

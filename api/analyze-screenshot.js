// api/analyze-screenshot.js
// Server-side CUOnline Portal Screenshot OCR Endpoint via Gemini Vision (Native Fetch)

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // ~3 MB image max
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const TIMEOUT_MS = 9500;

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function checkUpstashRateLimit(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: true };

  try {
    const key = `ratelimit:ocr:${ip}`;
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, 60]
      ]),
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return { allowed: true };
    const data = await res.json();
    const count = Number(data?.[0]?.result || 1);
    return { allowed: count <= 5 };
  } catch {
    return { allowed: true };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const rateStatus = await checkUpstashRateLimit(ip);
  if (!rateStatus.allowed) {
    return res.status(429).json({ error: 'Too many screenshot scans. Please wait a minute and try again.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Please sign in to use the AI Screenshot Scanner.' });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    }
  }

  const rawImage = String(req.body?.imageBase64 || '');
  if (!rawImage) {
    return res.status(400).json({ error: 'Screenshot image data is required.' });
  }
  if (rawImage.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'Screenshot image exceeds the 3 MB size limit.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server.'
    });
  }

  const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = mimeMatch && ALLOWED_MIMES.has(mimeMatch[1]) ? mimeMatch[1] : 'image/png';
  const base64Data = rawImage.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();

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
              { inlineData: { mimeType, data: base64Data } }
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

    return res.status(200).json(parsedData);
  } catch (err) {
    console.warn('[analyze-screenshot] OCR error:', err?.message || err);
    return res.status(502).json({
      error: 'Could not extract marks from this screenshot. Please ensure the CUOnline marks table is clearly visible.'
    });
  }
}

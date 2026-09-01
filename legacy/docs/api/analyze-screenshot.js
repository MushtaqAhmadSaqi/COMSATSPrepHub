// api/analyze-screenshot.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure AI screenshot scanner endpoint.
// Uses Google Gemini to process portal screenshots and return parsed marks JSON.
// Requires a valid Supabase user session (Bearer token) to prevent API abuse.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ── Supabase admin client (server-side only, never sent to browser) ───────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Helper: extract Bearer token from Authorization header ────────────────────
function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Check for required server env vars
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({
      error: "Server configuration error. Contact the site administrator.",
    });
  }

  // 2. Require auth token to prevent unauthorized access and API abuse
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Please sign in to use the AI Screenshot Scanner.",
    });
  }

  // 3. Validate request body
  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "Screenshot image data is required" });
  }

  // 4. Require Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured. Add it in Vercel Project Settings.",
    });
  }

  // 5. Verify the Supabase session token
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({
      error: "Your session is invalid or expired. Please sign in again.",
    });
  }

  // 6. Call Gemini AI to parse the screenshot
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // Low temperature for high accuracy OCR extraction
      },
    });

    // Strip out the data:image/*;base64 prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Prepare image for Gemini
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/png"
      }
    };

    const prompt = `
      You are an expert COMSATS University Islamabad student portal OCR parser.
      Analyze this screenshot showing marks details (typically from CUOnline, showing assignments, quizzes, midterms, or sessional marks).
      
      Extract:
      1. The Subject Name (e.g. "Data Structures", "Object Oriented Programming", etc.).
      2. The Credit Hours of the subject (typically 3 or 4, check credit weighting if mentioned, default to 3 if unsure).
      3. Quizzes: All obtained and total marks listed in the Quizzes section.
      4. Assignments: All obtained and total marks listed in the Assignments section.
      5. Midterm Exam: The obtained and total marks.
      6. Final Exam: The obtained and total marks.

      Guidelines:
      - If sessional marks are split into columns, extract individual obtained/total values (e.g. quiz 1: 8/10, quiz 2: 7/10) rather than summing them.
      - If midterm is out of 25, return obtained out of 25. If out of 30, return out of 30.
      - If final exam is out of 50, return obtained out of 50.
      - If final exam marks are not yet listed or showing blank, return null or omit final exam obtained.
      
      Return ONLY valid JSON matching this schema:
      {
        "subjectName": "string",
        "creditHours": number,
        "theory": {
          "quizzes": [{ "obtained": number, "total": number }],
          "assignments": [{ "obtained": number, "total": number }],
          "mid": { "obtained": number, "total": number },
          "final": { "obtained": number, "total": number }
        }
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result?.response?.text?.();

    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return valid JSON. Ensure image is clear.");
      }
      parsedData = JSON.parse(jsonMatch[0]);
    }

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error("AI parse screenshot error:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze screenshot. Please ensure the screenshot is clear and shows marks clearly.",
    });
  }
}

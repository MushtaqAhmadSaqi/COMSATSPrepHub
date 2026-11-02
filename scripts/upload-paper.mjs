#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Read environment variables from .env
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found in project root.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
// Prefer SERVICE_ROLE_KEY if available (bypasses RLS for admin uploads), else use anon key
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// 2. Parse command-line argument for JSON file
const targetFile = process.argv[2] || path.join(__dirname, 'sample-paper.json');
const absolutePath = path.isAbsolute(targetFile) ? targetFile : path.join(process.cwd(), targetFile);

if (!fs.existsSync(absolutePath)) {
  console.error(`❌ Error: JSON file not found at: ${absolutePath}`);
  console.log('\nUsage: node scripts/upload-paper.mjs <path-to-json>');
  console.log('Example: node scripts/upload-paper.mjs scripts/sample-paper.json');
  process.exit(1);
}

let rawData;
try {
  rawData = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
} catch (err) {
  console.error(`❌ Error: Invalid JSON in ${absolutePath}:`, err.message);
  process.exit(1);
}

const papersList = Array.isArray(rawData) ? rawData : [rawData];

console.log(`\n📄 Found ${papersList.length} paper(s) to upload in: ${path.basename(absolutePath)}`);
console.log(`🔗 Connecting to Supabase project at: ${supabaseUrl}\n`);

async function uploadSinglePaper(paperData, index) {
  const {
    subject_code,
    subject_name,
    title,
    term = 'Exam',
    year = new Date().getFullYear(),
    semester = '',
    total_marks = null,
    instructor_name = null,
    file_url = null,
    questions = []
  } = paperData;

  if (!subject_code) {
    throw new Error(`Paper #${index + 1} is missing required 'subject_code'.`);
  }

  const paperTitle =
    title ||
    `${subject_code} — ${term} ${semester || year}`.trim();

  // 1. Insert into past_papers
  console.log(`⏳ Uploading paper: "${paperTitle}"...`);
  const { data: insertedPaper, error: paperError } = await supabase
    .from('past_papers')
    .insert({
      subject_code: subject_code.toUpperCase().trim(),
      subject_name: (subject_name || '').trim(),
      title: paperTitle,
      term: term,
      year: Number(year) || new Date().getFullYear(),
      semester: semester || '',
      total_marks: total_marks ? Number(total_marks) : null,
      instructor_name: instructor_name || null,
      file_url: file_url || null
    })
    .select()
    .single();

  if (paperError) {
    if (paperError.message.includes('row-level security') || paperError.code === '42501') {
      console.error('\n⚠️  Row Level Security (RLS) Notice:');
      console.error('Supabase RLS is blocking public/anon INSERTs to "past_papers".');
      console.error('To fix this, either:');
      console.error('  1. Add SUPABASE_SERVICE_ROLE_KEY=your_key to your .env file, OR');
      console.error('  2. In Supabase Dashboard -> Authentication -> Policies -> past_papers -> Add INSERT policy.\n');
    }
    throw new Error(`Failed to insert paper into past_papers: ${paperError.message}`);
  }

  const paperId = insertedPaper.id;
  console.log(`   ✅ Paper created with ID: ${paperId}`);

  // 2. Insert questions if present
  if (Array.isArray(questions) && questions.length > 0) {
    console.log(`   ⏳ Inserting ${questions.length} question(s)...`);
    const formattedQuestions = questions.map((q, qIdx) => ({
      paper_id: paperId,
      question_number: Number(q.question_number || qIdx + 1),
      question_text: String(q.question_text || q.question || '').trim(),
      model_answer: String(q.model_answer || q.answer || '').trim() || null,
      marks: q.marks ? Number(q.marks) : null,
      clo: q.clo || `Question ${qIdx + 1}`,
      options: q.options || null
    }));

    const { error: qError } = await supabase
      .from('questions')
      .insert(formattedQuestions);

    if (qError) {
      throw new Error(`Paper was created (ID: ${paperId}), but inserting questions failed: ${qError.message}`);
    }

    console.log(`   ✅ ${questions.length} questions attached successfully!`);
  } else {
    console.log(`   ℹ️  No questions array found for this paper (paper metadata uploaded only).`);
  }

  return { paperId, paperTitle, questionCount: questions.length };
}

async function run() {
  const results = [];
  for (let i = 0; i < papersList.length; i++) {
    try {
      const res = await uploadSinglePaper(papersList[i], i);
      results.push(res);
    } catch (err) {
      console.error(`\n❌ Error processing paper #${i + 1}:`, err.message);
    }
  }

  console.log('\n──────────────────────────────────────────────────');
  console.log(`🎉 Finished! Successfully uploaded ${results.length} of ${papersList.length} paper(s).`);
  console.log('──────────────────────────────────────────────────');
  results.forEach((r) => {
    console.log(`• "${r.paperTitle}" -> ID: ${r.paperId} (${r.questionCount} questions)`);
  });
  console.log('\n💡 These papers will now immediately appear in COMSATSPrepHub when students browse this subject!\n');
}

run();


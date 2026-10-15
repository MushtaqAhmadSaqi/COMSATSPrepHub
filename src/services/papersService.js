import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_SUBJECTS } from '../constants/subjects';
import { getOfflineExamQuestions } from './geminiService';

const catalogByCode = new Map(
  DEFAULT_SUBJECTS.map((subj) => [subj.code.toUpperCase(), subj])
);

/**
 * Sanitizes user/route input before interpolating into PostgREST .or() filters
 * to prevent filter syntax injection.
 */
export function sanitizeFilterValue(val) {
  return String(val || '')
    .replace(/[,()*%\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Fetches all unique subjects with paper counts from Supabase 'past_papers' table,
 * enriched with department and icon metadata from DEFAULT_SUBJECTS.
 * Falls back gracefully to DEFAULT_SUBJECTS when Supabase is unconfigured or unreachable.
 */
export async function fetchSubjectsFromSupabase() {
  if (!isSupabaseConfigured) {
    return DEFAULT_SUBJECTS;
  }

  try {
    const { data, error } = await supabase
      .from('past_papers')
      .select('subject_code, subject_name');

    if (error) {
      console.warn('Supabase past_papers fetch warning, using catalog fallback:', error.message);
      return DEFAULT_SUBJECTS;
    }

    if (!data || data.length === 0) {
      return DEFAULT_SUBJECTS;
    }

    const subjectMap = new Map();

    data.forEach((item) => {
      const code = String(item.subject_code || '').trim().toUpperCase();
      if (!code) return;

      const catalogMatch = catalogByCode.get(code);
      const name = String(item.subject_name || '').trim() || catalogMatch?.name || code;
      const department =
        String(item.department || '').trim() ||
        catalogMatch?.department ||
        inferDepartment(code, name);
      const icon = catalogMatch?.icon || getSubjectIcon(code, name);

      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code,
          name,
          papers: 1,
          department,
          icon
        });
      } else {
        const existing = subjectMap.get(code);
        existing.papers += 1;
        if (name && (!existing.name || existing.name === code)) {
          existing.name = name;
        }
      }
    });

    return Array.from(subjectMap.values());
  } catch (err) {
    console.warn('Fetch subjects network error, using catalog fallback:', err.message);
    return DEFAULT_SUBJECTS;
  }
}

function buildFallbackPapers(subjectCode, subjectName) {
  const code = String(subjectCode || 'CSC211').trim().toUpperCase();
  const name = String(subjectName || catalogByCode.get(code)?.name || 'Course').trim();
  return [
    {
      id: `fallback-${code.toLowerCase()}-terminal-2024`,
      title: `${name} — Terminal Examination (Spring 2024)`,
      term: 'Terminal',
      year: 2024,
      semester: 'Spring 2024',
      file_url: null,
      subjectCode: code,
      subjectName: name,
      totalMarks: 50,
      instructorName: 'COMSATS Faculty'
    },
    {
      id: `fallback-${code.toLowerCase()}-midterm-2024`,
      title: `${name} — Midterm Examination (Spring 2024)`,
      term: 'Midterm',
      year: 2024,
      semester: 'Spring 2024',
      file_url: null,
      subjectCode: code,
      subjectName: name,
      totalMarks: 25,
      instructorName: 'COMSATS Faculty'
    },
    {
      id: `fallback-${code.toLowerCase()}-terminal-2023`,
      title: `${name} — Terminal Examination (Fall 2023)`,
      term: 'Terminal',
      year: 2023,
      semester: 'Fall 2023',
      file_url: null,
      subjectCode: code,
      subjectName: name,
      totalMarks: 50,
      instructorName: 'COMSATS Faculty'
    }
  ];
}

/**
 * Fetches past papers for a specific subject from Supabase 'past_papers' table.
 */
export async function fetchPapersForSubjectFromSupabase(subjectCode, subjectName) {
  if (!isSupabaseConfigured) {
    return buildFallbackPapers(subjectCode, subjectName);
  }

  try {
    let query = supabase.from('past_papers').select('*');

    const code = sanitizeFilterValue(subjectCode);
    const name = sanitizeFilterValue(subjectName);

    if (code || name) {
      const normalizedCode = code.replace(/[-\s]/g, '');
      const filters = [];
      if (code) filters.push(`subject_code.ilike.%${code}%`);
      if (normalizedCode && normalizedCode !== code) {
        filters.push(`subject_code.ilike.%${normalizedCode}%`);
      }
      if (name) filters.push(`subject_name.ilike.%${name}%`);
      if (filters.length > 0) {
        query = query.or(filters.join(','));
      }
    }

    const { data, error } = await query.order('year', { ascending: false });

    if (error) {
      console.warn('Supabase fetch papers warning, using fallback papers:', error.message);
      return buildFallbackPapers(subjectCode, subjectName);
    }

    if (!data || data.length === 0) {
      return buildFallbackPapers(subjectCode, subjectName);
    }

    return data.map((item) => ({
      id: item.id,
      title: item.title || item.paper_title || buildPaperTitle(item),
      term: item.term || item.exam_type || 'Exam',
      year: item.year || new Date().getFullYear(),
      semester: item.semester || '',
      file_url: item.file_url || item.pdf_url || item.url || null,
      subjectCode: item.subject_code || subjectCode || '',
      subjectName: item.subject_name || subjectName || '',
      totalMarks: item.total_marks || null,
      instructorName: item.instructor_name || null,
      createdAt: item.created_at || null
    }));
  } catch (err) {
    console.warn('Fetch papers network error, using fallback papers:', err.message);
    return buildFallbackPapers(subjectCode, subjectName);
  }
}

/**
 * Fetches the real questions attached to a selected paper from Supabase,
 * with a fallback to curated subject exam questions when offline or for sample papers.
 */
export async function fetchQuestionsForPaperFromSupabase(paperId, paperMeta = {}) {
  const isFallbackPaper = String(paperId || '').startsWith('fallback-');

  if (!isSupabaseConfigured || isFallbackPaper || paperId === undefined || paperId === null || paperId === '') {
    return getOfflineExamQuestions(
      paperMeta.subjectName,
      paperMeta.subjectCode,
      paperMeta.title,
      paperMeta.term,
      paperMeta.year
    );
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('paper_id', paperId)
      .order('question_number', { ascending: true });

    if (error) {
      console.warn('Fetch paper questions warning, using fallback questions:', error.message);
      return getOfflineExamQuestions(
        paperMeta.subjectName,
        paperMeta.subjectCode,
        paperMeta.title,
        paperMeta.term,
        paperMeta.year
      );
    }

    const rows = (data || [])
      .filter((item) => item.question_text || item.model_answer)
      .map((item, idx) => ({
        id: item.id || `${paperId}-${idx + 1}`,
        number: item.question_number ? `Question ${item.question_number}` : `Question ${idx + 1}`,
        section: item.clo || 'Past paper question',
        marks: item.marks ? `${item.marks} Marks` : 'Marks not specified',
        questionText: String(item.question_text || '').trim(),
        answerText: String(item.model_answer || 'No model answer is available for this question yet.').trim(),
        subParts: item.sub_parts || null,
        options: item.options || null,
        graph: item.graph || null,
        answerGraph: item.answer_graph || null,
        source: 'supabase'
      }));

    if (rows.length > 0) return rows;

    return getOfflineExamQuestions(
      paperMeta.subjectName,
      paperMeta.subjectCode,
      paperMeta.title,
      paperMeta.term,
      paperMeta.year
    );
  } catch (err) {
    console.warn('Fetch paper questions error, using fallback questions:', err.message);
    return getOfflineExamQuestions(
      paperMeta.subjectName,
      paperMeta.subjectCode,
      paperMeta.title,
      paperMeta.term,
      paperMeta.year
    );
  }
}

function buildPaperTitle(item) {
  const term = item.exam_type || item.term || 'Exam';
  const semester = item.semester ? `${item.semester} ` : '';
  const year = item.year || 'COMSATS';
  return `${term} - ${semester}${year}`;
}

function inferDepartment(code, name) {
  const upper = String(code || '').toUpperCase();
  if (upper.startsWith('SWE')) return 'Software Eng';
  if (upper.startsWith('MTH')) return 'Math';
  if (upper.startsWith('EEE')) return 'Electrical';
  if (upper.startsWith('PHY')) return 'Physics & Sciences';
  if (upper.startsWith('HUM') || upper.startsWith('MGT')) return 'Humanities & Management';
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('math') || text.includes('calculus') || text.includes('algebra')) return 'Math';
  if (text.includes('software')) return 'Software Eng';
  if (text.includes('physics')) return 'Physics & Sciences';
  if (text.includes('english') || text.includes('management')) return 'Humanities & Management';
  return 'CS & IT';
}

function getSubjectIcon(code, name) {
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('math') || text.includes('calculus') || text.includes('linear') || text.includes('differential') || text.includes('numerical')) return 'functions';
  if (text.includes('code') || text.includes('program') || text.includes('java') || text.includes('python')) return 'code';
  if (text.includes('data') || text.includes('algo')) return 'account_tree';
  if (text.includes('db') || text.includes('database')) return 'storage';
  if (text.includes('network') || text.includes('lan')) return 'lan';
  if (text.includes('ai') || text.includes('intelligence') || text.includes('machine learning')) return 'smart_toy';
  if (text.includes('electric') || text.includes('circuit') || text.includes('dld') || text.includes('logic')) return 'developer_board';
  if (text.includes('operating') || text.includes('os') || text.includes('architecture')) return 'memory';
  if (text.includes('software') || text.includes('swe') || text.includes('requirement') || text.includes('quality')) return 'terminal';
  if (text.includes('security') || text.includes('cyber')) return 'security';
  if (text.includes('mobile') || text.includes('app')) return 'smartphone';
  if (text.includes('web') || text.includes('html')) return 'language';
  if (text.includes('physics') || text.includes('applied')) return 'science';
  if (text.includes('english') || text.includes('composition') || text.includes('humanities')) return 'menu_book';
  if (text.includes('management') || text.includes('business')) return 'business_center';
  return 'computer';
}

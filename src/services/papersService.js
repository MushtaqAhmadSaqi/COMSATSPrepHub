import { supabase } from './supabase';

/**
 * Fetches all unique subjects with paper counts from Supabase 'past_papers' table.
 */
export async function fetchSubjectsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('past_papers')
      .select('subject_code, subject_name, department, term, year');

    if (error || !data || data.length === 0) {
      console.warn('Supabase past_papers query notice:', error?.message || 'No rows returned');
      return null; // Signals to caller to use default catalog fallback
    }

    // Group papers by subject_code
    const subjectMap = new Map();
    data.forEach(item => {
      const code = String(item.subject_code || '').trim().toUpperCase();
      const name = String(item.subject_name || '').trim();
      const department = String(item.department || '').trim() || 'CS & IT';

      if (!code) return;

      if (!subjectMap.has(code)) {
        subjectMap.set(code, {
          code,
          name: name || code,
          papers: 1,
          department,
          icon: getSubjectIcon(code, name)
        });
      } else {
        const existing = subjectMap.get(code);
        existing.papers += 1;
      }
    });

    return Array.from(subjectMap.values());
  } catch (err) {
    console.error('Fetch subjects error:', err);
    return null;
  }
}

/**
 * Fetches past papers for a specific subject from Supabase 'past_papers' table.
 */
export async function fetchPapersForSubjectFromSupabase(subjectCode, subjectName) {
  try {
    const query = supabase.from('past_papers').select('*');

    if (subjectCode) {
      query = query.ilike('subject_code', `%${subjectCode}%`);
    } else if (subjectName) {
      query = query.ilike('subject_name', `%${subjectName}%`);
    }

    const { data, error } = await query.order('year', { ascending: false });

    if (error) {
      console.warn('Supabase fetch papers error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(item => ({
      id: item.id || Math.random(),
      title: item.title || item.paper_title || `${item.term || 'Exam'} Paper — ${item.year || 'COMSATS'}`,
      term: item.term || 'Exam',
      year: item.year || new Date().getFullYear(),
      file_url: item.file_url || item.pdf_url || item.url || null
    }));
  } catch (err) {
    console.error('Fetch papers error:', err);
    return null;
  }
}

function getSubjectIcon(code, name) {
  const text = `${code} ${name}`.toLowerCase();
  if (text.includes('math') || text.includes('calculus') || text.includes('linear')) return 'functions';
  if (text.includes('code') || text.includes('program') || text.includes('java') || text.includes('python')) return 'code';
  if (text.includes('data') || text.includes('algo')) return 'account_tree';
  if (text.includes('db') || text.includes('database')) return 'storage';
  if (text.includes('network') || text.includes('lan')) return 'lan';
  if (text.includes('ai') || text.includes('intelligence')) return 'smart_toy';
  if (text.includes('electric') || text.includes('circuit')) return 'developer_board';
  return 'computer';
}

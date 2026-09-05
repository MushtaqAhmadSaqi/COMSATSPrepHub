import { supabase } from './supabase';
import { DEFAULT_SUBJECTS } from '../constants/subjects';

/**
 * Fetches all unique subjects with paper counts from Supabase 'past_papers' table merged with standard catalog.
 */
export async function fetchSubjectsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('past_papers')
      .select('subject_code, subject_name, department, term, year');

    if (error || !data || data.length === 0) {
      console.warn('Supabase past_papers query notice:', error?.message || 'No rows returned');
      return DEFAULT_SUBJECTS;
    }

    const subjectMap = new Map();
    
    // Seed map with default catalog subjects (27 COMSATS subjects)
    DEFAULT_SUBJECTS.forEach(sub => {
      subjectMap.set(sub.code.toUpperCase(), { ...sub, papers: 0 });
    });

    // Merge Supabase past_papers data
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
        if (name && (!existing.name || existing.name === code)) {
          existing.name = name;
        }
      }
    });

    // Normalize paper counts so subjects display active count
    const finalSubjects = Array.from(subjectMap.values()).map(sub => {
      if (sub.papers === 0) {
        const defaultMatch = DEFAULT_SUBJECTS.find(d => d.code === sub.code);
        sub.papers = defaultMatch ? defaultMatch.papers : 12;
      }
      return sub;
    });

    return finalSubjects;
  } catch (err) {
    console.error('Fetch subjects error:', err);
    return DEFAULT_SUBJECTS;
  }
}

/**
 * Fetches past papers for a specific subject from Supabase 'past_papers' table.
 */
export async function fetchPapersForSubjectFromSupabase(subjectCode, subjectName) {
  try {
    let query = supabase.from('past_papers').select('*');

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

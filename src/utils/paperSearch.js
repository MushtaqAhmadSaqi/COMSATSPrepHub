import { DEFAULT_SUBJECTS } from '../constants/subjects.js';

const departmentByCode = new Map(
  DEFAULT_SUBJECTS.map((subj) => [subj.code.toUpperCase(), subj.department])
);

/**
 * Course-code matching ignores case, spaces, hyphens and underscores so
 * "csc 103", "CSC-103" and "csc103" all resolve to the same code.
 */
export function normalizeCourseCode(value) {
  return String(value || '').toLowerCase().replace(/[\s\-_]/g, '');
}

export function paperMatchesQuery(paper, query) {
  const raw = String(query || '').trim().toLowerCase();
  if (!raw) return true;
  const normalized = normalizeCourseCode(raw);
  const code = normalizeCourseCode(paper.subjectCode);
  if (normalized && code && (code.includes(normalized) || normalized.includes(code))) return true;
  const haystack = [paper.title, paper.subjectName, paper.term, paper.semester, paper.instructorName]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
  return haystack.includes(raw);
}

export function getPaperDepartment(paper) {
  return (
    paper.department ||
    departmentByCode.get(String(paper.subjectCode || '').toUpperCase()) ||
    'Other'
  );
}

export function getPaperFacets(papers) {
  const examTypes = Array.from(
    new Set(papers.map((p) => String(p.term || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const years = Array.from(
    new Set(papers.map((p) => String(p.year || '')).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const semesters = ['Spring', 'Fall', 'Summer'].filter((season) =>
    papers.some((p) => String(p.semester || '').toLowerCase().includes(season.toLowerCase()))
  );

  const departments = Array.from(
    new Set(papers.map((p) => getPaperDepartment(p)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return { examTypes, years, semesters, departments };
}

export function filterPapers(papers, { query = '', examType = 'All', semester = 'All', year = 'All', department = 'All' } = {}) {
  return papers.filter((paper) => {
    if (!paperMatchesQuery(paper, query)) return false;
    if (examType !== 'All' && String(paper.term || '').toLowerCase() !== examType.toLowerCase()) return false;
    if (semester !== 'All' && !String(paper.semester || '').toLowerCase().includes(semester.toLowerCase())) return false;
    if (year !== 'All' && String(paper.year || '') !== year) return false;
    if (department !== 'All' && getPaperDepartment(paper) !== department) return false;
    return true;
  });
}
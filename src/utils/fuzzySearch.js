import { DEFAULT_SUBJECTS } from '../constants/subjects.js';

/**
 * Scoring logic for fuzzy search in Command Palette.
 *
 * @param {string} query
 * @param {string} text
 * @returns {number} score 0..100
 */
function calculateScore(query, text) {
  if (!query || !text) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (!q) return 0;

  if (t === q || t.includes(q)) {
    if (t.startsWith(q) || t.includes(' ' + q)) return 80;
    return 100;
  }

  const words = t.split(/[\s\-_\/()]+/);
  if (words.some((w) => w.startsWith(q))) return 80;

  if (t.includes(q)) return 60;

  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) qIdx++;
  }
  if (qIdx === q.length) return 40;

  return 0;
}

/**
 * Returns filtered and sorted command palette items.
 */
export function getCommandPaletteResults(query = '', { isLoggedIn = false } = {}) {
  const allItems = [
    // Pages Group
    { id: 'page_home', group: 'Pages', label: 'Home', icon: 'home', path: 'home' },
    { id: 'page_subjects', group: 'Pages', label: 'Subjects & Past Papers', icon: 'menu_book', path: 'subjects' },
    { id: 'page_quiz', group: 'Pages', label: 'Practice Quiz', icon: 'quiz', path: 'quiz' },
    { id: 'page_ai_quiz', group: 'Pages', label: 'AI Quiz Generator', icon: 'auto_awesome', path: 'ai-quiz-generator' },
    { id: 'page_gpa', group: 'Pages', label: 'GPA Calculator', icon: 'calculate', path: 'gpa' },
    { id: 'page_upload', group: 'Pages', label: 'Upload Past Paper', icon: 'upload_file', path: 'upload' },
    { id: 'page_dashboard', group: 'Pages', label: 'Student Dashboard', icon: 'dashboard', path: 'dashboard' },
    { id: 'page_about', group: 'Pages', label: 'Our Team', icon: 'groups', path: 'about' },

    // Subjects Group (includes full subject object for direct deep-linking to subject-papers)
    ...DEFAULT_SUBJECTS.map((subj) => ({
      id: `subj_${subj.code}`,
      group: 'Subjects',
      label: `${subj.code} — ${subj.name}`,
      icon: subj.icon || 'menu_book',
      path: 'subject-papers',
      subjectCode: subj.code,
      subject: subj
    })),

    // Actions Group
    { id: 'action_dark_mode', group: 'Actions', label: 'Toggle dark mode', icon: 'dark_mode', actionId: 'toggle_dark_mode' },
    ...(isLoggedIn
      ? [{ id: 'action_sign_out', group: 'Actions', label: 'Sign out', icon: 'logout', actionId: 'sign_out' }]
      : [{ id: 'action_sign_in', group: 'Actions', label: 'Sign in', icon: 'login', actionId: 'open_auth' }]
    )
  ];

  const trimmed = query.trim();

  if (!trimmed) {
    return allItems.filter((item) => item.group === 'Pages' || item.group === 'Actions');
  }

  const scored = allItems
    .map((item) => {
      const labelScore = calculateScore(trimmed, item.label);
      const codeScore = item.subjectCode ? calculateScore(trimmed, item.subjectCode) : 0;
      const finalScore = Math.max(labelScore, codeScore);
      return { ...item, score: finalScore };
    })
    .filter((item) => item.score > 0);

  const groups = ['Pages', 'Subjects', 'Actions'];
  let results = [];

  for (const groupName of groups) {
    const groupItems = scored
      .filter((item) => item.group === groupName)
      .sort((a, b) => b.score - a.score);
    results = results.concat(groupItems);
  }

  return results.slice(0, 12);
}

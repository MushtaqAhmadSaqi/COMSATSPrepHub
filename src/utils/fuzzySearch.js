import { DEFAULT_SUBJECTS } from '../constants/subjects';

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

  // Exact match or exact substring
  if (t === q || t.includes(q)) {
    if (t.startsWith(q) || t.includes(' ' + q)) return 80;
    return 100;
  }

  // Match at start of any word
  const words = t.split(/[\s\-_\/()]+/);
  if (words.some((w) => w.startsWith(q))) return 80;

  // Substring anywhere
  if (t.includes(q)) return 60;

  // Sequential character fuzzy match
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) qIdx++;
  }
  if (qIdx === q.length) return 40;

  return 0;
}

/**
 * Returns filtered and sorted command palette items.
 *
 * @param {string} query
 * @param {object} options
 * @param {boolean} [options.isLoggedIn=false]
 * @returns {Array<{id: string, group: string, label: string, icon: string, path?: string, actionId?: string, score: number}>}
 */
export function getCommandPaletteResults(query = '', { isLoggedIn = false } = {}) {
  const allItems = [
    // Pages Group
    { id: 'page_home', group: 'Pages', label: 'Home', icon: 'home', path: 'home' },
    { id: 'page_subjects', group: 'Pages', label: 'Subjects', icon: 'menu_book', path: 'subjects' },
    { id: 'page_papers_hint', group: 'Pages', label: 'Past Papers', icon: 'picture_as_pdf', path: 'subjects' },
    { id: 'page_quiz', group: 'Pages', label: 'Practice Quiz', icon: 'quiz', path: 'quiz' },
    { id: 'page_ai_quiz', group: 'Pages', label: 'AI Quiz Generator', icon: 'auto_awesome', path: 'ai-quiz-generator' },
    { id: 'page_gpa', group: 'Pages', label: 'GPA Calculator', icon: 'calculate', path: 'gpa' },
    ...(isLoggedIn ? [{ id: 'page_dashboard', group: 'Pages', label: 'Dashboard', icon: 'dashboard', path: 'dashboard' }] : []),

    // Subjects Group
    ...DEFAULT_SUBJECTS.map((subj) => ({
      id: `subj_${subj.code}`,
      group: 'Subjects',
      label: `${subj.code} — ${subj.name}`,
      icon: subj.icon || 'menu_book',
      path: 'subjects',
      subjectCode: subj.code
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
    // Empty query: show Pages + Actions only (no subjects)
    return allItems.filter((item) => item.group === 'Pages' || item.group === 'Actions');
  }

  // Filter and score items
  const scored = allItems
    .map((item) => {
      const labelScore = calculateScore(trimmed, item.label);
      const codeScore = item.subjectCode ? calculateScore(trimmed, item.subjectCode) : 0;
      const finalScore = Math.max(labelScore, codeScore);
      return { ...item, score: finalScore };
    })
    .filter((item) => item.score > 0);

  // Group items by group name to preserve group order (Pages, Subjects, Actions)
  const groups = ['Pages', 'Subjects', 'Actions'];
  let results = [];

  for (const groupName of groups) {
    const groupItems = scored
      .filter((item) => item.group === groupName)
      .sort((a, b) => b.score - a.score);
    results = results.concat(groupItems);
  }

  // Cap at 12 items total
  return results.slice(0, 12);
}

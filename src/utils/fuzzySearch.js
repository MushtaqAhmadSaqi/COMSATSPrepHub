import { DEFAULT_SUBJECTS } from '../constants/subjects.js';

/**
 * Scoring logic for fuzzy search in Command Palette & Global Search.
 *
 * @param {string} query
 * @param {string} text
 * @returns {number} score 0..100
 */
export function calculateScore(query, text) {
  if (!query || !text) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (!q) return 0;

  if (t === q || t.includes(q)) {
    if (t.startsWith(q) || t.includes(' ' + q)) return 100;
    return 85;
  }

  const words = t.split(/[\s\-_\/()]+/);
  if (words.some((w) => w.startsWith(q))) return 80;

  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) qIdx++;
  }
  if (qIdx === q.length) return 40;

  return 0;
}

/**
 * Returns filtered and sorted command palette items across Pages, Subjects, Papers, and Actions.
 */
export function getCommandPaletteResults(query = '', { isLoggedIn = false } = {}) {
  const allItems = [
    // Pages Group
    { id: 'page_home', group: 'Pages', label: 'Home', icon: 'home', path: 'home' },
    { id: 'page_subjects', group: 'Pages', label: 'Subjects & Past Papers', icon: 'menu_book', path: 'subjects' },
    { id: 'page_quiz', group: 'Pages', label: 'Practice Quiz', icon: 'quiz', path: 'quiz' },
    { id: 'page_ai_quiz', group: 'Pages', label: 'AI Quiz Generator', icon: 'auto_awesome', path: 'ai-quiz-generator' },
    { id: 'page_study_hub', group: 'Pages', label: 'Study Hub — Daily Challenge, Flashcards & AI Helper', icon: 'psychology', path: 'study-hub' },
    { id: 'page_gpa', group: 'Pages', label: 'GPA & CGPA Calculator', icon: 'calculate', path: 'gpa' },
    { id: 'page_upload', group: 'Pages', label: 'Upload or Request Past Paper', icon: 'upload_file', path: 'upload' },
    { id: 'page_dashboard', group: 'Pages', label: 'Student Dashboard', icon: 'dashboard', path: 'dashboard' },
    { id: 'page_account', group: 'Pages', label: 'Account & Profile Settings', icon: 'manage_accounts', path: 'account' },
    { id: 'page_faq', group: 'Pages', label: 'FAQ, Contact & Feedback', icon: 'help', path: 'faq' },
    { id: 'page_about', group: 'Pages', label: 'About & Our Team', icon: 'groups', path: 'about' },
    { id: 'page_terms', group: 'Pages', label: 'Terms, Privacy Policy & Disclaimer', icon: 'gavel', path: 'terms' },

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

    // Past Papers Quick-Access Group
    ...DEFAULT_SUBJECTS.slice(0, 12).map((subj) => ({
      id: `paper_${subj.code}_term`,
      group: 'Papers',
      label: `${subj.code} Terminal & Midterm Past Papers (${subj.name})`,
      icon: 'description',
      path: 'subject-papers',
      subjectCode: subj.code,
      subject: subj
    })),

    // Actions Group
    { id: 'action_daily', group: 'Actions', label: 'Start Today’s 5-Question Daily Challenge', icon: 'local_fire_department', path: 'study-hub' },
    { id: 'action_flashcards', group: 'Actions', label: 'Review Spaced-Repetition Flashcards', icon: 'style', path: 'study-hub' },
    { id: 'action_dark_mode', group: 'Actions', label: 'Toggle dark / light mode', icon: 'dark_mode', actionId: 'toggle_dark_mode' },
    { id: 'action_lang_toggle', group: 'Actions', label: 'Toggle English / Urdu (اردو) study helper', icon: 'translate', actionId: 'toggle_language' },
    ...(isLoggedIn
      ? [
          { id: 'action_profile', group: 'Actions', label: 'Profile & Account Settings', icon: 'settings', path: 'account' },
          { id: 'action_sign_out', group: 'Actions', label: 'Sign out', icon: 'logout', actionId: 'sign_out' }
        ]
      : [{ id: 'action_sign_in', group: 'Actions', label: 'Sign in or Create Account', icon: 'login', actionId: 'open_auth' }]
    )
  ];

  const trimmed = query.trim();

  if (!trimmed) {
    return allItems.filter((item) => item.group === 'Pages' || item.group === 'Actions').slice(0, 12);
  }

  const scored = allItems
    .map((item) => {
      const labelScore = calculateScore(trimmed, item.label);
      const codeScore = item.subjectCode ? calculateScore(trimmed, item.subjectCode) : 0;
      const finalScore = Math.max(labelScore, codeScore);
      return { ...item, score: finalScore };
    })
    .filter((item) => item.score > 0);

  const groups = ['Subjects', 'Papers', 'Pages', 'Actions'];
  let results = [];

  for (const groupName of groups) {
    const groupItems = scored
      .filter((item) => item.group === groupName)
      .sort((a, b) => b.score - a.score);
    results = results.concat(groupItems);
  }

  return results.slice(0, 14);
}

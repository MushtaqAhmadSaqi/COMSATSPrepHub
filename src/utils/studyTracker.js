const STORAGE_KEY = 'pph_study_history';
const BOOKMARKS_KEY = 'pph_bookmarks';
const NOTES_KEY = 'pph_paper_notes';
const FLASHCARDS_KEY = 'pph_flashcards_srs';
const DAILY_KEY = 'pph_daily_challenge';
const EXAMS_KEY = 'pph_exam_countdowns';
constPREFS_KEY = 'pph_student_prefs';
const SUBMISSIONS_KEY = 'pph_moderation_queue';
const GPA_HISTORY_KEY = 'pph_gpa_semesters';

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readHistory() {
  const value = safeReadJson(STORAGE_KEY, []);
  return Array.isArray(value) ? value : [];
}

function writeHistory(history) {
  safeWriteJson(STORAGE_KEY, history.slice(0, 120));
}

function addActivity(activity) {
  writeHistory([
    {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    },
    ...readHistory()
  ]);
}

export function recordQuizAttempt({
  subject,
  subjectCode = '',
  score,
  totalQuestions,
  difficulty,
  wrongTopics = []
}) {
  addActivity({
    type: 'quiz',
    title: subject || 'Practice Quiz',
    subjectCode,
    description: `${score}/${totalQuestions} correct`,
    score: Number(score) || 0,
    totalQuestions: Number(totalQuestions) || 1,
    difficulty: difficulty || 'Medium',
    wrongTopics: Array.isArray(wrongTopics) ? wrongTopics.slice(0, 10) : [],
    icon: 'quiz'
  });
}

export function recordPaperView(paper) {
  if (!paper) return;
  const existing = readHistory().filter(
    (item) => !(item.type === 'paper' && item.paperId && item.paperId === paper.id)
  );
  writeHistory([
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type: 'paper',
      paperId: paper.id || paper.title,
      title: paper.title || 'Past paper',
      subjectCode: paper.subjectCode || '',
      subjectName: paper.subjectName || '',
      term: paper.term || 'Exam',
      year: paper.year || '',
      description: `${paper.subjectCode ? `${paper.subjectCode} · ` : ''}Past paper`,
      icon: 'description'
    },
    ...existing
  ]);
}

export function getRecentlyViewedPapers(limit = 4) {
  return readHistory()
    .filter((item) => item.type === 'paper')
    .slice(0, limit);
}

export function getQuizHistory(limit = 10) {
  return readHistory()
    .filter((item) => item.type === 'quiz')
    .slice(0, limit)
    .map((item) => ({
      ...item,
      accuracy: item.totalQuestions
        ? Math.round((item.score / item.totalQuestions) * 100)
        : 0,
      dateLabel: new Date(item.timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      })
    }));
}

export function getWeakTopicsSummary() {
  const quizzes = readHistory().filter((item) => item.type === 'quiz');
  const bySubject = new Map();

  for (const q of quizzes) {
    const key = q.title || 'General';
    const pct = q.totalQuestions ? Math.round((q.score / q.totalQuestions) * 100) : 0;
    const prev = bySubject.get(key) || {
      subject: key,
      subjectCode: q.subjectCode || '',
      attempts: 0,
      totalPct: 0,
      missedConcepts: new Set()
    };
    prev.attempts += 1;
    prev.totalPct += pct;
    if (Array.isArray(q.wrongTopics)) {
      q.wrongTopics.forEach((t) => prev.missedConcepts.add(t));
    }
    bySubject.set(key, prev);
  }

  return Array.from(bySubject.values())
    .map((item) => ({
      subject: item.subject,
      subjectCode: item.subjectCode,
      attempts: item.attempts,
      averageAccuracy: Math.round(item.totalPct / item.attempts),
      missedConcepts: Array.from(item.missedConcepts).slice(0, 3)
    }))
    .filter((item) => item.averageAccuracy < 75)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy);
}

export function getStudyStreak() {
  const history = readHistory();
  if (history.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(
      history.map((item) => {
        const d = new Date(item.timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
      })
    )
  ).sort().reverse();

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < uniqueDays.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (uniqueDays.includes(key)) {
      streak++;
    } else if (i === 0) {
      // Allow streak to persist if studied yesterday
      continue;
    } else {
      break;
    }
  }
  return Math.max(streak, uniqueDays.length > 0 ? 1 : 0);
}

export function getStudyStats() {
  const history = readHistory();
  const quizzes = history.filter((item) => item.type === 'quiz');
  const papers = history.filter((item) => item.type === 'paper');
  const bookmarks = getBookmarkedPapers();

  const accuracyTotal = quizzes.reduce((sum, item) => {
    return sum + (item.totalQuestions ? (item.score / item.totalQuestions) * 100 : 0);
  }, 0);

  const streakDays = getStudyStreak();
  const xp = quizzes.length * 50 + papers.length * 20 + bookmarks.length * 10 + streakDays * 30;
  const level = Math.floor(xp / 200) + 1;
  const levelTitles = [
    'Semester Starter',
    'Focused Scholar',
    'Problem Solver',
    'Exam Strategist',
    'Dean’s List Contender',
    'COMSATS Master'
  ];
  const levelTitle = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

  const badges = [];
  if (quizzes.length >= 1) badges.push({ id: 'first-quiz', label: 'First Quiz Completed', icon: 'military_tech' });
  if (quizzes.some((q) => q.totalQuestions && q.score / q.totalQuestions >= 0.8)) {
    badges.push({ id: 'high-scorer', label: '80%+ Accuracy Club', icon: 'workspace_premium' });
  }
  if (papers.length >= 3) badges.push({ id: 'paper-explorer', label: 'Paper Researcher', icon: 'library_books' });
  if (streakDays >= 3) badges.push({ id: 'streak-3', label: `${streakDays}-Day Study Streak`, icon: 'local_fire_department' });

  return {
    quizzesAttempted: quizzes.length,
    averageAccuracy: quizzes.length ? Math.round(accuracyTotal / quizzes.length) : 0,
    savedPapers: papers.length,
    bookmarkedCount: bookmarks.length,
    streakDays,
    xp,
    level,
    levelTitle,
    badges
  };
}

export function getRecentActivity(limit = 6) {
  return readHistory()
    .slice(0, limit)
    .map((item) => ({
      ...item,
      time: new Date(item.timestamp).toLocaleDateString()
    }));
}

/* ── Bookmarks & Paper Notes ── */
export function getBookmarkedPapers() {
  const list = safeReadJson(BOOKMARKS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function isPaperBookmarked(paperId) {
  if (!paperId) return false;
  return getBookmarkedPapers().some((item) => item.id === paperId);
}

export function togglePaperBookmark(paper) {
  if (!paper || !paper.id) return { bookmarked: false, list: getBookmarkedPapers() };
  const current = getBookmarkedPapers();
  const exists = current.some((item) => item.id === paper.id);
  const next = exists
    ? current.filter((item) => item.id !== paper.id)
    : [
        {
          id: paper.id,
          title: paper.title || 'Past Paper',
          subjectCode: paper.subjectCode || '',
          subjectName: paper.subjectName || '',
          term: paper.term || 'Exam',
          year: paper.year || '',
          semester: paper.semester || '',
          savedAt: Date.now()
        },
        ...current
      ];
  safeWriteJson(BOOKMARKS_KEY, next);
  return { bookmarked: !exists, list: next };
}

export function getPaperNote(paperId) {
  if (!paperId) return '';
  const map = safeReadJson(NOTES_KEY, {});
  return typeof map[paperId] === 'string' ? map[paperId] : '';
}

export function savePaperNote(paperId, noteText) {
  if (!paperId) return false;
  const map = safeReadJson(NOTES_KEY, {});
  map[paperId] = String(noteText || '').slice(0, 2000);
  return safeWriteJson(NOTES_KEY, map);
}

/* ── Daily Challenge (5 Qs / day) ── */
export function getDailyChallengeStatus() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const state = safeReadJson(DAILY_KEY, {});
  return {
    todayKey,
    completedToday: state.lastCompletedDate === todayKey,
    todayScore: state.lastCompletedDate === todayKey ? state.lastScore : null,
    dailyStreak: Number(state.dailyStreak) || 0
  };
}

export function recordDailyChallengeCompletion(score, total = 5) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const state = safeReadJson(DAILY_KEY, {});
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let nextStreak = 1;
  if (state.lastCompletedDate === todayKey) {
    nextStreak = Number(state.dailyStreak) || 1;
  } else if (state.lastCompletedDate === yesterday) {
    nextStreak = (Number(state.dailyStreak) || 0) + 1;
  }

  const updated = {
    lastCompletedDate: todayKey,
    lastScore: `${score}/${total}`,
    dailyStreak: nextStreak
  };
  safeWriteJson(DAILY_KEY, updated);
  recordQuizAttempt({
    subject: 'Daily 5-Question Challenge',
    subjectCode: 'DAILY',
    score,
    totalQuestions: total,
    difficulty: 'Medium'
  });
  return updated;
}

/* ── Spaced Repetition Flashcards ── */
export const DEFAULT_FLASHCARDS = [
  { id: 'fc-1', subjectCode: 'CSC211', front: 'What is the time complexity of searching in a balanced AVL Tree?', back: 'O(log n) in both average and worst cases because height is strictly balanced within ±1.' },
  { id: 'fc-2', subjectCode: 'CSC211', front: 'When does a Deadlock occur in Operating Systems (Coffman conditions)?', back: '1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait.' },
  { id: 'fc-3', subjectCode: 'CSC241', front: 'Difference between Compile-Time and Run-Time Polymorphism in C++?', back: 'Compile-time uses function/operator overloading; Run-time uses virtual functions and vtable dynamic dispatch.' },
  { id: 'fc-4', subjectCode: 'CSC371', front: 'What is Third Normal Form (3NF) in Database Systems?', back: 'A relation is in 3NF if it is in 2NF and has no transitive dependencies (non-key attributes depend only on the primary key).' },
  { id: 'fc-5', subjectCode: 'MTH104', front: 'State the Fundamental Theorem of Calculus (Part 2).', back: 'If F is an antiderivative of continuous function f on [a, b], then ∫[a to b] f(x) dx = F(b) - F(a).' },
  { id: 'fc-6', subjectCode: 'CSC311', front: 'Which OSI layer handles end-to-end TCP reliability and flow control?', back: 'Layer 4 — The Transport Layer (TCP/UDP).' }
];

export function getFlashcardsQueue() {
  const saved = safeReadJson(FLASHCARDS_KEY, null);
  if (Array.isArray(saved) && saved.length > 0) return saved;
  return DEFAULT_FLASHCARDS.map((card) => ({
    ...card,
    box: 1,
    nextReview: Date.now()
  }));
}

export function reviewFlashcard(cardId, rating = 'good') {
  const list = getFlashcardsQueue();
  const intervalsMs = {
    again: 60 * 1000,
    good: 24 * 3600 * 1000,
    easy: 3 * 24 * 3600 * 1000
  };
  const updated = list.map((card) => {
    if (card.id !== cardId) return card;
    const nextBox = rating === 'again' ? 1 : Math.min(5, (card.box || 1) + 1);
    return {
      ...card,
      box: nextBox,
      lastRating: rating,
      nextReview: Date.now() + (intervalsMs[rating] || intervalsMs.good)
    };
  });
  safeWriteJson(FLASHCARDS_KEY, updated);
  return updated;
}

export function addCustomFlashcard({ subjectCode, front, back }) {
  const list = getFlashcardsQueue();
  const newCard = {
    id: `fc-custom-${Date.now()}`,
    subjectCode: String(subjectCode || 'GENERAL').toUpperCase().slice(0, 12),
    front: String(front || '').trim().slice(0, 300),
    back: String(back || '').trim().slice(0, 600),
    box: 1,
    nextReview: Date.now()
  };
  const updated = [newCard, ...list];
  safeWriteJson(FLASHCARDS_KEY, updated);
  return updated;
}

/* ── Student Preferences (Campus, Department, Language, Leaderboard Opt-in) ── */
export function getStudentPrefs() {
  const defaults = {
    campus: 'Islamabad',
    department: 'CS & IT',
    semester: '4',
    lang: 'en',
    leaderboardOptIn: false
  };
  return { ...defaults, ...safeReadJson(PREFS_KEY, {}) };
}

export function saveStudentPrefs(partial) {
  const next = { ...getStudentPrefs(), ...partial };
  safeWriteJson(PREFS_KEY, next);
  return next;
}

/* ── Exam Countdowns ── */
export function getExamCountdowns() {
  const list = safeReadJson(EXAMS_KEY, [
    { id: 'exam-default-1', course: 'CSC211 — Data Structures', examType: 'Midterm', date: '2026-11-15' },
    { id: 'exam-default-2', course: 'CSC371 — Database Systems', examType: 'Terminal', date: '2026-12-20' }
  ]);
  return Array.isArray(list) ? list : [];
}

export function saveExamCountdowns(list) {
  safeWriteJson(EXAMS_KEY, list.slice(0, 15));
  return list;
}

/* ── Semester GPA History ── */
export function getSemesterGpaHistory() {
  const list = safeReadJson(GPA_HISTORY_KEY, [
    { id: 'sem-1', label: 'Sem 1', sgpa: 3.18, credits: 16 },
    { id: 'sem-2', label: 'Sem 2', sgpa: 3.42, credits: 17 },
    { id: 'sem-3', label: 'Sem 3', sgpa: 3.55, credits: 18 }
  ]);
  return Array.isArray(list) ? list : [];
}

export function saveSemesterGpaEntry({ label, sgpa, credits }) {
  const current = getSemesterGpaHistory();
  const next = [
    ...current,
    {
      id: `sem-${Date.now()}`,
      label: String(label || `Sem ${current.length + 1}`).slice(0, 20),
      sgpa: Number(Number(sgpa).toFixed(2)),
      credits: Number(credits) || 15
    }
  ].slice(-8);
  safeWriteJson(GPA_HISTORY_KEY, next);
  return next;
}

/* ── Moderation Queue (Uploads, Paper Requests, Issue Reports) ── */
export function getModerationSubmissions() {
  const list = safeReadJson(SUBMISSIONS_KEY, [
    {
      id: 'mod-sample-1',
      type: 'upload',
      subjectCode: 'CSC211',
      title: 'Data Structures — Midterm Fall 2025',
      contributor: 'Moeed Ali',
      status: 'pending',
      createdAt: '2026-10-25'
    },
    {
      id: 'mod-sample-2',
      type: 'request',
      subjectCode: 'CSC322',
      title: 'Request: Operating Systems Terminal 2024 Solutions',
      contributor: 'Student Request',
      status: 'pending',
      createdAt: '2026-10-26'
    }
  ]);
  return Array.isArray(list) ? list : [];
}

export function addModerationSubmission(entry) {
  const current = getModerationSubmissions();
  const item = {
    id: `mod-${Date.now()}`,
    type: entry.type || 'upload',
    subjectCode: String(entry.subjectCode || 'CSC101').toUpperCase().slice(0, 20),
    title: String(entry.title || 'Submission').slice(0, 140),
    contributor: String(entry.contributor || 'Anonymous Student').slice(0, 60),
    details: String(entry.details || '').slice(0, 500),
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 10)
  };
  const next = [item, ...current].slice(0, 50);
  safeWriteJson(SUBMISSIONS_KEY, next);
  return item;
}

export function updateModerationSubmissionStatus(id, status) {
  const next = getModerationSubmissions().map((item) =>
    item.id === id ? { ...item, status } : item
  );
  safeWriteJson(SUBMISSIONS_KEY, next);
  return next;
}

/* ── Privacy: Export & Clear All User Data ── */
export function exportAllStudentData() {
  return {
    exportedAt: new Date().toISOString(),
    preferences: getStudentPrefs(),
    stats: getStudyStats(),
    bookmarks: getBookmarkedPapers(),
    notes: safeReadJson(NOTES_KEY, {}),
    history: readHistory(),
    gpaHistory: getSemesterGpaHistory(),
    exams: getExamCountdowns()
  };
}

export function clearAllStudentData() {
  const keys = [
    STORAGE_KEY,
    BOOKMARKS_KEY,
    NOTES_KEY,
    FLASHCARDS_KEY,
    DAILY_KEY,
    EXAMS_KEY,
    PREFS_KEY,
    SUBMISSIONS_KEY,
    GPA_HISTORY_KEY
  ];
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

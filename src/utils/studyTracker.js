const STORAGE_KEY = 'pph_study_history';

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {
    // Study history is an enhancement and should not interrupt studying.
  }
}

function addActivity(activity) {
  writeHistory([
    { ...activity, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
    ...readHistory()
  ]);
}

export function recordQuizAttempt({ subject, score, totalQuestions, difficulty }) {
  addActivity({
    type: 'quiz',
    title: subject || 'Practice Quiz',
    description: `${score}/${totalQuestions} correct`,
    score,
    totalQuestions,
    difficulty,
    icon: 'quiz'
  });
}

export function recordPaperView(paper) {
  addActivity({
    type: 'paper',
    title: paper?.title || 'Past paper',
    description: 'Past paper',
    icon: 'description'
  });
}

export function getStudyStats() {
  const history = readHistory();
  const quizzes = history.filter((item) => item.type === 'quiz');
  const accuracyTotal = quizzes.reduce((sum, item) => {
    return sum + (item.totalQuestions ? (item.score / item.totalQuestions) * 100 : 0);
  }, 0);

  return {
    quizzesAttempted: quizzes.length,
    averageAccuracy: quizzes.length ? Math.round(accuracyTotal / quizzes.length) : 0,
    savedPapers: history.filter((item) => item.type === 'paper').length
  };
}

export function getRecentActivity() {
  return readHistory().slice(0, 5).map((item) => ({
    ...item,
    time: new Date(item.timestamp).toLocaleDateString()
  }));
}

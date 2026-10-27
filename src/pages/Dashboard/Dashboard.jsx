import React, { useState, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import {
  getStudyStats,
  getRecentActivity,
  getBookmarkedPapers,
  getWeakTopicsSummary,
  getQuizHistory,
  getExamCountdowns,
  saveExamCountdowns,
  getStudentPrefs
} from '../../utils/studyTracker';
import './Dashboard.css';

const DEFAULT_ROUTES = {
  papers: 'subjects',
  quiz: 'ai-quiz-generator',
  practiceQuiz: 'quiz',
  gpa: 'gpa',
  studyHub: 'study-hub',
  account: 'account'
};

const DEMO_ACTIVITY = [
  {
    id: 'demo-1',
    title: 'Data Structures & Algorithms',
    description: 'Practice quiz · 8/10 correct',
    time: 'Sample activity',
    icon: 'quiz'
  },
  {
    id: 'demo-2',
    title: 'Calculus & Analytical Geometry',
    description: 'Past paper reviewed',
    time: 'Sample activity',
    icon: 'description'
  }
];

function Icon({ name, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export default function Dashboard({
  user = null,
  onNavigate = () => {},
  onOpenAuth,
  onStartTargetedDrill,
  routes = DEFAULT_ROUTES,
  stats = null,
  activity = []
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [exams, setExams] = useState(() => getExamCountdowns());
  const [newExamCourse, setNewExamCourse] = useState('');
  const [newExamDate, setNewExamDate] = useState('');

  const prefs = useMemo(() => getStudentPrefs(), []);
  const fullName = user?.user_metadata?.full_name?.trim();
  const displayName =
    fullName?.split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'Student';

  const localStats = stats || getStudyStats();
  const localActivity = activity && activity.length > 0 ? activity : getRecentActivity();
  const bookmarkedPapers = useMemo(() => getBookmarkedPapers(), []);
  const weakTopics = useMemo(() => getWeakTopicsSummary(), []);
  const quizHistory = useMemo(() => getQuizHistory(6), []);

  const hasRealHistory =
    (localStats?.quizzesAttempted || 0) > 0 ||
    (localStats?.savedPapers || 0) > 0 ||
    bookmarkedPapers.length > 0;
  const isDemo = !hasRealHistory && stats == null;
  const destinations = { ...DEFAULT_ROUTES, ...routes };

  const metrics = [
    {
      label: 'Quizzes completed',
      value: isDemo ? '12' : String(localStats.quizzesAttempted ?? 0),
      description: 'Practice builds confidence',
      icon: 'quiz'
    },
    {
      label: 'Average accuracy',
      value: isDemo
        ? '84%'
        : Number.isFinite(localStats.averageAccuracy) && localStats.quizzesAttempted > 0
          ? `${localStats.averageAccuracy}%`
          : '—',
      description: 'Across your completed quizzes',
      icon: 'track_changes'
    },
    {
      label: 'Papers & bookmarks',
      value: isDemo ? '8' : String((localStats.savedPapers || 0) + (localStats.bookmarkedCount || 0)),
      description: 'Your revision collection',
      icon: 'bookmark'
    },
    {
      label: 'Study streak',
      value: isDemo ? '4 days' : `${localStats.streakDays || 0} ${localStats.streakDays === 1 ? 'day' : 'days'}`,
      description: `Level ${localStats.level || 1} · ${localStats.levelTitle || 'Focused Scholar'} (${localStats.xp || 0} XP)`,
      icon: 'local_fire_department'
    }
  ];

  const recentActivity = isDemo ? DEMO_ACTIVITY : localActivity;

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError('');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onNavigate('home');
    } catch {
      setSignOutError('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  function handleAddExam(e) {
    e.preventDefault();
    if (!newExamCourse.trim() || !newExamDate) return;
    const updated = saveExamCountdowns([
      ...exams,
      {
        id: `exam-${Date.now()}`,
        course: newExamCourse.trim().slice(0, 60),
        examType: 'Exam',
        date: newExamDate
      }
    ]);
    setExams(updated);
    setNewExamCourse('');
    setNewExamDate('');
  }

  function handleRemoveExam(id) {
    const updated = saveExamCountdowns(exams.filter((item) => item.id !== id));
    setExams(updated);
  }

  function getDaysRemaining(dateStr) {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;
    const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  return (
    <div className="study-dashboard">
      <header className="study-dashboard__header">
        <div>
          <p className="study-dashboard__eyebrow">
            YOUR WORKSPACE · {prefs.campus?.toUpperCase() || 'ISLAMABAD'} CAMPUS · {prefs.department || 'CS & IT'}
          </p>
          <h1>Welcome back, {displayName}.</h1>
          <p className="study-dashboard__intro">
            A little practice today. A little more confidence tomorrow.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="study-dashboard__signout"
            onClick={() => onNavigate(destinations.account)}
          >
            <Icon name="manage_accounts" />
            Profile &amp; Settings
          </button>

          {user ? (
            <button
              type="button"
              className="study-dashboard__signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <Icon name="logout" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          ) : (
            <button
              type="button"
              className="study-dashboard__primary"
              style={{ marginTop: 0 }}
              onClick={() => {
                if (typeof onOpenAuth === 'function') onOpenAuth();
                else onNavigate('auth');
              }}
            >
              <Icon name="login" />
              Sign in to sync
            </button>
          )}
        </div>
      </header>

      {signOutError && (
        <p className="study-dashboard__error" role="alert">
          {signOutError}
        </p>
      )}

      {isDemo && (
        <div className="study-dashboard__preview">
          <Icon name="info" />
          <p>
            <strong>Guest mode preview.</strong> Complete a quiz, bookmark a paper, or try today’s Daily Challenge to replace these sample metrics with your real study history.
          </p>
        </div>
      )}

      <section
        className="study-dashboard__metrics"
        aria-label="Study overview"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {metrics.map((metric) => (
          <article
            className="study-dashboard__metric"
            key={metric.label}
          >
            <div className="study-dashboard__metric-top">
              <span>{metric.label}</span>
              <Icon name={metric.icon} />
            </div>

            <strong className="study-dashboard__metric-value">
              {metric.value}
            </strong>

            <p>{metric.description}</p>
          </article>
        ))}
      </section>

      {/* Earned Badges Strip */}
      {localStats.badges && localStats.badges.length > 0 && (
        <section
          aria-label="Earned study badges"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}
        >
          {localStats.badges.map((b) => (
            <span
              key={b.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: 'var(--sd-soft)',
                color: 'var(--sd-brand)',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              <Icon name={b.icon} />
              {b.label}
            </span>
          ))}
        </section>
      )}

      <div className="study-dashboard__layout">
        <div className="study-dashboard__main">
          <section className="study-dashboard__feature">
            <div className="study-dashboard__feature-top">
              <span className="study-dashboard__section-label">
                THE PAPER LIBRARY
              </span>
              <Icon name="library_books" />
            </div>

            <h2>Start with the questions<br />that came before.</h2>
            <p>
              Explore past papers by subject. Get familiar with the format,
              revisit the difficult topics, and make your next study session count.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="study-dashboard__primary"
                onClick={() => onNavigate(destinations.papers)}
              >
                Browse past papers
                <Icon name="arrow_forward" />
              </button>

              <button
                type="button"
                className="study-dashboard__signout"
                style={{ marginTop: '22px' }}
                onClick={() => onNavigate(destinations.studyHub)}
              >
                <Icon name="local_fire_department" />
                Daily Challenge &amp; Flashcards
              </button>
            </div>

            <div className="study-dashboard__feature-foot">
              <span>01 / Explore</span>
              <span>02 / Understand</span>
              <span>03 / Practice</span>
            </div>
          </section>

          {/* Quiz History Chart & Weak Topics */}
          <section
            className="study-dashboard__activity"
            aria-label="Quiz accuracy history and weak topics"
            style={{ marginBottom: '24px' }}
          >
            <div className="study-dashboard__section-heading">
              <div>
                <p className="study-dashboard__section-label">PERFORMANCE INSIGHTS</p>
                <h2>Quiz History &amp; Weak-Topic Detection</h2>
              </div>
            </div>

            {quizHistory.length > 0 ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${quizHistory.length}, minmax(40px, 1fr))`,
                    gap: '0.5rem',
                    alignItems: 'end',
                    height: '110px',
                    padding: '0.75rem 0.25rem 0',
                    borderBottom: '1px solid var(--sd-line)'
                  }}
                >
                  {quizHistory.slice().reverse().map((q) => (
                    <div
                      key={q.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                        gap: '0.25rem'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sd-brand)' }}>
                        {q.accuracy}%
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '38px',
                          height: `${Math.max(12, q.accuracy)}%`,
                          background: q.accuracy >= 70 ? '#10b981' : 'var(--sd-brand)',
                          borderRadius: '6px 6px 0 0'
                        }}
                        title={`${q.title}: ${q.accuracy}% (${q.dateLabel})`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--sd-muted)', marginBottom: '1rem' }}>
                Complete your first practice or AI quiz to unlock your accuracy chart.
              </p>
            )}

            {weakTopics.length > 0 ? (
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--sd-muted)', marginBottom: '0.5rem' }}>
                  Topics scoring under 75% (recommended for targeted drill):
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {weakTopics.map((wt) => (
                    <div
                      key={wt.subject}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--sd-line)',
                        background: 'var(--sd-bg)'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.875rem' }}>{wt.subject}</strong>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--sd-muted)' }}>
                          Avg accuracy: {wt.averageAccuracy}% across {wt.attempts} {wt.attempts === 1 ? 'attempt' : 'attempts'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="study-dashboard__signout"
                        onClick={() => {
                          if (typeof onStartTargetedDrill === 'function') {
                            onStartTargetedDrill({
                              topic: wt.subject,
                              subjectCode: wt.subjectCode || '',
                              difficulty: 'Medium',
                              numQuestions: 5
                            });
                          } else {
                            onNavigate('ai-quiz-generator');
                          }
                        }}
                      >
                        <Icon name="bolt" />
                        Practice Drill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--sd-muted)' }}>
                ✅ No weak topics detected below 75% accuracy yet. Keep up the momentum!
              </p>
            )}
          </section>

          {/* Bookmarked Papers */}
          {bookmarkedPapers.length > 0 && (
            <section
              className="study-dashboard__activity"
              aria-label="Bookmarked past papers"
              style={{ marginBottom: '24px' }}
            >
              <div className="study-dashboard__section-heading">
                <div>
                  <p className="study-dashboard__section-label">SAVED COLLECTION</p>
                  <h2>Bookmarked Papers ({bookmarkedPapers.length})</h2>
                </div>
              </div>
              <ul className="study-dashboard__activity-list">
                {bookmarkedPapers.slice(0, 5).map((bp) => (
                  <li key={bp.id}>
                    <div className="study-dashboard__activity-icon">
                      <Icon name="bookmark" />
                    </div>
                    <div className="study-dashboard__activity-copy">
                      <h3>{bp.title}</h3>
                      <p>{bp.subjectCode} · {bp.term} {bp.year}</p>
                    </div>
                    <button
                      type="button"
                      className="study-dashboard__signout"
                      onClick={() => onNavigate('subjects')}
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className="study-dashboard__activity"
            aria-labelledby="study-activity-title"
          >
            <div className="study-dashboard__section-heading">
              <div>
                <p className="study-dashboard__section-label">YOUR STUDY TRAIL</p>
                <h2 id="study-activity-title">Recent activity</h2>
              </div>

              {isDemo && (
                <span className="study-dashboard__sample-label">
                  Sample
                </span>
              )}
            </div>

            {recentActivity.length > 0 ? (
              <ul className="study-dashboard__activity-list">
                {recentActivity.map((item) => (
                  <li key={item.id}>
                    <div className="study-dashboard__activity-icon">
                      <Icon name={item.icon || 'description'} />
                    </div>

                    <div className="study-dashboard__activity-copy">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>

                    <span className="study-dashboard__activity-time">
                      {item.time}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="study-dashboard__empty">
                <Icon name="history" />
                <h3>Your study history starts here</h3>
                <p>
                  Your recorded activity will appear here when it is available.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="study-dashboard__sidebar">
          <section className="study-dashboard__tools">
            <p className="study-dashboard__section-label">KEEP MOVING</p>
            <h2>A good next step</h2>

            <button
              type="button"
              className="study-dashboard__tool"
              onClick={() => onNavigate(destinations.studyHub)}
            >
              <span className="study-dashboard__tool-icon">
                <Icon name="psychology" />
              </span>
              <span className="study-dashboard__tool-copy">
                <strong>Study Hub &amp; Daily Challenge</strong>
                <span>5-Q daily challenge, flashcards &amp; AI study planner.</span>
              </span>
              <Icon name="arrow_forward" />
            </button>

            <button
              type="button"
              className="study-dashboard__tool"
              onClick={() => onNavigate(destinations.quiz)}
            >
              <span className="study-dashboard__tool-icon">
                <Icon name="auto_awesome" />
              </span>
              <span className="study-dashboard__tool-copy">
                <strong>AI Quiz Generator</strong>
                <span>Create a custom quiz around any topic.</span>
              </span>
              <Icon name="arrow_forward" />
            </button>

            <button
              type="button"
              className="study-dashboard__tool"
              onClick={() => onNavigate(destinations.practiceQuiz)}
            >
              <span className="study-dashboard__tool-icon">
                <Icon name="quiz" />
              </span>
              <span className="study-dashboard__tool-copy">
                <strong>Course Practice Quiz</strong>
                <span>Revise COMSATS subjects with MCQs.</span>
              </span>
              <Icon name="arrow_forward" />
            </button>

            <button
              type="button"
              className="study-dashboard__tool"
              onClick={() => onNavigate(destinations.gpa)}
            >
              <span className="study-dashboard__tool-icon">
                <Icon name="calculate" />
              </span>
              <span className="study-dashboard__tool-copy">
                <strong>Plan your semester</strong>
                <span>Work out your SGPA, CGPA, and target grades.</span>
              </span>
              <Icon name="arrow_forward" />
            </button>
          </section>

          {/* Exam Countdown & Reminders Widget */}
          <section className="study-dashboard__tools" aria-label="Exam countdown reminders">
            <p className="study-dashboard__section-label">EXAM COUNTDOWN</p>
            <h2>Upcoming Exams</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
              {exams.map((ex) => {
                const days = getDaysRemaining(ex.date);
                return (
                  <div
                    key={ex.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--sd-line)',
                      background: 'var(--sd-bg)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block' }}>{ex.course}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--sd-muted)' }}>{ex.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          background: 'var(--sd-soft)',
                          color: 'var(--sd-brand)',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}
                      >
                        {days === null ? '—' : days < 0 ? 'Passed' : days === 0 ? 'Today!' : `${days}d left`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExam(ex.id)}
                        aria-label={`Remove ${ex.course} exam reminder`}
                        style={{ background: 'none', border: 'none', color: 'var(--sd-muted)', padding: '2px' }}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddExam} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <input
                type="text"
                placeholder="Course (e.g. CSC311 Final)"
                value={newExamCourse}
                onChange={(e) => setNewExamCourse(e.target.value)}
                aria-label="Exam course title"
                style={{
                  padding: '0.5rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--sd-line)',
                  background: 'var(--sd-bg)',
                  color: 'var(--sd-text)',
                  fontSize: '0.8125rem'
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  aria-label="Exam date"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid var(--sd-line)',
                    background: 'var(--sd-bg)',
                    color: 'var(--sd-text)',
                    fontSize: '0.8125rem'
                  }}
                />
                <button
                  type="submit"
                  className="study-dashboard__signout"
                  style={{ padding: '0.5rem 0.85rem' }}
                >
                  Add
                </button>
              </div>
            </form>
          </section>

          <section className="study-dashboard__note">
            <Icon name="edit_note" />
            <p className="study-dashboard__section-label">A SMALL STUDY HABIT</p>
            <h2>Give one topic your full attention.</h2>
            <p>
              Pick something you find difficult. Review one paper, attempt a few
              questions, then write down what you still need to understand.
            </p>
            <span>Keep the session small. Make it useful.</span>
          </section>
        </aside>
      </div>

      <footer className="study-dashboard__footer">
        <span>COMSATSPrepHub</span>
        <span>Your space to prepare.</span>
      </footer>
    </div>
  );
}

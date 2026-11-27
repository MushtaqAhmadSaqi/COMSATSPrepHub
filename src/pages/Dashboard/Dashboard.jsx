import React, { useEffect, useState, useMemo } from 'react';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import {
  getStudyStats,
  getRecentActivity,
  getBookmarkedPapers,
  getWeakTopicsSummary,
  getQuizHistory,
  getExamCountdowns,
  saveExamCountdowns,
  getStudentPrefs,
  mapRemoteActivity,
  mergeRemoteActivity
} from '../../utils/studyTracker';
import AppIcon from '../../components/ui/AppIcon';
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
  return <AppIcon name={name} className={className} size={20} />;
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
  const [liveActivity, setLiveActivity] = useState(() => (
    activity.length > 0 ? activity : getRecentActivity()
  ));
  const [dataVersion, setDataVersion] = useState(0);

  const prefs = useMemo(() => getStudentPrefs(), [dataVersion]);
  const fullName = user?.user_metadata?.full_name?.trim();
  const displayName =
    fullName?.split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'Student';

  const localStats = useMemo(() => stats || getStudyStats(), [stats, dataVersion]);
  const localActivity = liveActivity;
  const bookmarkedPapers = useMemo(() => getBookmarkedPapers(), [dataVersion]);
  const weakTopics = useMemo(() => getWeakTopicsSummary(), [dataVersion]);
  const quizHistory = useMemo(() => getQuizHistory(6), [dataVersion]);

  const hasRealHistory =
    (localStats?.quizzesAttempted || 0) > 0 ||
    (localStats?.savedPapers || 0) > 0 ||
    bookmarkedPapers.length > 0 ||
    localActivity.length > 0;
  const isDemo = !hasRealHistory && stats == null;
  const destinations = { ...DEFAULT_ROUTES, ...routes };

  useEffect(() => {
    const handleLocalActivity = (event) => {
      if (event.detail) {
        setLiveActivity((current) => [
          { ...event.detail, time: new Date(event.detail.timestamp).toLocaleDateString() },
          ...current.filter((item) => item.id !== event.detail.id)
        ].slice(0, 12));
        setDataVersion((version) => version + 1);
      }
    };

    window.addEventListener('pph:study-activity', handleLocalActivity);
    return () => window.removeEventListener('pph:study-activity', handleLocalActivity);
  }, []);

  useEffect(() => {
    const handleOwnerChange = () => {
      setLiveActivity(getRecentActivity());
      setExams(getExamCountdowns());
      setDataVersion((version) => version + 1);
    };

    window.addEventListener('pph:workspace-owner-changed', handleOwnerChange);
    return () => window.removeEventListener('pph:workspace-owner-changed', handleOwnerChange);
  }, []);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return undefined;

    let channel;
    let cancelled = false;

    async function loadActivity() {
      const { data, error } = await supabase
        .from('user_activity')
        .select('id, client_id, type, title, description, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.warn('Dashboard activity sync failed:', error.message);
        return;
      }

      if (!cancelled) {
        const remoteItems = (data || []).map(mapRemoteActivity);
        mergeRemoteActivity(remoteItems);
        setLiveActivity(remoteItems);
        setDataVersion((version) => version + 1);
      }
    }

    loadActivity();

    if (typeof supabase.channel === 'function') {
      channel = supabase
        .channel(`dashboard-activity-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_activity',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const item = mapRemoteActivity(payload.new);
            mergeRemoteActivity([item]);
            setLiveActivity((current) => [
              item,
              ...current.filter((existing) => existing.id !== item.id)
            ].slice(0, 12));
            setDataVersion((version) => version + 1);
          }
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (channel && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

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
          <h1>Welcome back, {displayName}.</h1>
          <p className="study-dashboard__intro">
            A little practice today. A little more confidence tomorrow.
          </p>
        </div>

        <div className="study-dashboard__header-actions">
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
              className="study-dashboard__primary study-dashboard__primary--flush"
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
        className="study-dashboard__metrics study-dashboard__metrics--cards"
        aria-label="Study overview"
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

            <strong className="study-dashboard__metric-value tabular-nums">
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
          className="study-dashboard__badges"
        >
          {localStats.badges.map((b) => (
            <span
              key={b.id}
              className="study-dashboard__badge"
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
              <h2>Start with the questions<br />that came before.</h2>
              <Icon name="library_books" />
            </div>

            <p>
              Explore past papers by subject. Get familiar with the format,
              revisit the difficult topics, and make your next study session count.
            </p>

            <div className="study-dashboard__feature-actions">
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
                className="study-dashboard__signout study-dashboard__signout--aligned"
                onClick={() => onNavigate(destinations.studyHub)}
              >
                <Icon name="local_fire_department" />
                Daily Challenge &amp; Flashcards
              </button>
            </div>
          </section>

          {/* Quiz History Chart & Weak Topics */}
          <section
            className="study-dashboard__activity study-dashboard__activity--spaced"
            aria-label="Quiz accuracy history and weak topics"
          >
            <div className="study-dashboard__section-heading">
              <div>
                <h2>Quiz History &amp; Weak-Topic Detection</h2>
              </div>
            </div>

            {quizHistory.length > 0 ? (
              <div className="study-dashboard__chart-wrap">
                <div className="study-dashboard__chart-grid">
                  {quizHistory.slice().reverse().map((q) => (
                    <div
                      key={q.id}
                      className="study-dashboard__chart-col"
                    >
                      <span className="study-dashboard__chart-pct tabular-nums">
                        {q.accuracy}%
                      </span>
                      <div
                        className={`study-dashboard__chart-bar${q.accuracy >= 70 ? ' study-dashboard__chart-bar--high' : ''}`}
                        style={{ '--bar-h': `${Math.max(12, q.accuracy)}%` }}
                        title={`${q.title}: ${q.accuracy}% (${q.dateLabel})`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="study-dashboard__chart-hint">
                Complete your first practice or AI quiz to unlock your accuracy chart.
              </p>
            )}

            {weakTopics.length > 0 ? (
              <div>
                <p className="study-dashboard__weak-label">
                  Topics scoring under 75% (recommended for targeted drill):
                </p>
                <div className="study-dashboard__weak-list">
                  {weakTopics.map((wt) => (
                    <div
                      key={wt.subject}
                      className="study-dashboard__weak-item"
                    >
                      <div>
                        <strong className="study-dashboard__weak-title">{wt.subject}</strong>
                        <span className="study-dashboard__weak-meta tabular-nums">
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
              <p className="study-dashboard__weak-empty">
                <Icon name="check_circle" />
                <span>No weak topics detected below 75% accuracy yet. Keep up the momentum!</span>
              </p>
            )}
          </section>

          {/* Bookmarked Papers */}
          <section
            className="study-dashboard__activity study-dashboard__activity--spaced"
            aria-label="Bookmarked past papers"
          >
            <div className="study-dashboard__section-heading">
              <div>
                <h2>Bookmarked Papers ({bookmarkedPapers.length})</h2>
              </div>
            </div>
            {bookmarkedPapers.length > 0 ? (
              <ul className="study-dashboard__activity-list">
                {bookmarkedPapers.slice(0, 5).map((bp) => (
                  <li key={bp.id}>
                    <div className="study-dashboard__activity-icon">
                      <Icon name="bookmark" />
                    </div>
                    <div className="study-dashboard__activity-copy">
                      <h3>{bp.title}</h3>
                      <p>
                        <span className="mono-code" translate="no">{bp.subjectCode}</span>
                        {' · '}
                        {bp.term} {bp.year}
                      </p>
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
            ) : (
              <div className="study-dashboard__empty">
                <Icon name="bookmark_add" />
                <h3>No bookmarked papers yet</h3>
                <p>
                  Open any COMSATS past paper and tap Bookmark to keep it handy here for exam night.
                </p>
                <button
                  type="button"
                  className="study-dashboard__signout study-dashboard__empty-action"
                  onClick={() => onNavigate(destinations.papers)}
                >
                  Browse Past Papers
                </button>
              </div>
            )}
          </section>

          <section
            className="study-dashboard__activity"
            aria-labelledby="study-activity-title"
          >
            <div className="study-dashboard__section-heading">
              <div>
                <h2 id="study-activity-title">Recent activity</h2>
              </div>

              {user ? (
                <span className="study-dashboard__live-label">
                  <span aria-hidden="true" />
                  Live sync
                </span>
              ) : isDemo ? (
                <span className="study-dashboard__sample-label">
                  Sample
                </span>
              ) : null}
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
            <h2>Upcoming Exams</h2>

            <div className="study-dashboard__exam-list">
              {exams.map((ex) => {
                const days = getDaysRemaining(ex.date);
                const isSample = String(ex.id || '').startsWith('exam-default-');
                const isPassed = days !== null && days < 0;
                return (
                  <div
                    key={ex.id}
                    className={`study-dashboard__exam-item${isPassed ? ' study-dashboard__exam-item--passed' : ''}`}
                  >
                    <div className="study-dashboard__exam-info">
                      <strong className="study-dashboard__exam-course">{ex.course}</strong>
                      <span className="study-dashboard__exam-date">
                        {ex.date}
                        {isSample && ' · Sample reminder: edit or remove it'}
                      </span>
                    </div>
                    <div className="study-dashboard__exam-actions">
                      <span className="study-dashboard__exam-pill tabular-nums">
                        {days === null ? '—' : isPassed ? 'Passed' : days === 0 ? 'Today!' : `${days}d left`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExam(ex.id)}
                        aria-label={`Remove ${ex.course} exam reminder`}
                        className="study-dashboard__exam-remove"
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleAddExam} className="study-dashboard__exam-form">
              <input
                type="text"
                placeholder="Course (e.g. CSC311 Final)"
                value={newExamCourse}
                onChange={(e) => setNewExamCourse(e.target.value)}
                aria-label="Exam course title"
                className="study-dashboard__exam-input"
              />
              <div className="study-dashboard__exam-row">
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  aria-label="Exam date"
                  className="study-dashboard__exam-date-input"
                />
                <button
                  type="submit"
                  className="study-dashboard__signout study-dashboard__exam-add"
                >
                  Add
                </button>
              </div>
            </form>
          </section>

          <section className="study-dashboard__note">
            <Icon name="edit_note" />
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

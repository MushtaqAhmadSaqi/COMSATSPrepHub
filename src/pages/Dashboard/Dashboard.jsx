import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import './Dashboard.css';

const DEFAULT_ROUTES = {
  papers: 'subjects',
  quiz: 'ai-quiz',
  gpa: 'gpa',
};

const DEMO_ACTIVITY = [
  {
    id: 'demo-1',
    title: 'Data Structures & Algorithms',
    description: 'Practice quiz',
    time: 'Example activity',
    icon: 'quiz',
  },
  {
    id: 'demo-2',
    title: 'Calculus & Analytical Geometry',
    description: 'Past paper',
    time: 'Example activity',
    icon: 'description',
  },
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
  routes = DEFAULT_ROUTES,
  stats = null,
  activity = [],
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const fullName = user?.user_metadata?.full_name?.trim();
  const displayName =
    fullName?.split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'Student';

  const isDemo = stats == null;
  const destinations = { ...DEFAULT_ROUTES, ...routes };

  const metrics = [
    {
      label: 'Quizzes completed',
      value: isDemo ? '12' : stats.quizzesAttempted ?? '—',
      description: 'Practice builds confidence',
      icon: 'quiz',
    },
    {
      label: 'Average accuracy',
      value: isDemo
        ? '84%'
        : Number.isFinite(stats.averageAccuracy)
          ? `${stats.averageAccuracy}%`
          : '—',
      description: 'Across your completed quizzes',
      icon: 'track_changes',
    },
    {
      label: 'Saved papers',
      value: isDemo ? '8' : stats.savedPapers ?? '—',
      description: 'Your revision collection',
      icon: 'bookmark',
    },
  ];

  const recentActivity = isDemo ? DEMO_ACTIVITY : activity;

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

  return (
    <main className="study-dashboard">
      <header className="study-dashboard__header">
        <div>
          <p className="study-dashboard__eyebrow">YOUR WORKSPACE</p>
          <h1>Welcome back, {displayName}.</h1>
          <p className="study-dashboard__intro">
            A little practice today. A little more confidence tomorrow.
          </p>
        </div>

        {user && (
          <button
            type="button"
            className="study-dashboard__signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <Icon name="logout" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        )}
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
            <strong>Dashboard preview.</strong> The statistics and activity below
            are examples, not your personal study history.
          </p>
        </div>
      )}

      <section
        className="study-dashboard__metrics"
        aria-label="Study overview"
      >
        {metrics.map(metric => (
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

            <button
              type="button"
              className="study-dashboard__primary"
              onClick={() => onNavigate(destinations.papers)}
            >
              Browse past papers
              <Icon name="arrow_forward" />
            </button>

            <div className="study-dashboard__feature-foot">
              <span>01 / Explore</span>
              <span>02 / Understand</span>
              <span>03 / Practice</span>
            </div>
          </section>

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
                {recentActivity.map(item => (
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
              onClick={() => onNavigate(destinations.quiz)}
            >
              <span className="study-dashboard__tool-icon">
                <Icon name="quiz" />
              </span>
              <span className="study-dashboard__tool-copy">
                <strong>Test your understanding</strong>
                <span>Create a quiz around your topic.</span>
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
                <span>Work out your SGPA and CGPA.</span>
              </span>
              <Icon name="arrow_forward" />
            </button>
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
    </main>
  );
}

import React from 'react';
import './Dashboard.css';

const STATS = [
  {
    label: 'Quizzes Attempted',
    value: '12',
    sub: '+3 this week',
    subClass: 'dash-sub-positive',
    icon: 'quiz',
    colors: ['#0ea5e9', '#2563eb']
  },
  {
    label: 'Average Accuracy',
    value: '84%',
    sub: 'Top 15% of cohort',
    subClass: 'dash-sub-positive',
    icon: 'track_changes',
    colors: ['#10b981', '#0d9488']
  },
  {
    label: 'Saved Papers',
    value: '8',
    sub: 'Ready for offline study',
    subClass: 'dash-sub-neutral',
    icon: 'bookmark',
    colors: ['#8b5cf6', '#6366f1']
  }
];

const ACTIVITY = [
  { name: 'Data Structures & Algorithms Quiz', time: '2 hours ago', icon: 'quiz' },
  { name: 'Calculus Terminal Paper — Fall 2023', time: 'Yesterday', icon: 'picture_as_pdf' },
  { name: 'OOP Midterm Paper — Spring 2024', time: '3 days ago', icon: 'picture_as_pdf' },
];

export default function Dashboard({ user = { name: 'Student', email: 'student@comsats.edu.pk' } }) {
  const displayName = user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="dash-container">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-welcome-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>waving_hand</span>
          Welcome back
        </div>
        <h1 className="dash-title">Hi, {displayName}!</h1>
        <p className="dash-subtitle">Student Performance Analytics & Study Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="dash-grid">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="dash-card"
            style={{
              animationDelay: `${i * 0.08}s`,
              '--card-color-1': s.colors[0],
              '--card-color-2': s.colors[1]
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="dash-card-label">{s.label}</span>
              <div className="dash-activity-icon" style={{ background: `${s.colors[0]}18`, color: s.colors[0] }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{s.icon}</span>
              </div>
            </div>
            <div className="dash-stat-val" style={{ backgroundImage: `linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})` }}>
              {s.value}
            </div>
            <span className={`dash-card-sub ${s.subClass}`}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="dash-section-title">Recent Activity</h2>
        <div className="dash-activity-list">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="dash-activity-item">
              <div className="dash-activity-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{a.icon}</span>
              </div>
              <div className="dash-activity-text">
                <div className="dash-activity-name">{a.name}</div>
                <div className="dash-activity-time">{a.time}</div>
              </div>
              <span className="material-symbols-outlined" style={{ color: 'var(--border-strong)', fontSize: '18px' }}>chevron_right</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

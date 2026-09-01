import React from 'react';
import './Dashboard.css';

export default function Dashboard({ user = { name: 'Moeed Ali', email: 'moeed@example.com' } }) {
  return (
    <div className="dash-container">
      <div className="dash-header">
        <h1 className="dash-title">Welcome back, {user.name}!</h1>
        <p style={{ color: '#64748b' }}>Student Performance Analytics & Study Overview</p>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Quizzes Attempted</span>
          <div className="dash-stat-val">12</div>
          <span style={{ fontSize: '0.8125rem', color: '#10b981' }}>+3 this week</span>
        </div>

        <div className="dash-card">
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Average Accuracy</span>
          <div className="dash-stat-val">84%</div>
          <span style={{ fontSize: '0.8125rem', color: '#10b981' }}>Top 15% of cohort</span>
        </div>

        <div className="dash-card">
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Saved Papers</span>
          <div className="dash-stat-val">8</div>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Ready for offline study</span>
        </div>
      </div>
    </div>
  );
}

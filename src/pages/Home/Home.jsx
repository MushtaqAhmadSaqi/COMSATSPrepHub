import React from 'react';
import './Home.css';

export default function Home({ onNavigate = () => {} }) {
  const features = [
    {
      icon: 'picture_as_pdf',
      title: 'Past Papers',
      desc: 'Verified COMSATS exam papers from multiple semesters'
    },
    {
      icon: 'quiz',
      title: 'Practice Quizzes',
      desc: 'MCQ-based quizzes designed for exam preparation'
    },
    {
      icon: 'auto_awesome',
      title: 'AI Generator',
      desc: 'Generate custom quizzes with Gemini AI on any topic'
    },
    {
      icon: 'calculate',
      title: 'GPA Calculator',
      desc: 'COMSATS-accurate SGPA & CGPA computation tool'
    }
  ];

  const stats = [
    { num: '500+', label: 'Past Papers' },
    { num: '50+',  label: 'Subjects'   },
    { num: '1K+',  label: 'Students'   }
  ];

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        {/* Badge */}
        <div className="home-badge-wrapper">
          <div className="home-badge-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
            Built for COMSATS Students
          </div>
        </div>

        {/* Headline */}
        <h1 className="home-title">
          Ace Your Exams at <br />
          <span className="home-title-highlight">COMSATS University</span>
        </h1>

        {/* Subtitle */}
        <p className="home-subtitle">
          Past papers, practice quizzes, AI quiz generation, and GPA tools —
          all in one clean, student-first platform built by COMSATS students.
        </p>

        {/* CTA Buttons */}
        <div className="home-cta-buttons">
          <button
            type="button"
            className="btn-primary-pill"
            onClick={() => onNavigate('subjects')}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            Browse Past Papers
          </button>
          <button
            type="button"
            className="btn-secondary-pill"
            onClick={() => onNavigate('quiz')}
          >
            <span className="material-symbols-outlined">quiz</span>
            Start Practice Quiz
          </button>
        </div>

        {/* Feature Cards */}
        <div className="home-features-grid">
          {features.map((f, i) => (
            <div key={i} className={`home-feature-card stagger-${i + 1}`} style={{ animationFillMode: 'both', animation: `fadeInUp 0.5s ${0.3 + i * 0.07}s var(--ease) both` }}>
              <div className="home-feature-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{f.icon}</span>
              </div>
              <div className="home-feature-title">{f.title}</div>
              <p className="home-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="home-stats-grid">
          {stats.map((s, i) => (
            <div key={i} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

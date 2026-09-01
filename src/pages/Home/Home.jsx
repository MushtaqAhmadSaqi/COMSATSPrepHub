import React from 'react';
import './Home.css';

export default function Home({ onNavigate = () => {} }) {
  const heroSubjects = ['Calculus', 'Data Structures', 'OOP', 'Networks', 'AI'];

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        <div className="home-badge-wrapper">
          <div className="home-badge-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
            Built for COMSATS Students
          </div>
        </div>

        <h1 className="home-title">
          Prepare Faster for <br />
          <span className="home-title-highlight">COMSATS Exams</span>
        </h1>

        <p className="home-subtitle">
          Past papers, practice quizzes, AI quiz generation, and GPA tools — all in one student-friendly platform.
        </p>

        <div className="home-cta-buttons">
          <button
            type="button"
            className="btn-primary-pill"
            onClick={() => onNavigate('subjects')}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            Browse Subjects
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

        {/* Stats Grid */}
        <div className="home-stats-grid">
          <div className="stat-item">
            <div className="stat-num">500+</div>
            <div className="stat-label">Past Papers</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">50+</div>
            <div className="stat-label">Subjects</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">1,000+</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>
      </section>
    </div>
  );
}

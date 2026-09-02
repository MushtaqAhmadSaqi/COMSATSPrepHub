import React, { useState, useEffect, useRef } from 'react';
import { useScrollRevealList } from '../../utils/useScrollReveal';
import { useCounter } from '../../utils/useCounter';
import './Home.css';

/* ── Typewriter for the gradient highlight ── */
function TypewriterText({ text, delay = 600 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    // Respect reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(text);
      setDone(true);
      return;
    }
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        idxRef.current += 1;
        setDisplayed(text.slice(0, idxRef.current));
        if (idxRef.current >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 42);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span className={`home-title-highlight${!done ? ' typing-cursor' : ''}`}>
      {displayed}
    </span>
  );
}

/* ── Animated Stat Item ── */
function StatItem({ num, label, suffix }) {
  const target = parseInt(num.replace(/\D/g, ''), 10);
  const { ref, display } = useCounter(target, { duration: 1600, suffix });

  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-num">{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Ripple helper ── */
function addRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  circle.className = 'ripple-circle';
  circle.style.top = `${e.clientY - rect.top}px`;
  circle.style.left = `${e.clientX - rect.left}px`;
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}

export default function Home({ onNavigate = () => {} }) {
  const features = [
    { icon: 'picture_as_pdf', title: 'Past Papers',     desc: 'Verified COMSATS exam papers from multiple semesters' },
    { icon: 'quiz',           title: 'Practice Quizzes', desc: 'MCQ-based quizzes designed for exam preparation' },
    { icon: 'auto_awesome',   title: 'AI Generator',     desc: 'Generate custom quizzes with Gemini AI on any topic' },
    { icon: 'calculate',      title: 'GPA Calculator',   desc: 'COMSATS-accurate SGPA & CGPA computation tool' }
  ];

  const stats = [
    { num: '500+', label: 'Past Papers', suffix: '+' },
    { num: '50+',  label: 'Subjects',    suffix: '+' },
    { num: '1000+',label: 'Students',    suffix: '+' }
  ];

  /* Scroll-reveal for feature cards */
  const { containerRef: featuresRef, visibleSet } = useScrollRevealList(features.length, { threshold: 0.12 });

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        {/* Floating particles */}
        <div className="home-particles" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`} />
          ))}
        </div>

        {/* Badge */}
        <div className="home-badge-wrapper">
          <div className="home-badge-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
            Built for COMSATS Students
          </div>
        </div>

        {/* Headline — typewriter on highlight */}
        <h1 className="home-title">
          Ace Your Exams at <br />
          <TypewriterText text="COMSATS University" delay={500} />
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
            className="btn-primary-pill btn-shimmer ripple-host"
            onClick={(e) => { addRipple(e); onNavigate('subjects'); }}
          >
            <span className="material-symbols-outlined">auto_stories</span>
            Browse Past Papers
          </button>
          <button
            type="button"
            className="btn-secondary-pill ripple-host"
            onClick={(e) => { addRipple(e); onNavigate('quiz'); }}
          >
            <span className="material-symbols-outlined">quiz</span>
            Start Practice Quiz
          </button>
        </div>

        {/* Feature Cards — scroll-reveal stagger */}
        <div className="home-features-grid" ref={featuresRef}>
          {features.map((f, i) => (
            <div
              key={i}
              className={`home-feature-card reveal${visibleSet.has(i) ? ' reveal-visible' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="home-feature-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{f.icon}</span>
              </div>
              <div className="home-feature-title">{f.title}</div>
              <p className="home-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats — animated counters */}
        <div className="home-stats-grid">
          {stats.map((s, i) => (
            <StatItem key={i} num={s.num} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>
    </div>
  );
}

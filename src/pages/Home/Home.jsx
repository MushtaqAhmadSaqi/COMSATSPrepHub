import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useScrollRevealList } from '../../utils/useScrollReveal';
import { useCounter } from '../../utils/useCounter';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import {
  getRecentActivity,
  getRecentlyViewedPapers,
  getDailyChallengeStatus
} from '../../utils/studyTracker';
import './Home.css';

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

/* ── Spotlight Card Effect with Magnetic Hover ── */
function SpotlightCard({ children, className = '', delay = 0, onClick, ariaLabel }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePosition({ x: mouseX, y: mouseY });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMagneticOffset({ x: 0, y: 0 });
      return;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = Math.max(-6, Math.min(6, ((mouseX - centerX) / centerX) * 6));
    const dy = Math.max(-6, Math.min(6, ((mouseY - centerY) / centerY) * 6));
    setMagneticOffset({ x: dx, y: dy });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMagneticOffset({ x: 0, y: 0 });
  };

  return (
    <motion.button
      type="button"
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
        transform: `translate3d(${magneticOffset.x}px, ${magneticOffset.y}px, 0)`,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: isHovered
          ? 'transform 150ms var(--ease), box-shadow 0.3s var(--ease-spring)'
          : 'transform 300ms var(--ease), box-shadow 0.3s var(--ease-spring)'
      }}
    >
      {children}
    </motion.button>
  );
}

/* ── Animated Button with Hover Lift ── */
function AnimatedButton({ children, onClick, variant = 'primary', className = '', icon }) {
  return (
    <motion.button
      type="button"
      className={`animated-btn btn-${variant} ${className}`}
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {icon && <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>}
      {children}
    </motion.button>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    icon: 'manage_search',
    title: 'Find Your Course',
    desc: 'Search by COMSATS course code (like CSC101, CSC211, MTH104) or filter by department to open verified past papers and model solutions.'
  },
  {
    step: '02',
    icon: 'psychology',
    title: 'Practice & Drill Weak Topics',
    desc: 'Take timed or practice MCQs, generate custom AI quizzes on specific topics, or review spaced-repetition flashcards.'
  },
  {
    step: '03',
    icon: 'trending_up',
    title: 'Track Mastery & Plan GPA',
    desc: 'Monitor your accuracy streak on the student dashboard and compute your exact COMSATS SGPA, CGPA, and target semester grades.'
  }
];

export default function Home({
  onNavigate = () => {},
  onSelectSubject = () => {},
  user = null
}) {
  const [heroQuery, setHeroQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const features = [
    { icon: 'picture_as_pdf', title: 'Past Papers',      desc: 'Verified COMSATS exam papers & model answers across semesters', path: 'subjects' },
    { icon: 'quiz',           title: 'Practice Quizzes', desc: 'Timed & practice MCQs with instant explanations and review',    path: 'quiz' },
    { icon: 'auto_awesome',   title: 'AI Generator',     desc: 'Generate custom quizzes on any course topic in seconds',        path: 'ai-quiz-generator' },
    { icon: 'calculate',      title: 'GPA Calculator',   desc: 'COMSATS-accurate SGPA, CGPA, retake & target GPA planner',       path: 'gpa' }
  ];

  const stats = [
    { num: `${DEFAULT_SUBJECTS.reduce((acc, s) => acc + (s.papers || 12), 150)}+`, label: 'Past Papers', suffix: '+' },
    { num: `${DEFAULT_SUBJECTS.length}+`,  label: 'COMSATS Courses', suffix: '+' },
    { num: '1200+', label: 'Active Students', suffix: '+' }
  ];

  const suggestions = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    if (!q) return DEFAULT_SUBJECTS.slice(0, 5);
    return DEFAULT_SUBJECTS.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [heroQuery]);

  const recentActivity = useMemo(() => getRecentActivity(3), []);
  const recentPapers = useMemo(() => getRecentlyViewedPapers(3), []);
  const dailyChallenge = useMemo(() => getDailyChallengeStatus(), []);

  /* Scroll-reveal for feature cards */
  const { containerRef: featuresRef } = useScrollRevealList(features.length, { threshold: 0.12 });

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      onSelectSubject(suggestions[0]);
    } else {
      onNavigate('subjects');
    }
  };

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        {/* Floating particles */}
        <div className="home-particles" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`} />
          ))}
        </div>

        {/* Background Blobs */}
        <div className="hero-blob hero-blob-1" aria-hidden="true" />
        <div className="hero-blob hero-blob-2" aria-hidden="true" />

        {/* Badge */}
        <motion.div
          className="home-badge-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <div className="home-badge-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }} aria-hidden="true">school</span>
            Built for COMSATS Students
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="home-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Ace Your Exams at <br />
          <span className="home-title-highlight">COMSATS University</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="home-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.22 }}
        >
          Past papers, practice quizzes, AI quiz generation, flashcards, and GPA tools —
          all in one clean, student-first workspace built for mobile &amp; campus Wi-Fi.
        </motion.p>

        {/* Global Course & Paper Search Bar with Instant Suggestions */}
        <div
          style={{
            maxWidth: '38rem',
            margin: '0 auto 1.75rem',
            position: 'relative',
            zIndex: 10,
            textAlign: 'left'
          }}
        >
          <form onSubmit={handleHeroSearchSubmit} role="search" aria-label="Search COMSATS courses and past papers">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--surface)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: '9999px',
                padding: '0.35rem 0.5rem 0.35rem 1rem',
                boxShadow: 'var(--shadow-2)',
                gap: '0.5rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ color: 'var(--brand)', fontSize: '20px' }} aria-hidden="true">
                search
              </span>
              <input
                type="search"
                value={heroQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search by course code or subject (e.g. CSC211, OOP, MTH104)…"
                aria-label="Search by course code or subject name"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  minWidth: 0,
                  padding: '0.45rem 0'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--brand)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  minHeight: '40px'
                }}
              >
                Explore
              </button>
            </div>
          </form>

          {(searchFocused || heroQuery.trim().length > 0) && (
            <div
              role="listbox"
              aria-label="Course suggestions"
              style={{
                position: 'absolute',
                top: 'calc(100% + 0.5rem)',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-3)',
                padding: '0.5rem',
                zIndex: 30
              }}
            >
              {suggestions.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-subtle)' }}>
                  No matching course found — press Explore to browse all subjects.
                </div>
              ) : (
                suggestions.map((subj) => (
                  <button
                    key={subj.code}
                    type="button"
                    onMouseDown={() => onSelectSubject(subj)}
                    onClick={() => onSelectSubject(subj)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      textAlign: 'left',
                      fontSize: '0.875rem'
                    }}
                  >
                    <span>
                      <strong style={{ color: 'var(--brand)', marginRight: '0.5rem' }}>{subj.code}</strong>
                      {subj.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {subj.papers} papers →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Primary CTA + Secondary Action */}
        <motion.div
          className="home-cta-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <AnimatedButton
            variant="primary"
            icon="auto_stories"
            onClick={(e) => { addRipple(e); onNavigate('subjects'); }}
            className="btn-primary-pill ripple-host"
          >
            Browse Past Papers
          </AnimatedButton>
          <AnimatedButton
            variant="secondary"
            icon="local_fire_department"
            onClick={(e) => { addRipple(e); onNavigate('study-hub'); }}
            className="btn-secondary-pill ripple-host"
          >
            {dailyChallenge.completedToday
              ? `Daily Challenge (${dailyChallenge.todayScore})`
              : 'Today’s 5-Q Challenge'}
          </AnimatedButton>
        </motion.div>

        {/* Feature Cards — Interactive navigation cards with spotlight effect */}
        <div className="home-features-grid" ref={featuresRef}>
          {features.map((f, i) => (
            <SpotlightCard
              key={f.title}
              className="home-feature-card"
              delay={i * 0.08}
              onClick={() => onNavigate(f.path)}
              ariaLabel={`Open ${f.title}: ${f.desc}`}
            >
              <div className="home-feature-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }} aria-hidden="true">{f.icon}</span>
              </div>
              <div className="home-feature-title">{f.title}</div>
              <p className="home-feature-desc">{f.desc}</p>
            </SpotlightCard>
          ))}
        </div>

        {/* Continue Where You Left Off / Recently Viewed (shown for logged-in users or returning visitors) */}
        {(user || recentActivity.length > 0 || recentPapers.length > 0) && (
          <section
            aria-label="Continue where you left off"
            style={{
              maxWidth: '64rem',
              margin: '2.75rem auto 0',
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem 1.75rem',
              boxShadow: 'var(--shadow-1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  CONTINUE WHERE YOU LEFT OFF
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.15rem' }}>
                  {user ? 'Your recent study session' : 'Recently viewed on this device'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                style={{
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  minHeight: '40px'
                }}
              >
                Open Full Dashboard →
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.875rem'
              }}
            >
              {(recentActivity.length > 0 ? recentActivity : [
                { id: 'quick-1', title: 'CSC211 — Data Structures', description: 'Browse past papers & solutions', icon: 'description', type: 'paper', subjectCode: 'CSC211' },
                { id: 'quick-2', title: 'Daily 5-Question Challenge', description: 'Keep your study streak alive', icon: 'local_fire_department', type: 'daily' }
              ]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.type === 'daily') onNavigate('study-hub');
                    else if (item.type === 'quiz') onNavigate('quiz');
                    else if (item.subjectCode) {
                      const found = DEFAULT_SUBJECTS.find((s) => s.code === item.subjectCode);
                      if (found) onSelectSubject(found);
                      else onNavigate('subjects');
                    } else {
                      onNavigate('subjects');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    textAlign: 'left'
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--brand)', fontSize: '22px', flexShrink: 0 }}
                    aria-hidden="true"
                  >
                    {item.icon || 'history'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {item.description} {item.time ? `· ${item.time}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <section
          aria-label="How COMSATSPrepHub works"
          style={{
            maxWidth: '64rem',
            margin: '3rem auto 1rem',
            textAlign: 'left'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              HOW IT WORKS
            </span>
            <h2 style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--text)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
              A smarter study loop before every Midterm &amp; Terminal
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.step}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand)', background: 'var(--brand-soft)', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>
                    STEP {item.step}
                  </span>
                  <span className="material-symbols-outlined" style={{ color: 'var(--brand)', fontSize: '22px' }} aria-hidden="true">
                    {item.icon}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.375rem' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', lineHeight: 1.6 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats — Animated counters */}
        <div className="home-stats-grid">
          {stats.map((s) => (
            <StatItem key={s.label} num={s.num} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>
    </div>
  );
}
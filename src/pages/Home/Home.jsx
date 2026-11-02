import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
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

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    if (typeof window !== 'undefined' && (
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )) {
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePosition({ x: mouseX, y: mouseY });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = Math.max(-4, Math.min(4, ((mouseX - centerX) / centerX) * 4));
    const dy = Math.max(-4, Math.min(4, ((mouseY - centerY) / centerY) * 4));
    setMagneticOffset({ x: dx, y: dy });
  };

  const handleMouseLeave = () => {
    setMagneticOffset({ x: 0, y: 0 });
  };

  return (
    <motion.button
      type="button"
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        x: magneticOffset.x,
        y: magneticOffset.y
      }}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
        cursor: 'pointer',
        fontFamily: 'inherit'
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
    { num: '203+', label: 'Past Papers', suffix: '+' },
    { num: `${DEFAULT_SUBJECTS.length}+`,  label: 'COMSATS Courses', suffix: '+' },
    { num: '500+', label: 'Active Students', suffix: '+' }
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
        <div className="home-features-grid">
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
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

        {/* ── Coming Soon Banner ────────────────────────────────────── */}
        <ComingSoonBanner />
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMING SOON — Upcoming features teaser section
───────────────────────────────────────────────────────────────── */
const COMING_SOON_FEATURES = [
  {
    icon: 'smart_toy',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    glow: 'rgba(99, 102, 241, 0.3)',
    label: 'AI Study Buddy',
    tag: 'AI',
    tagColor: '#6366f1',
    desc: 'Your personal 24/7 tutor — ask any COMSATS course question in plain Urdu or English and get step-by-step explanations, formula breakdowns, and past-paper hints instantly.',
    eta: 'Coming Q1 2027'
  },
  {
    icon: 'groups',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
    glow: 'rgba(14, 165, 233, 0.3)',
    label: 'Study Groups',
    tag: 'Social',
    tagColor: '#0ea5e9',
    desc: 'Create or join private study rooms with your class batch. Share notes, quiz each other live, and tackle past papers together with real-time collaborative annotations.',
    eta: 'Coming Q1 2027'
  },
  {
    icon: 'auto_graph',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    glow: 'rgba(16, 185, 129, 0.3)',
    label: 'Smart Weak-Point Radar',
    tag: 'Analytics',
    tagColor: '#10b981',
    desc: "Auto-detects your shakiest topics from quiz history and generates a targeted 7-day study schedule — so you spend zero time guessing what to revise.",
    eta: 'Coming Q2 2027'
  },
  {
    icon: 'model_training',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    glow: 'rgba(245, 158, 11, 0.3)',
    label: 'Mock Exam Simulator',
    tag: 'Exams',
    tagColor: '#f59e0b',
    desc: 'Full 3-hour timed midterm & terminal simulations with official COMSATS marking schemes. Get auto-graded, see your predicted grade, and compare with the class.',
    eta: 'Coming Q2 2027'
  },
  {
    icon: 'notifications_active',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #2563eb 100%)',
    glow: 'rgba(20, 184, 166, 0.3)',
    label: 'Exam Countdown Alerts',
    tag: 'Reminders',
    tagColor: '#14b8a6',
    desc: 'Set your COMSATS exam dates and receive smart push / WhatsApp reminders with daily revision tasks, so you never miss a beat in the final week.',
    eta: 'Coming Q3 2027'
  }
];

function ComingSoonBanner() {
  return (
    <motion.section
      aria-label="Coming Soon Features"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        maxWidth: '64rem',
        margin: '4rem auto 1.5rem',
        padding: '0 0.5rem'
      }}
    >
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '9999px',
            padding: '0.35rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#6366f1',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.875rem'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }} aria-hidden="true">rocket_launch</span>
          What's Coming Next
        </div>
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 900,
            color: 'var(--text)',
            letterSpacing: '-0.025em',
            marginBottom: '0.5rem'
          }}
        >
          Big features are on the way 🚀
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-subtle)', maxWidth: '32rem', margin: '0 auto' }}>
          We're building the most powerful exam-prep platform ever made for COMSATS students. Here's a sneak peek.
        </p>
      </div>

      {/* Feature cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
          gap: '1.125rem'
        }}
      >
        {COMING_SOON_FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
            style={{
              position: 'relative',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              overflow: 'hidden',
              boxShadow: `0 4px 24px ${f.glow}, var(--shadow-1)`
            }}
          >
            {/* Subtle glow blob behind icon */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '-30px',
                right: '-20px',
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)`,
                pointerEvents: 'none'
              }}
            />

            {/* Top row: icon + COMING SOON badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  background: f.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${f.glow}`
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#fff' }} aria-hidden="true">
                  {f.icon}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                {/* Category tag */}
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: f.tagColor,
                    background: `${f.tagColor}18`,
                    border: `1px solid ${f.tagColor}40`,
                    borderRadius: '9999px',
                    padding: '0.2rem 0.55rem'
                  }}
                >
                  {f.tag}
                </span>
                {/* Coming soon pill */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '9999px',
                    padding: '0.2rem 0.55rem'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      animation: 'pulse 2s infinite',
                      flexShrink: 0
                    }}
                  />
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--text)',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em'
              }}
            >
              {f.label}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-subtle)',
                lineHeight: 1.65,
                marginBottom: '1rem'
              }}
            >
              {f.desc}
            </p>

            {/* ETA footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                borderTop: '1px solid var(--border)',
                paddingTop: '0.875rem'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">schedule</span>
              {f.eta}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(30,58,138,0.06) 0%, rgba(99,102,241,0.06) 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--border-strong)'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--brand)', display: 'block', marginBottom: '0.5rem' }} aria-hidden="true">
          campaign
        </span>
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
          Want to shape what gets built next?
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
          Share your ideas with the student team — every voice counts.
        </p>
        <div className="home-suggest-actions">
          <a
            href="mailto:mushtaqahmedsaqi1234@gmail.com?subject=Feature%20Suggestion%20for%20COMSATSPrepHub"
            className="btn-suggest-email"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }} aria-hidden="true">mail</span>
            Suggest via Email
          </a>
          <a
            href="https://wa.me/923149574912?text=Hi%2C%20I%20have%20a%20feature%20suggestion%20for%20COMSATSPrepHub"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-suggest-whatsapp"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp (0314 9574912)
          </a>
        </div>
      </div>
    </motion.section>
  );
}

import React, { useState, useRef, useMemo, useEffect, useId, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useCounter } from '../../utils/useCounter';
import { DEFAULT_SUBJECTS } from '../../constants/subjects';
import { computePlatformStats } from '../../constants/platformStats';
import { fetchSubjectsFromSupabase } from '../../services/papersService';
import { normalizeCourseCode } from '../../utils/paperSearch';
import {
  getRecentActivity,
  getRecentlyViewedPapers,
  getDailyChallengeStatus
} from '../../utils/studyTracker';
import AppIcon from '../../components/ui/AppIcon';
import './Home.css';

const ExamLoopPlayer = lazy(() => import('../../components/ExamLoopPlayer/ExamLoopPlayer'));

/* ── Animated Stat Item ── */
function StatItem({ num, label, suffix }) {
  const target = typeof num === 'number' ? num : parseInt(String(num).replace(/\D/g, ''), 10);
  const { ref, display } = useCounter(target, { duration: 1000, suffix });

  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-num tabular-nums">{display}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ── Spotlight Card Effect (rAF + CSS custom properties, 0 React re-renders) ── */
function SpotlightCard({ children, className = '', onClick, ariaLabel }) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el || typeof window === 'undefined') return;
    if (
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      cardRef.current.style.setProperty('--mouse-x', `${Math.round(clientX - rect.left)}px`);
      cardRef.current.style.setProperty('--mouse-y', `${Math.round(clientY - rect.top)}px`);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--mouse-x', '50%');
    cardRef.current.style.setProperty('--mouse-y', '50%');
  };

  return (
    <button
      type="button"
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
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
      {icon && <AppIcon name={icon} size={18} />}
      {children}
    </motion.button>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    icon: 'manage_search',
    title: 'Find Your Course',
    desc: 'Search by COMSATS course code (like CSC101, CSC211, MTH104) or filter by department to open verified past papers and model solutions.'
  },
  {
    icon: 'psychology',
    title: 'Practice & Drill Weak Topics',
    desc: 'Take timed or practice MCQs, generate custom AI quizzes on specific topics, or review spaced-repetition flashcards.'
  },
  {
    icon: 'trending_up',
    title: 'Track Mastery & Plan GPA',
    desc: 'Monitor your accuracy streak on the student dashboard and compute your exact COMSATS SGPA, CGPA, and target semester grades.'
  }
];

const QUICK_JUMP_CODES = ['CSC211', 'MTH104', 'CSC241'];

export default function Home({
  onNavigate = () => {},
  onSelectSubject = () => {},
  user = null,
  isDark = false
}) {
  const [heroQuery, setHeroQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [escapeDismissed, setEscapeDismissed] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const suggestionsListId = useId();

  useEffect(() => {
    let active = true;
    fetchSubjectsFromSupabase()
      .then((rows) => {
        if (active && Array.isArray(rows) && rows.length > 0) {
          setSubjects(rows);
        }
      })
      .catch(() => { /* keep DEFAULT_SUBJECTS fallback */ });
    return () => { active = false; };
  }, []);

  const platformStats = useMemo(() => computePlatformStats(subjects), [subjects]);

  const features = [
    {
      icon: 'picture_as_pdf',
      title: 'Past Paper Library',
      desc: 'Search every COMSATS past paper by course code, teacher, or exam type, complete with model answers.',
      hint: `${platformStats.courseCount} courses · code search like "csc 211"`,
      path: 'subjects',
      wide: true
    },
    {
      icon: 'timer',
      title: 'Timed Quizzes',
      desc: 'Exam-style MCQs with a countdown, question flagging, and instant review.',
      path: 'quiz'
    },
    {
      icon: 'auto_awesome',
      title: 'AI Quiz Generator',
      desc: 'Generate custom quizzes on any course topic in seconds.',
      path: 'ai-quiz-generator'
    },
    {
      icon: 'local_fire_department',
      title: 'Study Hub',
      desc: 'Daily challenge, spaced-repetition flashcards, and cheat sheets.',
      path: 'study-hub'
    },
    {
      icon: 'calculate',
      title: 'GPA Calculator',
      desc: 'COMSATS-accurate SGPA, CGPA, retake & target GPA planner.',
      path: 'gpa'
    },
    {
      icon: 'dashboard',
      title: 'Dashboard',
      desc: 'Your streaks, accuracy, bookmarks, notes, and exam countdowns in one place.',
      hint: 'Works without an account, saved on this device',
      path: 'dashboard',
      wide: true
    }
  ];

  const stats = [
    { num: platformStats.paperCount, label: 'Past Papers', suffix: '+' },
    { num: platformStats.courseCount, label: 'COMSATS Courses', suffix: '' },
    { num: platformStats.departmentCount, label: 'Academic Departments', suffix: '' }
  ];

  const suggestions = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    if (!q) return subjects.slice(0, 5);
    const normalized = normalizeCourseCode(heroQuery);
    return subjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        (normalized && normalizeCourseCode(s.code).includes(normalized)) ||
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [heroQuery, subjects]);

  const recentActivity = useMemo(() => getRecentActivity(3), []);
  const recentPapers = useMemo(() => getRecentlyViewedPapers(3), []);
  const dailyChallenge = useMemo(() => getDailyChallengeStatus(), []);

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
      onSelectSubject(suggestions[activeSuggestionIdx]);
      return;
    }
    const query = heroQuery.trim();
    onNavigate(query ? `subjects?q=${encodeURIComponent(query)}` : 'subjects');
  };

  const isSuggestionsOpen = !escapeDismissed && (searchFocused || heroQuery.trim().length > 0);
  const activeSuggestionId =
    isSuggestionsOpen && activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]
      ? `${suggestionsListId}-opt-${activeSuggestionIdx}`
      : undefined;

  const handleHeroSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setEscapeDismissed(true);
      setSearchFocused(false);
      setActiveSuggestionIdx(-1);
      return;
    }
    if (e.key === 'ArrowDown' && !isSuggestionsOpen) {
      e.preventDefault();
      setEscapeDismissed(false);
      setSearchFocused(true);
      setActiveSuggestionIdx(0);
      return;
    }
    if (!isSuggestionsOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveSuggestionIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveSuggestionIdx(suggestions.length - 1);
    }
  };

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        {/* Headline */}
        <motion.h1
          className="home-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          Ace Your Exams at <br />
          <span className="home-title-highlight" translate="no">COMSATS University</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="home-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.14 }}
        >
          Past papers, timed quizzes, custom AI practice, flashcards, and COMSATS GPA tools in one fast student workspace.
        </motion.p>

        {/* Global Course & Paper Search Bar with Instant Suggestions */}
        <div
          onFocusCapture={() => setSearchFocused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setSearchFocused(false);
              setActiveSuggestionIdx(-1);
            }
          }}
          className="home-search-wrap"
        >
          <form onSubmit={handleHeroSearchSubmit} role="search" aria-label="Search COMSATS courses and past papers">
            <div className="home-search-box">
              <AppIcon name="search" size={20} className="home-search-icon" />
              <input
                type="search"
                spellCheck={false}
                value={heroQuery}
                onFocus={() => setEscapeDismissed(false)}
                onChange={(e) => {
                  setHeroQuery(e.target.value);
                  setEscapeDismissed(false);
                  setActiveSuggestionIdx(-1);
                }}
                onKeyDown={handleHeroSearchKeyDown}
                placeholder="Search courses (CSC211, OOP)…"
                aria-label="Search by course code or subject name"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isSuggestionsOpen}
                aria-controls={suggestionsListId}
                aria-activedescendant={activeSuggestionId}
                className="home-search-input"
              />
              <button
                type="submit"
                className="home-search-submit"
              >
                Explore
              </button>
            </div>
          </form>

          {isSuggestionsOpen && (
            <div
              id={suggestionsListId}
              role="listbox"
              aria-label="Course suggestions"
              className="home-suggestions-panel"
            >
              {suggestions.length === 0 ? (
                <div className="home-suggestions-empty">
                  No matching course found. Press Explore to browse all subjects.
                </div>
              ) : (
                suggestions.map((subj, idx) => (
                  <button
                    key={subj.code}
                    id={`${suggestionsListId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={idx === activeSuggestionIdx}
                    tabIndex={-1}
                    onClick={() => onSelectSubject(subj)}
                    onMouseEnter={() => setActiveSuggestionIdx(idx)}
                    className={`home-suggestion-btn${idx === activeSuggestionIdx ? ' is-active' : ''}`}
                  >
                    <span>
                      <strong translate="no" className="home-suggestion-code">{subj.code}</strong>
                      {subj.name}
                    </span>
                    <span className="home-suggestion-count tabular-nums">
                      {subj.papers} papers →
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Course quick-jump buttons */}
        <div className="home-quick-jumps" role="group" aria-label="Popular COMSATS courses">
          {QUICK_JUMP_CODES.map((code) => {
            const matched = subjects.find((s) => s.code === code) || { code, name: code };
            return (
              <button
                key={code}
                type="button"
                className="home-quick-jump-btn mono-code"
                translate="no"
                onClick={() => onSelectSubject(matched)}
                aria-label={`Open ${code} ${matched.name} past papers`}
              >
                {code}
              </button>
            );
          })}
        </div>

        {/* Primary CTA */}
        <motion.div
          className="home-cta-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
        >
          <AnimatedButton
            variant="primary"
            icon="auto_stories"
            onClick={() => onNavigate('subjects')}
            className="btn-primary-pill"
          >
            Browse Past Papers
          </AnimatedButton>
        </motion.div>

        {/* Bento destination grid */}
        <div className="home-features-grid">
          {features.map((f) => (
            <SpotlightCard
              key={f.title}
              className={`home-feature-card ${f.wide ? 'home-feature-card--wide' : ''}`}
              onClick={() => onNavigate(f.path)}
              ariaLabel={`Open ${f.title}: ${f.desc}`}
            >
              <div className="home-feature-icon">
                <AppIcon name={f.icon} size={22} />
              </div>
              <div className="home-feature-title">{f.title}</div>
              <p className="home-feature-desc">{f.desc}</p>
              {f.hint && <span className="home-feature-hint">{f.hint}</span>}
            </SpotlightCard>
          ))}
        </div>

        {/* Interactive Remotion Study Loop Preview (lazy-loaded) */}
        <Suspense fallback={<div className="exam-loop-skeleton" aria-hidden="true" />}>
          <ExamLoopPlayer isDark={isDark} />
        </Suspense>

        {/* Recently Studied (shown for logged-in users or returning visitors) */}
        {(user || recentActivity.length > 0 || recentPapers.length > 0) && (
          <section
            aria-label="Recently studied"
            className="home-recent-section"
          >
            <div className="home-recent-head">
              <div>
                <h2 className="home-recent-title">
                  {user ? 'Your recent study session' : 'Recently viewed on this device'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="home-recent-cta"
              >
                Open Full Dashboard →
              </button>
            </div>

            <div className="home-recent-grid">
              {(recentActivity.length > 0 ? recentActivity : [
                { id: 'quick-1', title: 'CSC211: Data Structures', description: 'Browse past papers & solutions', icon: 'description', type: 'paper', subjectCode: 'CSC211' },
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
                  className="home-recent-item"
                >
                  <AppIcon
                    name={item.icon || 'history'}
                    size={22}
                    className="home-recent-item__icon"
                  />
                  <div className="home-recent-item__body">
                    <div className="home-recent-item__title">
                      {item.title}
                    </div>
                    <div className="home-recent-item__desc">
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
          className="home-how-section"
        >
          <div className="home-how-header">
            <h2 className="home-how-title">
              A smarter study loop before every Midterm &amp; Terminal
            </h2>
          </div>

          <div className="home-how-grid">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.title}
                className="home-how-card"
              >
                <div className="home-how-card__top">
                  <AppIcon name={item.icon} size={22} className="home-how-icon" />
                </div>
                <h3 className="home-how-card__title">
                  {item.title}
                </h3>
                <p className="home-how-card__desc">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats: Animated counters */}
        <div className="home-stats-grid">
          {stats.map((s) => (
            <StatItem key={s.label} num={s.num} label={s.label} suffix={s.suffix} />
          ))}
        </div>

        {/* Coming Soon Banner */}
        <ComingSoonBanner />
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMING SOON: Upcoming features teaser section
───────────────────────────────────────────────────────────────── */
const COMING_SOON_FEATURES = [
  {
    icon: 'smart_toy',
    variant: 'brand',
    label: 'AI Study Buddy',
    tag: 'AI',
    desc: 'Your personal 24/7 tutor. Ask any COMSATS course question in plain Urdu or English and get step-by-step explanations, formula breakdowns, and past-paper hints instantly.',
    eta: 'Coming Q1 2027'
  },
  {
    icon: 'groups',
    variant: 'sky',
    label: 'Study Groups',
    tag: 'Social',
    desc: 'Create or join private study rooms with your class batch. Share notes, quiz each other live, and tackle past papers together with real-time collaborative annotations.',
    eta: 'Coming Q1 2027'
  },
  {
    icon: 'auto_graph',
    variant: 'success',
    label: 'Smart Weak-Point Radar',
    tag: 'Analytics',
    desc: 'Auto-detects your shakiest topics from quiz history and generates a targeted 7-day study schedule so you spend zero time guessing what to revise.',
    eta: 'Coming Q2 2027'
  },
  {
    icon: 'model_training',
    variant: 'accent',
    label: 'Mock Exam Simulator',
    tag: 'Exams',
    desc: 'Full 3-hour timed midterm & terminal simulations with official COMSATS marking schemes. Get auto-graded, see your predicted grade, and compare with the class.',
    eta: 'Coming Q2 2027'
  },
  {
    icon: 'notifications_active',
    gradient: 'linear-gradient(135deg, var(--brand) 0%, var(--success) 100%)',
    glow: 'var(--brand-soft)',
    label: 'Exam Countdown Alerts',
    tag: 'Reminders',
    tagColor: 'var(--brand)',
    tagBg: 'var(--brand-soft)',
    desc: 'Set your COMSATS exam dates and receive smart push / WhatsApp reminders with daily revision tasks, so you never miss a beat in the final week.',
    eta: 'Coming Q3 2027'
  }
];

function ComingSoonBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.section
      className="home-coming-section"
      aria-label="Coming Soon Features"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Section header */}
      <div className={`home-coming-head${expanded ? ' home-coming-head--expanded' : ''}`}>
        <h2 className="home-coming-title">
          Big features are on the way
        </h2>
        <p className="home-coming-subtitle">
          We're building the most powerful exam-prep platform ever made for COMSATS students. Here's a sneak peek.
        </p>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="coming-soon-panel"
          className="home-coming-toggle"
        >
          <AppIcon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
          {expanded ? 'Hide upcoming features' : `Preview ${COMING_SOON_FEATURES.length} upcoming features`}
        </button>
      </div>

      {expanded && (
        <div id="coming-soon-panel">
          {/* Feature cards grid */}
          <div className="home-coming-grid">
            {COMING_SOON_FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
                className={`home-coming-card home-coming-card--${f.variant}`}
              >
                {/* Subtle glow blob behind icon */}
                <div aria-hidden="true" className="home-coming-card__glow" />

                {/* Top row: icon */}
                <div className="home-coming-card__top">
                  <div className="home-coming-card__icon-box">
                    <AppIcon name={f.icon} size={22} className="home-coming-card__icon" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="home-coming-card__title">
                  {f.label}
                </h3>

                {/* Description */}
                <p className="home-coming-card__desc">
                  {f.desc}
                </p>

                {/* ETA footer */}
                <div className="home-coming-card__eta">
                  <AppIcon name="schedule" size={14} />
                  {f.eta}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="home-suggest-box">
        <AppIcon name="campaign" size={28} className="home-suggest-icon" />
        <p className="home-suggest-title">
          Want to shape what gets built next?
        </p>
        <p className="home-suggest-desc">
          Share your ideas with the student team. Every voice counts.
        </p>
        <div className="home-suggest-actions">
          <a
            href="mailto:mushtaqahmedsaqi1234@gmail.com?subject=Feature%20Suggestion%20for%20COMSATSPrepHub"
            className="btn-suggest-email"
          >
            <AppIcon name="mail" size={17} />
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
              className="home-wa-icon"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp (0314 9574912)
          </a>
        </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

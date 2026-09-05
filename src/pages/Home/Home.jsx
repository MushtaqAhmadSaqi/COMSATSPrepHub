import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
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

/* ── Spotlight Card Effect ── */
function SpotlightCard({ children, className = '', delay = 0 }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        '--mouse-x': `${mousePosition.x}px`,
        '--mouse-y': `${mousePosition.y}px`,
      }}
    >
      {children}
    </motion.div>
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
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {children}
    </motion.button>
  );
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

  // Parallax effect for hero section
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 500], [0, -100]);
  const opacityParallax = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="home-page-wrapper">
      <section className="home-hero-section">
        {/* Floating particles */}
        <div className="home-particles" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`} />
          ))}
        </div>

        {/* Parallax Background Blobs */}
        <motion.div
          className="hero-blob hero-blob-1"
          style={{ y: yParallax, opacity: opacityParallax }}
          aria-hidden="true"
        />
        <motion.div
          className="hero-blob hero-blob-2"
          style={{ y: yParallax }}
          aria-hidden="true"
        />

        {/* Badge */}
        <motion.div
          className="home-badge-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="home-badge-pill">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
            Built for COMSATS Students
          </div>
        </motion.div>

        {/* Headline — typewriter on highlight */}
        <motion.h1
          className="home-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Ace Your Exams at <br />
          <TypewriterText text="COMSATS University" delay={500} />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="home-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          Past papers, practice quizzes, AI quiz generation, and GPA tools —
          all in one clean, student-first platform built by COMSATS students.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="home-cta-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
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
            icon="quiz"
            onClick={(e) => { addRipple(e); onNavigate('quiz'); }}
            className="btn-secondary-pill ripple-host"
          >
            Start Practice Quiz
          </AnimatedButton>
        </motion.div>

        {/* Feature Cards — Scroll reveal with spotlight effect */}
        <div className="home-features-grid" ref={featuresRef}>
          {features.map((f, i) => (
            <SpotlightCard
              key={i}
              className="home-feature-card"
              delay={i * 0.1}
            >
              <div className="home-feature-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{f.icon}</span>
              </div>
              <div className="home-feature-title">{f.title}</div>
              <p className="home-feature-desc">{f.desc}</p>
            </SpotlightCard>
          ))}
        </div>

        {/* Stats — Animated counters */}
        <div className="home-stats-grid">
          {stats.map((s, i) => (
            <StatItem key={i} num={s.num} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>
    </div>
  );
}
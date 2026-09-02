import React, { useRef, useEffect } from 'react';
import { useScrollReveal } from '../../utils/useScrollReveal';
import './Footer.css';

/* Scroll-reveal wrapper for each footer column */
function RevealCol({ children, delay = 0 }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`footer-col reveal${isVisible ? ' reveal-visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Footer({ onNavigate = () => {} }) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const borderRef = useRef(null);

  /* Expand the gradient border line when footer enters viewport */
  useEffect(() => {
    const el = borderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('footer-border-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el.closest('footer'));
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="app-footer">
      {/* Animated border line */}
      <div className="footer-border-line" ref={borderRef} />

      <div className="footer-container">
        <div className="footer-grid">

          {/* Brand column */}
          <RevealCol delay={0}>
            <div className="footer-brand-title">
              COMSATS<span>PrepHub</span>
            </div>
            <p className="footer-brand-desc">
              Your smart study assistant for COMSATS University exams. Verified past papers,
              quizzes, AI practice generator, and GPA tracking.
            </p>

            {/* Social / contact icons */}
            <div className="footer-social-row">
              <a
                href="mailto:mushtaqahmedsaqi1234@gmail.com"
                className="footer-social-btn"
                aria-label="Email support"
                title="Email Support"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
              </a>
              <a
                href="https://github.com/MushtaqAhmadSaqi"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="GitHub profile"
                title="GitHub"
              >
                {/* Simple GitHub SVG icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </RevealCol>

          {/* Quick Links */}
          <RevealCol delay={80}>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('home')}>Home</button></li>
              <li><button type="button" onClick={() => onNavigate('subjects')}>Browse Subjects</button></li>
              <li><button type="button" onClick={() => onNavigate('quiz')}>Practice Quizzes</button></li>
              <li><button type="button" onClick={() => onNavigate('ai-quiz-generator')}>AI Generator</button></li>
            </ul>
          </RevealCol>

          {/* Tools */}
          <RevealCol delay={160}>
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('gpa')}>GPA Calculator</button></li>
              <li><button type="button" onClick={() => onNavigate('upload')}>Upload Past Paper</button></li>
              <li><button type="button" onClick={() => onNavigate('dashboard')}>Student Dashboard</button></li>
              <li><button type="button" onClick={() => onNavigate('about')}>Our Team</button></li>
            </ul>
          </RevealCol>

          {/* Legal */}
          <RevealCol delay={240}>
            <h4 className="footer-heading">Legal & Info</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('terms')}>Terms of Service</button></li>
              <li><a href="mailto:mushtaqahmedsaqi1234@gmail.com">Contact Support</a></li>
            </ul>

            {/* Back to top */}
            <button type="button" className="footer-back-top" onClick={scrollToTop}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_upward</span>
              Back to top
            </button>
          </RevealCol>

        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} COMSATSPrepHub. Built for COMSATS Students.</p>
          <p>Created by Mushtaq Ahmad Saqi & Contributors.</p>
        </div>
      </div>
    </footer>
  );
}

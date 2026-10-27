import React from 'react';
import './Footer.css';

function RevealCol({ children }) {
  return <div className="footer-col">{children}</div>;
}

export default function Footer({ onNavigate = () => {} }) {
  const scrollToTop = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  };

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-border-line" />

      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand column */}
          <RevealCol>
            <div className="footer-brand-title">
              COMSATS<span>PrepHub</span>
            </div>
            <p className="footer-brand-desc">
              Your smart study companion for COMSATS University exams. Verified past papers,
              practice quizzes, AI quiz generator, flashcards, and COMSATS GPA tracking.
            </p>

            <div className="footer-social-row">
              <a
                href="mailto:mushtaqahmedsaqi1234@gmail.com"
                className="footer-social-btn"
                aria-label="Send email support request"
                title="Email Support"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
              </a>
              <a
                href="https://github.com/MushtaqAhmadSaqi/COMSATSPrepHub"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="Visit COMSATSPrepHub GitHub repository"
                title="GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </RevealCol>

          {/* Study Tools */}
          <RevealCol>
            <h4 className="footer-heading">Study Tools</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('subjects')}>Past Papers Library</button></li>
              <li><button type="button" onClick={() => onNavigate('quiz')}>Practice Quizzes</button></li>
              <li><button type="button" onClick={() => onNavigate('ai-quiz-generator')}>AI Quiz Generator</button></li>
              <li><button type="button" onClick={() => onNavigate('study-hub')}>Daily Challenge &amp; Flashcards</button></li>
              <li><button type="button" onClick={() => onNavigate('gpa')}>GPA &amp; CGPA Calculator</button></li>
            </ul>
          </RevealCol>

          {/* Community & Account */}
          <RevealCol>
            <h4 className="footer-heading">Student Hub</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('dashboard')}>Student Dashboard</button></li>
              <li><button type="button" onClick={() => onNavigate('upload')}>Upload / Request Paper</button></li>
              <li><button type="button" onClick={() => onNavigate('account')}>Account Settings</button></li>
              <li><button type="button" onClick={() => onNavigate('about')}>Meet the Team</button></li>
              <li><button type="button" onClick={() => onNavigate('faq')}>FAQ &amp; Contact Us</button></li>
            </ul>
          </RevealCol>

          {/* Legal & Policies */}
          <RevealCol>
            <h4 className="footer-heading">Legal &amp; Policies</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('terms')}>Terms of Use</button></li>
              <li><button type="button" onClick={() => onNavigate('privacy')}>Privacy Policy</button></li>
              <li><button type="button" onClick={() => onNavigate('disclaimer')}>Copyright &amp; Takedown</button></li>
              <li><a href="mailto:mushtaqahmedsaqi1234@gmail.com">Report Copyright / Issue</a></li>
            </ul>

            <button
              type="button"
              className="footer-back-top"
              onClick={scrollToTop}
              aria-label="Scroll to top of page"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_upward</span>
              Back to top
            </button>
          </RevealCol>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} COMSATSPrepHub. Independent student educational project — not affiliated with official COMSATS administration.</p>
          <p>Created by Mushtaq Ahmad Saqi &amp; Contributors.</p>
        </div>
      </div>
    </footer>
  );
}

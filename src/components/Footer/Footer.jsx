import React from 'react';
import './Footer.css';

export default function Footer({ onNavigate = () => {} }) {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-title">
              COMSATS<span style={{ color: '#38bdf8' }}>PrepHub</span>
            </div>
            <p className="footer-brand-desc">
              Your smart study assistant for COMSATS University exams. Verified past papers, quizzes, AI practice generator, and GPA tracking.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('home')}>Home</button></li>
              <li><button type="button" onClick={() => onNavigate('subjects')}>Browse Subjects</button></li>
              <li><button type="button" onClick={() => onNavigate('quiz')}>Practice Quizzes</button></li>
              <li><button type="button" onClick={() => onNavigate('ai-quiz-generator')}>AI Generator</button></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Tools</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('gpa')}>GPA Calculator</button></li>
              <li><button type="button" onClick={() => onNavigate('upload')}>Upload Past Paper</button></li>
              <li><button type="button" onClick={() => onNavigate('dashboard')}>Student Dashboard</button></li>
              <li><button type="button" onClick={() => onNavigate('about')}>Our Team</button></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Legal & Info</h4>
            <ul className="footer-links">
              <li><button type="button" onClick={() => onNavigate('terms')}>Terms of Service</button></li>
              <li><a href="mailto:mushtaqahmedsaqi1234@gmail.com">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} COMSATSPrepHub. Built for COMSATS Students.</p>
          <p>Created by Mushtaq Ahmad Saqi & Contributors.</p>
        </div>
      </div>
    </footer>
  );
}

import React, { useState } from 'react';
import './Auth.css';

export default function Auth({ onLoginSuccess = () => {} }) {
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess({ name: 'Student User', email: 'student@comsats.edu.pk' });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-card">
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textAlign: 'center', marginBottom: '0.5rem' }}>
          {isSignUp ? 'Create Account' : 'Student Sign In'}
        </h2>
        <p style={{ color: '#64748b', textAlign: 'center', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Access your COMSATS prep tools
        </p>

        <form onSubmit={handleSubmit}>
          <div className="ai-field">
            <label className="ai-label">Email Address</label>
            <input type="email" className="ai-input" placeholder="student@comsats.edu.pk" required />
          </div>

          <div className="ai-field">
            <label className="ai-label">Password</label>
            <input type="password" className="ai-input" placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn-generate-ai" style={{ width: '100%', marginTop: '1rem' }}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#0ea5e9', fontWeight: 700, marginLeft: '0.375rem', cursor: 'pointer' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../services/auth';
import './AuthModal.css';

export default function AuthModal({ isOpen = false, onClose = () => {}, onLoginSuccess = () => {} }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        setLoading(false);
        return;
      }

      const res = await signUpWithEmail(fullName, email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Account created successfully! Checking session...');
        if (res.user) {
          onLoginSuccess(res.user);
          setTimeout(onClose, 1000);
        }
      }
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Signed in successfully!');
        if (res.user) {
          onLoginSuccess(res.user);
          setTimeout(onClose, 800);
        }
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    const res = await signInWithGoogle();
    if (!res.ok) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="auth-header">
          <h3 className="auth-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h3>
          <p className="auth-subtitle">
            {isSignUp ? 'Join COMSATSPrepHub to track your progress' : 'Sign in to access your saved papers & quiz scores'}
          </p>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="auth-form-group">
              <label className="auth-label">Full Name</label>
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. Moeed Ali"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-form-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="student@comsats.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={{ margin: '1rem 0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Or continue with
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '9999px', background: '#ffffff', border: '1px solid #cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          <span>Sign in with Google</span>
        </button>

        <div className="auth-switch-prompt">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" className="auth-switch-btn" onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

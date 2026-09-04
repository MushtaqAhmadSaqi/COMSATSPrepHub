import React, { useState, useEffect, useRef } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../services/auth';
import './AuthModal.css';

/* Inline Google icon — avoids external svgrepo.com dependency */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function AuthModal({
  isOpen = false,
  onClose = () => {},
  onLoginSuccess = () => {}
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cardRef = useRef(null);
  const firstInputRef = useRef(null);

  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /* Move focus into the modal when it opens */
  useEffect(() => {
    if (isOpen) {
      // Use rAF to allow the DOM to render before focusing
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    }
  }, [isOpen, isSignUp]);

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
        setErrorMsg('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const res = await signUpWithEmail(fullName, email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Account created! Signing you in...');
        if (res.user) { onLoginSuccess(res.user); setTimeout(onClose, 1000); }
      }
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Signed in successfully!');
        if (res.user) { onLoginSuccess(res.user); setTimeout(onClose, 800); }
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    const res = await signInWithGoogle();
    if (!res.ok) setErrorMsg(res.error);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div
        className="auth-modal-card"
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isSignUp ? 'Create account' : 'Sign in'}
      >
        {/* Close */}
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>

        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              {isSignUp ? 'person_add' : 'login'}
            </span>
          </div>
          <h3 className="auth-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h3>
          <p className="auth-subtitle">
            {isSignUp
              ? 'Join COMSATSPrepHub to track your progress & save papers'
              : 'Sign in to access your saved papers & quiz scores'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="auth-alert auth-alert-error">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>error</span>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="auth-form-group">
              <label className="auth-label">Full Name</label>
              <input
                ref={firstInputRef}
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
              ref={isSignUp ? undefined : firstInputRef}
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
            <div className="auth-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">or continue with</div>

        {/* Google */}
        <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Sign in with Google
        </button>

        {/* Switch */}
        <div className="auth-switch-prompt">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button type="button" className="auth-switch-btn" onClick={switchMode}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

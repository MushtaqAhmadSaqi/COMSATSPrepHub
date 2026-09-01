import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../services/auth';
import './AuthModal.css';

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
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
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
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            style={{ width: '18px', height: '18px' }}
          />
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

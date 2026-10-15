import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../services/auth';
import { useToast } from '../../utils/toast';
import '../../components/AuthModal/AuthModal.css';
import './Auth.css';

export default function Auth({ onLoginSuccess = () => {} }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isSignUp && !fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    if (isSignUp) {
      const res = await signUpWithEmail(fullName, email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        setSuccessMsg('Account created! Signing you in...');
        toast.success('Account created successfully!');
        if (res.user) onLoginSuccess(res.user);
      }
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        setSuccessMsg('Signed in successfully!');
        toast.success('Welcome back!');
        if (res.user) onLoginSuccess(res.user);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    const res = await signInWithGoogle();
    if (!res.ok) {
      setErrorMsg(res.error);
      toast.error(res.error);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-card">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }} aria-hidden="true">
              {isSignUp ? 'person_add' : 'login'}
            </span>
          </div>
          <h1 className="auth-title">{isSignUp ? 'Create Account' : 'Student Sign In'}</h1>
          <p className="auth-subtitle">
            {isSignUp
              ? 'Join COMSATSPrepHub to track your progress & save papers'
              : 'Sign in with your Supabase account to access your study workspace'}
          </p>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">error</span>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="auth-alert auth-alert-success" role="status">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }} aria-hidden="true">check_circle</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="page-auth-fullname">Full Name</label>
              <input
                id="page-auth-fullname"
                type="text"
                className="auth-input"
                placeholder="e.g. Moeed Ali"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="page-auth-email">Email Address</label>
            <input
              id="page-auth-email"
              type="email"
              className="auth-input"
              placeholder="student@comsats.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="page-auth-password">Password</label>
            <div className="auth-password-wrapper">
              <input
                id="page-auth-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading && (
              <span className="material-symbols-outlined auth-submit-spinner" style={{ fontSize: '18px' }} aria-hidden="true">
                progress_activity
              </span>
            )}
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-divider">or continue with</div>

        <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand)' }} aria-hidden="true">
            account_circle
          </span>
          Sign in with Google
        </button>

        <div className="auth-switch-prompt">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

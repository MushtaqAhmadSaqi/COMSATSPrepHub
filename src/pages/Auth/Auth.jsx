import React, { useState } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  requestPasswordReset,
  validatePasswordStrength
} from '../../services/auth';
import { useToast } from '../../utils/toast';
import '../../components/AuthModal/AuthModal.css';
import './Auth.css';

export default function Auth({ onLoginSuccess = () => {} }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toast = useToast();
  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (honeypot) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (isReset) {
      setLoading(true);
      const res = await requestPasswordReset(email);
      setLoading(false);
      if (!res.ok) setErrorMsg(res.error);
      else {
        setSuccessMsg(res.message);
        toast.info('Reset instructions sent if account exists.');
      }
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      const pwdCheck = validatePasswordStrength(password);
      if (!pwdCheck.valid) {
        setErrorMsg(pwdCheck.error);
        return;
      }
    } else if (password.length < 8) {
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
              {isReset ? 'lock_reset' : isSignUp ? 'person_add' : 'login'}
            </span>
          </div>
          <h1 className="auth-title">
            {isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Student Sign In'}
          </h1>
          <p className="auth-subtitle">
            {isReset
              ? 'We will send a password recovery link to your registered email'
              : isSignUp
                ? 'Join COMSATSPrepHub to track your progress & save papers'
                : 'Sign in with your account to access your study workspace'}
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
          <input
            type="text"
            name="website_url"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
          />

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

          {!isReset && (
            <div className="auth-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label" htmlFor="page-auth-password">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); }}
                    style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)' }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
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
              {isSignUp && (
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                  Use 8+ characters with uppercase, lowercase, and a number.
                </span>
              )}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading && (
              <span className="material-symbols-outlined auth-submit-spinner" style={{ fontSize: '18px' }} aria-hidden="true">
                progress_activity
              </span>
            )}
            {loading
              ? 'Processing...'
              : isReset
                ? 'Send Reset Link'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
          </button>
        </form>

        {!isReset && (
          <>
            <div className="auth-divider">or continue with</div>
            <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--brand)' }} aria-hidden="true">
                account_circle
              </span>
              Sign in with Google
            </button>
          </>
        )}

        <div className="auth-switch-prompt">
          {isReset ? (
            <>
              Remembered your password?
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Sign In
              </button>
            </>
          ) : isSignUp ? (
            <>
              Already have an account?
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

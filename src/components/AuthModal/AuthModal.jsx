import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  requestPasswordReset,
  validatePasswordStrength
} from '../../services/auth';
import { useToast } from '../../utils/toast';
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
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const toast = useToast();

  const cardRef = useRef(null);
  const firstInputRef = useRef(null);
  const triggerRef = useRef(null);

  const isSignUp = mode === 'signup';
  const isReset = mode === 'reset';

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    } else if (triggerRef.current) {
      triggerRef.current.focus?.();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (honeypot) return; // Silently drop bot submissions

    setErrorMsg('');
    setSuccessMsg('');

    if (isReset) {
      setLoading(true);
      const res = await requestPasswordReset(email);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message);
        toast.info('Password reset instructions sent if account exists.');
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
      setLoading(true);
      const res = await signUpWithEmail(fullName, email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        setSuccessMsg('Account created! Check your email or continue...');
        toast.success('Account created successfully!');
        if (res.user) {
          onLoginSuccess(res.user);
          setTimeout(onClose, 900);
        }
      }
    } else {
      setLoading(true);
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        setSuccessMsg('Signed in successfully!');
        toast.success('Welcome back!');
        if (res.user) {
          onLoginSuccess(res.user);
          setTimeout(onClose, 700);
        }
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

  const switchToMode = (nextMode) => {
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
    setFieldErrors({});
  };

  const validateField = (field, value) => {
    const errs = { ...fieldErrors };
    switch (field) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errs.email = 'Please enter a valid email address';
        } else {
          delete errs.email;
        }
        break;
      case 'password':
        if (isSignUp && value) {
          const check = validatePasswordStrength(value);
          if (!check.valid) errs.password = check.error;
          else delete errs.password;
        } else if (value && value.length < 8) {
          errs.password = 'Must be at least 8 characters';
        } else {
          delete errs.password;
        }
        break;
      case 'fullName':
        if (isSignUp && value !== undefined && !value.trim()) {
          errs.fullName = 'Name is required';
        } else {
          delete errs.fullName;
        }
        break;
      default:
        break;
    }
    setFieldErrors(errs);
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
        aria-labelledby="auth-modal-title"
      >
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>

        <div className="auth-header">
          <div className="auth-icon-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              {isReset ? 'lock_reset' : isSignUp ? 'person_add' : 'login'}
            </span>
          </div>
          <h3 className="auth-title" id="auth-modal-title">
            {isReset ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h3>
          <p className="auth-subtitle">
            {isReset
              ? 'Enter your email to receive a password reset link'
              : isSignUp
                ? 'Join COMSATSPrepHub to track your progress & save papers'
                : 'Sign in to access your saved papers & quiz scores'}
          </p>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>error</span>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success" role="status">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>check_circle</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Anti-bot honeypot field */}
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
              <label className="auth-label" htmlFor="auth-fullname">Full Name</label>
              <input
                ref={firstInputRef}
                id="auth-fullname"
                type="text"
                className={`auth-input${fieldErrors.fullName ? ' auth-input--error' : ''}`}
                placeholder="e.g. Moeed Ali"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={(e) => validateField('fullName', e.target.value)}
                autoComplete="name"
                enterKeyHint="next"
                required
              />
              {fieldErrors.fullName && <span className="auth-field-error">{fieldErrors.fullName}</span>}
            </div>
          )}

          <div className="auth-form-group">
            <label className="auth-label" htmlFor="auth-email">Email Address</label>
            <input
              ref={isSignUp ? undefined : firstInputRef}
              id="auth-email"
              type="email"
              className={`auth-input${fieldErrors.email ? ' auth-input--error' : ''}`}
              placeholder="student@comsats.edu.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateField('email', e.target.value)}
              autoComplete="email"
              enterKeyHint="next"
              required
            />
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          {!isReset && (
            <div className="auth-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label" htmlFor="auth-password">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => switchToMode('reset')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--brand)',
                      cursor: 'pointer'
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="auth-password-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input${fieldErrors.password ? ' auth-input--error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={(e) => validateField('password', e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  enterKeyHint="done"
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
              {isSignUp && !fieldErrors.password && (
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                  Min 8 characters with uppercase, lowercase &amp; a number
                </span>
              )}
              {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading && (
              <span className="material-symbols-outlined auth-submit-spinner" style={{ fontSize: '18px' }}>
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
              <GoogleIcon />
              Sign in with Google
            </button>
          </>
        )}

        <div className="auth-switch-prompt">
          {isReset ? (
            <>
              Remembered your password?
              <button type="button" className="auth-switch-btn" onClick={() => switchToMode('login')}>
                Back to Sign In
              </button>
            </>
          ) : isSignUp ? (
            <>
              Already have an account?
              <button type="button" className="auth-switch-btn" onClick={() => switchToMode('login')}>
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?
              <button type="button" className="auth-switch-btn" onClick={() => switchToMode('signup')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

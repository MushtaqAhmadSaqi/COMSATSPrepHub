import React, { useEffect, useState } from 'react';
import { exportAllStudentData, clearAllStudentData, clearCloudStudyActivity, getStudentPrefs, saveStudentPrefs } from '../../utils/studyTracker';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../utils/analytics';
import { updatePassword, validatePasswordStrength } from '../../services/auth';
import { toast } from '../../utils/toast';

export default function Account({
  user,
  onOpenAuth = () => {},
  passwordRecovery = false,
  onPasswordUpdated = () => {}
}) {
  const [prefs, setPrefs] = useState(() => getStudentPrefs());
  const [analyticsConsent, setConsentState] = useState(() => getAnalyticsConsent() || 'declined');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    const handleOwnerChange = () => setPrefs(getStudentPrefs());
    window.addEventListener('pph:workspace-owner-changed', handleOwnerChange);
    return () => window.removeEventListener('pph:workspace-owner-changed', handleOwnerChange);
  }, []);

  const handleExport = () => {
    const data = exportAllStudentData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comsatsprephub-student-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded student data backup!');
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all local study history, bookmarks, and quiz attempts? This cannot be undone.')) {
      return;
    }
    const cloud = user ? await clearCloudStudyActivity() : { ok: true, reason: 'guest' };
    clearAllStudentData();
    if (cloud.ok) {
      toast.info(user ? 'All local and synced study data cleared.' : 'All local study data cleared.');
    } else {
      toast.error(
        'Local study data cleared, but your synced activity could not be deleted. Please retry or email us from the footer.'
      );
    }
  };

  const handleCampusChange = (e) => {
    const campus = e.target.value;
    const next = saveStudentPrefs({ campus });
    setPrefs(next);
    toast.success('Campus preference updated.');
  };

  const handleToggleAnalytics = (e) => {
    const next = e.target.checked ? 'accepted' : 'declined';
    setAnalyticsConsent(next);
    setConsentState(next);
    toast.info(next === 'accepted' ? 'Anonymous analytics enabled.' : 'Analytics disabled (essential storage only).');
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (updatingPassword) return;

    const check = validatePasswordStrength(newPassword);
    if (!check.valid) {
      toast.error(check.error);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The two passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    const res = await updatePassword(newPassword);
    setUpdatingPassword(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated. Use your new password the next time you sign in.');
    onPasswordUpdated();
  };

  return (
    <div style={{ maxWidth: '48rem', margin: '2rem auto', padding: '0 1rem', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand)' }}>Student Account &amp; Settings</h1>
        <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>
          Manage your campus preferences, privacy controls, and data export.
        </p>
      </div>

      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--brand)' }} aria-hidden="true">person</span>
          Profile
        </h2>
        {user ? (
          <div>
            <p><strong>Signed in as:</strong> {user.email}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Your activity feed is synced with your account. Bookmarks, notes, flashcards, GPA plans,
              and exam countdowns stay in this browser.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }}>
              You are using local guest mode. Sign in to sync your activity feed across devices; bookmarks, notes, and flashcards stay in this browser.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              style={{
                minHeight: '44px',
                padding: '0.625rem 1.25rem',
                borderRadius: '9999px',
                background: 'var(--brand)',
                color: 'var(--on-brand)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Sign In / Register
            </button>
          </div>
        )}
      </div>

      {passwordRecovery && (
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '2px solid var(--brand)', boxShadow: 'var(--shadow-2)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--brand)' }} aria-hidden="true">lock_reset</span>
            Set a New Password
          </h2>

          {user ? (
            <form onSubmit={handleSetNewPassword} noValidate>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
                You reached this page from a password reset link. Choose a new password to finish recovery.
              </p>

              <label htmlFor="account-new-password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                New password
              </label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  minHeight: '44px',
                  width: '100%',
                  maxWidth: '360px',
                  padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  marginBottom: '0.85rem'
                }}
              />

              <label htmlFor="account-confirm-password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Confirm new password
              </label>
              <input
                id="account-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  minHeight: '44px',
                  width: '100%',
                  maxWidth: '360px',
                  padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  marginBottom: '0.5rem'
                }}
              />

              <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
                Use 8+ characters with uppercase, lowercase, and a number.
              </p>

              <button
                type="submit"
                disabled={updatingPassword}
                style={{
                  minHeight: '44px',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '9999px',
                  background: 'var(--brand)',
                  color: 'var(--on-brand)',
                  border: 'none',
                  cursor: updatingPassword ? 'default' : 'pointer',
                  fontWeight: 600
                }}
              >
                {updatingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }} role="alert">
              This password reset link is invalid or has expired. Request a new reset email from the sign-in page.
            </p>
          )}
        </div>
      )}

      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--brand)' }} aria-hidden="true">school</span>
          Campus Preference
        </h2>
        <label htmlFor="account-campus-select" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Primary COMSATS Campus:
        </label>
        <select
          id="account-campus-select"
          value={prefs.campus || 'Islamabad'}
          onChange={handleCampusChange}
          style={{
            minHeight: '44px',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-2)',
            color: 'var(--text)',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '300px'
          }}
        >
          {['Islamabad', 'Lahore', 'Wah', 'Abbottabad', 'Attock', 'Sahiwal', 'Vehari', 'Virtual Campus'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-2)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--brand)' }} aria-hidden="true">dataset</span>
          Data &amp; Privacy Control
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
          You retain complete ownership of your study history and notes. You can export or erase your data at any time.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={analyticsConsent === 'accepted'}
            onChange={handleToggleAnalytics}
          />
          Allow optional anonymous analytics to help improve COMSATSPrepHub
        </label>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">download</span>
            Export All Data (JSON)
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="account-clear-data"
            style={{
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--danger)',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">delete_forever</span>
            Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
}

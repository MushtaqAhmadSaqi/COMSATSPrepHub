import React, { useEffect, useState } from 'react';
import { exportAllStudentData, clearAllStudentData, clearCloudStudyActivity, getStudentPrefs, saveStudentPrefs } from '../../utils/studyTracker';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../utils/analytics';
import { updatePassword, validatePasswordStrength } from '../../services/auth';
import { toast } from '../../utils/toast';
import AppIcon from '../../components/ui/AppIcon';
import Modal from '../../components/ui/Modal';
import './Account.css';

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

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const handleClear = () => {
    setConfirmClearOpen(true);
  };

  const confirmClearLocalData = async () => {
    setClearingData(true);
    try {
      const cloud = user ? await clearCloudStudyActivity() : { ok: true, reason: 'guest' };
      clearAllStudentData();
      setConfirmClearOpen(false);
      if (cloud.ok) {
        toast.info(user ? 'All local and synced study data cleared.' : 'All local study data cleared.');
      } else {
        toast.error(
          'Local study data cleared, but your synced activity could not be deleted. Please retry or email us from the footer.'
        );
      }
    } finally {
      setClearingData(false);
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
    <div className="account-container">
      <div className="account-header">
        <h1 className="account-title">Student Account &amp; Settings</h1>
        <p className="account-subtitle">
          Manage your campus preferences, privacy controls, and data export.
        </p>
      </div>

      <div className="account-card">
        <h2 className="account-card-title">
          <AppIcon name="person" size={20} className="account-card-icon" />
          Profile
        </h2>
        {user ? (
          <div>
            <p><strong>Signed in as:</strong> {user.email}</p>
            <p className="account-note">
              Your activity feed is synced with your account. Bookmarks, notes, flashcards, GPA plans,
              and exam countdowns stay in this browser.
            </p>
          </div>
        ) : (
          <div>
            <p className="account-copy">
              You are using local guest mode. Sign in to sync your activity feed across devices; bookmarks, notes, and flashcards stay in this browser.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="account-btn account-btn--primary"
            >
              Sign In / Register
            </button>
          </div>
        )}
      </div>

      {passwordRecovery && (
        <div className="account-card account-card--highlight">
          <h2 className="account-card-title account-card-title--tight">
            <AppIcon name="lock_reset" size={20} className="account-card-icon" />
            Set a New Password
          </h2>

          {user ? (
            <form onSubmit={handleSetNewPassword} noValidate>
              <p className="account-copy">
                You reached this page from a password reset link. Choose a new password to finish recovery.
              </p>

              <label htmlFor="account-new-password" className="account-label">
                New password
              </label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="account-input"
              />

              <label htmlFor="account-confirm-password" className="account-label">
                Confirm new password
              </label>
              <input
                id="account-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="account-input account-input--last"
              />

              <p className="account-hint">
                Use 8+ characters with uppercase, lowercase, and a number.
              </p>

              <button
                type="submit"
                disabled={updatingPassword}
                className="account-btn account-btn--primary"
              >
                {updatingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          ) : (
            <p className="account-alert" role="alert">
              This password reset link is invalid or has expired. Request a new reset email from the sign-in page.
            </p>
          )}
        </div>
      )}

      <div className="account-card">
        <h2 className="account-card-title">
          <AppIcon name="school" size={20} className="account-card-icon" />
          Campus Preference
        </h2>
        <label htmlFor="account-campus-select" className="account-label account-label--spaced">
          Primary COMSATS Campus:
        </label>
        <select
          id="account-campus-select"
          value={prefs.campus || 'Islamabad'}
          onChange={handleCampusChange}
          className="account-select"
        >
          {['Islamabad', 'Lahore', 'Wah', 'Abbottabad', 'Attock', 'Sahiwal', 'Vehari', 'Virtual Campus'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="account-card account-card--flush">
        <h2 className="account-card-title">
          <AppIcon name="dataset" size={20} className="account-card-icon" />
          Data &amp; Privacy Control
        </h2>
        <p className="account-copy">
          You retain complete ownership of your study history and notes. You can export or erase your data at any time.
        </p>

        <label className="account-checkbox-label">
          <input
            type="checkbox"
            checked={analyticsConsent === 'accepted'}
            onChange={handleToggleAnalytics}
          />
          Allow optional anonymous analytics to help improve COMSATSPrepHub
        </label>

        <div className="account-actions">
          <button
            type="button"
            onClick={handleExport}
            className="account-btn account-btn--secondary"
          >
            <AppIcon name="download" size={18} />
            Export All Data (JSON)
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="account-btn account-btn--outline-danger account-clear-data"
          >
            <AppIcon name="delete_forever" size={18} />
            Clear Local Data
          </button>

          <Modal
            isOpen={confirmClearOpen}
            onClose={() => {
              if (!clearingData) setConfirmClearOpen(false);
            }}
            title="Clear Study Data?"
          >
            <p className="account-modal-copy">
              This permanently deletes all local study history, bookmarks, notes, flashcards, and quiz attempts
              {user ? ' (as well as your synced cloud study activity)' : ' stored on this device'}. This action cannot be undone.
            </p>
            <div className="account-modal-actions">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                disabled={clearingData}
                className="account-btn account-btn--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearLocalData}
                disabled={clearingData}
                className="account-btn account-btn--danger"
              >
                <AppIcon name={clearingData ? 'progress_activity' : 'delete_forever'} size={18} />
                {clearingData ? 'Clearing…' : 'Yes, Clear Everything'}
              </button>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}

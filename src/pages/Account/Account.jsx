import React, { useState } from 'react';
import { exportAllStudentData, clearAllStudentData, getStudentPrefs, saveStudentPrefs } from '../../utils/studyTracker';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../utils/analytics';
import { toast } from '../../utils/toast';

export default function Account({ user, onOpenAuth = () => {} }) {
  const [prefs, setPrefs] = useState(() => getStudentPrefs());
  const [analyticsConsent, setConsentState] = useState(() => getAnalyticsConsent() || 'declined');

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

  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all local study history, bookmarks, and quiz attempts? This cannot be undone.')) {
      clearAllStudentData();
      toast.info('All local study data cleared.');
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

  return (
    <div style={{ maxWidth: '48rem', margin: '2rem auto', padding: '0 1rem', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand)' }}>Student Account &amp; Settings</h1>
        <p style={{ color: 'var(--text-subtle)', marginTop: '0.5rem' }}>
          Manage your campus preferences, sync status, privacy controls, and data export.
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
              Your progress and saved papers are synchronized with your account.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-subtle)', marginBottom: '1rem' }}>
              You are using local guest mode. Sign in to sync your study activity across devices.
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              style={{
                minHeight: '44px',
                padding: '0.625rem 1.25rem',
                borderRadius: '9999px',
                background: 'var(--brand)',
                color: '#fff',
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
            style={{
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              borderRadius: '9999px',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
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

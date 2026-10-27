import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CookieNotice.css';

const CONSENT_KEY = 'pph_analytics_consent';

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export default function CookieNotice({ onNavigate }) {
  const [consent, setConsent] = useState(readConsent);

  useEffect(() => {
    if (consent === null && navigator.doNotTrack === '1') {
      setConsent('declined');
    }
  }, [consent]);

  const saveConsent = (value) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // The notice can still be dismissed when browser storage is unavailable.
    }
    setConsent(value);
  };

  return (
    <AnimatePresence>
      {consent === null && (
        <motion.aside
          className="cookie-notice"
          role="dialog"
          aria-labelledby="cookie-notice-title"
          aria-describedby="cookie-notice-description"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.25 }}
        >
          <div className="cookie-notice__content">
            <span className="material-symbols-outlined cookie-notice__icon" aria-hidden="true">
              cookie
            </span>
            <div>
              <h2 id="cookie-notice-title">Privacy and analytics</h2>
              <p id="cookie-notice-description">
                We use essential browser storage to keep COMSATSPrepHub working. Optional,
                anonymous analytics help us improve the site and are only enabled if you accept.
              </p>
              <button
                type="button"
                className="cookie-notice__link"
                onClick={() => onNavigate('terms')}
              >
                Read our privacy policy
              </button>
            </div>
          </div>
          <div className="cookie-notice__actions">
            <button
              type="button"
              className="cookie-notice__button cookie-notice__button--secondary"
              onClick={() => saveConsent('declined')}
            >
              Essential only
            </button>
            <button
              type="button"
              className="cookie-notice__button cookie-notice__button--primary"
              onClick={() => saveConsent('accepted')}
            >
              Accept analytics
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnalyticsConsent, setAnalyticsConsent, initConsentGatedAnalytics } from '../../utils/analytics';
import './CookieNotice.css';

export default function CookieNotice({ onNavigate }) {
  const [consent, setConsent] = useState(getAnalyticsConsent);

  useEffect(() => {
    if (consent === null && navigator.doNotTrack === '1') {
      setConsent('declined');
    } else if (consent === 'accepted') {
      initConsentGatedAnalytics();
    }
  }, [consent]);

  const saveConsent = (value) => {
    setAnalyticsConsent(value);
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
                onClick={() => onNavigate('privacy')}
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

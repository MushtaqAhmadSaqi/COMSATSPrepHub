import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnalyticsConsent, setAnalyticsConsent, initConsentGatedAnalytics } from '../../utils/analytics';
import AppIcon from '../ui/AppIcon';
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22 }}
        >
          <div className="cookie-notice__content">
            <AppIcon name="cookie" className="cookie-notice__icon" size={22} />
            <div>
              <h2 id="cookie-notice-title">Privacy and analytics</h2>
              <p id="cookie-notice-description">
                Essential browser storage keeps <span translate="no">COMSATSPrepHub</span> working. Optional analytics help improve exam tools only if accepted.
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

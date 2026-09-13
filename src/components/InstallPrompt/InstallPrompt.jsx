import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './InstallPrompt.css';

/**
 * InstallPrompt — subtle banner shown once on second visit, encouraging PWA install.
 * Uses sessionStorage to gate display. Listens for `beforeinstallprompt`.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on second+ visit
    try {
      const visits = Number(sessionStorage.getItem('pph_visits') || '0') + 1;
      sessionStorage.setItem('pph_visits', String(visits));
      if (visits < 2) return;
      if (sessionStorage.getItem('pph_install_dismissed')) return;
    } catch { return; }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    try { sessionStorage.setItem('pph_install_dismissed', 'true'); } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="install-prompt"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="install-prompt__content">
            <span className="material-symbols-outlined install-prompt__icon">
              install_mobile
            </span>
            <div className="install-prompt__text">
              <strong>Install COMSATSPrepHub</strong>
              <span>Quick access from your home screen</span>
            </div>
          </div>
          <div className="install-prompt__actions">
            <button
              type="button"
              className="install-prompt__btn install-prompt__btn--install"
              onClick={handleInstall}
            >
              Install
            </button>
            <button
              type="button"
              className="install-prompt__btn install-prompt__btn--dismiss"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

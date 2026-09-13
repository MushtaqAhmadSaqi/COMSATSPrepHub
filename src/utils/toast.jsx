import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './toast.css';

/* ─────────────────────────────────────────────────────────────────
   TOAST CONTEXT & PROVIDER
   Usage:
     // In App.jsx — wrap children with <ToastProvider>
     // In any component — const toast = useToast();
     //                     toast.success('Saved!');
     //                     toast.error('Failed to load');
     //                     toast.info('Copied to clipboard');
───────────────────────────────────────────────────────────────── */

const ToastContext = createContext(null);

const ICONS = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4000;

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((type, message) => {
    const id = ++toastIdCounter;
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      // Keep only the latest MAX_TOASTS
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    // Auto-dismiss
    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, AUTO_DISMISS_MS);

    return id;
  }, [removeToast]);

  const toast = useCallback(
    {
      success: (msg) => addToast('success', msg),
      error: (msg) => addToast('error', msg),
      info: (msg) => addToast('info', msg),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addToast]
  );

  // Check reduced-motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 24, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 12, scale: 0.95 } };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast--${t.type}`}
              layout
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="material-symbols-outlined toast__icon">
                {ICONS[t.type]}
              </span>
              <span className="toast__content">{t.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — returns { success, error, info } functions to show toasts.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — log to console instead
    return {
      success: (msg) => console.log('[toast:success]', msg),
      error: (msg) => console.error('[toast:error]', msg),
      info: (msg) => console.info('[toast:info]', msg),
    };
  }
  return ctx;
}

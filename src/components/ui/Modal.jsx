import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Generic accessible Modal dialog component with focus trap and focus restoration.
 */
export default function Modal({
  isOpen = false,
  onClose = () => {},
  title = '',
  children
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const focusTimer = requestAnimationFrame(() => {
      const focusables = modalRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        focusables[0].focus();
      }
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '32rem',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-3)',
              padding: '1.75rem',
              color: 'var(--text)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}
            >
              {title && (
                <h3
                  id="modal-title"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text)'
                  }}
                >
                  {title}
                </h3>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-subtle)',
                  padding: '0.5rem',
                  minWidth: '40px',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9999px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">
                  close
                </span>
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ErrorState — displayed when a fetch/operation fails. Includes retry button.
 *
 * @param {object}   props
 * @param {string}   [props.message]  — Error description text
 * @param {function} [props.onRetry]  — Called when user clicks Retry
 */
export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <motion.div
      className="error-state"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '3rem',
          color: 'var(--danger)',
          display: 'block',
          marginBottom: '1rem',
        }}
      >
        error_outline
      </span>
      <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)', marginBottom: '0.375rem' }}>
        Oops! Something went wrong
      </p>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', marginBottom: '1.5rem', maxWidth: '360px', margin: '0 auto 1.5rem' }}>
        {message}
      </p>
      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            borderRadius: '9999px',
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

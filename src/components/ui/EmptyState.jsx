import React from 'react';
import { motion } from 'framer-motion';

/**
 * EmptyState — friendly placeholder when a list/page has no data.
 *
 * @param {object}   props
 * @param {string}   props.icon          — Material Symbol name
 * @param {string}   props.title         — Primary message
 * @param {string}   [props.description] — Secondary text
 * @param {string}   [props.actionLabel] — CTA button text
 * @param {function} [props.onAction]    — CTA click handler
 */
export default function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        color: 'var(--text-subtle)',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '3rem',
          color: 'var(--border-strong)',
          display: 'block',
          marginBottom: '1rem',
        }}
      >
        {icon}
      </span>
      <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: '0.875rem', marginBottom: actionLabel ? '1.5rem' : 0 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <motion.button
          type="button"
          onClick={onAction}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            borderRadius: '9999px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-brand)',
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import AppIcon from './AppIcon';
import './StateDisplay.css';

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
      className="error-state ui-state-error"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="ui-state-icon ui-state-icon--danger">
        <AppIcon name="error_outline" size={46} />
      </div>
      <p className="ui-state-title ui-state-title--error">
        Something went wrong
      </p>
      <p className="ui-state-desc ui-state-desc--spaced">
        {message}
      </p>
      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="ui-state-retry"
        >
          <AppIcon name="refresh" size={18} />
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

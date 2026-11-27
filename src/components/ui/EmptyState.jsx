import React from 'react';
import { motion } from 'framer-motion';
import AppIcon from './AppIcon';
import './StateDisplay.css';

/**
 * EmptyState — friendly placeholder when a list/page has no data.
 *
 * @param {object}   props
 * @param {string}   [props.icon='inbox'] — AppIcon key
 * @param {string}   props.title          — Primary message
 * @param {string}   [props.description]  — Secondary text
 * @param {string}   [props.actionLabel]  — CTA button text
 * @param {function} [props.onAction]     — CTA click handler
 */
export default function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }) {
  return (
    <motion.div
      className="empty-state ui-state-empty"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="ui-state-icon">
        <AppIcon name={icon} size={46} />
      </div>
      <p className="ui-state-title">
        {title}
      </p>
      {description && (
        <p className={`ui-state-desc${actionLabel ? ' ui-state-desc--spaced' : ''}`}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <motion.button
          type="button"
          onClick={onAction}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="ui-state-action"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

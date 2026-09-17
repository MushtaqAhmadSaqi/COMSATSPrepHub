import React from 'react';
import './Breadcrumbs.css';

/**
 * Breadcrumbs navigation component.
 *
 * @param {object} props
 * @param {Array<{label: string, onClick?: () => void}>} props.items
 */
export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs-container">
      <ol className="breadcrumbs-list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const displayLabel = item.label && item.label.length > 24
            ? item.label.slice(0, 24) + '…'
            : item.label;

          return (
            <li key={idx} className="breadcrumbs-item">
              {idx > 0 && (
                <span className="material-symbols-outlined breadcrumbs-separator" aria-hidden="true">
                  chevron_right
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="breadcrumbs-current"
                  title={item.label}
                >
                  {displayLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="breadcrumbs-link"
                  title={item.label}
                >
                  {displayLabel}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

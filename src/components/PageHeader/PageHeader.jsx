import React from 'react';
import './PageHeader.css';

/**
 * Shared PageHeader component.
 *
 * @param {object} props
 * @param {string} [props.badge] - Optional badge text
 * @param {string} props.title - Required page title
 * @param {string} [props.subtitle] - Optional subtitle text
 * @param {'left'|'center'} [props.align='left'] - Text alignment
 * @param {React.ReactNode} [props.children] - Optional right action or extra header content
 */
export default function PageHeader({
  badge,
  title,
  subtitle,
  align = 'left',
  children
}) {
  const isCenter = align === 'center';

  return (
    <header className={`page-header ${isCenter ? 'page-header--center' : ''}`}>
      <div className="page-header__content">
        {badge && (
          <span className="section-badge page-header__badge">
            {badge}
          </span>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  );
}

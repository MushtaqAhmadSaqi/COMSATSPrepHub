import React from 'react';
import './Skeleton.css';

/**
 * Skeleton — shimmer placeholder for loading states.
 *
 * @param {object}  props
 * @param {string}  [props.variant='rect']  — 'text' | 'rect' | 'circle'
 * @param {string}  [props.width]           — CSS width (e.g. '100%', '120px')
 * @param {string}  [props.height]          — CSS height (e.g. '1rem', '200px')
 * @param {string}  [props.className]       — Additional classes
 */
export function Skeleton({ variant = 'rect', width, height, className = '', style = {} }) {
  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard — matches subject/quiz card layout.
 */
export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__header">
        <Skeleton variant="text" width="60px" height="0.75rem" />
        <Skeleton variant="circle" width="24px" height="24px" />
      </div>
      <div className="skeleton-card__body">
        <Skeleton variant="text" width="80%" height="1rem" />
        <Skeleton variant="text" width="60%" height="0.75rem" />
      </div>
    </div>
  );
}

/**
 * SkeletonListItem — matches paper list item layout.
 */
export function SkeletonListItem() {
  return (
    <div className="skeleton-list-item" aria-hidden="true">
      <div className="skeleton-list-item__icon">
        <Skeleton variant="circle" width="40px" height="40px" />
      </div>
      <div className="skeleton-list-item__body">
        <Skeleton variant="text" width="75%" height="1rem" />
        <Skeleton variant="text" width="40%" height="0.75rem" />
      </div>
    </div>
  );
}

/**
 * SkeletonStatCard — matches dashboard stat card layout.
 */
export function SkeletonStatCard() {
  return (
    <div className="skeleton-stat-card" aria-hidden="true">
      <Skeleton variant="text" width="60%" height="0.75rem" />
      <Skeleton variant="text" width="40%" height="2rem" />
      <Skeleton variant="text" width="50%" height="0.625rem" />
    </div>
  );
}

export default Skeleton;

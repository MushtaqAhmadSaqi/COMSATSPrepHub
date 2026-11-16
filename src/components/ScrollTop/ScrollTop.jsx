import React, { useState, useEffect, useCallback } from 'react';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';
import './ScrollTop.css';

export default function ScrollTop() {
  const prefersReduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 300);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'instant' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`scroll-top-btn${visible ? ' scroll-top-btn--visible' : ''}`}
      onClick={scrollToTop}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Scroll to top of page"
    >
      <span className="material-symbols-outlined">arrow_upward</span>
    </button>
  );
}

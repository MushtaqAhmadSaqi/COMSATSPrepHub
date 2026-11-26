import React, { useState, useEffect, useCallback } from 'react';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';
import AppIcon from '../ui/AppIcon';
import './ScrollTop.css';

export default function ScrollTop() {
  const prefersReduced = usePrefersReducedMotion();
  const [scrolledPastFold, setScrolledPastFold] = useState(false);
  const [footerInView, setFooterInView] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolledPastFold(window.scrollY > 360);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Hide the floating ScrollTop control when the footer's own "Back to top" button is visible
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const footerEl = document.querySelector('footer.app-footer');
    if (!footerEl) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.05 }
    );
    observer.observe(footerEl);
    return () => observer.disconnect();
  }, []);

  const visible = scrolledPastFold && !footerInView;

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
      <AppIcon name="arrow_upward" size={20} />
    </button>
  );
}

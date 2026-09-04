import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal — triggers when element enters the viewport.
 * @param {Object} options
 * @param {number} options.threshold — 0–1, how much of the element must be visible. Default 0.15
 * @param {boolean} options.once — only trigger once. Default true
 * @returns {{ ref, isVisible }}
 */
export function useScrollReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preference — immediately show
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return { ref, isVisible };
}

/**
 * useScrollRevealList — applies staggered reveal to an array of child elements.
 *
 * Uses a SINGLE shared IntersectionObserver for all children rather than one
 * per child, reducing the number of active observers from O(n) to O(1).
 *
 * @param {number} count — number of items
 * @param {Object} options — passed to IntersectionObserver
 * @returns {{ containerRef, visibleSet }} — visibleSet is a Set of visible indices
 */
export function useScrollRevealList(count, { threshold = 0.1, once = true } = {}) {
  const containerRef = useRef(null);
  const [visibleSet, setVisibleSet] = useState(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced-motion — immediately reveal all items
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleSet(new Set(Array.from({ length: count }, (_, i) => i)));
      return;
    }

    const children = Array.from(container.children);

    // Single shared observer — much cheaper than one observer per child
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = children.indexOf(entry.target);
            if (idx !== -1) {
              setVisibleSet((prev) => new Set([...prev, idx]));
              if (once) observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold }
    );

    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [count, threshold, once]);

  return { containerRef, visibleSet };
}

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
 * useScrollRevealList — applies staggered reveal to an array of refs.
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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleSet(new Set(Array.from({ length: count }, (_, i) => i)));
      return;
    }

    const children = Array.from(container.children);
    const observers = children.map((child, idx) => {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSet((prev) => new Set([...prev, idx]));
            if (once) obs.disconnect();
          }
        },
        { threshold }
      );
      obs.observe(child);
      return obs;
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [count, threshold, once]);

  return { containerRef, visibleSet };
}

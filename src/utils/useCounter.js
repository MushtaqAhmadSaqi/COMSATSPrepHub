import { useEffect, useRef, useState } from 'react';

/**
 * useCounter — smoothly counts up to `target` without flashing 0 on first paint
 * and stays reactive when live catalog data updates `target`.
 * @param {number} target — final numeric value
 * @param {object} [options]
 * @param {number} [options.duration=1100] — animation duration in ms
 * @param {string} [options.suffix=''] — suffix appended to number (e.g. "+")
 * @param {number} [options.decimals=0] — fractional precision
 * @returns {{ ref: import('react').RefObject<any>, display: string }}
 */
export function useCounter(target, { duration = 1100, suffix = '', decimals = 0 } = {}) {
  const numericTarget = Number(target) || 0;
  const ref = useRef(null);
  const [count, setCount] = useState(numericTarget);
  const hasAnimated = useRef(false);

  useEffect(() => {
    setCount(numericTarget);
  }, [numericTarget]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined' ||
      hasAnimated.current
    ) {
      setCount(numericTarget);
      return undefined;
    }

    const startValue = Math.round(numericTarget * 0.72);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          const startTime = performance.now();
          const easeOut = (t) => 1 - Math.pow(1 - t, 3);

          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = startValue + easeOut(progress) * (numericTarget - startValue);
            setCount(current);
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [numericTarget, duration]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toString();
  return { ref, display: `${formatted}${suffix}` };
}

import { useEffect, useRef, useState } from 'react';

/**
 * useCounter — animates a number from 0 to `target` when the element enters viewport.
 * @param {number} target — final number value (e.g. 500)
 * @param {number} duration — animation duration in ms. Default 1500
 * @param {string} suffix — text after number, e.g. "+" or "K+". Default ""
 * @returns {{ ref, display }} — attach ref to element, display is the formatted string
 */
export function useCounter(target, { duration = 1500, suffix = '' } = {}) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion — show final value immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          observer.disconnect();

          const startTime = performance.now();
          const easeOut = (t) => 1 - Math.pow(1 - t, 3); // cubic ease-out

          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(easeOut(progress) * target);
            setCount(current);
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, display: `${count}${suffix}` };
}

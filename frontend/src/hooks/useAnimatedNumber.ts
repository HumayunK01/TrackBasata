import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Eases a displayed number toward `value` so totals animate instead of jumping. */
export function useAnimatedNumber(value: number, duration = 400) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    fromRef.current = display;
    startRef.current = 0;
    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const step = (t: number) => {
      if (!startRef.current) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + delta * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduce]);

  return display;
}

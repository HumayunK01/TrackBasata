import { useEffect, useState } from "react";

/**
 * Debounces a value by the specified delay in milliseconds.
 * Useful for fast-keystroke inputs like search bars to eliminate re-render churn.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}

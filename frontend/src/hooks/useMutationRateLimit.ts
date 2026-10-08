import { useRef } from "react";

interface Config {
  maxRequests: number;
  windowMs: number;
}

// ponytail: per-component-instance UX guard only — resets on unmount, not a shared limiter.
// Server-side RLS/Supabase is the authoritative rate limit.
export function useMutationRateLimit({ maxRequests, windowMs }: Config) {
  const timestamps = useRef<number[]>([]);

  const checkLimit = (): boolean => {
    const now = Date.now();
    timestamps.current = timestamps.current.filter((t) => now - t < windowMs);
    if (timestamps.current.length >= maxRequests) return false;
    timestamps.current.push(now);
    return true;
  };

  return { checkLimit };
}

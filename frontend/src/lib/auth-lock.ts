// Tolerant replacement for supabase-auth's navigatorLock (pass via
// createClient auth.lock). Same semantics, except that when the caller asks
// for an immediate, no-wait acquire (acquireTimeout === 0, used by the
// auto-refresh tick) and another tab holds the lock, we skip silently instead
// of throwing NavigatorLockAcquireTimeoutError — the tab holding the lock
// performs the refresh. Callers with acquireTimeout > 0 (sign-in, sign-out,
// user-triggered refresh) still wait for the timeout and still error, so a
// dropped operation can't happen.
// ponytail: worst case in the skip path is a slightly delayed token refresh
// in this tab; supabase's refresh-token reuse interval covers any cross-tab race.
export function tolerantNavigatorLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks) return fn(); // no Web Locks support: run uncoordinated, like supabase's fallback

  if (acquireTimeout === 0) {
    return locks.request(name, { mode: "exclusive", ifAvailable: true }, (lock) => {
      // busy: skip this tick, don't throw
      if (!lock) return Promise.resolve(undefined as R);
      return fn();
    }) as Promise<R>;
  }

  const controller = new AbortController();
  const timer =
    acquireTimeout > 0
      ? window.setTimeout(() => controller.abort(), acquireTimeout)
      : undefined;
  return (locks
    .request(name, { mode: "exclusive", signal: controller.signal }, () => fn()) as Promise<R>)
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Mirror supabase's timeout error shape (callers check isAcquireTimeout).
        const err = new Error(
          `Acquiring an exclusive lock "${name}" timed out`,
        ) as Error & { isAcquireTimeout: boolean };
        err.isAcquireTimeout = true;
        throw err;
      }
      throw error;
    })
    .finally(() => {
      if (timer !== undefined) window.clearTimeout(timer);
    });
}
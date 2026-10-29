const POLL_INTERVAL_MS = 2 * 60 * 1000; // Check for new deployments every 2 minutes
const IDLE_CHECK_INTERVAL_MS = 1000; // Check every 1s once an update is pre-cached
const MIN_IDLE_MS = 5000; // 5s without taps/typing before swapping an active visible tab
const LAST_APPLIED_SIG_KEY = "basata_last_auto_update_sig";

export interface ExtractedBuildAssets {
  signature: string | null;
  assetUrls: string[];
}

/**
 * Extracts the entry module script signature and all hashed `/assets/` URLs from HTML text.
 */
export function extractBuildAssetsFromHtml(html: string): ExtractedBuildAssets {
  const assetUrls = new Set<string>();
  let signature: string | null = null;

  const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.includes("/assets/")) {
      assetUrls.add(src);
      if (!signature) signature = src;
    }
  }

  const linkRegex = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.includes("/assets/")) {
      assetUrls.add(href);
    }
  }

  return {
    signature,
    assetUrls: Array.from(assetUrls),
  };
}

/**
 * Reads the currently loaded production bundle signature from the live DOM.
 * Returns null in local Vite dev mode (`/src/main.tsx`).
 */
export function getCurrentDomSignature(doc: Document = document): string | null {
  const scripts = Array.from(doc.querySelectorAll<HTMLScriptElement>("script[src]"));
  for (const s of scripts) {
    const src = s.getAttribute("src") || "";
    if (src.includes("/assets/")) {
      return src;
    }
  }
  return null;
}

/**
 * Checks whether the current screen is safe for an instant <100ms reload swap:
 * 1. No unsaved counter taps (`counter_dirty` / `counter_pending_rescue`).
 * 2. User is not focused inside an `<input>`, `<textarea>`, `<select>`, or contenteditable.
 * 3. No open modal, sheet, or alert dialog (`[role="dialog"]` / `[role="alertdialog"]`).
 * 4. Tab is either hidden (`visibilityState === "hidden"`) OR idle for >= MIN_IDLE_MS.
 */
export function isSafeToAutoSwap(
  lastActivityAt: number,
  now: number = Date.now(),
  doc: Document = document,
  storage: Storage = localStorage
): boolean {
  try {
    if (storage.getItem("counter_dirty") === "true") return false;
    if (storage.getItem("counter_pending_rescue")) return false;
  } catch {
    // Ignore storage errors
  }

  const active = doc.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) {
      return false;
    }
  }

  const openOverlay = doc.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  if (openOverlay) return false;

  if (doc.visibilityState === "hidden") {
    return true;
  }

  return now - lastActivityAt >= MIN_IDLE_MS;
}

async function prefetchAssetUrls(urls: string[]): Promise<void> {
  await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "force-cache",
      })
    )
  );
}

export function initAutoUpdater(reloadFn: () => void = () => window.location.reload()): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const currentSignature = getCurrentDomSignature(document);
  let lastActivityAt = Date.now();
  let updateReadySignature: string | null = null;
  let isChecking = false;
  let idleTimer: ReturnType<typeof setInterval> | null = null;

  const markActivity = () => {
    lastActivityAt = Date.now();
  };

  const applySwapIfSafe = () => {
    if (!updateReadySignature) return;
    if (!isSafeToAutoSwap(lastActivityAt)) return;

    try {
      if (sessionStorage.getItem(LAST_APPLIED_SIG_KEY) === updateReadySignature) {
        updateReadySignature = null;
        return;
      }
      sessionStorage.setItem(LAST_APPLIED_SIG_KEY, updateReadySignature);
    } catch {
      // Ignore sessionStorage errors
    }

    if (idleTimer) {
      clearInterval(idleTimer);
      idleTimer = null;
    }
    reloadFn();
  };

  const startIdleWatcher = () => {
    if (idleTimer) return;
    applySwapIfSafe();
    idleTimer = setInterval(applySwapIfSafe, IDLE_CHECK_INTERVAL_MS);
  };

  const checkForUpdate = async () => {
    // Only poll in production builds where hashed /assets/ scripts exist
    if (!currentSignature || isChecking || updateReadySignature) return;
    isChecking = true;

    try {
      const res = await fetch(`/index.html?_t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!res.ok) return;

      const html = await res.text();
      const { signature: nextSignature, assetUrls } = extractBuildAssetsFromHtml(html);

      if (nextSignature && nextSignature !== currentSignature) {
        try {
          if (sessionStorage.getItem(LAST_APPLIED_SIG_KEY) === nextSignature) return;
        } catch {
          // Ignore storage errors
        }

        // Pre-warm the new JS and CSS chunks into the browser HTTP cache before swapping
        await prefetchAssetUrls(assetUrls);
        updateReadySignature = nextSignature;
        startIdleWatcher();
      }
    } catch {
      // Ignore transient network errors
    } finally {
      isChecking = false;
    }
  };

  // Recover seamlessly if a lazy-loaded route chunk 404s right after a deploy
  const onPreloadError = (event: Event) => {
    const key = `vite_preload_recover_${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Ignore storage errors
    }
    event.preventDefault();
    if (isSafeToAutoSwap(0)) {
      reloadFn();
    } else {
      updateReadySignature = `preload_recovery_${Date.now()}`;
      startIdleWatcher();
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      applySwapIfSafe();
    } else {
      void checkForUpdate();
    }
  };

  window.addEventListener("pointerdown", markActivity, { passive: true });
  window.addEventListener("keydown", markActivity, { passive: true });
  window.addEventListener("wheel", markActivity, { passive: true });
  window.addEventListener("touchstart", markActivity, { passive: true });
  window.addEventListener("vite:preloadError", onPreloadError);
  document.addEventListener("visibilitychange", onVisibilityChange);

  const pollTimer = setInterval(() => {
    void checkForUpdate();
  }, POLL_INTERVAL_MS);

  return () => {
    window.removeEventListener("pointerdown", markActivity);
    window.removeEventListener("keydown", markActivity);
    window.removeEventListener("wheel", markActivity);
    window.removeEventListener("touchstart", markActivity);
    window.removeEventListener("vite:preloadError", onPreloadError);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearInterval(pollTimer);
    if (idleTimer) clearInterval(idleTimer);
  };
}

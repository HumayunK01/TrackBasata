import { useCallback, useSyncExternalStore } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function isExpired(session: Session): boolean {
  return !!session.expires_at && session.expires_at * 1000 < Date.now();
}

// ── Hard session cap: force logout 10 hours after sign-in, no matter what ──
const SESSION_START_KEY = "basata-session-started-at";
const MAX_SESSION_MS = 10 * 60 * 60 * 1000; // 10 hours
const WARN_BEFORE_MS = 15 * 60 * 1000; // warn 15 minutes before the cap trips

let forcedLogoutInFlight = false;
let capWarningShown = false;

function sessionElapsedMs(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_START_KEY);
    if (!raw) return null;
    const started = Number(raw);
    if (!Number.isFinite(started)) return null;
    return Date.now() - started;
  } catch {
    return null;
  }
}

function sessionCapExceeded(): boolean {
  const elapsed = sessionElapsedMs();
  return elapsed !== null && elapsed > MAX_SESSION_MS;
}

function maybeWarnSessionEnding() {
  if (capWarningShown) return;
  const elapsed = sessionElapsedMs();
  if (elapsed === null || elapsed <= MAX_SESSION_MS - WARN_BEFORE_MS || elapsed > MAX_SESSION_MS) return;
  capWarningShown = true;
  const minutesLeft = Math.max(1, Math.round((MAX_SESSION_MS - elapsed) / 60_000));
  toast.warning(
    `Your session ends in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}. Save your work — you'll need to sign in again.`,
    { duration: 15_000 },
  );
}

function markSessionStart(reset = false) {
  try {
    if (reset || !localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      capWarningShown = false;
    }
  } catch {
    // Ignore localStorage failures
  }
}

function clearSessionLocalStorage() {
  capWarningShown = false;
  try {
    // ponytail: preserve visual theme preferences, profile role cache, and any
    // unsynced counter rescue payload across 10-hour session resets.
    const theme = localStorage.getItem("basata-theme");
    const variant = localStorage.getItem("basata-theme-variant");
    const profileCache = localStorage.getItem("basata_profile_cache");
    const existingRescue = localStorage.getItem("counter_pending_rescue");
    const isDirty = localStorage.getItem("counter_dirty") === "true";
    const dirtyCounts = localStorage.getItem("counter_counts");
    const dirtyDate = localStorage.getItem("counter_counts_date");

    localStorage.clear();

    if (theme) localStorage.setItem("basata-theme", theme);
    if (variant) localStorage.setItem("basata-theme-variant", variant);
    if (profileCache) localStorage.setItem("basata_profile_cache", profileCache);
    if (isDirty && dirtyCounts && dirtyDate) {
      localStorage.setItem(
        "counter_pending_rescue",
        JSON.stringify({ date: dirtyDate, counts: JSON.parse(dirtyCounts) })
      );
    } else if (existingRescue) {
      localStorage.setItem("counter_pending_rescue", existingRescue);
    }
  } catch {
    // Ignore localStorage failures
  }
  try {
    sessionStorage.clear();
  } catch {
    // Ignore sessionStorage failures
  }
}

export { clearSessionLocalStorage };

async function flushDirtyCountsBeforeSignOut(): Promise<void> {
  try {
    if (localStorage.getItem("counter_dirty") !== "true") return;
    const rawCounts = localStorage.getItem("counter_counts");
    const logDate = localStorage.getItem("counter_counts_date");
    if (!rawCounts || !logDate) return;

    const counts = JSON.parse(rawCounts) as Record<string, number>;
    const total = Object.values(counts).reduce((s, v) => s + (v || 0), 0);
    if (total <= 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error: rpcError } = await supabase.rpc("sync_daily_log_counts", {
      p_user_id: userId,
      p_log_date: logDate,
      p_counts: counts,
      p_force_keys: [],
    });

    if (!rpcError) {
      localStorage.removeItem("counter_dirty");
      localStorage.removeItem("counter_pending_rescue");
      return;
    }

    const { data: existing } = await supabase
      .from("daily_logs")
      .select("counts, is_off_day, notes")
      .eq("user_id", userId)
      .eq("log_date", logDate)
      .maybeSingle();

    const merged: Record<string, number> = { ...((existing?.counts as Record<string, number>) ?? {}) };
    for (const [k, v] of Object.entries(counts)) {
      merged[k] = Math.max(v || 0, merged[k] || 0);
    }

    const { error: upsertError } = await supabase
      .from("daily_logs")
      .upsert(
        {
          user_id: userId,
          log_date: logDate,
          counts: merged,
          is_off_day: existing?.is_off_day ?? false,
          notes: existing?.notes ?? null,
        },
        { onConflict: "user_id,log_date" }
      );

    if (!upsertError) {
      localStorage.removeItem("counter_dirty");
      localStorage.removeItem("counter_pending_rescue");
    }
  } catch {
    // Best-effort flush; counter_pending_rescue remains in localStorage as fallback
  }
}

function forceLogout() {
  if (forcedLogoutInFlight) return;
  forcedLogoutInFlight = true;
  try {
    localStorage.removeItem(SESSION_START_KEY);
  } catch {
    // Ignore localStorage failures
  }
  void flushDirtyCountsBeforeSignOut().finally(() => {
    clearSessionLocalStorage();
    supabase.auth.signOut().finally(() => {
      forcedLogoutInFlight = false;
    });
  });
  toast.info("Your session has ended after 10 hours. Please sign in again.");
}

// ── Shared singleton auth store so 15+ mounted hooks share 1 session listener ──
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

let currentState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

const listeners = new Set<() => void>();
let activeSubscription: { unsubscribe: () => void } | null = null;
let activeCapInterval: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function setAuthState(next: AuthState) {
  if (
    currentState.user === next.user &&
    currentState.session === next.session &&
    currentState.loading === next.loading
  ) {
    return;
  }
  currentState = next;
  for (const listener of listeners) {
    listener();
  }
}

function ensureAuthSubscription() {
  if (initialized) return;
  initialized = true;

  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      if (session && (isExpired(session) || sessionCapExceeded())) {
        forceLogout();
        setAuthState({ user: null, session: null, loading: false });
      } else {
        if (session) {
          markSessionStart();
          maybeWarnSessionEnding();
        } else {
          clearSessionLocalStorage();
        }
        setAuthState({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
        });
      }
    })
    .catch(() => {
      setAuthState({ user: null, session: null, loading: false });
    });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      clearSessionLocalStorage();
      setAuthState({ user: null, session: null, loading: false });
      return;
    }

    // On a fresh sign-in (or user switch), reset the 10-hour session start clock
    // so a stale timestamp from the previous day never kicks out a newly signed-in user.
    const isNewSignIn =
      event === "SIGNED_IN" &&
      (!currentState.user || currentState.user.id !== session.user.id || sessionCapExceeded());

    if (isNewSignIn) {
      markSessionStart(true);
    } else if (isExpired(session) || sessionCapExceeded()) {
      forceLogout();
      setAuthState({ user: null, session: null, loading: false });
      return;
    } else {
      markSessionStart();
    }

    setAuthState({
      user: session.user ?? null,
      session,
      loading: false,
    });
  });

  activeSubscription = subscription;

  activeCapInterval = setInterval(() => {
    if (sessionCapExceeded()) {
      forceLogout();
      setAuthState({ user: null, session: null, loading: false });
    } else {
      maybeWarnSessionEnding();
    }
  }, 60_000);
}

function subscribeAuth(listener: () => void) {
  ensureAuthSubscription();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      activeSubscription?.unsubscribe();
      activeSubscription = null;
      if (activeCapInterval !== null) {
        clearInterval(activeCapInterval);
        activeCapInterval = null;
      }
      initialized = false;
    }
  };
}

function getAuthSnapshot(): AuthState {
  return currentState;
}

export function getCurrentAccessToken(): string | null {
  return currentState.session?.access_token ?? null;
}

export function useAuth() {
  const state = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

  const signOut = useCallback(async () => {
    await flushDirtyCountsBeforeSignOut();
    clearSessionLocalStorage();
    setAuthState({ user: null, session: null, loading: false });
    return supabase.auth.signOut();
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (sessionCapExceeded()) {
      forceLogout();
      setAuthState({ user: null, session: null, loading: false });
      return false;
    }
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await flushDirtyCountsBeforeSignOut();
      clearSessionLocalStorage();
      await supabase.auth.signOut();
      setAuthState({ user: null, session: null, loading: false });
      return false;
    }
    setAuthState({
      user: data.session.user ?? null,
      session: data.session,
      loading: false,
    });
    return true;
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    signOut,
    refreshSession,
  };
}

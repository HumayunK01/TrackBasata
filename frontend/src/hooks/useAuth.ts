import { useEffect, useReducer } from "react";
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

// Several components mount useAuth; these guard against duplicate
// signOut calls + toasts when the cap trips or the warning fires.
// ponytail: intentional module-level singletons for cross-instance dedup — don't move into state.
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

function markSessionStart() {
  try {
    // Only set once per login so refreshes/tab reloads don't extend the cap
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }
  } catch {
    // Ignore localStorage failures
  }
}

function clearSessionLocalStorage() {
  capWarningShown = false;
  try {
    // ponytail: preserve visual theme preferences so logout doesn't flash white in dark mode
    const theme = localStorage.getItem("basata-theme");
    const variant = localStorage.getItem("basata-theme-variant");
    localStorage.clear();
    if (theme) localStorage.setItem("basata-theme", theme);
    if (variant) localStorage.setItem("basata-theme-variant", variant);
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

function forceLogout() {
  if (forcedLogoutInFlight) return;
  forcedLogoutInFlight = true;
  clearSessionLocalStorage();
  supabase.auth.signOut().finally(() => {
    forcedLogoutInFlight = false;
  });
  toast.info("Your session has ended after 10 hours. Please sign in again.");
}

interface AuthState { user: User | null; session: Session | null; loading: boolean; }
type AuthAction =
  | { type: "set"; session: Session | null }
  | { type: "ready" }
  | { type: "clear" };

function authReducer(s: AuthState, a: AuthAction): AuthState {
  switch (a.type) {
    case "set": return { user: a.session?.user ?? null, session: a.session, loading: false };
    case "ready": return { ...s, loading: false };
    case "clear": return { user: null, session: null, loading: false };
  }
}

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, { user: null, session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && (isExpired(session) || sessionCapExceeded())) {
        forceLogout();
        dispatch({ type: "clear" });
      } else {
        if (session) {
          markSessionStart();
          maybeWarnSessionEnding();
        } else {
          clearSessionLocalStorage();
        }
        dispatch({ type: "set", session });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        clearSessionLocalStorage();
        dispatch({ type: "set", session: null });
        return;
      }
      if (isExpired(session) || sessionCapExceeded()) {
        forceLogout();
        dispatch({ type: "clear" });
        return;
      }
      markSessionStart();
      dispatch({ type: "set", session });
    });

    // Periodic check so the cap also trips mid-session (or on laptop wake)
    const capInterval = setInterval(() => {
      if (sessionCapExceeded()) {
        forceLogout();
        dispatch({ type: "clear" });
      } else {
        maybeWarnSessionEnding();
      }
    }, 60_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(capInterval);
    };
  }, []);

  const signOut = () => {
    clearSessionLocalStorage();
    return supabase.auth.signOut();
  };

  const refreshSession = async (): Promise<boolean> => {
    if (sessionCapExceeded()) {
      forceLogout();
      dispatch({ type: "clear" });
      return false;
    }
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      clearSessionLocalStorage();
      await supabase.auth.signOut();
      dispatch({ type: "clear" });
      return false;
    }
    dispatch({ type: "set", session: data.session });
    return true;
  };

  return { user: state.user, session: state.session, loading: state.loading, signOut, refreshSession };
}

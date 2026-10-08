import { useReducer, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Eye, EyeOff, Sun, Moon, Check, X } from "@/components/ui/icons";
import { useTheme } from "@/hooks/useTheme";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";

const PASSWORD_RULES = [
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(p) },
];

type Mode = "login" | "signup";

interface LoginState {
  mode: Mode;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  showPassword: boolean;
  loading: boolean;
  confirmEmail: string | null;
}

type LoginAction =
  | { type: "set_mode"; mode: Mode }
  | { type: "set_email"; v: string }
  | { type: "set_password"; v: string }
  | { type: "set_first"; v: string }
  | { type: "set_last"; v: string }
  | { type: "toggle_pw" }
  | { type: "submitting" }
  | { type: "done" }
  | { type: "signup_success"; email: string }
  | { type: "back_to_login" };

const loginInit: LoginState = {
  mode: "login",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  showPassword: false,
  loading: false,
  confirmEmail: null,
};

function loginReducer(s: LoginState, a: LoginAction): LoginState {
  switch (a.type) {
    case "set_mode": return { ...s, mode: a.mode, firstName: "", lastName: "" };
    case "set_email": return { ...s, email: a.v };
    case "set_password": return { ...s, password: a.v };
    case "set_first": return { ...s, firstName: a.v };
    case "set_last": return { ...s, lastName: a.v };
    case "toggle_pw": return { ...s, showPassword: !s.showPassword };
    case "submitting": return { ...s, loading: true };
    case "done": return { ...s, loading: false };
    case "signup_success": return { ...loginInit, confirmEmail: a.email };
    case "back_to_login": return { ...loginInit };
    default: return s;
  }
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const [s, dispatch] = useReducer(loginReducer, loginInit);
  const { mode, email, password, firstName, lastName, showPassword, loading, confirmEmail } = s;
  const attemptTimestamps = useRef<number[]>([]);

  useEffect(() => {
    document.title = mode === "signup" ? "Sign Up · Basata Tracker" : "Sign In · Basata Tracker";
  }, [mode]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter(t => now - t < WINDOW_MS);
    if (attemptTimestamps.current.length >= MAX_ATTEMPTS) return false;
    attemptTimestamps.current.push(now);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }
    if (mode === "signup") {
      if (!firstName.trim()) { toast.error("First name is required."); return; }
      if (!lastName.trim()) { toast.error("Last name is required."); return; }
    }
    dispatch({ type: "submitting" });
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        });
        if (error) throw error;
        dispatch({ type: "signup_success", email });
        return;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      dispatch({ type: "done" });
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background px-4 py-8 sm:px-6 overflow-hidden select-none">

      {/* Atmospheric radial glow and ambient gradient */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[400px] bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] blur-[130px] rounded-full" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
      </div>

      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="size-9 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-2xs transition-all cursor-pointer"
        >
          {theme === "dark" ? <Sun className="size-4.5" strokeWidth={1.75} /> : <Moon className="size-4.5" strokeWidth={1.75} />}
        </button>
      </div>

      {/* Main card */}
      <AnimatePresence mode="wait">
        {confirmEmail ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[400px]"
          >
            <div className="bg-card/95 backdrop-blur-2xl border border-border/70 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6 text-center">
              <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-2xs">
                <AppFavicon className="size-8 object-contain" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground font-heading">
                  Check your email
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a confirmation link to{" "}
                  <span className="font-semibold text-foreground break-all">{confirmEmail}</span>.
                  Please click the link in your email to activate your account.
                </p>
              </div>

              <Button
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs shadow-emerald-600/25 active:scale-[0.98]"
                onClick={() => dispatch({ type: "back_to_login" })}
              >
                Back to sign in
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Didn&apos;t receive it? Check your spam folder or wait a few minutes.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[400px]"
          >
            <div className="bg-card/95 backdrop-blur-2xl border border-border/70 rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">

              {/* Logo & Subtitle */}
              <div className="space-y-3 text-center">
                <div className="flex justify-center">
                  <AppLogo className="h-10 object-contain drop-shadow-xs" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sign in to continue to Basata Tracker
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First and last name for signup */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2.5 overflow-hidden"
                  >
                    <Input
                      type="text"
                      placeholder="First name"
                      aria-label="First name"
                      value={firstName}
                      onChange={(e) => dispatch({ type: "set_first", v: e.target.value })}
                      required
                      autoComplete="given-name"
                      className="h-11 rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                    />
                    <Input
                      type="text"
                      placeholder="Last name"
                      aria-label="Last name"
                      value={lastName}
                      onChange={(e) => dispatch({ type: "set_last", v: e.target.value })}
                      required
                      autoComplete="family-name"
                      className="h-11 rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                    />
                  </motion.div>
                )}

                {/* Email input */}
                <div className="space-y-1.5">
                  <Input
                    type="email"
                    placeholder="Email address"
                    aria-label="Email address"
                    value={email}
                    onChange={(e) => dispatch({ type: "set_email", v: e.target.value })}
                    required
                    autoComplete="email"
                    className="h-11 rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                  />
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      aria-label="Password"
                      value={password}
                      onChange={(e) => dispatch({ type: "set_password", v: e.target.value })}
                      required
                      minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="h-11 rounded-xl bg-muted/40 border-border/60 text-sm pr-11 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "toggle_pw" })}
                      tabIndex={-1}
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                {/* Password rules for signup */}
                {mode === "signup" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1"
                  >
                    {PASSWORD_RULES.map(({ label, test }) => {
                      const passed = password.length > 0 && test(password);
                      const untouched = password.length === 0;
                      return (
                        <div
                          key={label}
                          className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                            untouched ? "text-muted-foreground" : passed ? "text-emerald-500 font-medium" : "text-destructive font-medium"
                          }`}
                        >
                          {untouched || passed
                            ? <Check className="size-3 shrink-0" strokeWidth={2} />
                            : <X className="size-3 shrink-0" strokeWidth={2} />}
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  Login
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

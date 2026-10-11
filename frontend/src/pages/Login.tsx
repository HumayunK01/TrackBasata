import { useReducer, useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Eye, EyeOff, Sun, Moon, Check, X, RefreshCw } from "@/components/ui/icons";
import { useTheme } from "@/hooks/useTheme";
import { AppLogo } from "@/components/ar/AppLogo";
import { AppFavicon } from "@/components/ar/AppFavicon";

const PASSWORD_RULES = [
  { id: "len", label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { id: "lower", label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "num", label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "Special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p) },
];

type Mode = "login" | "signup" | "forgot";

interface LoginState {
  mode: Mode;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  showPassword: boolean;
  loading: boolean;
  confirmEmail: string | null;
  resetSentEmail: string | null;
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
  | { type: "reset_sent"; email: string }
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
  resetSentEmail: null,
};

function loginReducer(s: LoginState, a: LoginAction): LoginState {
  switch (a.type) {
    case "set_mode":
      return {
        ...s,
        mode: a.mode,
        confirmEmail: null,
        resetSentEmail: null,
      };
    case "set_email":
      return { ...s, email: a.v };
    case "set_password":
      return { ...s, password: a.v };
    case "set_first":
      return { ...s, firstName: a.v };
    case "set_last":
      return { ...s, lastName: a.v };
    case "toggle_pw":
      return { ...s, showPassword: !s.showPassword };
    case "submitting":
      return { ...s, loading: true };
    case "done":
      return { ...s, loading: false };
    case "signup_success":
      return { ...s, loading: false, confirmEmail: a.email };
    case "reset_sent":
      return { ...s, loading: false, resetSentEmail: a.email };
    case "back_to_login":
      return { ...loginInit, email: s.email };
    default:
      return s;
  }
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const [s, dispatch] = useReducer(loginReducer, loginInit);
  const {
    mode,
    email,
    password,
    firstName,
    lastName,
    showPassword,
    loading,
    confirmEmail,
    resetSentEmail,
  } = s;

  const attemptTimestamps = useRef<number[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (mode === "signup") {
      document.title = "Create Account · Basata Tracker";
    } else if (mode === "forgot") {
      document.title = "Reset Password · Basata Tracker";
    } else {
      document.title = "Sign In · Basata Tracker";
    }
  }, [mode]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter((t) => now - t < WINDOW_MS);
    if (attemptTimestamps.current.length >= MAX_ATTEMPTS) return false;
    attemptTimestamps.current.push(now);
    return true;
  };

  const handleResendConfirmation = async () => {
    if (!confirmEmail || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmEmail,
      });
      if (error) throw error;
      toast.success("Confirmation email sent.");
      setResendCooldown(60);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to resend confirmation email.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) {
      toast.error("Too many attempts. Please wait a minute and try again.");
      return;
    }

    if (mode === "signup") {
      if (!firstName.trim()) {
        toast.error("First name is required.");
        return;
      }
      if (!lastName.trim()) {
        toast.error("Last name is required.");
        return;
      }
      const failedRule = PASSWORD_RULES.find((r) => !r.test(password));
      if (failedRule) {
        toast.error(`Password requirement not met: ${failedRule.label}`);
        return;
      }
    }

    dispatch({ type: "submitting" });

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });
        if (error) throw error;
        dispatch({ type: "signup_success", email: email.trim() });
        setResendCooldown(60);
        return;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        dispatch({ type: "reset_sent", email: email.trim() });
        toast.success("Check your inbox for a reset link.");
        return;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      dispatch({ type: "done" });
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background px-4 py-12 sm:px-6 select-none overflow-hidden">
      
      {/* Subtle atmospheric background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-[120px] rounded-full" />
      </div>

      {/* Theme toggle */}
      <div className="fixed top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="size-9 rounded-lg border border-border/60 bg-card/70 backdrop-blur-md hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-2xs transition-all cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="size-4" strokeWidth={1.75} />
          ) : (
            <Moon className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[380px]">
        
        {/* Brand logo */}
        <div className="mb-6 flex justify-center">
          <AppLogo className="h-9 object-contain" />
        </div>

        <div className="bg-card/90 backdrop-blur-xl border border-border/70 rounded-2xl p-6 sm:p-7 shadow-xl">
          <AnimatePresence mode="wait">
            {confirmEmail ? (
              /* Confirmation email screen */
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5 text-center"
              >
                <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <AppFavicon className="size-6 object-contain" />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-lg font-semibold tracking-tight text-foreground font-heading">
                    Check your email
                  </h1>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We sent a confirmation link to{" "}
                    <span className="font-medium text-foreground break-all">{confirmEmail}</span>.
                    Click the link in the email to activate your account.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resendCooldown > 0 || resendLoading}
                    onClick={handleResendConfirmation}
                    className="w-full h-10 rounded-lg text-xs font-medium cursor-pointer border-border/70"
                  >
                    {resendLoading ? (
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3 mr-2" />
                    )}
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend email"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => dispatch({ type: "back_to_login" })}
                  >
                    Back to sign in
                  </Button>
                </div>
              </motion.div>
            ) : resetSentEmail ? (
              /* Reset link sent screen */
              <motion.div
                key="reset-sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5 text-center"
              >
                <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <Check className="size-6" strokeWidth={2} />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-lg font-semibold tracking-tight text-foreground font-heading">
                    Reset link sent
                  </h1>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If an account exists for{" "}
                    <span className="font-medium text-foreground break-all">{resetSentEmail}</span>,
                    you will receive an email with instructions to set a new password.
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  onClick={() => dispatch({ type: "back_to_login" })}
                >
                  Back to sign in
                </Button>
              </motion.div>
            ) : (
              /* Auth form */
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="space-y-1 text-center">
                  <h1 className="text-lg font-semibold tracking-tight text-foreground font-heading">
                    {mode === "login"
                      ? "Sign in to Basata Tracker"
                      : mode === "signup"
                      ? "Create an account"
                      : "Reset password"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {mode === "login"
                      ? "Enter your credentials to continue"
                      : mode === "signup"
                      ? "Enter your details to get started"
                      : "Enter your email to receive a reset link"}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First & Last name for signup */}
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-3 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          First name
                        </label>
                        <Input
                          type="text"
                          aria-label="First name"
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => dispatch({ type: "set_first", v: e.target.value })}
                          required
                          autoComplete="given-name"
                          className="h-10 px-3 rounded-lg bg-background border-border text-sm text-foreground placeholder:text-muted-foreground/50 hover:border-border/80 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Last name
                        </label>
                        <Input
                          type="text"
                          aria-label="Last name"
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => dispatch({ type: "set_last", v: e.target.value })}
                          required
                          autoComplete="family-name"
                          className="h-10 px-3 rounded-lg bg-background border-border text-sm text-foreground placeholder:text-muted-foreground/50 hover:border-border/80 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      aria-label="Email address"
                      value={email}
                      onChange={(e) => dispatch({ type: "set_email", v: e.target.value })}
                      required
                      autoComplete="email"
                      className="h-10 px-3 rounded-lg bg-background border-border text-sm text-foreground placeholder:text-muted-foreground/50 hover:border-border/80 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                    />
                  </div>

                  {/* Password */}
                  {mode !== "forgot" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          aria-label="Password"
                          value={password}
                          onChange={(e) => dispatch({ type: "set_password", v: e.target.value })}
                          required
                          minLength={6}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          className="h-10 px-3 pr-10 rounded-lg bg-background border-border text-sm text-foreground placeholder:text-muted-foreground/50 hover:border-border/80 focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "toggle_pw" })}
                          tabIndex={-1}
                          title={showPassword ? "Hide password" : "Show password"}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-1 top-1/2 -translate-y-1/2 size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" strokeWidth={1.75} />
                          ) : (
                            <Eye className="size-4" strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password criteria for signup */}
                  {mode === "signup" && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-1 space-y-1 text-[11px]"
                    >
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {PASSWORD_RULES.map(({ id, label, test }) => {
                          const passed = password.length > 0 && test(password);
                          const untouched = password.length === 0;
                          return (
                            <div
                              key={id}
                              className={`flex items-center gap-1.5 transition-colors ${
                                untouched
                                  ? "text-muted-foreground"
                                  : passed
                                  ? "text-emerald-500"
                                  : "text-destructive"
                              }`}
                            >
                              {passed ? (
                                <Check className="size-3 shrink-0" strokeWidth={2} />
                              ) : untouched ? (
                                <span className="size-1 rounded-full bg-muted-foreground/50 shrink-0 mx-1" />
                              ) : (
                                <X className="size-3 shrink-0" strokeWidth={2} />
                              )}
                              <span className="truncate">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-xs shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {mode === "login"
                      ? "Sign in"
                      : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
                  </Button>
                </form>

                {/* Mode toggle / navigation links */}
                {mode !== "login" && (
                  <div className="pt-2 text-center text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "set_mode", mode: "login" })}
                      className="text-foreground hover:underline font-medium cursor-pointer"
                    >
                      Back to sign in
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

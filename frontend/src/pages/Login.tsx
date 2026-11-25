import { useReducer, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sun, Moon, Check, X, RefreshCw } from "@/components/ui/icons";
import { useTheme } from "@/hooks/useTheme";
import { AppLogo } from "@/components/ar/AppLogo";
import { APP_VERSION } from "@/lib/version";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { id: "len", label: "6+ characters", test: (p: string) => p.length >= 6 },
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
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

// Medically accurate two-cycle P-QRS-T sinus rhythm path across 640x180 viewport
const ECG_PATH =
  "M 0,108 L 58,108 C 66,108 70,96 78,96 C 86,96 90,108 98,108 L 116,108 L 123,120 L 134,26 L 145,142 L 154,108 L 178,108 C 190,108 196,86 210,86 C 224,86 230,108 242,108 L 348,108 C 356,108 360,96 368,96 C 376,96 380,108 388,108 L 406,108 L 413,120 L 424,22 L 435,144 L 444,108 L 468,108 C 480,108 486,86 500,86 C 514,86 520,108 532,108 L 640,108";

function formatPhoenixClock(d: Date): string {
  try {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "America/Phoenix",
    });
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
}

function usePhoenixLiveClock() {
  const [clock, setClock] = useState(() => formatPhoenixClock(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setClock(formatPhoenixClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return clock;
}

export default function LoginPage() {
  const { theme, toggle } = useTheme();
  const reduceMotion = useReducedMotion();
  const phoenixClock = usePhoenixLiveClock();
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
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [activeField, setActiveField] = useState<"email" | "password" | "name" | null>(null);
  const [pulseBeat, setPulseBeat] = useState(0);

  // Spring-damped pointer parallax for the telemetry stage
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 90, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 90, damping: 22 });
  const ringTranslateX = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const ringTranslateY = useTransform(springY, [-0.5, 0.5], [-14, 14]);
  const waveTranslateX = useTransform(springX, [-0.5, 0.5], [7, -7]);
  const waveTranslateY = useTransform(springY, [-0.5, 0.5], [5, -5]);

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

  const triggerPulse = () => {
    if (!reduceMotion) setPulseBeat((n) => n + 1);
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleStageMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter((t) => now - t < WINDOW_MS);
    if (attemptTimestamps.current.length >= MAX_ATTEMPTS) return false;
    attemptTimestamps.current.push(now);
    return true;
  };

  const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
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

    triggerPulse();
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

  const viewTransition = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, y: 8, filter: "blur(2px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(2px)" },
        transition: { duration: 0.2, ease: EASE_OUT },
      };

  const inputClass =
    "w-full h-11 rounded-xl bg-background dark:bg-white/[0.03] hover:bg-card dark:hover:bg-white/[0.05] focus:bg-card dark:focus:bg-white/[0.06] border border-slate-300/90 dark:border-white/[0.13] hover:border-slate-400 dark:hover:border-white/[0.22] focus:border-primary dark:focus:border-primary px-3.5 text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-[border-color,background-color] duration-150";

  // Active telemetry channel responds to what the user is interacting with
  const activeSignalLabel = loading
    ? "AUTHENTICATING SESSION"
    : activeField === "password"
    ? "VERIFYING CREDENTIALS"
    : activeField === "email"
    ? "OPERATOR IDENTIFIED"
    : "SINUS RHYTHM · READY";

  return (
    <div className="min-h-dvh w-full bg-card dark:bg-[#0B0F15] text-foreground grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* LEFT STAGE: Deep Forest-Obsidian Cardiac Telemetry Instrument      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section
        aria-label="Phoenix Heart Clinical Telemetry Canvas"
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
        className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative bg-[#071712] text-[#ECFAF4] flex-col justify-between p-10 xl:p-14 overflow-hidden select-none"
      >
        {/* Top Bar: White Brand Wordmark + Live Phoenix MST Telemetry Clock */}
        <div className="relative z-10 flex items-center justify-between gap-6">
          <img
            src="/logo.png"
            alt="Basata Tracker"
            className="h-9 w-auto object-contain"
          />

          <div className="flex items-center gap-2.5 text-xs text-[#A7D7C5] bg-[#0C241C] px-3 py-1.5 rounded-lg">
            <span className="inline-flex rounded-full size-2 bg-emerald-400" />
            <span className="tabular-nums font-medium tracking-tight">
              Phoenix, AZ · {phoenixClock} MST
            </span>
          </div>
        </div>

        {/* Center Interactive Piece: Concentric Instrument Dial + Live Sweeping P-QRS-T ECG */}
        <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[600px] rounded-2xl bg-[#0A2019] p-6 xl:p-8 flex flex-col items-center justify-center overflow-hidden">
            {/* Interactive Parallax Calibration Rings + Keystroke Pulse Ripple */}
            <motion.div
              style={{ x: ringTranslateX, y: ringTranslateY }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <motion.div
                key={pulseBeat}
                initial={pulseBeat > 0 ? { scale: 0.94, opacity: 0.9 } : false}
                animate={{ scale: 1, opacity: 0.45 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
                className="size-[220px] rounded-full bg-[#0E2B22] flex items-center justify-center"
              >
                <div className="size-[136px] rounded-full bg-[#12352A]" />
              </motion.div>
            </motion.div>

            {/* Live Sweeping Cardiac ECG Waveform on Real SVG Calibration Paper */}
            <motion.div
              style={{ x: waveTranslateX, y: waveTranslateY }}
              className="relative z-10 w-full"
            >
              <svg
                viewBox="0 0 640 180"
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="Live Phoenix Heart ECG rhythm"
              >
                <defs>
                  <pattern id="ecg-mm-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="rgba(52, 211, 153, 0.08)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <filter id="ecg-phosphor" x="-10%" y="-25%" width="120%" height="150%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Oscilloscope Millimeter Surface */}
                <rect x="0" y="0" width="640" height="180" rx="8" fill="url(#ecg-mm-grid)" />

                {/* Baseline Reference */}
                <line
                  x1="0"
                  y1="108"
                  x2="640"
                  y2="108"
                  stroke="rgba(167, 215, 197, 0.16)"
                  strokeDasharray="3 5"
                  strokeWidth="1"
                />

                {/* Persistent Phosphor Afterglow Trace */}
                <path
                  d={ECG_PATH}
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.25)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Animated Live Sweeping Wavefront */}
                {reduceMotion ? (
                  <path
                    d={ECG_PATH}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#ecg-phosphor)"
                  />
                ) : (
                  <motion.path
                    d={ECG_PATH}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#ecg-phosphor)"
                    initial={{ pathLength: 0.24, pathOffset: 0 }}
                    animate={{ pathOffset: [0, 1] }}
                    transition={{
                      duration: activeField ? 2.2 : 3.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                )}
              </svg>

              {/* Instrument Readout Strip directly beneath the trace */}
              <div className="mt-4 flex items-center justify-between gap-4 px-1 text-xs text-[#8EC5B0]">
                <span>Lead II · 25 mm/s · EKG / Cath / ROI / Fax</span>
                <span className="text-emerald-300 font-medium transition-colors duration-150">
                  {activeSignalLabel}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Editorial Statement (Separated by Tone & Space, Zero Rules) */}
        <div className="relative z-10 flex items-end justify-between gap-8 pt-4">
          <div className="max-w-md space-y-2">
            <h2 className="font-heading text-2xl xl:text-[28px] font-semibold tracking-[-0.025em] text-white leading-[1.2]">
              Clinical intake and document operations for Phoenix Heart.
            </h2>
            <p className="text-sm text-[#99CBB7] leading-relaxed">
              Daily document velocity, multi-step fax resolution, clinic directories, and shift logs in one workspace.
            </p>
          </div>

          <span className="text-xs text-[#7AB39D] shrink-0 tabular-nums">
            {APP_VERSION}
          </span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT STAGE: Tactile, Crisp Authentication Column                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between min-h-dvh px-6 sm:px-12 lg:px-14 xl:px-16 py-6 sm:py-8 relative">
        {/* Mobile-only subtle top emerald hairline accent */}
        <div className="lg:hidden fixed top-0 inset-x-0 h-1 bg-primary z-30" aria-hidden="true" />

        {/* Top Bar */}
        <header className="w-full flex items-center justify-between">
          <div className="lg:hidden">
            <Link to="/" aria-label="Basata Tracker" className="inline-flex items-center">
              <AppLogo className="h-8 w-auto object-contain" />
            </Link>
          </div>
          <div className="hidden lg:block" />

          <button
            type="button"
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-background/60 dark:bg-white/[0.03] hover:bg-muted/70 dark:hover:bg-white/[0.07] flex items-center gap-2 text-xs font-medium text-foreground/80 hover:text-foreground active:scale-[0.97] transition-[transform,background-color,color] duration-150 cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="size-3.5 text-amber-400" strokeWidth={1.85} />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-foreground/80" strokeWidth={1.85} />
                <span>Dark</span>
              </>
            )}
          </button>
        </header>

        {/* Center Auth Form */}
        <div className="w-full max-w-[380px] mx-auto my-auto py-8">
          <AnimatePresence mode="wait" initial={false}>
            {confirmEmail ? (
              <motion.div key="confirm" {...viewTransition} className="space-y-6">
                <div className="space-y-2">
                  <h1 className="font-heading text-[26px] font-bold tracking-[-0.03em] text-foreground">
                    Check your email
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a confirmation link to{" "}
                    <span className="font-semibold text-foreground break-all">{confirmEmail}</span>.
                    Open the link to activate your account.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resendCooldown > 0 || resendLoading}
                    onClick={handleResendConfirmation}
                    className="w-full h-11 rounded-xl text-sm font-semibold border-slate-300/90 dark:border-white/[0.14] bg-transparent hover:bg-muted/60 active:scale-[0.985] transition-[transform,background-color] duration-150 cursor-pointer"
                  >
                    {resendLoading ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5 mr-2" />
                    )}
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend confirmation email"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => dispatch({ type: "back_to_login" })}
                    className="w-full h-10 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </div>
              </motion.div>
            ) : resetSentEmail ? (
              <motion.div key="reset-sent" {...viewTransition} className="space-y-6">
                <div className="space-y-2">
                  <h1 className="font-heading text-[26px] font-bold tracking-[-0.03em] text-foreground">
                    Reset link sent
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If an account exists for{" "}
                    <span className="font-semibold text-foreground break-all">{resetSentEmail}</span>,
                    check your inbox for instructions to set a new password.
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold active:scale-[0.985] transition-[transform,background-color] duration-150 cursor-pointer"
                  onClick={() => dispatch({ type: "back_to_login" })}
                >
                  Back to sign in
                </Button>
              </motion.div>
            ) : (
              <motion.div key={mode} {...viewTransition} className="space-y-7">
                {/* Heading */}
                <div className="space-y-2">
                  <h1 className="font-heading text-[28px] sm:text-[30px] font-bold tracking-[-0.03em] text-foreground leading-tight">
                    {mode === "login"
                      ? "Sign in"
                      : mode === "signup"
                      ? "Create account"
                      : "Reset password"}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode === "login"
                      ? "Sign in with your Basata Tracker account."
                      : mode === "signup"
                      ? "Enter your details to set up your workspace profile."
                      : "Enter your work email and we will send you a reset link."}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {mode === "signup" && (
                    <div className="grid grid-cols-2 gap-3 pb-0.5">
                      <div className="space-y-1.5">
                        <label htmlFor="login-first-name" className="block text-[13px] font-semibold text-foreground/90">
                          First name
                        </label>
                        <input
                          id="login-first-name"
                          type="text"
                          value={firstName}
                          onFocus={() => setActiveField("name")}
                          onBlur={() => setActiveField(null)}
                          onChange={(e) => {
                            dispatch({ type: "set_first", v: e.target.value });
                            triggerPulse();
                          }}
                          required
                          autoComplete="given-name"
                          className={inputClass}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="login-last-name" className="block text-[13px] font-semibold text-foreground/90">
                          Last name
                        </label>
                        <input
                          id="login-last-name"
                          type="text"
                          value={lastName}
                          onFocus={() => setActiveField("name")}
                          onBlur={() => setActiveField(null)}
                          onChange={(e) => {
                            dispatch({ type: "set_last", v: e.target.value });
                            triggerPulse();
                          }}
                          required
                          autoComplete="family-name"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="block text-[13px] font-semibold text-foreground/90">
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onFocus={() => {
                        setActiveField("email");
                        triggerPulse();
                      }}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => {
                        dispatch({ type: "set_email", v: e.target.value });
                        triggerPulse();
                      }}
                      placeholder="you@yourgmail.com"
                      required
                      autoFocus
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>

                  {mode !== "forgot" && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <label htmlFor="login-password" className="block text-[13px] font-semibold text-foreground/90">
                          Password
                        </label>

                        {capsLockOn && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            Caps Lock on
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onFocus={() => {
                            setActiveField("password");
                            triggerPulse();
                          }}
                          onBlur={() => {
                            setActiveField(null);
                            setCapsLockOn(false);
                          }}
                          onChange={(e) => {
                            dispatch({ type: "set_password", v: e.target.value });
                            triggerPulse();
                          }}
                          onKeyDown={handlePasswordKeyEvent}
                          onKeyUp={handlePasswordKeyEvent}
                          placeholder="Enter your password"
                          required
                          minLength={6}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          className={cn(inputClass, "pr-11")}
                        />
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "toggle_pw" })}
                          title={showPassword ? "Hide password" : "Show password"}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/[0.07] active:scale-[0.92] transition-[transform,color,background-color] duration-150 cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" strokeWidth={1.8} />
                          ) : (
                            <Eye className="size-4" strokeWidth={1.8} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === "signup" && (
                    <div className="pt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      {PASSWORD_RULES.map(({ id, label, test }) => {
                        const passed = password.length > 0 && test(password);
                        const untouched = password.length === 0;
                        return (
                          <div
                            key={id}
                            className={cn(
                              "flex items-center gap-1.5",
                              untouched
                                ? "text-muted-foreground"
                                : passed
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : "text-destructive"
                            )}
                          >
                            {passed ? (
                              <Check className="size-3 shrink-0" strokeWidth={2.2} />
                            ) : untouched ? (
                              <span className="size-1.5 rounded-full bg-muted-foreground/45 shrink-0 mx-0.5" />
                            ) : (
                              <X className="size-3 shrink-0" strokeWidth={2.2} />
                            )}
                            <span className="truncate">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold shadow-none active:scale-[0.985] transition-[transform,background-color] duration-150 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          <span>
                            {mode === "login"
                              ? "Signing in…"
                              : mode === "signup"
                              ? "Creating account…"
                              : "Sending link…"}
                          </span>
                        </>
                      ) : mode === "login" ? (
                        "Sign in"
                      ) : mode === "signup" ? (
                        "Create account"
                      ) : (
                        "Send reset link"
                      )}
                    </Button>
                  </div>
                </form>

                {mode !== "login" && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "set_mode", mode: "login" })}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Legal Footer */}
        <footer className="w-full flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Phoenix Heart · Basata</span>
          <nav aria-label="Legal" className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

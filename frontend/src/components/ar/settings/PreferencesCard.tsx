import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Globe,
  Clock,
  Check,
  ShieldCheck,
  Cookie,
  ArrowUpRight,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { isFeedbackEnabled, setFeedbackEnabled, playTapFeedback } from "@/lib/audio-feedback";
import { cn } from "@/lib/utils";

interface PreferencesCardProps {
  tzPreference: string;
  onTzChange: (val: string) => void;
}

export function PreferencesCard({ tzPreference, onTzChange }: PreferencesCardProps) {
  const { theme, toggle } = useTheme();
  const [feedbackOn, setFeedbackOn] = useState(() => isFeedbackEnabled());

  const handleToggleFeedback = (enable: boolean) => {
    setFeedbackOn(enable);
    setFeedbackEnabled(enable);
    if (enable) {
      playTapFeedback();
      toast.success("Tactile feedback enabled");
    } else {
      toast.info("Tactile feedback muted");
    }
  };

  const handleTestAudio = () => {
    playTapFeedback();
    toast.success("Audio click preview played", { duration: 1500 });
  };

  const ORG_TZ = "America/Phoenix";
  const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Live clocks for regional preview
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const orgTimeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: ORG_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime);

  const localTimeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: LOCAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime);

  return (
    <div className="space-y-6">
      {/* ── 1. Visual Theme Selection ── */}
      <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              {theme === "dark" ? <Moon className="size-4.5" strokeWidth={1.75} /> : <Sun className="size-4.5" strokeWidth={1.75} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">Workspace Appearance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Select your preferred lighting atmosphere</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
            {theme === "dark" ? "Dark Mode Active" : "Light Mode Active"}
          </span>
        </div>

        {/* Visual Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => theme !== "dark" && toggle()}
            className={cn(
              "group relative flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer",
              theme === "dark"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-2 ring-emerald-500/20 shadow-xs"
                : "border-border/60 bg-card hover:bg-muted/40 hover:border-border/90"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-foreground">Dark Studio</span>
              </div>
              {theme === "dark" ? (
                <span className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="size-5 rounded-full border border-border/70" />
              )}
            </div>

            {/* Stylized Miniature Dark UI Preview */}
            <div className="w-full h-20 rounded-lg bg-[#111828] border border-slate-700/60 p-2 flex gap-2 overflow-hidden shadow-inner select-none pointer-events-none">
              <div className="w-1/4 h-full bg-[#1e293b] rounded flex flex-col gap-1 p-1">
                <div className="w-3/4 h-1.5 bg-emerald-500/80 rounded" />
                <div className="w-1/2 h-1 bg-slate-600 rounded" />
                <div className="w-2/3 h-1 bg-slate-600 rounded" />
              </div>
              <div className="flex-1 h-full bg-[#1e293b]/70 rounded p-1.5 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="w-1/3 h-1.5 bg-slate-500 rounded" />
                  <div className="size-2 rounded-full bg-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-4 rounded bg-[#0f172a] border border-slate-700/50" />
                  <div className="h-4 rounded bg-[#0f172a] border border-slate-700/50" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5">
              High-contrast slate dark theme designed for extended daily indexing shifts.
            </p>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => theme === "dark" && toggle()}
            className={cn(
              "group relative flex flex-col p-4 rounded-xl border text-left transition-all cursor-pointer",
              theme !== "dark"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-2 ring-emerald-500/20 shadow-xs"
                : "border-border/60 bg-card hover:bg-muted/40 hover:border-border/90"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="size-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">Clean Light</span>
              </div>
              {theme !== "dark" ? (
                <span className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="size-5 rounded-full border border-border/70" />
              )}
            </div>

            {/* Stylized Miniature Light UI Preview */}
            <div className="w-full h-20 rounded-lg bg-[#f8fafc] border border-slate-300/80 p-2 flex gap-2 overflow-hidden shadow-inner select-none pointer-events-none">
              <div className="w-1/4 h-full bg-[#e2e8f0] rounded flex flex-col gap-1 p-1">
                <div className="w-3/4 h-1.5 bg-emerald-600 rounded" />
                <div className="w-1/2 h-1 bg-slate-400 rounded" />
                <div className="w-2/3 h-1 bg-slate-400 rounded" />
              </div>
              <div className="flex-1 h-full bg-white rounded p-1.5 flex flex-col justify-between border border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="w-1/3 h-1.5 bg-slate-400 rounded" />
                  <div className="size-2 rounded-full bg-emerald-600" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-4 rounded bg-slate-100 border border-slate-200" />
                  <div className="h-4 rounded bg-slate-100 border border-slate-200" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5">
              Crisp daylight mode with elevated clarity for bright office environments.
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Tactile Audio & Haptic Feedback ── */}
      <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
              {feedbackOn ? <Volume2 className="size-4.5" strokeWidth={1.75} /> : <VolumeX className="size-4.5" strokeWidth={1.75} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">Tactile Audio &amp; Haptic Indexing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Zero-latency synthesized acoustic tick (~10ms) &amp; vibration on counter taps
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive "Test Click" Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestAudio}
              className="h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Volume2 className="size-3.5 mr-1.5 text-muted-foreground" />
              Test Click
            </Button>

            {/* Apple-style Toggle Switch */}
            <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-border/60">
              <Switch
                id="feedback-switch"
                checked={feedbackOn}
                onCheckedChange={handleToggleFeedback}
              />
              <label
                htmlFor="feedback-switch"
                className="text-xs font-medium text-foreground cursor-pointer select-none"
              >
                {feedbackOn ? "Enabled" : "Muted"}
              </label>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Designed for no-look confirmation when rapid-fire indexing documents. Synthesized directly via Web Audio API without network roundtrips.
        </p>
      </div>

      {/* ── 3. Time Zone & Regional Clock ── */}
      <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3.5 pb-3 border-b border-border/60">
          <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <Globe className="size-4.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-heading">Time Zone &amp; Regional Clock</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose how dates and timestamps are interpreted across daily logs and reports
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Org Time Zone */}
          <label
            className={cn(
              "group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer",
              tzPreference === "org"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-xs ring-2 ring-emerald-500/20"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name="tz"
              value="org"
              checked={tzPreference === "org"}
              onChange={() => onTzChange("org")}
              className="size-4 mt-1 accent-emerald-600 cursor-pointer"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Organization Time</span>
                {tzPreference === "org" && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-bold text-foreground">{orgTimeStr}</span>
                <span className="text-[10px] font-mono text-muted-foreground">({ORG_TZ})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                Standardizes all logs across team members and facilities. Recommended for consistent auditing.
              </p>
            </div>
          </label>

          {/* Local Device Time Zone */}
          <label
            className={cn(
              "group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer",
              tzPreference === "local"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] shadow-xs ring-2 ring-emerald-500/20"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name="tz"
              value="local"
              checked={tzPreference === "local"}
              onChange={() => onTzChange("local")}
              className="size-4 mt-1 accent-emerald-600 cursor-pointer"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Local Device Time</span>
                {tzPreference === "local" && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-bold text-foreground">{localTimeStr}</span>
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">({LOCAL_TZ})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                Converts all timestamps to your workstation operating system clock.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ── 4. Legal & Privacy Policies ── */}
      <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <ShieldCheck className="size-4.5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">Privacy &amp; Policies</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Personal data handling, local storage &amp; cookies</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
            Transparency
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {/* Terms of Service Link */}
          <Link
            to="/terms"
            className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <div className="size-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
              <Scale className="size-4.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Terms of Service
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Personal use agreement, AS-IS disclaimers, liability limits, and no-PHI rules.
              </p>
            </div>
          </Link>

          {/* Privacy Policy Link */}
          <Link
            to="/privacy"
            className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-4.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Review data collection limits, personal workspace storage, and zero-telemetry commitments.
              </p>
            </div>
          </Link>

          {/* Cookie Policy Link */}
          <Link
            to="/cookies"
            className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-amber-500/40 transition-all cursor-pointer"
          >
            <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
              <Cookie className="size-4.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Cookie Policy
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Learn how authentication tokens, theme preferences, and local storage keys are managed.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

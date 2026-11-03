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
  Compass,
  LayoutDashboard,
  Hash,
  CalendarDays,
  Send,
  Building2,
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

const START_PAGES = [
  { path: "/console", label: "Console", desc: "Overview, charts & team breakdown", icon: LayoutDashboard },
  { path: "/counter", label: "Counter", desc: "Live counting with keyboard shortcuts", icon: Hash },
  { path: "/log", label: "Daily Log", desc: "Daily document logs and history", icon: CalendarDays },
  { path: "/tracker", label: "Tracker", desc: "Incoming faxes & indexables workflow", icon: Send },
  { path: "/facilities", label: "Facilities", desc: "Clinic directory and verified numbers", icon: Building2 },
];

export function PreferencesCard({ tzPreference, onTzChange }: PreferencesCardProps) {
  const { theme, toggle } = useTheme();
  const [feedbackOn, setFeedbackOn] = useState(() => isFeedbackEnabled());
  const [startPage, setStartPage] = useState(() => localStorage.getItem("default_start_page") ?? "/console");

  const handleStartPageChange = (path: string, label: string) => {
    setStartPage(path);
    localStorage.setItem("default_start_page", path);
    toast.success(`Default start page set to ${label}`);
  };

  const handleToggleFeedback = (enable: boolean) => {
    setFeedbackOn(enable);
    setFeedbackEnabled(enable);
    if (enable) {
      playTapFeedback();
      toast.success("Sound feedback turned on");
    } else {
      toast.info("Sound feedback muted");
    }
  };

  const handleTestAudio = () => {
    playTapFeedback();
    toast.success("Click sound played", { duration: 1500 });
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
    <div className="space-y-5">
      {/* ── 1. Visual Theme ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              {theme === "dark" ? <Moon className="size-4" strokeWidth={1.75} /> : <Sun className="size-4" strokeWidth={1.75} />}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Appearance</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Choose light or dark mode</p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {theme === "dark" ? "Dark Active" : "Light Active"}
          </span>
        </div>

        {/* Visual Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => theme !== "dark" && toggle()}
            className={cn(
              "group relative flex flex-col p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme === "dark"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Moon className="size-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">Dark Mode</span>
              </div>
              {theme === "dark" ? (
                <span className="size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="size-2.5" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/70" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dark theme with high contrast for comfortable daily use.
            </p>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => theme === "dark" && toggle()}
            className={cn(
              "group relative flex flex-col p-3.5 rounded-xl border text-left transition-all cursor-pointer",
              theme !== "dark"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sun className="size-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Light Mode</span>
              </div>
              {theme !== "dark" ? (
                <span className="size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                  <Check className="size-2.5" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/70" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Clean light theme for well-lit office environments.
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Default Start Page ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-500">
            <Compass className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Default Start Page</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Choose which page opens first when you open Basata Tracker
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-0.5">
          {START_PAGES.map((page) => {
            const isSelected = startPage === page.path;
            const Icon = page.icon;
            return (
              <button
                key={page.path}
                type="button"
                onClick={() => handleStartPageChange(page.path, page.label)}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                    : "border-border/60 bg-card hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                    isSelected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.75} />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{page.label}</span>
                    {isSelected && (
                      <span className="size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                        <Check className="size-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    {page.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Sound & Vibration ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/60 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              {feedbackOn ? <Volume2 className="size-4" strokeWidth={1.75} /> : <VolumeX className="size-4" strokeWidth={1.75} />}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-foreground">Sound &amp; Vibration</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Play a click sound and vibrate on mobile when counting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestAudio}
              className="h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              <Volume2 className="size-3 mr-1 text-muted-foreground" />
              Test Sound
            </Button>

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
                {feedbackOn ? "On" : "Muted"}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Time Zone ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-500">
            <Globe className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Time Zone</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Choose the time zone used for your logs and reports
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          {/* Clinic Time */}
          <label
            className={cn(
              "group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
              tzPreference === "org"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name="tz"
              value="org"
              checked={tzPreference === "org"}
              onChange={() => onTzChange("org")}
              className="size-3.5 mt-0.5 accent-emerald-600 cursor-pointer"
            />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Clinic Time (Arizona)</span>
                {tzPreference === "org" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                <Clock className="size-3 text-muted-foreground" />
                <span>{orgTimeStr}</span>
                <span className="text-[10px] text-muted-foreground font-sans">({ORG_TZ})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal pt-0.5">
                Standardizes logs across all facilities (recommended).
              </p>
            </div>
          </label>

          {/* Local Device Time */}
          <label
            className={cn(
              "group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
              tzPreference === "local"
                ? "border-emerald-500/60 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                : "border-border/60 bg-card hover:bg-muted/40"
            )}
          >
            <input
              type="radio"
              name="tz"
              value="local"
              checked={tzPreference === "local"}
              onChange={() => onTzChange("local")}
              className="size-3.5 mt-0.5 accent-emerald-600 cursor-pointer"
            />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Your Local Time</span>
                {tzPreference === "local" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
                <Clock className="size-3 text-muted-foreground" />
                <span>{localTimeStr}</span>
                <span className="text-[10px] text-muted-foreground font-sans truncate max-w-[110px]">({LOCAL_TZ})</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal pt-0.5">
                Uses the current clock of your computer.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* ── 5. Policies & Terms ── */}
      <div className="bg-card/80 border border-border/65 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <ShieldCheck className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground">Policies &amp; Terms</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Usage guidelines and privacy policies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
          {/* Terms of Service */}
          <Link
            to="/terms"
            className="group flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-all cursor-pointer"
          >
            <div className="size-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:text-foreground">
              <Scale className="size-3.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Terms
                </span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Usage agreement and service rules.
              </p>
            </div>
          </Link>

          {/* Privacy Policy */}
          <Link
            to="/privacy"
            className="group flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-all cursor-pointer"
          >
            <div className="size-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:text-foreground">
              <ShieldCheck className="size-3.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Privacy
                </span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                How your logs and data are protected.
              </p>
            </div>
          </Link>

          {/* Cookie Policy */}
          <Link
            to="/cookies"
            className="group flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-all cursor-pointer"
          >
            <div className="size-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0 group-hover:text-foreground">
              <Cookie className="size-3.5" strokeWidth={1.75} />
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  Cookies
                </span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Local storage and session details.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

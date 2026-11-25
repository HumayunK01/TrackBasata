import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Volume2,
  Clock,
  Check,
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
  { path: "/console", label: "Console", desc: "Analytics & team overview", icon: LayoutDashboard },
  { path: "/counter", label: "Counter", desc: "Live shift tap counter", icon: Hash },
  { path: "/log", label: "Daily Log", desc: "Daily volume records", icon: CalendarDays },
  { path: "/tracker", label: "Tracker", desc: "Fax & indexable pipeline", icon: Send },
  { path: "/overtime", label: "Overtime", desc: "Extra shift hours log", icon: Clock },
  { path: "/facilities", label: "Facilities", desc: "Verified clinic numbers", icon: Building2 },
];

export function PreferencesCard({ tzPreference, onTzChange }: PreferencesCardProps) {
  const { theme, toggle } = useTheme();
  const [feedbackOn, setFeedbackOn] = useState(() => isFeedbackEnabled());
  const [startPage, setStartPage] = useState(
    () => localStorage.getItem("default_start_page") ?? "/console"
  );

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

  const isDark = theme === "dark";

  return (
    <div className="rounded-2xl border border-border/65 bg-card/85 divide-y divide-border/50 shadow-2xs">
      {/* ── Row 1: Appearance ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
        <div className="md:col-span-4 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Choose how Basata Tracker looks on this workstation.
          </p>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Appearance">
          {/* Light Mode Preview Card */}
          <button
            type="button"
            role="radio"
            aria-checked={!isDark}
            onClick={() => isDark && toggle()}
            className={cn(
              "group rounded-xl border p-3 text-left transition-colors duration-150 cursor-pointer outline-none",
              !isDark
                ? "border-primary bg-primary/[0.04]"
                : "border-border/65 bg-card hover:bg-muted/35 hover:border-border"
            )}
          >
            {/* Miniature Light UI Schematic */}
            <div className="h-20 rounded-lg border border-slate-200 bg-[#F8FAFC] overflow-hidden flex mb-3 select-none">
              <div className="w-11 border-r border-slate-200 bg-white p-2 flex flex-col gap-1.5">
                <div className="h-2 w-5 rounded-sm bg-emerald-500" />
                <div className="h-1.5 w-6 rounded-sm bg-slate-200" />
                <div className="h-1.5 w-5 rounded-sm bg-slate-200" />
                <div className="h-1.5 w-6 rounded-sm bg-slate-200" />
              </div>
              <div className="flex-1 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-14 rounded-sm bg-slate-800" />
                  <div className="size-2 rounded-full bg-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-9 rounded-md bg-white border border-slate-200 p-1.5">
                    <div className="h-2 w-6 rounded-sm bg-slate-700" />
                  </div>
                  <div className="h-9 rounded-md bg-white border border-slate-200 p-1.5">
                    <div className="h-2 w-7 rounded-sm bg-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sun className="size-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Light</span>
              </div>
              {!isDark ? (
                <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="size-2.5" strokeWidth={2.6} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/80" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Crisp daylight surfaces for bright clinical offices.
            </p>
          </button>

          {/* Dark Mode Preview Card */}
          <button
            type="button"
            role="radio"
            aria-checked={isDark}
            onClick={() => !isDark && toggle()}
            className={cn(
              "group rounded-xl border p-3 text-left transition-colors duration-150 cursor-pointer outline-none",
              isDark
                ? "border-primary bg-primary/[0.05]"
                : "border-border/65 bg-card hover:bg-muted/35 hover:border-border"
            )}
          >
            {/* Miniature Dark UI Schematic */}
            <div className="h-20 rounded-lg border border-slate-800 bg-[#111828] overflow-hidden flex mb-3 select-none">
              <div className="w-11 border-r border-slate-800 bg-[#161F31] p-2 flex flex-col gap-1.5">
                <div className="h-2 w-5 rounded-sm bg-emerald-400" />
                <div className="h-1.5 w-6 rounded-sm bg-slate-700" />
                <div className="h-1.5 w-5 rounded-sm bg-slate-700" />
                <div className="h-1.5 w-6 rounded-sm bg-slate-700" />
              </div>
              <div className="flex-1 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-14 rounded-sm bg-slate-200" />
                  <div className="size-2 rounded-full bg-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-9 rounded-md bg-[#202938] border border-slate-700/80 p-1.5">
                    <div className="h-2 w-6 rounded-sm bg-slate-200" />
                  </div>
                  <div className="h-9 rounded-md bg-[#202938] border border-slate-700/80 p-1.5">
                    <div className="h-2 w-7 rounded-sm bg-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Moon className="size-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-foreground">Dark</span>
              </div>
              {isDark ? (
                <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="size-2.5" strokeWidth={2.6} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/80" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Low-glare slate surfaces comfortable for long shifts.
            </p>
          </button>
        </div>
      </div>

      {/* ── Row 2: Default Start Page ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
        <div className="md:col-span-4 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Default Start Page</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select which workspace view opens first when you launch or sign in.
          </p>
        </div>

        <div
          className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
          role="radiogroup"
          aria-label="Default Start Page"
        >
          {START_PAGES.map((page) => {
            const isSelected = startPage === page.path;
            const Icon = page.icon;
            return (
              <button
                key={page.path}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleStartPageChange(page.path, page.label)}
                className={cn(
                  "group flex flex-col justify-between rounded-xl border p-3.5 text-left transition-colors duration-150 cursor-pointer outline-none",
                  isSelected
                    ? "border-primary bg-primary/[0.04]"
                    : "border-border/65 bg-card hover:bg-muted/35 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {page.label}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="size-2.5" strokeWidth={2.6} />
                    </span>
                  ) : (
                    <span className="size-4 rounded-full border border-border/75 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-snug">
                  {page.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Row 3: Time Zone ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
        <div className="md:col-span-4 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Time Zone</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Controls shift timestamps and date cutoffs across logs and reports.
          </p>
        </div>

        <div
          className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
          role="radiogroup"
          aria-label="Time Zone"
        >
          {/* Clinic Time */}
          <button
            type="button"
            role="radio"
            aria-checked={tzPreference === "org"}
            onClick={() => onTzChange("org")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors duration-150 cursor-pointer outline-none space-y-2",
              tzPreference === "org"
                ? "border-primary bg-primary/[0.04]"
                : "border-border/65 bg-card hover:bg-muted/35 hover:border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  Clinic Time (Arizona)
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 shrink-0">
                  Recommended
                </span>
              </div>
              {tzPreference === "org" ? (
                <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Check className="size-2.5" strokeWidth={2.6} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/75 shrink-0" />
              )}
            </div>

            <div className="flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-sm font-bold text-foreground">{orgTimeStr}</span>
              <span className="text-[11px] text-muted-foreground">{ORG_TZ}</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              Aligns daily cutoffs across all Phoenix Heart team members.
            </p>
          </button>

          {/* Local Device Time */}
          <button
            type="button"
            role="radio"
            aria-checked={tzPreference === "local"}
            onClick={() => onTzChange("local")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors duration-150 cursor-pointer outline-none space-y-2",
              tzPreference === "local"
                ? "border-primary bg-primary/[0.04]"
                : "border-border/65 bg-card hover:bg-muted/35 hover:border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground truncate">
                Device Local Time
              </span>
              {tzPreference === "local" ? (
                <span className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Check className="size-2.5" strokeWidth={2.6} />
                </span>
              ) : (
                <span className="size-4 rounded-full border border-border/75 shrink-0" />
              )}
            </div>

            <div className="flex items-baseline gap-2 font-mono tabular-nums min-w-0">
              <span className="text-sm font-bold text-foreground shrink-0">{localTimeStr}</span>
              <span className="text-[11px] text-muted-foreground truncate">{LOCAL_TZ}</span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-normal">
              Displays timestamps using this computer’s local clock.
            </p>
          </button>
        </div>
      </div>

      {/* ── Row 4: Sound & Haptics ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 p-5 sm:p-6">
        <div className="md:col-span-4 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Counter Sound &amp; Haptics</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Audio click and mobile tap vibration when incrementing or decrementing counts.
          </p>
        </div>

        <div className="md:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/55 bg-muted/25 px-4 py-3.5">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {feedbackOn ? "Tactile feedback enabled" : "Silent counting mode"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {feedbackOn
                  ? "Plays a soft click on each count tap or hotkey press."
                  : "Audio clicks and haptic pulses are muted."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestAudio}
                className="h-8 px-3 rounded-lg border-border/80 bg-card hover:bg-muted text-xs font-medium cursor-pointer"
              >
                <Volume2 className="size-3.5 mr-1.5 text-muted-foreground" />
                Preview sound
              </Button>

              <div className="flex items-center gap-2 pl-3 border-l border-border/60">
                <Switch
                  id="feedback-switch"
                  checked={feedbackOn}
                  onCheckedChange={handleToggleFeedback}
                />
                <label
                  htmlFor="feedback-switch"
                  className="text-xs font-medium text-foreground cursor-pointer select-none min-w-[38px]"
                >
                  {feedbackOn ? "On" : "Off"}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

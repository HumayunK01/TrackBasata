import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  FileBarChart,
  Hash,
  Send,
  Building2,
  GitFork,
  KeyRound,
  Users,
  Settings,
  BookOpen,
  Tags,
  Sun,
  Moon,
  Volume2,
  VolumeX,
} from "@/components/ui/icons";
import { useTheme } from "@/hooks/useTheme";
import { useIsAdmin } from "@/hooks/useProfile";
import { isFeedbackEnabled, setFeedbackEnabled, playTapFeedback } from "@/lib/audio-feedback";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Actions" | "Resources";
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const isAdmin = useIsAdmin();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset search and selection when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-console",
        title: "Console & Dashboard",
        category: "Navigation",
        icon: LayoutDashboard,
        action: () => { navigate("/console"); setOpen(false); },
        keywords: ["console", "dashboard", "overview", "home", "stats"],
      },
      {
        id: "nav-counter",
        title: "Fast Tap Counter",
        category: "Navigation",
        icon: Hash,
        action: () => { navigate("/counter"); setOpen(false); },
        keywords: ["counter", "tap", "click", "count", "today", "log"],
      },
      {
        id: "nav-log",
        title: "Daily Log History",
        category: "Navigation",
        icon: CalendarDays,
        action: () => { navigate("/log"); setOpen(false); },
        keywords: ["daily", "log", "history", "records", "days"],
      },
      {
        id: "nav-report",
        title: "Reports & Analytics",
        category: "Navigation",
        icon: FileBarChart,
        action: () => { navigate("/report"); setOpen(false); },
        keywords: ["report", "analytics", "trends", "export", "pdf"],
      },
      {
        id: "nav-tracker",
        title: "Fax & Indexable Tracker",
        category: "Navigation",
        icon: Send,
        action: () => { navigate("/tracker"); setOpen(false); },
        keywords: ["tracker", "fax", "indexable", "resolution"],
      },
      {
        id: "nav-facilities",
        title: "Clinic Facilities Directory",
        category: "Navigation",
        icon: Building2,
        action: () => { navigate("/facilities"); setOpen(false); },
        keywords: ["facilities", "clinics", "phone", "fax numbers", "addresses"],
      },
      {
        id: "nav-scenarios",
        title: "Intake Process Guides & Flowcharts",
        category: "Navigation",
        icon: GitFork,
        action: () => { navigate("/scenarios"); setOpen(false); },
        keywords: ["scenarios", "flowchart", "decision tree", "roi", "cath", "ekg"],
      },
      {
        id: "nav-vault",
        title: "Credential Vault",
        category: "Navigation",
        icon: KeyRound,
        action: () => { navigate("/vault"); setOpen(false); },
        keywords: ["vault", "passwords", "credentials", "logins", "portals"],
      },
      ...(isAdmin
        ? [
            {
              id: "nav-team",
              title: "Team Overview & Work Distribution",
              category: "Navigation" as const,
              icon: Users,
              action: () => { navigate("/team"); setOpen(false); },
              keywords: ["team", "users", "associates", "admin"],
            },
          ]
        : []),
      {
        id: "nav-settings",
        title: "Account & Preferences Settings",
        category: "Navigation",
        icon: Settings,
        action: () => { navigate("/settings"); setOpen(false); },
        keywords: ["settings", "preferences", "password", "theme", "goal"],
      },

      // Resources
      {
        id: "res-cheat-sheet",
        title: "Phoenix Heart Cheat Sheet",
        category: "Resources",
        icon: BookOpen,
        action: () => { navigate("/resources/cheat-sheet"); setOpen(false); },
        keywords: ["cheat sheet", "sop", "phoenix", "rules"],
      },
      {
        id: "res-test-patients",
        title: "Labeling Guide & Test Patients",
        category: "Resources",
        icon: Tags,
        action: () => { navigate("/resources/test-patients"); setOpen(false); },
        keywords: ["labeling", "test patients", "inbox labels"],
      },

      // Actions
      {
        id: "act-theme",
        title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
        category: "Actions",
        icon: theme === "dark" ? Sun : Moon,
        action: () => {
          toggleTheme();
          setOpen(false);
          toast.success(`Switched to ${theme === "dark" ? "Light" : "Dark"} mode`);
        },
        keywords: ["theme", "dark mode", "light mode", "color"],
      },
      {
        id: "act-audio",
        title: isFeedbackEnabled() ? "Mute Tactile Audio & Haptics" : "Enable Tactile Audio & Haptics",
        category: "Actions",
        icon: isFeedbackEnabled() ? VolumeX : Volume2,
        action: () => {
          const next = !isFeedbackEnabled();
          setFeedbackEnabled(next);
          setOpen(false);
          if (next) {
            playTapFeedback();
            toast.success("Tactile feedback enabled");
          } else {
            toast.info("Tactile feedback muted");
          }
        },
        keywords: ["sound", "audio", "click", "haptic", "vibration", "tick"],
      },
    ];

    return list;
  }, [navigate, theme, toggleTheme, isAdmin]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase().trim();
    return items.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchCat = item.category.toLowerCase().includes(query);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(query));
      return matchTitle || matchCat || matchKeywords;
    });
  }, [items, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      const current = filteredItems[selectedIndex] ?? filteredItems[0];
      if (current) current.action();
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[16%] -translate-x-1/2 z-50 w-[92vw] max-w-xl",
            "bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-150 outline-none flex flex-col"
          )}
          aria-label="Command Palette"
        >
          {/* Command Search Bar */}
          <div className="flex items-center px-4 py-3 border-b border-border/70 gap-3 bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" size={16} />
            <input
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium h-7"
              placeholder="Search commands, pages, clinics, or actions…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <kbd className="hidden sm:inline-block text-[10px] font-mono font-bold text-muted-foreground px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 select-none">
              ESC
            </kbd>
          </div>

          {/* Command Results List */}
          <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/20">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                No matching commands or pages found.
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer outline-none",
                        isSelected
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-border/50",
                          )}
                        >
                          <IconComponent className="w-3.5 h-3.5 shrink-0" size={14} />
                        </div>
                        <div className="truncate">
                          <span className="block truncate">{item.title}</span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                      </div>

                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Command Footer */}
          <div className="px-4 py-2 bg-muted/40 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-mono font-bold">↑↓</kbd> Navigate
              </span>
              <span>
                <kbd className="font-mono font-bold">↵</kbd> Select
              </span>
            </div>
            <span className="font-mono text-2xs">TrackBasata Quick Command</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

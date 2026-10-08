import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories, type Category } from "@/hooks/useCategories";
import { useUpsertLog, useDailyLogs } from "@/hooks/useDailyLogs";
import { isoDate, totalForLog, isWeekend } from "@/types/log";
import { EmptyState } from "@/components/ar/industrial";
import { RotateCcw, Hash, Plus, Tag, ChevronRight, RefreshCw, AlertTriangle } from "@/components/ui/icons";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";

// Import modular components
import { CounterCard } from "@/components/ar/counter/CounterCard";
import { CategoryPicker } from "@/components/ar/counter/CategoryPicker";
import { NewCategoryDialog } from "@/components/ar/counter/NewCategoryDialog";

const COUNTS_KEY = "counter_counts";
const SELECTED_KEY = "counter_selected_keys";
const COUNTS_DATE_KEY = "counter_counts_date";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Ignore localStorage parse failures
  }
  return fallback;
}

interface CounterState {
  counts: Record<string, number>;
  selectedKeys: string[];
  saved: boolean;
}

type CounterAction =
  | { type: "set_count"; key: string; val: number }
  | { type: "add_key"; key: string }
  | { type: "remove_key"; key: string }
  | { type: "set_saved"; v: boolean }
  | { type: "reset" }
  | { type: "hydrate"; counts: Record<string, number>; keys: string[] };

function counterReducer(s: CounterState, a: CounterAction): CounterState {
  switch (a.type) {
    case "set_count":
      return { ...s, counts: { ...s.counts, [a.key]: Math.max(0, a.val) } };
    case "add_key":
      return { ...s, selectedKeys: [...s.selectedKeys, a.key] };
    case "remove_key":
      return { ...s, selectedKeys: s.selectedKeys.filter((k) => k !== a.key) };
    case "set_saved":
      return { ...s, saved: a.v };
    case "reset":
      return { ...s, counts: {}, selectedKeys: [], saved: false };
    case "hydrate":
      return { counts: { ...a.counts }, selectedKeys: a.keys, saved: true };
    default:
      return s;
  }
}

function triggerKudosAnimation(emoji: string) {
  const container = document.getElementById("kudos-animation-container");
  if (!container) return;

  const node = document.createElement("div");
  node.innerText = emoji;
  node.className = "kudos-float absolute text-4xl select-none pointer-events-none z-50";

  const randomX = Math.random() * 80 + 10;
  node.style.left = `${randomX}%`;
  node.style.bottom = "0px";
  node.style.fontSize = `${Math.random() * 25 + 28}px`;
  
  container.appendChild(node);
  setTimeout(() => {
    node.remove();
  }, 2000);
}

export default function CounterPage() {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: logs = [], isLoading: logsLoading, isFetched: logsFetched } = useDailyLogs();
  const upsert = useUpsertLog();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const qc = useQueryClient();
  const { checkLimit: checkSilentLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });

  const todayIso = isoDate();
  const todayLog = logs.find((l) => l.log_date === todayIso);
  const todayTotal = todayLog ? totalForLog(todayLog) : 0;

  const [{ counts, selectedKeys, saved }, cDispatch] = useReducer(counterReducer, undefined, () => {
    const savedDate = localStorage.getItem(COUNTS_DATE_KEY);
    const isCurrentDay = savedDate === todayIso;
    return {
      counts: isCurrentDay ? load<Record<string, number>>(COUNTS_KEY, {}) : {},
      selectedKeys: load<string[]>(SELECTED_KEY, []),
      saved: false,
    };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [reducedList, setReducedList] = useState<{ label: string; from: number; to: number }[] | null>(null);

  // Cross-device persistence. Saving is manual (Save button) into today's
  // daily_logs row; on first load the counter hydrates from the server so a
  // device that wasn't the last writer continues where the others left off.
  const hydratedRef = useRef(false);
  const skipUnsavedMarkRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("basata_live_activity", {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "kudos" }, (payload: { payload: { senderEmail: string; receiverId: string; emoji: string } }) => {
        if (payload.payload.receiverId === user.id) {
          toast("Kudos received! 🎉", {
            description: `${payload.payload.senderEmail} sent you a ${payload.payload.emoji}!`,
          });
          triggerKudosAnimation(payload.payload.emoji);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
    localStorage.setItem(COUNTS_DATE_KEY, todayIso);
  }, [counts, todayIso]);

  useEffect(() => {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedKeys));
  }, [selectedKeys]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  const availableToAdd = useMemo(() => {
    return categories.filter((c) => !selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  const broadcastIncrement = useCallback((key: string, change: number) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: "broadcast",
        event: "activity",
        payload: {
          user_id: user.id,
          email: user.email,
          category_key: key,
          change: change,
          timestamp: Date.now()
        }
      });
    }
  }, [user]);

  const getCount = (key: string) => counts[key] ?? 0;

  const increment = useCallback((key: string) => {
    cDispatch({ type: "set_count", key, val: (counts[key] ?? 0) + 1 });
    broadcastIncrement(key, 1);
  }, [counts, broadcastIncrement]);
  
  const decrement = useCallback((key: string) => {
    cDispatch({ type: "set_count", key, val: (counts[key] ?? 0) - 1 });
    broadcastIncrement(key, -1);
  }, [counts, broadcastIncrement]);

  const total = activeCategories.reduce((s, c) => s + getCount(c.key), 0);
  const maxCount = activeCategories.reduce((m, c) => Math.max(m, getCount(c.key)), 0);
  const animatedTotal = useAnimatedNumber(total);

  const addCategory = (cat: Category) => cDispatch({ type: "add_key", key: cat.key });
  const removeCategory = (key: string) => cDispatch({ type: "remove_key", key });

  // Hydrate from the server once, when today's row genuinely arrives from the database.
  // We MUST wait for !catsLoading && !logsLoading && logsFetched so we never overwrite DB data with 0.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (catsLoading || logsLoading || !logsFetched) return;
    if (categories.length === 0) return;

    const serverCounts = todayLog?.counts ?? {};
    const serverTotal = totalForLog(todayLog ?? { counts: {} });
    const localTotal = Object.values(counts).reduce((s, v) => s + (v || 0), 0);

    if (serverTotal > 0) {
      // Database already has counts for today (e.g. Move to Indexing: 20)
      // Automatically select and activate all categories that have counts in the DB
      const serverKeysWithCounts = Object.keys(serverCounts).filter(
        (k) => (serverCounts[k] ?? 0) > 0 && categories.some((c) => c.key === k)
      );
      const nextKeys = Array.from(new Set([...selectedKeys, ...serverKeysWithCounts]));

      // Safe merge: Never lose server counts or local taps
      const merged = { ...serverCounts };
      if (localTotal > 0) {
        for (const k of Object.keys(counts)) {
          merged[k] = Math.max(counts[k] ?? 0, serverCounts[k] ?? 0);
        }
      }

      skipUnsavedMarkRef.current = true;
      cDispatch({ type: "hydrate", counts: merged, keys: nextKeys });

      const matchesServer = Object.keys(merged).every((k) => (merged[k] ?? 0) === (serverCounts[k] ?? 0));
      cDispatch({ type: "set_saved", v: matchesServer });

      if (localTotal === 0) {
        toast.success(`Loaded today's counts from database (${serverTotal} docs).`, {
          id: "server-counts-loaded",
        });
      }
    } else if (localTotal > 0) {
      cDispatch({ type: "set_saved", v: false });
    } else {
      cDispatch({ type: "set_saved", v: true });
    }

    hydratedRef.current = true;
  }, [todayLog, categories, catsLoading, logsLoading, logsFetched, counts, selectedKeys]);

  // Mark progress as unsaved whenever counts change after initial hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipUnsavedMarkRef.current) {
      skipUnsavedMarkRef.current = false;
      return;
    }
    cDispatch({ type: "set_saved", v: false });
  }, [counts]);

  // Global Keyboard Shortcuts: Keys 1 to 9 instantly increment the 1st through 9th cards
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        const idx = num - 1;
        if (idx >= 0 && idx < activeCategories.length) {
          e.preventDefault();
          increment(activeCategories[idx].key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCategories, increment]);

  const handleReset = () => {
    cDispatch({ type: "reset" });
    setResetOpen(false);
  };

  // Check if candidate counts would reduce existing database counts for today
  const getReductionWarning = useCallback(
    (candidateCounts: Record<string, number>) => {
      const existingLog = logs.find((l) => l.log_date === todayIso);
      if (!existingLog?.counts) return null;
      const existingCounts = existingLog.counts;

      const reducedCategories: { label: string; from: number; to: number }[] = [];
      for (const cat of categories) {
        const serverVal = existingCounts[cat.key] ?? 0;
        const localVal = candidateCounts[cat.key] ?? 0;
        if (serverVal > 0 && localVal < serverVal) {
          reducedCategories.push({ label: cat.label, from: serverVal, to: localVal });
        }
      }
      return reducedCategories.length > 0 ? reducedCategories : null;
    },
    [logs, todayIso, categories]
  );

  const commitSave = useCallback(
    async (current: Record<string, number>, keys: string[]) => {
      if (keys.length === 0) return;
      const existingLog = logs.find((l) => l.log_date === todayIso);
      let same = true;
      for (const k of keys) {
        if ((current[k] ?? 0) !== (existingLog?.counts?.[k] ?? 0)) {
          same = false;
          break;
        }
      }
      if (same) {
        cDispatch({ type: "set_saved", v: true });
        return;
      }
      if (!checkSilentLimit()) throw new Error("Too many saves");
      const mergedCounts: Record<string, number> = { ...(existingLog?.counts ?? {}) };
      for (const k of keys) mergedCounts[k] = current[k] ?? 0;
      const user_id = await getUserId();
      const { error } = await supabase
        .from("daily_logs")
        .upsert(
          {
            log_date: todayIso,
            is_off_day: isWeekend(todayIso),
            notes: existingLog?.notes ?? null,
            counts: mergedCounts,
            user_id,
          },
          { onConflict: "user_id,log_date" }
        );
      if (error) throw error;
      await logAuditEvent("log_updated", { log_date: todayIso });
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      cDispatch({ type: "set_saved", v: true });
    },
    [logs, todayIso, qc, checkSilentLimit]
  );

  const handleSave = async () => {
    if (saved) return;
    const keys = activeCategories.map((c) => c.key);
    const reduction = getReductionWarning(counts);
    if (reduction) {
      setReducedList(reduction);
      setOverwriteOpen(true);
      return;
    }
    try {
      await commitSave(counts, keys);
      toast.success("Synced to database");
    } catch {
      toast.error("Couldn't sync counts", {
        description: "Check your connection and try again.",
      });
    }
  };

  // Auto-save: debounced silent flush, plus periodic backup — only if not saved.
  const autoSaveRef = useRef({ counts, activeCategories, isPending: upsert.isPending, saved });
  autoSaveRef.current = { counts, activeCategories, isPending: upsert.isPending, saved };
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const scheduleAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { counts: c, activeCategories: cats, isPending, saved: isSaved } = autoSaveRef.current;
      if (!hydratedRef.current || !logsFetched || isPending || cats.length === 0 || isSaved) return;

      // Safeguard: Never auto-save if it would reduce existing server counts
      if (getReductionWarning(c)) return;

      try {
        await commitSave(c, cats.map((cat) => cat.key));
      } catch {
        /* silent retry */
      }
    }, 2000);
  }, [commitSave, getReductionWarning, logsFetched]);

  useEffect(() => {
    if (hydratedRef.current && activeCategories.length > 0 && !saved) {
      scheduleAutoSave();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [counts, activeCategories, saved, scheduleAutoSave]);

  // Periodic backup every 30s — only if unsaved and safe to save
  useEffect(() => {
    const id = setInterval(async () => {
      const { counts: c, activeCategories: cats, isPending, saved: isSaved } = autoSaveRef.current;
      if (!hydratedRef.current || !logsFetched || isPending || cats.length === 0 || isSaved) return;
      if (getReductionWarning(c)) return;
      try {
        await commitSave(c, cats.map((cat) => cat.key));
      } catch {
        /* best-effort backup */
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [commitSave, getReductionWarning, logsFetched]);

  return (
    <>
      <div id="kudos-animation-container" className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5 max-w-7xl mx-auto">
          {/* Hero — Session Total Command Center */}
          <section className="relative rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 backdrop-blur-md overflow-hidden shadow-xs animate-fade-in">
            {/* Ambient accent top highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute -top-20 left-1/3 -translate-x-1/2 w-96 h-32 bg-primary/5 blur-3xl pointer-events-none rounded-full" />

            {/* Header bar */}
            <header className="flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-5 py-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary shadow-2xs" />
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground uppercase">
                  Session Total
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Sync status badge */}
                <div
                  className={`flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-2xs transition-colors duration-200 ${
                    logsLoading
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                      : saved
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : upsert.isPending
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                      : total > 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      : "bg-muted text-muted-foreground border-border/40"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      logsLoading || upsert.isPending
                        ? "bg-sky-500 animate-ping"
                        : saved
                        ? "bg-emerald-500"
                        : total > 0
                        ? "bg-amber-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <span>
                    {logsLoading ? "Syncing…" : saved ? "Synced" : upsert.isPending ? "Syncing…" : total > 0 ? "Unsaved" : "Ready"}
                  </span>
                </div>

                {/* Force sync button */}
                {!saved && total > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={upsert.isPending}
                    aria-label="Force sync now"
                    className="h-7 px-2.5 rounded-xl border-border/60 hover:bg-muted/80 text-xs font-medium"
                  >
                    <RefreshCw className={`size-3 mr-1 ${upsert.isPending ? "animate-spin" : ""}`} />
                    <span>Sync</span>
                  </Button>
                )}

                {/* Reset button */}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Reset counter"
                  className="h-7 px-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setResetOpen(true)}
                  disabled={total === 0 && activeCategories.length === 0}
                >
                  <RotateCcw className="size-3.5" />
                  <span className="hidden xs:inline ml-1 font-semibold text-xs">Reset</span>
                </Button>
              </div>
            </header>

            {/* Main hero display */}
            <div className="p-5 sm:p-7 flex flex-wrap items-end justify-between gap-6 relative z-10">
              <div>
                <p className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                  Current Count
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl sm:text-8xl xl:text-9xl font-black font-mono tabular-nums text-foreground leading-none tracking-tight">
                    {animatedTotal}
                  </span>
                  <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest pb-2">
                    docs
                  </span>
                </div>
              </div>

              {/* Quick stats cards */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/50 backdrop-blur-xs min-w-[100px] shadow-2xs">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Active
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                    {activeCategories.length}
                  </span>
                </div>

                <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/50 backdrop-blur-xs min-w-[110px] shadow-2xs">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                    Logged Today
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                    {todayTotal}
                  </span>
                </div>

                {total > 0 && (
                  <div className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/50 backdrop-blur-xs min-w-[100px] shadow-2xs">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Delta
                    </span>
                    <span
                      className={`text-xl font-bold font-mono tabular-nums ${
                        saved
                          ? "text-emerald-500"
                          : total > todayTotal
                          ? "text-amber-500"
                          : "text-foreground"
                      }`}
                    >
                      {saved ? "±0" : `${total >= todayTotal ? "+" : ""}${total - todayTotal}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Active counter cards */}
          {activeCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Active Counters
                  </h3>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {activeCategories.length}
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-2xs text-muted-foreground font-mono">
                  Keys <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 font-bold">1</kbd>
                  – <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 font-bold">{Math.min(9, activeCategories.length)}</kbd> to quick count
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5 stagger-children">
                {activeCategories.map((cat, idx) => (
                  <CounterCard
                    key={cat.key}
                    cat={cat}
                    count={getCount(cat.key)}
                    maxCount={maxCount}
                    onIncrement={() => increment(cat.key)}
                    onDecrement={() => decrement(cat.key)}
                    onRemove={() => removeCategory(cat.key)}
                    hotkeyIndex={idx < 9 ? idx + 1 : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category action tray */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={catsLoading || availableToAdd.length === 0}
              className="flex-1 flex items-center gap-3.5 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm px-4 py-3.5 text-left hover:bg-muted/40 hover:border-foreground/20 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation cursor-pointer shadow-2xs"
            >
              <span className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Plus className="size-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {catsLoading
                    ? "Loading categories…"
                    : availableToAdd.length === 0 && activeCategories.length === 0
                    ? "No categories yet"
                    : availableToAdd.length === 0
                    ? "All categories in counter"
                    : "Add Category from Tray"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {availableToAdd.length > 0
                    ? `${availableToAdd.length} available to track`
                    : "All available categories are already added"}
                </p>
              </div>
              {availableToAdd.length > 0 && !catsLoading && (
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setNewCatOpen(true)}
              disabled={catsLoading}
              className="sm:w-60 flex items-center gap-3.5 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 text-left hover:bg-primary/10 hover:border-primary/50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation cursor-pointer shadow-2xs"
            >
              <span className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Tag className="size-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary truncate">Create Category</p>
                <p className="text-[11px] text-primary/70 truncate">New document type</p>
              </div>
            </button>
          </div>

          {/* Empty state when no counters selected */}
          {activeCategories.length === 0 && !catsLoading && categories.length > 0 && (
            <EmptyState
              icon={Hash}
              title="No Active Counters"
              hint="Add categories from the tray above or press 'Add Category' to begin tracking document counts for today."
            />
          )}
        </div>
      </main>

      <CategoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        categories={availableToAdd}
        onPick={addCategory}
      />

      <NewCategoryDialog
        open={newCatOpen}
        onOpenChange={setNewCatOpen}
        onCreated={addCategory}
      />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Reset the counter?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will clear {total} count{total === 1 ? "" : "s"} and remove all{" "}
              {activeCategories.length} categor{activeCategories.length === 1 ? "y" : "ies"} from the active counter grid.
              {todayLog ? " Counts already saved to today's log are preserved safely in the database." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
              onClick={handleReset}
            >
              Reset counter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <AlertDialogContent className="rounded-2xl border border-destructive/40 bg-background/95 backdrop-blur-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Lower Count than Database Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
              <span className="block text-foreground/90 font-medium">
                The database currently has higher counts saved for today ({todayIso}):
              </span>
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 text-foreground font-mono text-2xs space-y-1 max-h-40 overflow-y-auto">
                {reducedList?.map((r) => (
                  <div key={r.label} className="flex justify-between items-center py-0.5">
                    <span className="truncate pr-2">{r.label}</span>
                    <span className="shrink-0 font-semibold">
                      <span className="text-emerald-500 font-bold">{r.from}</span> &rarr;{" "}
                      <span className="text-destructive font-bold">{r.to}</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="pt-1">
                Do you want to keep the higher counts from the database or overwrite your saved history with these lower numbers?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel
              className="rounded-xl border-border/60"
              onClick={() => {
                const serverCounts = todayLog?.counts ?? {};
                const serverKeys = Object.keys(serverCounts).filter((k) => (serverCounts[k] ?? 0) > 0);
                skipUnsavedMarkRef.current = true;
                cDispatch({
                  type: "hydrate",
                  counts: serverCounts,
                  keys: Array.from(new Set([...selectedKeys, ...serverKeys])),
                });
                cDispatch({ type: "set_saved", v: true });
                setOverwriteOpen(false);
                toast.info("Restored database counts.");
              }}
            >
              Keep Database Counts
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
              onClick={async () => {
                setOverwriteOpen(false);
                const keys = activeCategories.map((c) => c.key);
                try {
                  await commitSave(counts, keys);
                  toast.warning("Database record overwritten.");
                } catch {
                  toast.error("Failed to overwrite database record.");
                }
              }}
            >
              Overwrite Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { isoDate, totalForLog, isWeekend, type DailyLog } from "@/types/log";
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
import { playTapFeedback } from "@/lib/audio-feedback";

// Import modular components
import { CounterCard } from "@/components/ar/counter/CounterCard";
import { CategoryPicker } from "@/components/ar/counter/CategoryPicker";
import { NewCategoryDialog } from "@/components/ar/counter/NewCategoryDialog";

const COUNTS_KEY = "counter_counts";
const SELECTED_KEY = "counter_selected_keys";
const COUNTS_DATE_KEY = "counter_counts_date";
const COUNTS_DIRTY_KEY = "counter_dirty";
const PENDING_RESCUE_KEY = "counter_pending_rescue";

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
      return {
        ...s,
        selectedKeys: s.selectedKeys.includes(a.key) ? s.selectedKeys : [...s.selectedKeys, a.key],
      };
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

interface KudosItem {
  id: number;
  emoji: string;
  left: number;
  size: number;
}

export default function CounterPage() {
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const {
    data: logs = [],
    isLoading: logsLoading,
    isFetched: logsFetched,
    isFetchedAfterMount: logsFetchedAfterMount,
    isError: logsError,
  } = useDailyLogs();
  const upsert = useUpsertLog();
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const qc = useQueryClient();
  const { checkLimit: checkSilentLimit } = useMutationRateLimit({ maxRequests: 120, windowMs: 60_000 });

  const todayIso = isoDate();
  const todayLog = logs.find((l) => l.log_date === todayIso);
  const todayTotal = todayLog ? totalForLog(todayLog) : 0;

  const [{ counts, selectedKeys, saved }, cDispatch] = useReducer(counterReducer, undefined, () => {
    const savedDate = localStorage.getItem(COUNTS_DATE_KEY);
    const isCurrentDay = savedDate === todayIso;

    // If the date rolled over while previous counts were still marked dirty,
    // stage them into counter_pending_rescue BEFORE resetting for the new day.
    if (savedDate && !isCurrentDay && localStorage.getItem(COUNTS_DIRTY_KEY) === "true") {
      const staleCounts = load<Record<string, number>>(COUNTS_KEY, {});
      const staleTotal = Object.values(staleCounts).reduce((s, v) => s + (v || 0), 0);
      if (staleTotal > 0) {
        try {
          localStorage.setItem(
            PENDING_RESCUE_KEY,
            JSON.stringify({ date: savedDate, counts: staleCounts })
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      try {
        localStorage.removeItem(COUNTS_DIRTY_KEY);
      } catch {
        // Ignore storage errors
      }
    }

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
  const [isSyncing, setIsSyncing] = useState(false);

  // Cross-device persistence & anti-data-loss tracking
  const hydratedRef = useRef(false);
  const freshNetworkHydratedRef = useRef(false);
  const skipUnsavedMarkRef = useRef(false);
  // Keys the user explicitly decremented via '-' in this session (intentional reductions)
  const forceKeysRef = useRef<Set<string>>(new Set());
  // In-flight save serialization so concurrent taps never drop or falsely mark saved
  const isSavingRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const activeDateRef = useRef(todayIso);

  const [kudosItems, setKudosItems] = useState<KudosItem[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const triggerKudos = useCallback((emoji: string) => {
    const item: KudosItem = {
      id: Date.now() + Math.random(),
      emoji,
      left: Math.random() * 80 + 10,
      size: Math.random() * 25 + 28,
    };
    setKudosItems((prev) => [...prev, item]);
    setTimeout(() => {
      setKudosItems((prev) => prev.filter((k) => k.id !== item.id));
    }, 2000);
  }, []);

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
          triggerKudos(payload.payload.emoji);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, triggerKudos]);

  // Flush any rescued counts from a previous date rollover or forced 10-hour session logout
  useEffect(() => {
    if (!user?.id) return;
    const rawRescue = localStorage.getItem(PENDING_RESCUE_KEY);
    if (!rawRescue) return;

    let cancelled = false;
    (async () => {
      try {
        const parsed = JSON.parse(rawRescue) as { date?: string; counts?: Record<string, number> };
        if (!parsed?.date || !parsed?.counts) {
          localStorage.removeItem(PENDING_RESCUE_KEY);
          return;
        }
        const rescueTotal = Object.values(parsed.counts).reduce((s, v) => s + (v || 0), 0);
        if (rescueTotal <= 0) {
          localStorage.removeItem(PENDING_RESCUE_KEY);
          return;
        }

        const { error: rpcError } = await supabase.rpc("sync_daily_log_counts", {
          p_user_id: user.id,
          p_log_date: parsed.date,
          p_counts: parsed.counts,
          p_force_keys: [],
          p_is_off_day: isWeekend(parsed.date),
          p_notes: null,
        });

        if (rpcError) {
          const { data: existing } = await supabase
            .from("daily_logs")
            .select("counts, is_off_day, notes")
            .eq("user_id", user.id)
            .eq("log_date", parsed.date)
            .maybeSingle();

          const merged: Record<string, number> = {
            ...((existing?.counts as Record<string, number>) ?? {}),
          };
          for (const [k, v] of Object.entries(parsed.counts)) {
            merged[k] = Math.max(v || 0, merged[k] || 0);
          }

          const { error: upsertError } = await supabase
            .from("daily_logs")
            .upsert(
              {
                user_id: user.id,
                log_date: parsed.date,
                counts: merged,
                is_off_day: existing?.is_off_day ?? isWeekend(parsed.date),
                notes: existing?.notes ?? null,
              },
              { onConflict: "user_id,log_date" }
            );
          if (upsertError) return;
        }

        if (!cancelled) {
          localStorage.removeItem(PENDING_RESCUE_KEY);
          qc.invalidateQueries({ queryKey: ["daily_logs"] });
        }
      } catch {
        // Keep PENDING_RESCUE_KEY for next retry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, qc]);

  useEffect(() => {
    try {
      localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
      localStorage.setItem(COUNTS_DATE_KEY, todayIso);
    } catch {
      // Ignore storage errors
    }
  }, [counts, todayIso]);

  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(selectedKeys));
    } catch {
      // Ignore storage errors
    }
  }, [selectedKeys]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  const availableToAdd = useMemo(() => {
    return categories.filter((c) => !selectedKeys.includes(c.key));
  }, [categories, selectedKeys]);

  // Throttled / debounced broadcast queue to avoid saturating realtime channel on rapid clicks
  const pendingBroadcastRef = useRef<Record<string, number>>({});
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBroadcast = useCallback(() => {
    if (!channelRef.current || !user) {
      pendingBroadcastRef.current = {};
      return;
    }
    const pending = pendingBroadcastRef.current;
    pendingBroadcastRef.current = {};

    for (const [key, change] of Object.entries(pending)) {
      if (change !== 0) {
        channelRef.current.send({
          type: "broadcast",
          event: "activity",
          payload: {
            user_id: user.id,
            email: user.email,
            category_key: key,
            change,
            timestamp: Date.now(),
          },
        });
      }
    }
  }, [user]);

  const queueBroadcast = useCallback(
    (key: string, change: number) => {
      pendingBroadcastRef.current[key] = (pendingBroadcastRef.current[key] ?? 0) + change;
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = setTimeout(flushBroadcast, 450);
    },
    [flushBroadcast]
  );

  useEffect(() => {
    return () => {
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    };
  }, []);

  const getCount = (key: string) => counts[key] ?? 0;

  const markDirty = useCallback(() => {
    try {
      localStorage.setItem(COUNTS_DIRTY_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    cDispatch({ type: "set_saved", v: false });
  }, []);

  const increment = useCallback((key: string) => {
    const nextVal = (counts[key] ?? 0) + 1;
    markDirty();
    cDispatch({ type: "set_count", key, val: nextVal });
    queueBroadcast(key, 1);
    playTapFeedback();
    const cat = categories.find((c) => c.key === key);
    setAnnouncement(`${cat?.label ?? key}: ${nextVal}`);
  }, [counts, markDirty, queueBroadcast, categories]);
  
  const decrement = useCallback((key: string) => {
    const nextVal = Math.max(0, (counts[key] ?? 0) - 1);
    forceKeysRef.current.add(key);
    markDirty();
    cDispatch({ type: "set_count", key, val: nextVal });
    queueBroadcast(key, -1);
    playTapFeedback();
    const cat = categories.find((c) => c.key === key);
    setAnnouncement(`${cat?.label ?? key}: ${nextVal}`);
  }, [counts, markDirty, queueBroadcast, categories]);

  const total = activeCategories.reduce((s, c) => s + getCount(c.key), 0);
  const maxCount = activeCategories.reduce((m, c) => Math.max(m, getCount(c.key)), 0);
  const animatedTotal = useAnimatedNumber(total);

  const addCategory = (cat: Category) => cDispatch({ type: "add_key", key: cat.key });
  const removeCategory = (key: string) => cDispatch({ type: "remove_key", key });

  // Hydrate from the server once initial data arrives, and re-reconcile when the fresh
  // network fetch completes (in case persistQueryClient initially supplied stale cache).
  useEffect(() => {
    if (catsLoading || logsLoading) return;
    if (!logsFetched && !logsError) return;
    if (categories.length === 0 && !logsError) return;

    const isFreshPass = logsFetchedAfterMount && !freshNetworkHydratedRef.current;
    if (hydratedRef.current && !isFreshPass) return;

    const serverCounts = todayLog?.counts ?? {};
    const serverTotal = totalForLog(todayLog ?? { counts: {} });
    const localTotal = Object.values(counts).reduce((s, v) => s + (v || 0), 0);

    if (serverTotal > 0) {
      // Automatically select and activate all categories that have counts in the DB
      const serverKeysWithCounts = Object.keys(serverCounts).filter(
        (k) => (serverCounts[k] ?? 0) > 0 && (categories.length === 0 || categories.some((c) => c.key === k))
      );
      const nextKeys = Array.from(new Set([...selectedKeys, ...serverKeysWithCounts]));

      // Safe merge: Never lose server counts or local taps, while respecting intentional decrements
      const merged: Record<string, number> = { ...serverCounts };
      for (const k of Object.keys(counts)) {
        if (forceKeysRef.current.has(k)) {
          merged[k] = counts[k] ?? 0;
        } else {
          merged[k] = Math.max(counts[k] ?? 0, serverCounts[k] ?? 0);
        }
      }

      const changedFromLocal =
        nextKeys.length !== selectedKeys.length ||
        Object.keys(merged).some((k) => (merged[k] ?? 0) !== (counts[k] ?? 0));

      if (!hydratedRef.current || changedFromLocal) {
        skipUnsavedMarkRef.current = true;
        cDispatch({ type: "hydrate", counts: merged, keys: nextKeys });
      }

      const matchesServer = Object.keys(merged).every((k) => (merged[k] ?? 0) === (serverCounts[k] ?? 0));
      cDispatch({ type: "set_saved", v: matchesServer });
      if (matchesServer) {
        try {
          localStorage.removeItem(COUNTS_DIRTY_KEY);
        } catch {
          // Ignore storage errors
        }
      }

      if (!hydratedRef.current && localTotal === 0) {
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
    if (logsFetchedAfterMount) {
      freshNetworkHydratedRef.current = true;
    }
  }, [
    todayLog,
    categories,
    catsLoading,
    logsLoading,
    logsFetched,
    logsFetchedAfterMount,
    logsError,
    counts,
    selectedKeys,
  ]);

  // Mark progress as unsaved whenever counts change after initial hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipUnsavedMarkRef.current) {
      skipUnsavedMarkRef.current = false;
      return;
    }
    cDispatch({ type: "set_saved", v: false });
  }, [counts]);

  // Global Keyboard Shortcuts: Keys 1 to 9 & Numpad 1 to 9 (Shift+[1-9] decrements)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;

      const codeMatch = e.code.match(/^(?:Digit|Numpad)([1-9])$/);
      let num = codeMatch ? parseInt(codeMatch[1], 10) : NaN;
      if (isNaN(num)) {
        const parsedKey = parseInt(e.key, 10);
        if (!isNaN(parsedKey) && parsedKey >= 1 && parsedKey <= 9) {
          num = parsedKey;
        }
      }

      if (!isNaN(num) && num >= 1 && num <= 9) {
        const idx = num - 1;
        if (idx >= 0 && idx < activeCategories.length) {
          e.preventDefault();
          const targetKey = activeCategories[idx].key;
          if (e.shiftKey) {
            decrement(targetKey);
          } else {
            increment(targetKey);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCategories, increment, decrement]);

  const handleReset = () => {
    forceKeysRef.current.clear();
    try {
      localStorage.removeItem(COUNTS_DIRTY_KEY);
    } catch {
      // Ignore storage errors
    }
    cDispatch({ type: "reset" });
    setResetOpen(false);
  };

  // Check if candidate counts would reduce existing database counts for today
  // (excluding categories the user explicitly decremented in this session)
  const getReductionWarning = useCallback(
    (candidateCounts: Record<string, number>) => {
      const existingLog = logs.find((l) => l.log_date === todayIso);
      if (!existingLog?.counts) return null;
      const existingCounts = existingLog.counts;

      const reducedCategories: { label: string; from: number; to: number }[] = [];
      for (const cat of categories) {
        if (forceKeysRef.current.has(cat.key)) continue;
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

  // Latest state ref so in-flight saves and unmount/visibility flushes always see fresh values
  const autoSaveRef = useRef({
    counts,
    selectedKeys,
    activeCategories,
    isPending: upsert.isPending,
    saved,
    todayIso,
  });
  autoSaveRef.current = {
    counts,
    selectedKeys,
    activeCategories,
    isPending: upsert.isPending,
    saved,
    todayIso,
  };

  const commitSave = useCallback(
    async (
      current: Record<string, number>,
      keys: string[],
      opts: { allowUnforcedDecrease?: boolean; targetDate?: string } = {}
    ) => {
      const { allowUnforcedDecrease = false, targetDate = todayIso } = opts;
      const allCandidateKeys = Array.from(new Set([...keys, ...Object.keys(current)]));
      if (allCandidateKeys.length === 0) return;

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      const existingLog = logs.find((l) => l.log_date === targetDate);
      const existingCounts = existingLog?.counts ?? {};
      const forcedKeys = allowUnforcedDecrease
        ? allCandidateKeys
        : Array.from(forceKeysRef.current);

      const mergedCounts: Record<string, number> = { ...existingCounts };
      for (const k of allCandidateKeys) {
        const localVal = Math.max(0, current[k] ?? 0);
        const serverVal = existingCounts[k] ?? 0;
        if (allowUnforcedDecrease || forceKeysRef.current.has(k)) {
          mergedCounts[k] = localVal;
        } else {
          mergedCounts[k] = Math.max(localVal, serverVal);
        }
      }

      let same = true;
      for (const k of Object.keys(mergedCounts)) {
        if ((mergedCounts[k] ?? 0) !== (existingCounts[k] ?? 0)) {
          same = false;
          break;
        }
      }

      if (same) {
        const stillMatches = allCandidateKeys.every(
          (k) => (autoSaveRef.current.counts[k] ?? 0) === (current[k] ?? 0)
        );
        if (stillMatches) {
          try {
            localStorage.removeItem(COUNTS_DIRTY_KEY);
          } catch {
            // Ignore storage errors
          }
          cDispatch({ type: "set_saved", v: true });
        }
        return;
      }

      if (!checkSilentLimit()) throw new Error("Too many saves");

      isSavingRef.current = true;
      setIsSyncing(true);

      try {
        const userId = user?.id || (await getUserId());
        let savedRow: DailyLog | null = null;

        // 1. Primary path: Atomic row-locked PostgreSQL JSONB merge RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc("sync_daily_log_counts", {
          p_user_id: userId,
          p_log_date: targetDate,
          p_counts: mergedCounts,
          p_force_keys: forcedKeys,
          p_is_off_day: existingLog?.is_off_day ?? isWeekend(targetDate),
          p_notes: existingLog?.notes ?? null,
        });

        if (!rpcError && rpcData) {
          savedRow = rpcData as unknown as DailyLog;
        } else {
          // 2. Fallback path: Direct Supabase upsert (works even before SQL RPC is pasted)
          const { data: upsertData, error: upsertError } = await supabase
            .from("daily_logs")
            .upsert(
              {
                log_date: targetDate,
                is_off_day: existingLog?.is_off_day ?? isWeekend(targetDate),
                notes: existingLog?.notes ?? null,
                counts: mergedCounts,
                user_id: userId,
              },
              { onConflict: "user_id,log_date" }
            )
            .select()
            .single();
          if (upsertError) throw upsertError;
          savedRow = upsertData as DailyLog;
        }

        // Optimistically update React Query cache immediately so subsequent saves see the new baseline
        if (savedRow && userId) {
          qc.setQueryData<DailyLog[]>(["daily_logs", userId], (prev) => {
            const list = prev ?? [];
            const idx = list.findIndex((l) => l.log_date === targetDate);
            const normalized: DailyLog = {
              ...savedRow!,
              counts: (savedRow!.counts ?? mergedCounts) as Record<string, number>,
            };
            if (idx >= 0) {
              const copy = [...list];
              copy[idx] = normalized;
              return copy;
            }
            return [normalized, ...list];
          });
        }

        void logAuditEvent("log_updated", { log_date: targetDate });
        void qc.invalidateQueries({ queryKey: ["daily_logs"] });

        // Only mark saved=true if the user hasn't tapped again while this request was in flight
        const latestCounts = autoSaveRef.current.counts;
        const noNewTapsDuringFlight = allCandidateKeys.every(
          (k) => (latestCounts[k] ?? 0) === (current[k] ?? 0)
        );

        if (noNewTapsDuringFlight) {
          for (const k of forcedKeys) {
            forceKeysRef.current.delete(k);
          }
          try {
            localStorage.removeItem(COUNTS_DIRTY_KEY);
          } catch {
            // Ignore storage errors
          }
          cDispatch({ type: "set_saved", v: true });
        } else {
          queuedSaveRef.current = true;
        }
      } finally {
        isSavingRef.current = false;
        setIsSyncing(false);
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          const { counts: latestC, activeCategories: latestCats, selectedKeys: latestKeys } =
            autoSaveRef.current;
          const nextKeys =
            latestCats.length > 0 ? latestCats.map((c) => c.key) : latestKeys;
          void commitSave(latestC, nextKeys);
        }
      }
    },
    [logs, todayIso, qc, checkSilentLimit, user?.id]
  );

  // Handle live midnight date rollover while CounterPage remains mounted
  useEffect(() => {
    if (activeDateRef.current === todayIso) return;
    const prevDate = activeDateRef.current;
    activeDateRef.current = todayIso;

    const prevCounts = autoSaveRef.current.counts;
    const prevTotal = Object.values(prevCounts).reduce((s, v) => s + (v || 0), 0);
    if (prevTotal > 0 && !autoSaveRef.current.saved) {
      const prevKeys =
        autoSaveRef.current.activeCategories.length > 0
          ? autoSaveRef.current.activeCategories.map((c) => c.key)
          : autoSaveRef.current.selectedKeys;
      void commitSave(prevCounts, prevKeys, { targetDate: prevDate });
    }

    forceKeysRef.current.clear();
    hydratedRef.current = false;
    freshNetworkHydratedRef.current = false;
    skipUnsavedMarkRef.current = true;
    cDispatch({
      type: "hydrate",
      counts: {},
      keys: autoSaveRef.current.selectedKeys,
    });
  }, [todayIso, commitSave]);

  const handleSave = async () => {
    if (saved) return;
    const keys =
      activeCategories.length > 0 ? activeCategories.map((c) => c.key) : selectedKeys;
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

  // Auto-save: debounced silent flush (1s), plus periodic backup and unmount/visibility flush
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const flushPendingAutoSave = useCallback(() => {
    const {
      counts: c,
      activeCategories: cats,
      selectedKeys: selKeys,
      isPending,
      saved: isSaved,
    } = autoSaveRef.current;
    const keys = cats.length > 0 ? cats.map((cat) => cat.key) : selKeys;
    if (isPending || keys.length === 0 || isSaved) return;
    void commitSave(c, keys).catch(() => {
      /* silent retry on next interval or tap */
    });
  }, [commitSave]);

  const scheduleAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      flushPendingAutoSave();
    }, 1000);
  }, [flushPendingAutoSave]);

  // Note: `saved` is intentionally omitted from dependencies so `saved` flipping to `true`
  // from an earlier in-flight request never clears `debounceRef` for newer taps.
  useEffect(() => {
    const hasKeys = activeCategories.length > 0 || selectedKeys.length > 0;
    if (hasKeys && !autoSaveRef.current.saved) {
      scheduleAutoSave();
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [counts, activeCategories, selectedKeys, scheduleAutoSave]);

  // Flush immediately when switching tabs, minimizing window, or unmounting / navigating away
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !autoSaveRef.current.saved) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        flushPendingAutoSave();
      }
    };
    const onPageHide = () => {
      if (!autoSaveRef.current.saved) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        flushPendingAutoSave();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      if (!autoSaveRef.current.saved) {
        flushPendingAutoSave();
      }
    };
  }, [flushPendingAutoSave]);

  // Periodic backup every 15s — ensures counts sync even after a brief network drop
  useEffect(() => {
    const id = setInterval(() => {
      if (!autoSaveRef.current.saved) {
        flushPendingAutoSave();
      }
    }, 15 * 1000);
    return () => clearInterval(id);
  }, [flushPendingAutoSave]);

  return (
    <>
      {/* Declarative Kudos Float Stream */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden>
        {kudosItems.map((item) => (
          <div
            key={item.id}
            className="kudos-float absolute select-none pointer-events-none"
            style={{
              left: `${item.left}%`,
              bottom: "0px",
              fontSize: `${item.size}px`,
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Screen reader live region announcing counts */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

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
                    logsLoading || isSyncing || upsert.isPending
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                      : saved
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : total > 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      : "bg-muted text-muted-foreground border-border/40"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      logsLoading || isSyncing || upsert.isPending
                        ? "bg-sky-500 animate-ping"
                        : saved
                        ? "bg-emerald-500"
                        : total > 0
                        ? "bg-amber-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <span>
                    {logsLoading || isSyncing || upsert.isPending
                      ? "Syncing…"
                      : saved
                      ? "Synced"
                      : total > 0
                      ? "Unsaved"
                      : "Ready"}
                  </span>
                </div>

                {/* Force sync button */}
                {!saved && total > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={upsert.isPending || isSyncing}
                    aria-label="Force sync now"
                    className="h-7 px-2.5 rounded-xl border-border/60 hover:bg-muted/80 text-xs font-medium"
                  >
                    <RefreshCw className={`size-3 mr-1 ${upsert.isPending || isSyncing ? "animate-spin" : ""}`} />
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
                forceKeysRef.current.clear();
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
                const keys =
                  activeCategories.length > 0 ? activeCategories.map((c) => c.key) : selectedKeys;
                try {
                  await commitSave(counts, keys, { allowUnforcedDecrease: true });
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

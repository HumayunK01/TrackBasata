import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  type DailyLog,
  type DailyLogInsert,
  type LeaveTypeId,
  getDatesInRange,
  formatLeaveNotes,
} from "@/types/log";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { supabase, getUserId } from "@/integrations/supabase/client";

const countField = z.number().int("Must be a whole number").nonnegative("Must be 0 or more").max(9999, "Value too large");

const DailyLogInsertSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  counts: z.record(countField),
  is_off_day: z.boolean(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").nullable().optional(),
});

function formatError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Validation error";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function useDailyLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily_logs", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<DailyLog[]> => {
      try {
        const data = await api.get<DailyLog[]>("/logs");
        return (data ?? []).map((row) => ({
          ...row,
          counts: (row.counts ?? {}) as Record<string, number>,
        })) as DailyLog[];
      } catch {
        // Direct Supabase fallback if Render API is cold-starting or unreachable
        const { data, error } = await supabase
          .from("daily_logs")
          .select("id, user_id, log_date, counts, is_off_day, notes, created_at, updated_at")
          .eq("user_id", user!.id)
          .order("log_date", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => ({
          ...row,
          counts: (row.counts ?? {}) as Record<string, number>,
        })) as DailyLog[];
      }
    },
  });
}

export function useUpsertLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      const validated = DailyLogInsertSchema.parse(log);
      try {
        return await api.post<DailyLog>("/logs", { ...validated, notes: validated.notes ?? "" });
      } catch {
        const user_id = await getUserId();
        const { data, error } = await supabase
          .from("daily_logs")
          .upsert(
            {
              user_id,
              log_date: validated.log_date,
              counts: validated.counts,
              is_off_day: validated.is_off_day,
              notes: validated.notes ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,log_date" }
          )
          .select()
          .single();
        if (error) throw error;
        return data as DailyLog;
      }
    },
    onSuccess: (_data, variables) => {
      try {
        if (localStorage.getItem("counter_counts_date") === variables.log_date) {
          localStorage.setItem("counter_counts", JSON.stringify(variables.counts));
          localStorage.removeItem("counter_dirty");
        }
      } catch {
        // Ignore storage errors
      }
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
    },
    onError: (e: unknown) => {
      toast.error(formatError(e));
    },
  });
}

export function useUpsertLeaveRange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
      leaveType,
      notes,
      previousDates = [],
    }: {
      startDate: string;
      endDate: string;
      leaveType: LeaveTypeId;
      notes?: string | null;
      previousDates?: string[];
    }) => {
      const targetDates = getDatesInRange(startDate, endDate);
      const formattedNotes = formatLeaveNotes(leaveType, notes);
      const removedDates = previousDates.filter((d) => !targetDates.includes(d));

      const user_id = await getUserId();

      // Remove any dates that were trimmed when editing a leave span
      if (removedDates.length > 0) {
        const { error: delError } = await supabase
          .from("daily_logs")
          .delete()
          .eq("user_id", user_id)
          .in("log_date", removedDates);
        if (delError) throw delError;
      }

      const nowIso = new Date().toISOString();
      const rows = targetDates.map((d) => ({
        user_id,
        log_date: d,
        counts: {},
        is_off_day: true,
        notes: formattedNotes,
        updated_at: nowIso,
      }));

      const { data, error } = await supabase
        .from("daily_logs")
        .upsert(rows, { onConflict: "user_id,log_date" })
        .select();

      if (error) throw error;
      return (data ?? []) as DailyLog[];
    },
    onSuccess: (_data, variables) => {
      const days = getDatesInRange(variables.startDate, variables.endDate).length;
      toast.success(
        days > 1
          ? `${variables.leaveType} saved (${days} days in 1 row)`
          : `${variables.leaveType} saved`,
      );
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
    },
    onError: (e: unknown) => {
      toast.error(formatError(e));
    },
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dateOrDates: string | string[]) => {
      const dates = Array.isArray(dateOrDates) ? dateOrDates : [dateOrDates];
      if (dates.length === 1) {
        try {
          return await api.delete(`/logs?date=${encodeURIComponent(dates[0])}`);
        } catch {
          const user_id = await getUserId();
          const { error } = await supabase
            .from("daily_logs")
            .delete()
            .eq("user_id", user_id)
            .eq("log_date", dates[0]);
          if (error) throw error;
          return { deleted: true };
        }
      }

      const user_id = await getUserId();
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("user_id", user_id)
        .in("log_date", dates);
      if (error) throw error;
      return { deleted: true };
    },
    onSuccess: (_data, dateOrDates) => {
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      const count = Array.isArray(dateOrDates) ? dateOrDates.length : 1;
      toast.success(count > 1 ? `Leave (${count} days) deleted` : "Log deleted");
    },
    onError: (e: unknown) => {
      toast.error(formatError(e));
    },
  });
}

export function useTapIncrement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ log_date, key, delta = 1 }: { log_date: string; key: string; delta?: number }) => {
      return await api.post<DailyLog>("/logs/tap", { log_date, key, delta });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
    },
  });
}

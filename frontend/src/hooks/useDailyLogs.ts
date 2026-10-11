import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { DailyLog, DailyLogInsert } from "@/types/log";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";

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
      const data = await api.get<DailyLog[]>("/logs");
      return (data ?? []).map((row) => ({
        ...row,
        counts: (row.counts ?? {}) as Record<string, number>,
      })) as DailyLog[];
    },
  });
}

export function useUpsertLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      const validated = DailyLogInsertSchema.parse(log);
      return await api.post<DailyLog>("/logs", { ...validated, notes: validated.notes ?? "" });
    },
    onSuccess: () => {
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
    mutationFn: async (date: string) => {
      return await api.delete(`/logs?date=${encodeURIComponent(date)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      toast.success("Log deleted");
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

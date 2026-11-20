import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useProfile";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { Tables } from "@/integrations/supabase/types";

export type OvertimeLog = Tables<"overtime_logs">;

export const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_24H_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function parseTimeToMinutes(hhmm: string): number | null {
  if (!TIME_24H_RE.test(hhmm)) return null;
  const [hStr, mStr] = hhmm.split(":");
  return Number(hStr) * 60 + Number(mStr);
}

/**
 * Computes overtime duration in minutes between two 24-hour `HH:mm` times.
 * Supports overnight windows (e.g. 22:00 → 01:30 = 210 minutes).
 * Returns 0 when either time is invalid or start === end.
 */
export function computeDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null || start === end) return 0;
  return end > start ? end - start : 1440 - start + end;
}

export function isOvernightWindow(startTime: string, endTime: string): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return start !== null && end !== null && end < start;
}

export function addMinutesToTime(startTime: string, deltaMinutes: number): string {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return startTime;
  const total = (((start + deltaMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe === 0) return "0m";
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTime12h(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  if (mins === null) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export const OvertimeLogSchema = z.object({
  ot_date: z.string().regex(DATE_ISO_RE, "Valid OT date is required"),
  start_time: z.string().regex(TIME_24H_RE, "Start time must be in HH:MM format"),
  end_time: z.string().regex(TIME_24H_RE, "End time must be in HH:MM format"),
  duration_minutes: z
    .number()
    .int()
    .min(1, "End time must be different from start time")
    .max(1440, "Duration cannot exceed 24 hours"),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer").nullable().optional(),
});

export type OvertimeLogInput = z.infer<typeof OvertimeLogSchema>;

export function useOvertimeLogs() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["overtime_logs", user?.id ?? null, isAdmin ? "admin" : "user"],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OvertimeLog[]> => {
      if (!user) return [];
      let query = supabase
        .from("overtime_logs")
        .select("*")
        .order("ot_date", { ascending: false })
        .order("start_time", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpsertOvertimeLog() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: OvertimeLogInput }) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = OvertimeLogSchema.parse(input);
      const created_by = await getUserId();
      // Keep legacy DB columns satisfied even if 20261121000002 hasn't been applied yet.
      const payload = {
        ...validated,
        account_name: "-",
        doc_count: 0,
      };
      if (id) {
        const { error } = await supabase
          .from("overtime_logs")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        await logAuditEvent("overtime_updated", {
          id,
          ot_date: validated.ot_date,
          duration_minutes: validated.duration_minutes,
        });
      } else {
        const { error } = await supabase
          .from("overtime_logs")
          .insert({ ...payload, created_by });
        if (error) throw error;
        await logAuditEvent("overtime_created", {
          ot_date: validated.ot_date,
          duration_minutes: validated.duration_minutes,
        });
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["overtime_logs"] });
      toast.success(id ? "Overtime entry updated" : "Overtime entry added");
    },
    onError: (e: Error) => {
      toast.error(e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid OT data" : e.message);
    },
  });
}

export function useDeleteOvertimeLog() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      await logAuditEvent("overtime_deleted", { id });
      const { error } = await supabase
        .from("overtime_logs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime_logs"] });
      toast.success("Overtime entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

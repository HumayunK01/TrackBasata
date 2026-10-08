import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent, type AuditEvent } from "@/hooks/useAuditLog";
import { isoDate } from "@/types/log";
import type { Tables } from "@/integrations/supabase/types";

export type StepStatus = "Failed" | "Successfully Sent" | "Waiting" | "Pending";
export type StepField = "step1" | "step2" | "step3";

export type TrackerRow = Tables<"fax_tracker">;

export const STEP_STATUSES: StepStatus[] = ["Pending", "Waiting", "Successfully Sent", "Failed"];

const stepEnum = z.enum(["Failed", "Successfully Sent", "Waiting", "Pending"]);

export function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g, (word) =>
      word.replace(/[A-Za-z]+/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()),
    );
}

const InsertSchema = z.object({
  patient_name: z
    .string()
    .trim()
    .min(1, "Patient name is required")
    .max(200, "Name too long")
    .transform(toTitleCase),
  step1: stepEnum,
  step2: stepEnum.nullable(),
  step3: stepEnum.nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer").nullable().optional(),
});

export type TrackerInput = z.infer<typeof InsertSchema>;

export function isResolved(steps: Pick<TrackerRow, "step1" | "step2" | "step3">): boolean {
  return steps.step1 === "Successfully Sent"
    || steps.step2 === "Successfully Sent"
    || steps.step3 === "Successfully Sent";
}

export function normalizeStepsSequential(
  row: Pick<TrackerRow, "step1" | "step2" | "step3">,
  field: StepField,
  value: StepStatus,
): { step1: StepStatus; step2: StepStatus | null; step3: StepStatus | null } {
  let step1 = row.step1;
  let step2 = row.step2;
  let step3 = row.step3;
  if (field === "step1") step1 = value;
  if (field === "step2") step2 = value;
  if (field === "step3") step3 = value;
  if (step1 === "Successfully Sent") { step2 = null; step3 = null; }
  else if (step1 !== "Failed") { step2 = null; step3 = null; }
  else if (step2 === "Successfully Sent") { step3 = null; }
  else if (step2 !== "Failed") { step3 = null; }
  return { step1, step2, step3 };
}

export function normalizeStepsIndependent(
  row: Pick<TrackerRow, "step1" | "step2" | "step3">,
  field: StepField,
  value: StepStatus,
): { step1: StepStatus; step2: StepStatus | null; step3: StepStatus | null } {
  return {
    step1: field === "step1" ? value : row.step1,
    step2: field === "step2" ? value : (row.step2 ?? "Pending"),
    step3: field === "step3" ? value : (row.step3 ?? "Pending"),
  };
}

// ── Hook factories ──────────────────────────────────────────────────────────

export function createUseTracker(tableName: "fax_tracker" | "indexable_tracker", queryKey: string) {
  return function useTracker(accountId?: string) {
    const { user } = useAuth();
    return useQuery({
      queryKey: [queryKey, user?.id, accountId],
      enabled: !!user && !!accountId,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 60_000,
      queryFn: async (): Promise<TrackerRow[]> => {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("account_id", accountId!)
          .order("created_at", { ascending: true })
          .limit(2000);
        if (error) throw error;
        return data ?? [];
      },
    });
  };
}

export function createFetchAllRows(tableName: "fax_tracker" | "indexable_tracker") {
  return async function fetchAllRows(): Promise<TrackerRow[]> {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw error;
    return data ?? [];
  };
}

export function createUseResolvedByDay(queryKey: string, tableName: "fax_tracker" | "indexable_tracker") {
  return function useResolvedByDay() {
    const { user } = useAuth();
    return useQuery({
      queryKey: [queryKey, user?.id],
      enabled: !!user,
      staleTime: 60_000,
      queryFn: async (): Promise<Record<string, number>> => {
        const { data, error } = await supabase
          .from(tableName)
          .select("step1, step2, step3, updated_at")
          .eq("created_by", user!.id)
          .limit(5000);
        if (error) throw error;
        const byDay: Record<string, number> = {};
        for (const r of data ?? []) {
          if (!isResolved(r)) continue;
          const day = isoDate(new Date(r.updated_at));
          byDay[day] = (byDay[day] ?? 0) + 1;
        }
        return byDay;
      },
    });
  };
}

export function createUseUpsert(tableName: "fax_tracker" | "indexable_tracker", queryKey: string, auditPrefix: string) {
  return function useUpsert() {
    const qc = useQueryClient();
    const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
    return useMutation({
      mutationFn: async ({ id, input, accountId }: { id?: string; input: TrackerInput; accountId?: string }) => {
        if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
        const validated = InsertSchema.parse(input);
        const created_by = await getUserId();
        if (id) {
          const { error } = await supabase
            .from(tableName)
            .update(validated)
            .eq("id", id)
            .eq("created_by", created_by);
          if (error) throw error;
          await logAuditEvent(`${auditPrefix}updated` as AuditEvent, { [`${auditPrefix}id`]: id });
        } else {
          if (!accountId) throw new Error("No account selected.");
          const { error } = await supabase
            .from(tableName)
            .insert({ ...validated, created_by, account_id: accountId });
          if (error) throw error;
          await logAuditEvent(`${auditPrefix}created` as AuditEvent, { patient_name: validated.patient_name, account_id: accountId });
        }
      },
      onSuccess: (_d, { id }) => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        toast.success(id ? "Patient updated" : "Patient added");
      },
      onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
    });
  };
}

export function createUseUpdateStep(tableName: "fax_tracker" | "indexable_tracker", queryKey: string, auditPrefix: string, normalizeFn: typeof normalizeStepsSequential) {
  return function useUpdateStep() {
    const qc = useQueryClient();
    const { checkLimit } = useMutationRateLimit({ maxRequests: 40, windowMs: 60_000 });
    return useMutation({
      mutationFn: async ({ row, field, value }: { row: TrackerRow; field: StepField; value: StepStatus }) => {
        if (!checkLimit()) throw new Error("Too many updates. Please wait a moment.");
        const created_by = await getUserId();
        const patch = normalizeFn(row, field, value);
        const { error } = await supabase
          .from(tableName)
          .update(patch)
          .eq("id", row.id)
          .eq("created_by", created_by);
        if (error) throw error;
        await logAuditEvent(`${auditPrefix}updated` as AuditEvent, { [`${auditPrefix}id`]: row.id, field, value, prev: row[field] });
      },
      onMutate: async ({ row, field, value }) => {
        await qc.cancelQueries({ queryKey: [queryKey] });
        const key = [queryKey];
        const snapshots = qc.getQueriesData<TrackerRow[]>({ queryKey: key });
        const patch = normalizeFn(row, field, value);
        for (const [qKey, data] of snapshots) {
          if (!data) continue;
          qc.setQueryData<TrackerRow[]>(qKey, data.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
        }
        return { snapshots };
      },
      onError: (e: Error, _vars, ctx) => {
        ctx?.snapshots.forEach(([qKey, data]) => qc.setQueryData(qKey, data));
        toast.error(e.message);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: [queryKey] });
      },
    });
  };
}

export function createUseDelete(tableName: "fax_tracker" | "indexable_tracker", queryKey: string, auditPrefix: string) {
  return function useDelete() {
    const qc = useQueryClient();
    const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
    return useMutation({
      mutationFn: async (id: string) => {
        if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
        const created_by = await getUserId();
        await logAuditEvent(`${auditPrefix}deleted` as AuditEvent, { [`${auditPrefix}id`]: id });
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq("id", id)
          .eq("created_by", created_by);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [queryKey] });
        toast.success("Patient deleted");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };
}

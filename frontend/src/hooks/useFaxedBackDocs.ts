import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { Tables } from "@/integrations/supabase/types";

export type FaxedBackDoc = Tables<"faxed_back_docs">;

export const FAXED_BACK_STATUSES = ["Pending", "Sent", "Failed"] as const;
export type FaxedBackStatus = (typeof FAXED_BACK_STATUSES)[number];

const DocSchema = z.object({
  file_name: z.string().trim().min(1, "File name is required").max(255, "Name too long"),
  // ponytail: optional — empty string keeps the NOT NULL column happy without a migration
  patient_name: z.string().trim().max(200, "Name too long").default(""),
  patient_dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable().optional(),
  worked_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  status: z.enum(FAXED_BACK_STATUSES),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer").nullable().optional(),
});

export type FaxedBackInput = z.infer<typeof DocSchema>;

export interface FaxedBackPageResult {
  rows: FaxedBackDoc[];
  totalDays: number;
  totalDocs: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useFaxedBackDocs(page = 1, pageSize = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["faxed_back_docs", user?.id, page, pageSize],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<FaxedBackPageResult> => {
      const created_by = await getUserId();
      
      // Get distinct dates with counts for pagination
      const { data: dateCounts, error: countError } = await supabase
        .from("faxed_back_docs")
        .select("worked_on", { count: "exact", head: false })
        .eq("created_by", created_by);
      
      if (countError) throw countError;
      
      // Group by date and count
      const dateMap = new Map<string, number>();
      for (const row of dateCounts ?? []) {
        const date = row.worked_on;
        dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
      }
      
      const sortedDates = [...dateMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const totalDays = sortedDates.length;
      const totalDocs = dateCounts?.length ?? 0;
      const totalPages = Math.ceil(totalDays / pageSize);
      
      // Get dates for current page
      const startIdx = (page - 1) * pageSize;
      const pageDates = sortedDates.slice(startIdx, startIdx + pageSize).map(([d]) => d);
      
      if (pageDates.length === 0) {
        return { rows: [], totalDays, totalDocs, page, pageSize, totalPages };
      }
      
      // Fetch documents for these dates
      const { data: rows, error } = await supabase
        .from("faxed_back_docs")
        .select("*")
        .eq("created_by", created_by)
        .in("worked_on", pageDates)
        .order("worked_on", { ascending: false })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return { rows: rows ?? [], totalDays, totalDocs, page, pageSize, totalPages };
    },
  });
}

export function useUpsertFaxedBackDoc() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: FaxedBackInput }) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = DocSchema.parse(input);
      const created_by = await getUserId();
      if (id) {
        const { error } = await supabase
          .from("faxed_back_docs")
          .update(validated)
          .eq("id", id)
          .eq("created_by", created_by);
        if (error) throw error;
        await logAuditEvent("faxed_back_updated", { id });
      } else {
        const { error } = await supabase
          .from("faxed_back_docs")
          .insert({ ...validated, created_by });
        if (error) throw error;
        await logAuditEvent("faxed_back_created", { file_name: validated.file_name });
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["faxed_back_docs"] });
      toast.success(id ? "Document updated" : "Document added");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useUpdateFaxedBackStatus() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 40, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FaxedBackStatus }) => {
      if (!checkLimit()) throw new Error("Too many updates. Please wait a moment.");
      const created_by = await getUserId();
      // ponytail: cache is paginated FaxedBackPageResult now, but handle legacy array shape too
      const snaps = qc.getQueriesData({ queryKey: ["faxed_back_docs"] });
      let prev: string | undefined;
      for (const [, d] of snaps) {
        if (!d) continue;
        const rows: FaxedBackDoc[] = Array.isArray(d) ? (d as FaxedBackDoc[]) : ((d as FaxedBackPageResult).rows ?? []);
        const found = rows.find((r) => r.id === id);
        if (found) { prev = found.status; break; }
      }
      const { error } = await supabase
        .from("faxed_back_docs")
        .update({ status })
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
      await logAuditEvent("faxed_back_updated", { id, field: "status", value: status, prev });
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["faxed_back_docs"] });
      const snapshots = qc.getQueriesData({ queryKey: ["faxed_back_docs"] });
      for (const [qKey, data] of snapshots) {
        if (!data) continue;
        if (Array.isArray(data)) {
          qc.setQueryData(qKey, (data as FaxedBackDoc[]).map((r) => (r.id === id ? { ...r, status } : r)));
        } else if (data && typeof data === "object" && "rows" in (data as Record<string, unknown>) && Array.isArray((data as FaxedBackPageResult).rows)) {
          const page = data as FaxedBackPageResult;
          qc.setQueryData(qKey, { ...page, rows: page.rows.map((r) => (r.id === id ? { ...r, status } : r)) });
        }
      }
      return { snapshots };
    },
    onError: (_e: Error, _vars, ctx) => {
      ctx?.snapshots.forEach(([qKey, data]) => qc.setQueryData(qKey, data));
      toast.error(_e.message);
    },
    onSuccess: (_d, { status }) => {
      toast.success(`Status changed to ${status}`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["faxed_back_docs"] });
    },
  });
}

export function useDeleteFaxedBackDoc() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const created_by = await getUserId();
      await logAuditEvent("faxed_back_deleted", { id });
      const { error } = await supabase
        .from("faxed_back_docs")
        .delete()
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faxed_back_docs"] });
      toast.success("Document deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFaxedBackSection() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (workedOn: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const created_by = await getUserId();
      await logAuditEvent("faxed_back_section_deleted", { worked_on: workedOn });
      const { error } = await supabase
        .from("faxed_back_docs")
        .delete()
        .eq("worked_on", workedOn)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faxed_back_docs"] });
      toast.success("Section deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog } from "@/types/log";
import type { Profile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useProfile";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export function useTeamProfiles() {
  const isAdmin = useIsAdmin();
  return useQuery<Profile[]>({
    queryKey: ["team_profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("first_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useTeamDailyLogs() {
  const isAdmin = useIsAdmin();
  return useQuery<DailyLog[]>({
    queryKey: ["team_daily_logs"],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_daily_logs", { limit_count: 2000 });
      if (error) throw error;
      return ((data ?? []) as DailyLog[]).map((row) => ({
        ...row,
        counts: (row.counts ?? {}) as Record<string, number>,
      }));
    },
  });
}

// ── Admin read-all fetchers. RLS lets admins read every user's rows (see the
// "Admins can read all …" policies), so these query the tables directly with
// server-side pagination + exact counts.

export interface TeamFaxedBackDoc {
  id: string;
  created_by: string;
  file_name: string;
  patient_name: string;
  patient_dob: string | null;
  worked_on: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface TeamCategory {
  id: string;
  user_id: string;
  key: string;
  label: string;
  short: string;
  position: number;
}

export interface TeamAuditLog {
  id: string;
  user_id: string;
  event: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface PagedRows<T> {
  rows: T[];
  total: number;
}

interface TeamPageOpts {
  search?: string;
  searchCols?: string[];
  eq?: Record<string, string>;
  gte?: [string, string];
  lte?: [string, string];
}

function useTeamPaged<T>(
  key: string,
  table: string,
  userIdCol: string,
  userId: string | null,
  page: number,
  pageSize: number,
  orderCol: string,
  ascending = false,
  opts: TeamPageOpts = {},
) {
  const optKey = JSON.stringify([opts.search ?? "", opts.searchCols ?? [], opts.eq ?? {}, opts.gte ?? null, opts.lte ?? null]);
  return useQuery<PagedRows<T>>({
    queryKey: [key, userId, page, optKey],
    enabled: !!userId,
    // Pull fresh rows on every visit so a just-added log shows up (the admin
    // reads other users' data, which changes outside this session).
    staleTime: 0,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      let q = supabase.from(table).select("*", { count: "exact" }).eq(userIdCol, userId!);
      if (opts.search && opts.searchCols?.length) {
        const or = opts.searchCols.map((c) => `${c}.ilike.%${opts.search}%`).join(",");
        q = q.or(or);
      }
      for (const [col, val] of Object.entries(opts.eq ?? {})) q = q.eq(col, val);
      if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
      if (opts.lte) q = q.lte(opts.lte[0], opts.lte[1]);
      const { data, count, error } = await q.order(orderCol, { ascending }).range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as T[], total: count ?? 0 };
    },
  });
}

export function useTeamUserLogs(userId: string | null, page: number, search?: string) {
  return useTeamPaged<DailyLog>("team_user_logs", "daily_logs", "user_id", userId, page, 30, "log_date", false, { search, searchCols: ["log_date"] });
}

export function useTeamUserFaxedBack(
  userId: string | null,
  page: number,
  opts: { search?: string; status?: string; workedFrom?: string; workedTo?: string } = {},
) {
  return useTeamPaged<TeamFaxedBackDoc>("team_user_faxed_back", "faxed_back_docs", "created_by", userId, page, 25, "created_at", false, {
    search: opts.search,
    searchCols: ["file_name", "patient_name", "notes"],
    eq: opts.status ? { status: opts.status } : undefined,
    gte: opts.workedFrom ? ["worked_on", opts.workedFrom] : undefined,
    lte: opts.workedTo ? ["worked_on", opts.workedTo] : undefined,
  });
}

export function useTeamUserCategories(userId: string | null, page: number) {
  return useTeamPaged<TeamCategory>("team_user_categories", "categories", "user_id", userId, page, 50, "position", true);
}

export function useTeamUserAuditLogs(userId: string | null, page: number) {
  return useTeamPaged<TeamAuditLog>("team_user_audit_logs", "audit_logs", "user_id", userId, page, 25, "created_at");
}

// On-demand fetch-all for exports (the paged queries only hold one page).

export async function fetchAllUserLogs(userId: string) {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as DailyLog[];
}

export async function fetchAllUserFaxedBack(userId: string, opts: { search?: string } = {}) {
  let q = supabase
    .from("faxed_back_docs")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (opts.search) {
    const or = ["file_name", "patient_name", "notes"].map((c) => `${c}.ilike.%${opts.search}%`).join(",");
    q = q.or(or);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TeamFaxedBackDoc[];
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc("delete_user", { target_user: targetUserId });
      if (error) throw error;
      await logAuditEvent("account_deleted", { target_user_id: targetUserId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      qc.invalidateQueries({ queryKey: ["team_daily_logs"] });
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetUserDisabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, shouldDisable }: { targetUserId: string; shouldDisable: boolean }) => {
      const { error } = await supabase.rpc("set_user_disabled", {
        target_user: targetUserId,
        should_disable: shouldDisable,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(variables.shouldDisable ? "User account disabled" : "User account re-enabled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role, prevRole }: { targetUserId: string; role: "user" | "admin"; prevRole?: "user" | "admin" }) => {
      const { error } = await supabase.rpc("set_user_role", {
        target_user: targetUserId,
        new_role: role,
      });
      if (error) throw error;
      await logAuditEvent("role_changed", { target_user_id: targetUserId, role, prev_role: prevRole ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export interface CreateUserInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: "user" | "admin";
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.rpc("admin_create_user", {
        new_email: input.email.trim(),
        new_password: input.password,
        new_first_name: input.first_name?.trim() || "",
        new_last_name: input.last_name?.trim() || "",
        new_role: input.role || "user",
      });
      if (error) throw error;
      await logAuditEvent("account_created", {
        created_user_id: data,
        email: input.email.trim(),
        role: input.role || "user",
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      toast.success("Team member created successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create user"),
  });
}


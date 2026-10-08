import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuditEvent =
  | "log_created"
  | "log_updated"
  | "log_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "categories_reordered"
  | "account_created"
  | "account_deleted"
  | "password_changed"
  | "data_exported"
  | "fax_created"
  | "fax_updated"
  | "fax_deleted"
  | "indexable_created"
  | "indexable_updated"
  | "indexable_deleted"
  | "faxed_back_created"
  | "faxed_back_updated"
  | "faxed_back_deleted"
  | "faxed_back_section_deleted"
  | "facility_created"
  | "facility_updated"
  | "facility_deleted"
  | "role_changed"
  | "account_disabled"
  | "account_enabled";

export async function logAuditEvent(
  event: AuditEvent,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ user_id: user.id, event, details });
  } catch {
    // Audit logging is best-effort — never block the main operation
  }
}

export function useAuditLogsQuery(limit = 50) {
  return useQuery({
    queryKey: ["audit_logs", limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return data ?? [];
    },
  });
}

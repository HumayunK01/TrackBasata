import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Read receipts for What's New entries. Entries themselves live in client
// code; this stores only "this user opened entry X" so read state follows
// the user across devices.
// ponytail: no rate limiter here, unlike CRUD mutations. Marking read is an
// idempotent upsert (PK conflict is a no-op) and carries no data risk.
export function useWhatsNewReads() {
  const { user } = useAuth();
  return useQuery<string[]>({
    queryKey: ["whats_new_reads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whats_new_reads")
        .select("entry_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row: { entry_id: string }) => row.entry_id);
    },
  });
}

export function useMarkWhatsNewRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("whats_new_reads")
        .upsert(
          { user_id: user!.id, entry_id: entryId },
          { onConflict: "user_id,entry_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    // Optimistic: clear the unread badge immediately, roll back on failure.
    onMutate: async (entryId) => {
      await qc.cancelQueries({ queryKey: ["whats_new_reads", user?.id] });
      const previous = qc.getQueryData<string[]>(["whats_new_reads", user?.id]);
      qc.setQueryData<string[]>(["whats_new_reads", user?.id], (old = []) =>
        old.includes(entryId) ? old : [...old, entryId],
      );
      return { previous };
    },
    onError: (_error, _entryId, context) => {
      if (context?.previous) {
        qc.setQueryData(["whats_new_reads", user?.id], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["whats_new_reads", user?.id] }),
  });
}
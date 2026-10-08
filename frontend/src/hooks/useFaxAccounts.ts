import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import type { Tables } from "@/integrations/supabase/types";

export type FaxAccount = Tables<"fax_accounts">;

const NameSchema = z.string().trim().min(1, "Account name is required").max(100, "Name too long");

export function useFaxAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fax_accounts", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<FaxAccount[]> => {
      const { data, error } = await supabase
        .from("fax_accounts")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateFaxAccount() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (name: string): Promise<FaxAccount> => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = NameSchema.parse(name);
      const created_by = await getUserId();
      const { data, error } = await supabase
        .from("fax_accounts")
        .insert({ name: validated, created_by })
        .select()
        .single();
      if (error) {
        // Unique (created_by, name) violation.
        if (error.code === "23505") throw new Error("You already have an account with that name.");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fax_accounts"] });
      toast.success("Account added");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useRenameFaxAccount() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const validated = NameSchema.parse(name);
      const created_by = await getUserId();
      const { error } = await supabase
        .from("fax_accounts")
        .update({ name: validated })
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) {
        if (error.code === "23505") throw new Error("You already have an account with that name.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fax_accounts"] });
      toast.success("Account renamed");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useDeleteFaxAccount() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 5, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many requests. Please wait a moment.");
      const created_by = await getUserId();
      // ON DELETE CASCADE removes the account's fax rows too.
      const { error } = await supabase
        .from("fax_accounts")
        .delete()
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fax_accounts"] });
      qc.invalidateQueries({ queryKey: ["fax_tracker"] });
      toast.success("Account deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  updated_at: string;
  daily_goal: number | null;
  role: "user" | "admin";
  is_disabled?: boolean;
  disabled_at?: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery<Profile | null>({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { first_name: string; last_name: string }) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user!.id, ...updates, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

export function useUpdateDailyGoal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (daily_goal: number) => {
      const { error } = await supabase
        .from("profiles")
        .update({ daily_goal, updated_at: new Date().toISOString() })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

export function useIsAdmin() {
  const { data: profile } = useProfile();
  return profile?.role === "admin";
}

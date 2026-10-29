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

const PROFILE_CACHE_KEY = "basata_profile_cache";

export function getCachedProfile(userId?: string): Profile | undefined {
  if (!userId) return undefined;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, Profile>;
    const cached = map?.[userId];
    if (cached && cached.id === userId) {
      return cached;
    }
  } catch {
    // Ignore storage parse errors
  }
  return undefined;
}

export function setCachedProfile(profile: Profile | null, userId?: string): void {
  const id = profile?.id ?? userId;
  if (!id) return;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const map: Record<string, Profile> = raw ? JSON.parse(raw) : {};
    if (profile) {
      map[id] = profile;
    } else {
      delete map[id];
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota/access errors
  }
}

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    enabled: !!userId,
    initialData: () => getCachedProfile(userId),
    // Mark seeded cache as stale (0) so Admin/Team UI renders in 0ms while
    // React Query immediately revalidates role & is_disabled in the background.
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setCachedProfile(data as Profile, userId);
      }
      return data as Profile | null;
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

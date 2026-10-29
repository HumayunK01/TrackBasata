import { useAuth } from "@/hooks/useAuth";

// Current Supabase access token, kept fresh via the shared useAuth store.
export function useAccessToken(): string | null {
  const { session } = useAuth();
  return session?.access_token ?? null;
}

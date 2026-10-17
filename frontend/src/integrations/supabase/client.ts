import { createClient } from '@supabase/supabase-js';
import { tolerantNavigatorLock } from '@/lib/auth-lock';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy-anon-key-for-test';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Skip-when-busy variant of the default navigator lock; prevents the
    // uncaught "Acquiring an exclusive Navigator LockManager lock" error when
    // another tab (or a stale HMR instance) holds the auth lock.
    lock: tolerantNavigatorLock,
  },
});

export async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

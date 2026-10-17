import { createClient } from '@supabase/supabase-js';
import { tolerantNavigatorLock } from '@/lib/auth-lock';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://calghfwmypuqrydprscx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbGdoZndteXB1cXJ5ZHByc2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTIwODIsImV4cCI6MjA5MzI4ODA4Mn0.CsstWGEYFhBy-gIK_-ZMfBpT08N_SyCcP3rBubx4N04';

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

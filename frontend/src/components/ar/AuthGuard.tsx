import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Skeleton from "react-loading-skeleton";
import LoginPage from "@/pages/Login";
import { Ban } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user && !loading) {
      queryClient.clear();
    }
  }, [user, loading, queryClient]);

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Skeleton width={160} height={32} borderRadius={6} />
          <Skeleton width={112} height={16} borderRadius={6} />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (profile?.is_disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4 p-6 sm:p-8 rounded-2xl border border-destructive/30 bg-destructive/[0.03] shadow-lg">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
            <Ban className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Account Deactivated</h2>
            <p className="text-xs text-muted-foreground">
              This account ID has been disabled by an administrator.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/40">
            Your historical work and activity records remain saved, but active dashboard access has been suspended. Please contact your manager or an administrator for assistance.
          </p>
          <Button
            variant="outline"
            className="w-full text-xs font-semibold cursor-pointer"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

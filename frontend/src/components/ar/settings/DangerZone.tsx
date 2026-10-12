import type { Dispatch } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Trash2,
  Lock,
  Database,
  History,
} from "lucide-react";

export interface DelState {
  open: boolean;
  confirmText: string;
  password: string;
  loading: boolean;
}

export type DelAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "set_text"; text: string }
  | { type: "set_pw"; pw: string }
  | { type: "submitting" }
  | { type: "done" };

interface DangerZoneProps {
  delState: DelState;
  delDispatch: Dispatch<DelAction>;
  onDeleteAccount: () => void;
}

export function DangerZone({ delState, delDispatch, onDeleteAccount }: DangerZoneProps) {
  return (
    <>
      <div className="bg-card/90 backdrop-blur-md border border-destructive/30 rounded-2xl shadow-sm overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-destructive/20 bg-destructive/[0.04]">
          <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 text-destructive">
            <AlertTriangle className="size-4.5 text-destructive" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-destructive font-heading">Danger Zone</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Destructive actions · Requires explicit password authorization</p>
          </div>
        </div>

        {/* Content explanation & Trigger */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-3.5 rounded-xl bg-destructive/[0.03] border border-destructive/15 space-y-1.5">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <Database className="size-3.5" />
                <span>Document Logs Wiped</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All historical category counts, daily log entries, and shift benchmarks are permanently deleted.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-destructive/[0.03] border border-destructive/15 space-y-1.5">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <History className="size-3.5" />
                <span>Audit Trail Purged</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All workspace sessions, credentials, and user preferences are scrubbed from database storage.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-destructive/[0.03] border border-destructive/15 space-y-1.5">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <Lock className="size-3.5" />
                <span>Immediate Sign-Out</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your auth token is instantly invalidated. You will be redirected to the sign-in page.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/[0.02] gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">Permanent Account Deletion</p>
              <p className="text-xs text-muted-foreground">
                Once confirmed, this operation cannot be reversed by any administrator.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8.5 px-3.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold shadow-xs shadow-destructive/20 border border-destructive/40 transition-all active:scale-[0.98] shrink-0 cursor-pointer"
              onClick={() => delDispatch({ type: "open" })}
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={delState.open} onOpenChange={(o) => !o && delDispatch({ type: "close" })}>
        <AlertDialogContent className="sm:max-w-md border border-destructive/30 bg-card/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="size-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-4.5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base font-bold font-heading">Permanently Wipe Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed">
              <span className="block text-foreground font-medium">
                This is a non-recoverable operation that removes all your workspace data.
              </span>
              
              <span className="flex gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs leading-normal">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground leading-relaxed">
                  All historical counts, daily logs, custom categories, and profile records will be permanently erased.
                </span>
              </span>

              <span className="block pt-1 text-xs text-muted-foreground">
                To confirm, type <strong className="text-foreground select-all font-mono font-bold">DELETE</strong> and enter your current password:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 mt-2">
            <Input
              placeholder="Type DELETE to confirm"
              value={delState.confirmText}
              className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-destructive/40 focus-visible:border-destructive/60 font-semibold uppercase tracking-wider font-mono h-10"
              onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Enter current password"
              value={delState.password}
              className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-destructive/40 focus-visible:border-destructive/60 h-10"
              onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
            />
          </div>

          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium h-8.5" onClick={() => delDispatch({ type: "close" })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 shadow-xs shadow-destructive/20 font-semibold text-xs active:scale-[0.98] h-8.5"
            >
              {delState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete Account Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
  Trash2,
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
      <div className="bg-card/80 border border-destructive/25 rounded-xl shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-destructive/20 bg-destructive/[0.03]">
          <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 text-destructive">
            <AlertTriangle className="size-4" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-destructive">Delete Account</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Permanently remove your account and logs</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="p-3.5 rounded-lg bg-destructive/[0.04] border border-destructive/15 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">Please read carefully:</p>
            Deleting your account will permanently remove all your daily logs, category counts, and preferences. You will be signed out immediately and this action cannot be undone.
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20 gap-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Permanent Account Deletion</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Requires your password to authorize.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 px-3 rounded-lg text-xs font-medium cursor-pointer shrink-0"
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
        <AlertDialogContent className="sm:max-w-md border border-border/80 bg-card rounded-xl p-5 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <AlertDialogTitle className="text-sm font-semibold">Delete Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 mt-2 text-xs leading-relaxed text-muted-foreground">
              <span>
                All your historical counts, daily logs, and custom categories will be permanently deleted.
              </span>

              <span className="block pt-1">
                To confirm, type <strong className="text-foreground select-all font-mono font-bold">DELETE</strong> and enter your current password:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 my-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Type DELETE to confirm:
              </label>
              <Input
                placeholder="DELETE"
                value={delState.confirmText}
                onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
                className="rounded-lg bg-muted/40 border-border/60 text-xs h-8.5 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Your current password:
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={delState.password}
                onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
                className="rounded-lg bg-muted/40 border-border/60 text-xs h-8.5 font-mono"
              />
            </div>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              onClick={() => delDispatch({ type: "close" })}
              className="h-8 rounded-lg text-xs font-medium border-border/80 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="h-8 rounded-lg text-xs font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer disabled:opacity-50"
            >
              {delState.loading && <Loader2 className="size-3 mr-1 animate-spin" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { AlertTriangle, Loader2, ShieldAlert } from "@/components/ui/icons";

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
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-destructive/20 bg-destructive/[0.03]">
          <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 text-destructive">
            <AlertTriangle className="size-4.5 text-destructive" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-destructive font-heading">Danger Zone</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Irreversible system actions · Proceed with caution</p>
          </div>
        </div>
        <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-foreground">Delete Account and Wipe Data</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Permanently delete your profile and wipe all document count history, custom categories, and immutable audit logs. This action cannot be reversed.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="w-full sm:w-auto shrink-0 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-xs shadow-destructive/20 h-9.5 px-4 transition-transform duration-100 active:scale-[0.98]"
            onClick={() => delDispatch({ type: "open" })}
          >
            Delete Account
          </Button>
        </div>
      </div>

      <AlertDialog open={delState.open} onOpenChange={(o) => !o && delDispatch({ type: "close" })}>
        <AlertDialogContent className="sm:max-w-md border border-destructive/30 bg-card/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <div className="size-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-4.5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base font-bold">Wipe Account and Data?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed">
              <span className="block text-foreground font-medium">
                This is a permanent, non-recoverable operation.
              </span>
              
              <span className="flex gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs leading-normal">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground leading-relaxed">
                  All your historical counts, logs, custom shortnames, and data records will be purged immediately from the database. You will be signed out.
                </span>
              </span>

              <span className="block pt-1 text-xs text-muted-foreground">
                Please type <strong className="text-foreground select-all font-mono font-bold">DELETE</strong> below and enter your password to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2.5 mt-2">
            <Input
              placeholder="Type DELETE"
              value={delState.confirmText}
              className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-destructive/40 focus-visible:border-destructive/60 font-semibold uppercase tracking-wider"
              onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Enter your current password"
              value={delState.password}
              className="rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-destructive/40 focus-visible:border-destructive/60"
              onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
            />
          </div>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-muted/70 font-semibold" onClick={() => delDispatch({ type: "close" })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 shadow-xs shadow-destructive/20 font-bold active:scale-[0.98]"
            >
              {delState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

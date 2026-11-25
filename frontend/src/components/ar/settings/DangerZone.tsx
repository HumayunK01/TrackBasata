import { useState, type Dispatch } from "react";
import { Button } from "@/components/ui/button";
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
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const cleanInputClass =
  "w-full h-10 rounded-xl bg-background dark:bg-white/[0.03] border border-border/80 hover:border-border focus:border-destructive px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors duration-150";

export function DangerZone({ delState, delDispatch, onDeleteAccount }: DangerZoneProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-destructive/30 bg-card/85 p-5 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-start">
          <div className="md:col-span-5 space-y-1.5">
            <div className="inline-flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <h2 className="text-sm sm:text-base font-semibold">Delete Account</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Permanently remove your Basata Tracker profile and all personal activity records. This action cannot be undone.
            </p>
          </div>

          <div className="md:col-span-7 space-y-4">
            <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 space-y-2 text-xs">
              <p className="font-semibold text-foreground">
                Deleting your account will immediately erase:
              </p>
              <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                <li>All daily document logs, historical category counts, and shift notes</li>
                <li>Personal overtime records and workspace preferences</li>
                <li>Your active sign-in credentials and workspace membership</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-xs text-muted-foreground">
                Requires confirmation and your current password.
              </span>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setShowPw(false);
                  delDispatch({ type: "open" });
                }}
                className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Delete account…
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={delState.open} onOpenChange={(o) => !o && delDispatch({ type: "close" })}>
        <AlertDialogContent className="sm:max-w-md border border-border/80 bg-card rounded-2xl p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <AlertDialogTitle className="text-base font-bold">
                Permanently delete your account?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 mt-2 text-xs leading-relaxed text-muted-foreground">
              <span className="block">
                All of your historical counts, daily logs, and account settings will be permanently deleted and cannot be recovered.
              </span>
              <span className="block pt-1">
                Type <strong className="text-foreground select-all font-mono font-bold">DELETE</strong> and enter your current password to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1.5">
              <label htmlFor="delete-confirm-text" className="text-xs font-medium text-foreground block">
                Confirmation phrase
              </label>
              <input
                id="delete-confirm-text"
                type="text"
                placeholder="DELETE"
                value={delState.confirmText}
                onChange={(e) => delDispatch({ type: "set_text", text: e.target.value })}
                className={cn(cleanInputClass, "font-mono")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="delete-confirm-pw" className="text-xs font-medium text-foreground block">
                Current password
              </label>
              <div className="relative">
                <input
                  id="delete-confirm-pw"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={delState.password}
                  onChange={(e) => delDispatch({ type: "set_pw", pw: e.target.value })}
                  className={cn(cleanInputClass, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => delDispatch({ type: "close" })}
              className="h-9 px-3.5 rounded-xl text-xs font-medium border-border/80 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              disabled={delState.confirmText !== "DELETE" || !delState.password || delState.loading}
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer disabled:opacity-50"
            >
              {delState.loading && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

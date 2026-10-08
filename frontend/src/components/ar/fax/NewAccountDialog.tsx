import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateFaxAccount, type FaxAccount } from "@/hooks/useFaxAccounts";
import { Info, Loader2, UserPlus } from "@/components/ui/icons";

interface NewAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created account, e.g. to select it right away. */
  onCreated?: (account: FaxAccount) => void;
}

export function NewAccountDialog({ open, onOpenChange, onCreated }: NewAccountDialogProps) {
  const createAccount = useCreateFaxAccount();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(""); setError(""); }
  }, [open]);

  const save = () => {
    const n = name.trim();
    if (!n) { setError("Account name is required."); return; }
    createAccount.mutate(n, {
      onSuccess: (account) => {
        onCreated?.(account);
        onOpenChange(false);
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            New Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fax-account-name" className="text-xs font-semibold text-foreground">Account Name</Label>
            <Input
              id="fax-account-name"
              placeholder="e.g. Ayush Rathi"
              value={name}
              className="h-10 rounded-xl bg-muted/30 border-border/60 font-medium"
              autoFocus
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-xs text-muted-foreground">Each account keeps its own separate list of patients.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={createAccount.isPending} className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 font-semibold">
            {createAccount.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

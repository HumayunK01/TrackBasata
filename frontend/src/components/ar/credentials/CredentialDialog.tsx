import { useEffect, useMemo, useState } from "react";
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
import { useUpsertCredential, type Credential } from "@/hooks/useCredentials";
import { Eye, EyeOff, Info, KeyRound, Loader2, WandSparkles } from "@/components/ui/icons";
import type { CredentialFolder } from "@/hooks/useCredentials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: Credential | null;
  folderId: string | undefined;
  folders: CredentialFolder[];
}

interface FormState {
  service: string;
  login_id: string;
  password: string;
  notes: string;
  website: string;
}

const EMPTY: FormState = { service: "", login_id: "", password: "", notes: "", website: "" };

export function CredentialDialog({ open, onOpenChange, row, folderId: initialFolderId, folders }: CredentialDialogProps) {
  const upsert = useUpsertCredential();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId ?? "");

  useEffect(() => {
    if (open) {
      setForm(
        row
          ? { service: row.service, login_id: row.login_id, password: row.password, notes: row.notes ?? "", website: row.website ?? "" }
          : EMPTY,
      );
      setSelectedFolderId(initialFolderId ?? "");
      setReveal(false);
      setError("");
    }
  }, [open, row, initialFolderId]);

  const targetFolderId = initialFolderId ?? selectedFolderId;
  const required = useMemo(() => ({ service: !form.service.trim(), login_id: !form.login_id.trim(), password: !form.password.trim() }), [form]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    const pwd = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, password: pwd }));
    setReveal(true);
  };

  const save = () => {
    if (!targetFolderId) { setError("Select a folder first."); return; }
    if (!form.service.trim()) { setError("Service name is required."); return; }
    if (!form.login_id.trim()) { setError("Login ID is required."); return; }
    if (!form.password.trim()) { setError("Password is required."); return; }
    upsert.mutate(
      {
        row,
        folderId: targetFolderId,
        values: {
          service: form.service,
          login_id: form.login_id,
          password: form.password,
          notes: form.notes.trim() ? form.notes.trim() : null,
          website: form.website.trim() ? form.website.trim() : null,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <KeyRound className="size-4" />
            </div>
            {row ? "Edit Credential" : "Add Credential"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {!initialFolderId && (
            <div className="space-y-1.5">
              <Label htmlFor="cred-folder" className="text-xs font-semibold text-foreground">Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-muted/40 border-border/50 text-sm">
                  <SelectValue placeholder="Select a folder…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="rounded-lg text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cred-service" className="text-xs font-semibold text-foreground">
              Service / Site <span className="text-destructive font-medium">*</span>
            </Label>
            <Input
              id="cred-service"
              placeholder="e.g. Gmail, Client Portal A"
              value={form.service}
              className={cn(
                "h-10 rounded-xl bg-muted/40 border-border/50 font-medium text-sm focus-visible:ring-emerald-500/40",
                required.service && "border-destructive/60",
              )}
              autoFocus
              onChange={(e) => set("service")(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-website" className="text-xs font-semibold text-foreground">
              Website <span className="font-normal text-muted-foreground/70">(optional, for logo)</span>
            </Label>
            <Input
              id="cred-website"
              placeholder="e.g. github.com"
              value={form.website}
              className="h-10 rounded-xl bg-muted/40 border-border/50 font-medium text-sm focus-visible:ring-emerald-500/40"
              onChange={(e) => set("website")(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cred-login" className="text-xs font-semibold text-foreground">
                Login ID <span className="text-destructive font-medium">*</span>
              </Label>
              <Input
                id="cred-login"
                placeholder="you@company.com"
                value={form.login_id}
                className={cn(
                  "h-10 rounded-xl bg-muted/40 border-border/50 font-medium text-sm focus-visible:ring-emerald-500/40",
                  required.login_id && "border-destructive/60",
                )}
                onChange={(e) => set("login_id")(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cred-password" className="text-xs font-semibold text-foreground">
                Password <span className="text-destructive font-medium">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cred-password"
                  type={reveal ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  className={cn(
                    "h-10 rounded-xl bg-muted/40 border-border/50 font-medium text-sm pr-16 focus-visible:ring-emerald-500/40 font-mono",
                    required.password && "border-destructive/60",
                  )}
                  onChange={(e) => set("password")(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={generatePassword}
                    title="Generate strong password"
                    className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <WandSparkles className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReveal((r) => !r)}
                    title={reveal ? "Hide password" : "Show password"}
                    className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cred-notes" className="text-xs font-semibold text-foreground">Notes</Label>
            <textarea
              id="cred-notes"
              placeholder="e.g. account details, pin, security hints"
              value={form.notes}
              rows={3}
              className="flex w-full rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
              onChange={(e) => set("notes")(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-border/60 hover:bg-muted/60 font-medium"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={upsert.isPending}
            className="h-10 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm shadow-emerald-600/20 min-w-20"
          >
            {upsert.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {row ? "Save Changes" : "Add Credential"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

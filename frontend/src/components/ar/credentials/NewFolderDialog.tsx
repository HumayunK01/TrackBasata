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
import { useCreateFolder, type CredentialFolder } from "@/hooks/useCredentials";
import { FolderPlus, Info, Loader2 } from "@/components/ui/icons";

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created folder, e.g. to select it right away. */
  onCreated?: (folder: CredentialFolder) => void;
}

export function NewFolderDialog({ open, onOpenChange, onCreated }: NewFolderDialogProps) {
  const createFolder = useCreateFolder();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(""); setError(""); }
  }, [open]);

  const save = () => {
    const n = name.trim();
    if (!n) { setError("Folder name is required."); return; }
    createFolder.mutate(n, {
      onSuccess: (folder) => {
        onCreated?.(folder);
        onOpenChange(false);
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-background/95 backdrop-blur-xl border-border/60 rounded-2xl shadow-xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FolderPlus className="size-4" />
            </div>
            New Vault Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cred-folder-name" className="text-xs font-semibold text-foreground">Folder Name</Label>
            <Input
              id="cred-folder-name"
              placeholder="e.g. Clients, Personal, Billing"
              value={name}
              className="h-10 rounded-xl bg-muted/40 border-border/50 font-medium text-sm focus-visible:ring-emerald-500/40"
              autoFocus
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Folders group related credentials and can be exported as separate files.
            </p>
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
            disabled={createFolder.isPending}
            className="h-10 rounded-xl px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm shadow-emerald-600/20 min-w-20"
          >
            {createFolder.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddCategory, useCategories, type Category } from "@/hooks/useCategories";
import { toast } from "sonner";
import { Info, Loader2, Tag } from "@/components/ui/icons";
import { colorForKey, withAlpha } from "@/lib/cat-colors";

// Same key derivation as the Settings page so both entry points agree
function toKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

interface NewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created category, e.g. to add it to the counter */
  onCreated?: (cat: Category) => void;
}

export function NewCategoryDialog({ open, onOpenChange, onCreated }: NewCategoryDialogProps) {
  const { data: categories = [] } = useCategories();
  const addCategory = useAddCategory();
  const [label, setLabel] = useState("");
  const [short, setShort] = useState("");
  const [error, setError] = useState("");

  const trimmedLabel = label.trim();
  const trimmedShort = short.trim();
  const previewKey = toKey(trimmedLabel);
  const clr = colorForKey(previewKey);

  const close = (o: boolean) => {
    if (!o) {
      setLabel("");
      setShort("");
      setError("");
    }
    onOpenChange(o);
  };

  const save = () => {
    const l = label.trim();
    const s = short.trim();
    if (!l) { setError("Label is required."); return; }
    if (!s) { setError("Short name is required."); return; }
    if (s.length > 10) { setError("Short name must be 10 characters or fewer."); return; }
    const key = toKey(l);
    if (!key) { setError("Could not derive a key from this label."); return; }
    if (categories.some((c) => c.key === key)) {
      setError("A category with this name already exists.");
      return;
    }
    const cat: Category = { key, label: l, short: s, position: categories.length };
    addCategory.mutate(cat, {
      onSuccess: () => {
        toast.success("Category added.");
        onCreated?.(cat);
        close(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            Add New Category
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Saved to your account and added to this counter right away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="counter-cat-label" className="text-xs font-semibold text-foreground">Category Label</Label>
            <Input
              id="counter-cat-label"
              placeholder="e.g. Worked on NG"
              value={label}
              autoFocus
              className="font-medium h-10 rounded-xl bg-muted/30 border-border/60"
              onChange={(e) => { setLabel(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="counter-cat-short" className="text-xs font-semibold text-foreground">Abbreviation / Short Name</Label>
              <span
                aria-live="polite"
                className={`font-mono text-2xs tabular-nums ${
                  short.length >= 10 ? "text-destructive font-bold" : "text-muted-foreground"
                }`}
              >
                {short.length}/10
              </span>
            </div>
            <Input
              id="counter-cat-short"
              placeholder="e.g. NG"
              maxLength={10}
              value={short}
              className="font-semibold pr-12 h-10 rounded-xl bg-muted/30 border-border/60"
              onChange={(e) => { setShort(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <p className="text-[11px] text-muted-foreground">Displayed on counters and mobile screens.</p>
          </div>

          {/* Live preview — mirrors the counter-card look */}
          {trimmedLabel ? (
            <div
              className="relative rounded-2xl border overflow-hidden animate-fade-in shadow-2xs"
              style={{
                borderColor: withAlpha(clr, 0.25),
                background: `radial-gradient(ellipse at top, ${withAlpha(clr, 0.08)} 0%, ${withAlpha(clr, 0.02)} 100%)`,
              }}
              aria-label="Category card preview"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{ backgroundColor: withAlpha(clr, 0.35) }}
              />
              <div className="relative flex items-center gap-2 px-4 pt-3.5 pb-1 min-w-0">
                <span className="size-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: clr }} aria-hidden />
                <p className="text-xs font-semibold truncate text-foreground">{trimmedLabel}</p>
                <span
                  className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0 border"
                  style={{
                    color: clr,
                    backgroundColor: withAlpha(clr, 0.12),
                    borderColor: withAlpha(clr, 0.25),
                  }}
                >
                  {trimmedShort || "CODE"}
                </span>
              </div>
              <div className="relative py-4 flex items-center justify-center overflow-hidden mx-2 rounded-xl">
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-mono font-extrabold text-[4.5rem] leading-none select-none pointer-events-none"
                  style={{ color: withAlpha(clr, 0.06) }}
                >
                  {trimmedShort || "??"}
                </span>
                <span className="relative text-4xl font-bold font-mono tabular-nums leading-none select-none text-foreground">
                  0
                </span>
              </div>
              <p className="relative font-mono text-2xs text-muted-foreground px-4 pb-3 truncate">
                key: {previewKey}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 grid place-items-center py-8 px-4 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Start typing — your category card preview will appear here.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
              <Info className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={addCategory.isPending || !trimmedLabel || !trimmedShort}
            className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
          >
            {addCategory.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

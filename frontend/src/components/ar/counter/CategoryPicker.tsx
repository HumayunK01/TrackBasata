import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { colorForKey, withAlpha } from "@/lib/cat-colors";
import type { Category } from "@/hooks/useCategories";
import { Plus, Search } from "@/components/ui/icons";

interface CategoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onPick: (cat: Category) => void;
}

function CategoryPickerList({
  categories,
  onPick,
  autoFocusSearch = false,
}: Pick<CategoryPickerProps, "categories" | "onPick"> & { autoFocusSearch?: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Always sort categories alphabetically by label
    const sorted = [...categories].sort((a, b) => a.label.localeCompare(b.label));
    if (!s) return sorted;
    return sorted.filter(
      (c) => c.label.toLowerCase().includes(s) || c.short.toLowerCase().includes(s),
    );
  }, [q, categories]);

  return (
    <div className="space-y-3.5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocusSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered.length > 0) onPick(filtered[0]);
          }}
          placeholder="Search categories…"
          className="pl-10 h-10 rounded-xl bg-muted/40 border-border/60 font-medium text-sm"
        />
      </div>
      <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 space-y-2 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-12 text-muted-foreground">
            <div className="size-11 rounded-2xl border border-border/50 bg-muted/30 grid place-items-center">
              <Search className="size-5 opacity-40" />
            </div>
            <p className="text-xs font-medium">No categories match &ldquo;{q}&rdquo;</p>
          </div>
        ) : (
          <>
            {q.trim() && (
              <p className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground px-1 pb-0.5">
                {filtered.length} match{filtered.length === 1 ? "" : "es"}
              </p>
            )}
            {filtered.map((cat) => {
              const clr = colorForKey(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onPick(cat)}
                  className="relative w-full group flex items-center gap-3 p-3 rounded-xl border text-left overflow-hidden active:scale-[0.99] transition-all duration-150 touch-manipulation cursor-pointer hover:shadow-xs"
                  style={{
                    borderColor: withAlpha(clr, 0.22),
                    backgroundColor: withAlpha(clr, 0.04),
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none transition-colors duration-150 group-hover:bg-foreground/[0.03]"
                  />
                  <span
                    className="relative size-9 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 group-hover:scale-105 transition-transform duration-150 shadow-2xs"
                    style={{
                      color: clr,
                      backgroundColor: withAlpha(clr, 0.14),
                      border: `1px solid ${withAlpha(clr, 0.3)}`,
                    }}
                  >
                    {cat.short.slice(0, 3)}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate block">{cat.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">{cat.short}</span>
                  </div>
                  <span
                    className="relative size-7 rounded-lg flex items-center justify-center shrink-0 opacity-70 group-hover:opacity-100 transition-opacity duration-150"
                    style={{
                      color: clr,
                      border: `1px solid ${withAlpha(clr, 0.25)}`,
                      backgroundColor: withAlpha(clr, 0.1),
                    }}
                  >
                    <Plus className="size-3.5" />
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
      {autoFocusSearch && (
        <p className="flex items-center justify-end gap-1.5 pt-0.5 text-2xs text-muted-foreground">
          <kbd className="font-mono font-semibold px-1.5 py-0.5 rounded-md border border-border/50 bg-muted/40 text-[10px]">Enter</kbd>
          adds first match
        </p>
      )}
    </div>
  );
}

export function CategoryPicker({ open, onOpenChange, categories, onPick }: CategoryPickerProps) {
  const isMobile = useIsMobile();
  const handlePick = (cat: Category) => {
    onPick(cat);
    onOpenChange(false);
  };

  const subtitle = `Pick from ${categories.length} available categor${categories.length === 1 ? "y" : "ies"}`;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background/95 backdrop-blur-xl border-t border-border/60">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base font-bold">Add category to counter</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">{subtitle}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <CategoryPickerList categories={categories} onPick={handlePick} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Add category to counter</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{subtitle}</DialogDescription>
        </DialogHeader>
        <CategoryPickerList categories={categories} onPick={handlePick} autoFocusSearch />
      </DialogContent>
    </Dialog>
  );
}

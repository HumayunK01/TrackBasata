import { useState, useMemo, type Dispatch, type DragEvent } from "react";
import { colorForKey } from "@/lib/cat-colors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  Tag,
  Loader2,
  Info,
  ChevronUp,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Skeleton from "react-loading-skeleton";
import { EmptyState } from "@/components/ar/industrial";
import type { Category } from "@/hooks/useCategories";
import { useIsAdmin } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export interface CategoryFormState {
  label: string;
  short: string;
}

export interface CatState {
  dialogOpen: boolean;
  editingKey: string | null;
  form: CategoryFormState;
  formError: string;
  deleteTarget: Category | null;
  dragging: string | null;
  dragOver: string | null;
}

export type CatAction =
  | { type: "open_add" }
  | { type: "open_edit"; cat: Category }
  | { type: "set_form"; patch: Partial<CategoryFormState> }
  | { type: "set_error"; msg: string }
  | { type: "close_dialog" }
  | { type: "set_delete_target"; cat: Category | null }
  | { type: "drag_start"; key: string }
  | { type: "drag_over"; key: string }
  | { type: "drag_end" };

interface CategorySectionProps {
  categories: Category[];
  isLoading: boolean;
  cat: CatState;
  catDispatch: Dispatch<CatAction>;
  isBusy: boolean;
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onSave: () => void;
  onDelete: () => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: DragEvent, key: string) => void;
  onDrop: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
  isAdmin?: boolean;
}

function previewKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

const cleanInputClass =
  "w-full h-10 rounded-xl bg-background dark:bg-white/[0.03] border border-border/80 hover:border-border focus:border-primary px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors duration-150";

export function CategorySection({
  categories,
  isLoading,
  cat,
  catDispatch,
  isBusy,
  onAdd,
  onEdit,
  onSave,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
  isAdmin,
}: CategorySectionProps) {
  const isAdminHook = useIsAdmin();
  const canManage = isAdmin !== undefined ? isAdmin : isAdminHook;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const derivedKey = cat.editingKey ?? (previewKey(cat.form.label) || "category_key");
  const previewColor = colorForKey(derivedKey);

  return (
    <>
      <div className="rounded-2xl border border-border/65 bg-card/85 shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-5 sm:p-6 border-b border-border/55 gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Document Categories
              </h2>
              <span className="text-[11px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                {String(categories.length).padStart(2, "0")} active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {canManage
                ? "Drag cards or use the action menu to set the display order across Counter and Daily Log."
                : "Shared workspace catalog · Administrator access is required to add or edit categories."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8 h-9 text-xs w-full rounded-xl bg-background dark:bg-white/[0.03] border border-border/75 hover:border-border focus:border-primary text-foreground placeholder:text-muted-foreground/55 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="size-5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors absolute right-2 top-1/2 -translate-y-1/2"
                  title="Clear filter"
                  aria-label="Clear filter"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {canManage && (
              <Button
                type="button"
                onClick={onAdd}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer shrink-0"
              >
                <Plus className="size-3.5 mr-1.5" />
                <span>Add Category</span>
              </Button>
            )}
          </div>
        </div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="p-5 sm:p-6 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(265px,1fr))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20"
              >
                <Skeleton circle width={12} height={12} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="70%" height={13} borderRadius={6} />
                  <Skeleton width={52} height={10} borderRadius={4} />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No Categories Configured"
            hint={
              canManage
                ? "Create your first document category to start logging daily counts."
                : "Ask a workspace administrator to configure document categories."
            }
          />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <p className="text-sm font-semibold text-foreground">
              No categories match &ldquo;{search}&rdquo;
            </p>
            <p className="text-xs text-muted-foreground">
              Try filtering by another label, short code, or key.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearch("")}
              className="h-8 px-3 rounded-lg border-border/75 text-xs mt-1 cursor-pointer"
            >
              Clear filter
            </Button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(265px,1fr))]">
            {filtered.map((c) => {
              const clr = colorForKey(c.key);
              const originalIndex = categories.findIndex((item) => item.key === c.key);
              const isFirst = originalIndex === 0;
              const isLast = originalIndex === categories.length - 1;
              const canDrag = canManage && !search;

              return (
                <div
                  key={c.key}
                  draggable={canDrag}
                  onDragStart={
                    canDrag
                      ? (e) => {
                          e.dataTransfer.setData("text/plain", c.key);
                          e.dataTransfer.effectAllowed = "move";
                          setTimeout(() => onDragStart(c.key), 0);
                        }
                      : undefined
                  }
                  onDragOver={canDrag ? (e) => onDragOver(e, c.key) : undefined}
                  onDrop={
                    canDrag
                      ? (e) => {
                          e.preventDefault();
                          onDrop(c.key);
                        }
                      : undefined
                  }
                  onDragEnd={canDrag ? () => catDispatch({ type: "drag_end" }) : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 select-none touch-manipulation transition-colors duration-150",
                    cat.dragOver === c.key && cat.dragging !== c.key
                      ? "border-primary bg-primary/10"
                      : "border-border/60 bg-card hover:bg-muted/35 hover:border-border",
                    cat.dragging === c.key && "opacity-35 border-dashed border-primary"
                  )}
                >
                  {/* Position / Drag Handle */}
                  {canDrag ? (
                    <div
                      className="cursor-grab active:cursor-grabbing shrink-0 -ml-1 text-muted-foreground/45 hover:text-foreground transition-colors p-0.5"
                      title="Drag to reorder"
                    >
                      <GripVertical className="size-4" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground/65 shrink-0 w-5">
                      {String(originalIndex + 1).padStart(2, "0")}
                    </span>
                  )}

                  {/* Color Dot */}
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: clr }}
                    aria-hidden="true"
                  />

                  {/* Label + Short Code */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs sm:text-[13px] font-semibold text-foreground truncate leading-snug"
                      title={c.label}
                    >
                      {c.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="text-[10px] font-mono font-semibold text-foreground/80 bg-muted px-1.5 py-0.5 rounded leading-none shrink-0">
                        {c.short}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/70 truncate">
                        {c.key}
                      </span>
                    </div>
                  </div>

                  {/* Admin Actions Menu */}
                  {canManage && (
                    <div className="flex items-center shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                            aria-label={`Actions for ${c.label}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-xl p-1 font-sans"
                        >
                          <DropdownMenuItem
                            className="text-xs font-medium rounded-lg gap-2 cursor-pointer"
                            onClick={() => onEdit(c)}
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            Edit category
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem
                            className="text-xs font-medium rounded-lg gap-2 cursor-pointer"
                            disabled={isFirst}
                            onClick={() => onMove(c.key, -1)}
                          >
                            <ChevronUp className="size-3.5 text-muted-foreground" />
                            Move up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs font-medium rounded-lg gap-2 cursor-pointer"
                            disabled={isLast}
                            onClick={() => onMove(c.key, 1)}
                          >
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                            Move down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem
                            className="text-xs font-medium rounded-lg gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => catDispatch({ type: "set_delete_target", cat: c })}
                          >
                            <Trash2 className="size-3.5" />
                            Archive category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={cat.dialogOpen} onOpenChange={(o) => !o && catDispatch({ type: "close_dialog" })}>
        <DialogContent className="sm:max-w-md bg-card border border-border/75 rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {cat.editingKey ? "Edit Category" : "New Document Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Live Preview Strip */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: previewColor }}
                />
                <span className="text-xs font-semibold text-foreground truncate">
                  {cat.form.label.trim() || "Category preview"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-background border border-border/60 text-foreground">
                  {cat.form.short.trim() || "SHORT"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground max-w-[110px] truncate">
                  {derivedKey}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-label" className="text-xs font-semibold text-foreground">
                Category label
              </Label>
              <input
                id="cat-label"
                type="text"
                placeholder="e.g. Worked on NG"
                value={cat.form.label}
                autoFocus
                className={cleanInputClass}
                onChange={(e) => catDispatch({ type: "set_form", patch: { label: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-short" className="text-xs font-semibold text-foreground">
                Short code
              </Label>
              <input
                id="cat-short"
                type="text"
                placeholder="e.g. NG"
                maxLength={10}
                value={cat.form.short}
                className={cn(cleanInputClass, "font-mono")}
                onChange={(e) => catDispatch({ type: "set_form", patch: { short: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
              <p className="text-[11px] text-muted-foreground">
                Compact column header used in Daily Log and mobile views (max 10 characters).
              </p>
            </div>

            {cat.formError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 font-medium">
                <Info className="size-3.5 shrink-0" />
                <span>{cat.formError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border/80 h-9 px-3.5 text-xs font-medium cursor-pointer"
              onClick={() => catDispatch({ type: "close_dialog" })}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={isBusy}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 cursor-pointer"
            >
              {isBusy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {cat.editingKey ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Category Confirm */}
      <AlertDialog
        open={!!cat.deleteTarget}
        onOpenChange={(o) => !o && catDispatch({ type: "set_delete_target", cat: null })}
      >
        <AlertDialogContent className="sm:max-w-md bg-card border border-destructive/30 rounded-2xl p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Archive &ldquo;{cat.deleteTarget?.label}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              <span className="block">
                Archiving{" "}
                <strong className="text-foreground">{cat.deleteTarget?.label}</strong>{" "}
                <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">
                  {cat.deleteTarget?.short}
                </code>{" "}
                hides it from active counters and new daily log entries.
              </span>
              <span className="block rounded-xl bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
                Historical counts already recorded under this category remain intact in your logs and reports.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl border-border/80 h-9 px-3.5 text-xs font-medium cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold text-xs h-9 px-4 cursor-pointer"
            >
              Archive category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

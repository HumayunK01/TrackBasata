import type { Dispatch, DragEvent } from "react";
import { colorForKey } from "@/lib/cat-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, MoreVertical, Pencil, Trash2, GripVertical, Tag, Loader2, Info, HelpCircle, ChevronUp, ChevronDown } from "@/components/ui/icons";
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
}

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
}: CategorySectionProps) {
  return (
    <>
      <div className="bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl shadow-sm overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/[0.04]">
          <div className="flex items-center gap-3.5">
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
              <Tag className="size-4.5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-heading text-foreground">Document Categories</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  {categories.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 hidden xs:block">
                Drag to reorder keys · Drive counters, quick logging, and chart reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-3.5 shadow-xs shadow-emerald-600/20 active:scale-[0.98]"
              onClick={onAdd}
            >
              <Plus className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Add Category</span>
            </Button>
          </div>
        </div>

        {/* Content grid */}
        {isLoading ? (
          <div className="p-4 sm:p-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20">
                <Skeleton circle width={12} height={12} />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="75%" height={14} borderRadius={6} />
                  <Skeleton width={48} height={10} borderRadius={4} />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No Categories Yet"
            hint="Click Add category to create your first document key."
          />
        ) : (
          <div className="p-4 sm:p-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {categories.map((c, index) => {
              const clr = colorForKey(c.key);
              return (
                <div
                  key={c.key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", c.key);
                    e.dataTransfer.effectAllowed = "move";
                    setTimeout(() => onDragStart(c.key), 0);
                  }}
                  onDragOver={(e) => onDragOver(e, c.key)}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(c.key);
                  }}
                  onDragEnd={() => catDispatch({ type: "drag_end" })}
                  className={[
                    "group flex items-center gap-3 rounded-xl border p-3 select-none touch-manipulation",
                    "transition-all duration-150",
                    cat.dragOver === c.key && cat.dragging !== c.key
                      ? "border-emerald-500/60 bg-emerald-500/10 scale-[0.99] shadow-xs"
                      : "border-border/60 bg-card hover:bg-muted/40 hover:border-border/90 shadow-2xs",
                    cat.dragging === c.key ? "opacity-35 scale-[0.98] border-dashed border-emerald-500" : "",
                  ].join(" ")}
                >
                  <div className="cursor-grab active:cursor-grabbing shrink-0 -ml-0.5 text-muted-foreground/60 hover:text-foreground transition-colors">
                    <GripVertical className="size-4" />
                  </div>
                  <span
                    className="size-3 rounded-full shrink-0 ring-2 ring-background shadow-xs"
                    style={{ backgroundColor: clr }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate" title={c.label}>
                      {c.label}
                    </p>
                    <span className="inline-block text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded mt-0.5 truncate max-w-full">
                      {c.short}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                          aria-label={`Actions for ${c.label}`}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-xl p-1 font-sans">
                        <DropdownMenuItem className="text-xs font-medium rounded-lg gap-2 cursor-pointer" onClick={() => onEdit(c)}>
                          <Pencil className="size-3.5 text-muted-foreground" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          className="text-xs font-medium rounded-lg gap-2 cursor-pointer"
                          disabled={index === 0}
                          onClick={() => onMove(c.key, -1)}
                        >
                          <ChevronUp className="size-3.5 text-muted-foreground" /> Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs font-medium rounded-lg gap-2 cursor-pointer"
                          disabled={index === categories.length - 1}
                          onClick={() => onMove(c.key, 1)}
                        >
                          <ChevronDown className="size-3.5 text-muted-foreground" /> Move down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          className="text-xs font-medium rounded-lg gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => catDispatch({ type: "set_delete_target", cat: c })}
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={cat.dialogOpen} onOpenChange={(o) => !o && catDispatch({ type: "close_dialog" })}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/70 rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Tag className="size-4" strokeWidth={1.75} />
              </div>
              {cat.editingKey ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!cat.editingKey && (
              <div className="flex gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs leading-normal">
                <HelpCircle className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-foreground leading-relaxed">
                  Labels automatically bind to daily metrics (e.g. <strong>&ldquo;Worked on NG&rdquo;</strong> generates target key <strong>&ldquo;worked_on_ng&rdquo;</strong>).
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cat-label" className="text-xs font-semibold text-foreground">Category Label</Label>
              <Input
                id="cat-label"
                placeholder="e.g. Worked on NG"
                value={cat.form.label}
                className="font-medium rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60"
                onChange={(e) => catDispatch({ type: "set_form", patch: { label: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-short" className="text-xs font-semibold text-foreground">Abbreviation / Short Name</Label>
              <Input
                id="cat-short"
                placeholder="e.g. NG"
                maxLength={10}
                value={cat.form.short}
                className="font-semibold rounded-xl bg-muted/40 border-border/60 text-sm focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60"
                onChange={(e) => catDispatch({ type: "set_form", patch: { short: e.target.value } })}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
              />
              <p className="text-[11px] text-muted-foreground">Displayed on counters, pills, and mobile screens (Max 10 chars)</p>
            </div>
            
            {cat.formError && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 animate-fade-in font-medium">
                <Info className="size-3.5 shrink-0" />
                <span>{cat.formError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" className="rounded-xl border-border/60 hover:bg-muted/70 font-semibold" onClick={() => catDispatch({ type: "close_dialog" })}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isBusy}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs shadow-emerald-600/20 active:scale-[0.98]"
            >
              {isBusy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {cat.editingKey ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog
        open={!!cat.deleteTarget}
        onOpenChange={(o) => !o && catDispatch({ type: "set_delete_target", cat: null })}
      >
        <AlertDialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-destructive/30 rounded-2xl p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-base font-bold">
              <Info className="size-5 shrink-0" />
              Remove Document Category?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 mt-2 text-sm leading-relaxed text-foreground">
              <span>
                Removing <strong>&ldquo;{cat.deleteTarget?.label}&rdquo;</strong> (`{cat.deleteTarget?.short}`) will delete it from counters and form selections.
              </span>
              
              <span className="flex gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs leading-normal">
                <Info className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-foreground leading-relaxed">
                  Existing logging history in your daily tables is preserved, but this category will no longer appear on your active Counter or daily form.
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-muted/70 font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs shadow-destructive/20 font-semibold active:scale-[0.98]"
            >
              Remove Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

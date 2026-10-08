import { useMemo, useState } from "react";
import {
  Building2,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "@/components/ui/icons";
import Skeleton from "react-loading-skeleton";
import {
  useFacilities,
  useUpsertFacility,
  useDeleteFacility,
  type Facility,
} from "@/hooks/useFacilities";
import { useIsAdmin } from "@/hooks/useProfile";
import { useDebouncedValue } from "@/hooks/useDebounce";
import {
  filterAndRankFacilities,
  type FacilityStatusFilter,
} from "@/components/ar/facilities/facility-utils";
import { EmptyState } from "@/components/ar/industrial";
import { Input } from "@/components/ui/input";
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
import { FacilityCard } from "@/components/ar/facilities/FacilityCard";
import { FacilityRow } from "@/components/ar/facilities/FacilityRow";
import { FacilityDialog } from "@/components/ar/facilities/FacilityDialog";
import { cn } from "@/lib/utils";

export default function FacilitiesPage() {
  const isAdmin = useIsAdmin();
  const { data: facilities = [], isLoading } = useFacilities();
  const upsert = useUpsertFacility();
  const deleteFacility = useDeleteFacility();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusFilter, setStatusFilter] = useState<FacilityStatusFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);

  // Dynamically filtered and relevance-ranked list with debounce
  const filtered = useMemo(() => {
    return filterAndRankFacilities(facilities, debouncedSearch, statusFilter);
  }, [facilities, debouncedSearch, statusFilter]);

  const verifiedCount = useMemo(() => facilities.filter((f) => f.verified).length, [facilities]);
  const unverifiedCount = facilities.length - verifiedCount;

  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="w-full space-y-4">
        {/* Controls Bar: Search, Status Tabs, View Switcher & Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 pr-16 h-9 text-xs sm:text-sm w-full bg-background border-border/60 focus:border-primary/50"
                placeholder="Search by clinic name, fax number, or address…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {debouncedSearch.trim() && (
                  <span
                    className="text-2xs font-mono font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md select-none"
                    title={`${filtered.length} matching facility(ies)`}
                  >
                    {filtered.length}
                  </span>
                )}
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="size-5 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills & View Mode */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
              {/* Status Filter Tabs */}
              <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    statusFilter === "all"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>All</span>
                  <span className="text-[10px] opacity-70 font-mono">({facilities.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("verified")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    statusFilter === "verified"
                      ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ShieldCheck className="size-3 text-emerald-500" />
                  <span>Verified</span>
                  <span className="text-[10px] opacity-70 font-mono">({verifiedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("unverified")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                    statusFilter === "unverified"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Standard</span>
                  <span className="text-[10px] opacity-70 font-mono">({unverifiedCount})</span>
                </button>
              </div>

              {/* View mode toggle */}
              <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={cn(
                    "size-7 rounded-lg grid place-items-center transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className={cn(
                    "size-7 rounded-lg grid place-items-center transition-all cursor-pointer",
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="size-3.5" />
                </button>
              </div>

              {/* Add Facility Button */}
              {isAdmin && (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs shadow-primary/20 h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <Plus className="size-3.5 mr-1.5" />
                  <span>Add Facility</span>
                </Button>
              )}
            </div>
          </div>

          {/* Content Area: Grid or List */}
          {isLoading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5"
                  : "space-y-2.5"
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    viewMode === "grid"
                      ? "rounded-2xl border border-border/70 bg-card overflow-hidden"
                      : "rounded-xl border border-border/70 bg-card p-4 flex items-center gap-4"
                  }
                >
                  {viewMode === "grid" ? (
                    <>
                      <Skeleton height={120} className="w-full rounded-none" />
                      <div className="p-3 space-y-2">
                        <Skeleton width="75%" height={14} />
                        <Skeleton height={42} className="rounded-xl mt-2" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Skeleton className="size-10 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton width="50%" height={15} />
                        <Skeleton width="30%" height={12} />
                      </div>
                      <Skeleton width={120} height={32} className="rounded-lg" />
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={facilities.length === 0 ? "No facilities registered" : "No matching facilities found"}
              hint={
                facilities.length === 0
                  ? "Admins can register clinic endpoints and fax numbers here."
                  : debouncedSearch.trim()
                    ? `No facility matches "${debouncedSearch.trim()}". Try searching by a different name, fax digits, or city.`
                    : "Try adjusting the status filter."
              }
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((f) => (
                <FacilityCard
                  key={f.id}
                  f={f}
                  isAdmin={isAdmin}
                  setEditing={setEditing}
                  setDialogOpen={setDialogOpen}
                  setDeleteTarget={setDeleteTarget}
                  upsert={upsert}
                  deleteFacility={deleteFacility}
                  searchQuery={debouncedSearch}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5" role="list" aria-label="Facilities list">
              {filtered.map((f) => (
                <FacilityRow
                  key={f.id}
                  f={f}
                  isAdmin={isAdmin}
                  setEditing={setEditing}
                  setDialogOpen={setDialogOpen}
                  setDeleteTarget={setDeleteTarget}
                  upsert={upsert}
                  deleteFacility={deleteFacility}
                  searchQuery={debouncedSearch}
                />
              ))}
            </div>
          )}
      </div>

      {/* Facility Add / Edit Dialog */}
      <FacilityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        upsert={upsert}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md border-destructive/20 bg-background/95 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will remove {deleteTarget?.name} and its fax routing endpoint from the facilities directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="border-border/60 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/95 text-destructive-foreground disabled:opacity-50 text-xs font-semibold"
              disabled={deleteFacility.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteFacility.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              {deleteFacility.isPending ? "Deleting…" : "Delete Facility"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
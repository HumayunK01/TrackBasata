import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Building2,
  Check,
  CheckCheck,
  Copy,
  FileDown,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
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
  copyFacilitiesTable,
  downloadFacilitiesCSV,
  downloadFacilitiesPDF,
  filterAndRankFacilities,
  formatFax,
  type FacilityStatusFilter,
} from "@/components/ar/facilities/facility-utils";
import { EmptyState } from "@/components/ar/industrial";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const { data: facilities = [], isLoading } = useFacilities();
  const upsert = useUpsertFacility();
  const deleteFacility = useDeleteFacility();

  const [searchParams, setSearchParams] = useSearchParams();

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            if (val === null || val === undefined || val === "" || val === "all") {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Synchronized search query
  const urlQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(search, 200);

  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== (searchParams.get("q") ?? "")) {
        updateUrlParams({ q: trimmed || null });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, searchParams, updateUrlParams]);

  // Synchronized status filter (?status=verified|unverified|all)
  const statusFilter: FacilityStatusFilter = useMemo(() => {
    const s = searchParams.get("status")?.toLowerCase();
    if (s === "verified" || s === "unverified") return s;
    return "all";
  }, [searchParams]);

  const handleStatusFilterChange = (status: FacilityStatusFilter) => {
    updateUrlParams({ status: status === "all" ? null : status });
  };

  // Synchronized view mode (?view=grid|list)
  const viewMode: "grid" | "list" = useMemo(() => {
    const v = searchParams.get("view")?.toLowerCase();
    if (v === "list" || v === "grid") return v;
    return "grid"; // Default is grid
  }, [searchParams]);

  const handleViewModeChange = (mode: "grid" | "list") => {
    updateUrlParams({ view: mode === "grid" ? null : mode });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Dynamically filtered and relevance-ranked list with debounce and status
  const filtered = useMemo(() => {
    return filterAndRankFacilities(facilities, debouncedSearch, statusFilter);
  }, [facilities, debouncedSearch, statusFilter]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStartSelect = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((f) => selectedIds.has(f.id)),
    [filtered, selectedIds],
  );

  const handleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const f of filtered) next.delete(f.id);
      } else {
        for (const f of filtered) next.add(f.id);
      }
      return next;
    });
  }, [allFilteredSelected, filtered]);

  const selectedFacilities = useMemo(
    () => facilities.filter((f) => selectedIds.has(f.id)),
    [facilities, selectedIds],
  );

  useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClearSelection();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, handleClearSelection]);

  const verifiedCount = useMemo(() => facilities.filter((f) => f.verified).length, [facilities]);
  const unverifiedCount = facilities.length - verifiedCount;

  // Letter counts for section headers
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of filtered) {
      const ch = f.name.trim()[0]?.toUpperCase();
      if (ch && /[A-Z]/.test(ch)) {
        counts[ch] = (counts[ch] ?? 0) + 1;
      } else {
        counts["#"] = (counts["#"] ?? 0) + 1;
      }
    }
    return counts;
  }, [filtered]);

  return (
    <main
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-5 sm:pb-6"
    >
      <div className="w-full space-y-3.5 pt-5 sm:pt-6">
        {/* Sticky Controls Bar: Search, Status Tabs, View Switcher & Add Button */}
        <div className="sticky top-1.5 z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-3 sm:p-3.5 shadow-sm">
          {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 pr-16 h-9 text-xs sm:text-sm w-full bg-background border-border/60 focus:border-primary/50 rounded-xl"
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
                    onClick={() => {
                      setSearch("");
                      updateUrlParams({ q: null });
                    }}
                    className="size-5 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills, View Mode & Add Button */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
              {/* Status Filter Tabs */}
              <div
                role="tablist"
                aria-label="Filter facilities by status"
                className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-background/90 dark:bg-black/35 p-1 border border-border/70 shadow-2xs text-xs"
              >
                {(
                  [
                    {
                      id: "all" as const,
                      label: "All",
                      count: facilities.length,
                      icon: false,
                    },
                    {
                      id: "verified" as const,
                      label: "Verified",
                      count: verifiedCount,
                      icon: true,
                    },
                    {
                      id: "unverified" as const,
                      label: "Standard",
                      count: unverifiedCount,
                      icon: false,
                    },
                  ]
                ).map((tab) => {
                  const isActive = statusFilter === tab.id;
                  const isVerifiedTab = tab.id === "verified";
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleStatusFilterChange(tab.id)}
                      className={cn(
                        "h-full px-2.5 rounded-lg font-medium transition-colors duration-200 cursor-pointer inline-flex items-center gap-1.5 relative z-0 select-none active:scale-[0.98]",
                        isActive
                          ? isVerifiedTab
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="facilities-status-pill"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", bounce: 0.15, duration: 0.35 }
                          }
                          className={cn(
                            "absolute inset-0 rounded-lg -z-10 shadow-xs border",
                            isVerifiedTab
                              ? "bg-emerald-500/12 dark:bg-emerald-500/15 border-emerald-500/30"
                              : "bg-card dark:bg-white/[0.09] border-border/80 dark:border-white/12",
                          )}
                        />
                      )}
                      {tab.icon && (
                        <ShieldCheck
                          className={cn(
                            "size-3.5 transition-colors",
                            isActive
                              ? "text-emerald-500"
                              : "text-emerald-500/70",
                          )}
                        />
                      )}
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums leading-none transition-colors",
                          isActive
                            ? isVerifiedTab
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold"
                              : "bg-foreground/10 dark:bg-white/15 text-foreground font-semibold"
                            : "bg-muted/70 dark:bg-white/[0.05] text-muted-foreground/80",
                        )}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* View mode toggle */}
              <div
                role="group"
                aria-label="View mode"
                className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-background/90 dark:bg-black/35 p-1 border border-border/70 shadow-2xs"
              >
                {(
                  [
                    { mode: "grid" as const, label: "Grid view", Icon: LayoutGrid },
                    { mode: "list" as const, label: "List view", Icon: List },
                  ]
                ).map(({ mode, label, Icon }) => {
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleViewModeChange(mode)}
                      aria-label={label}
                      aria-pressed={isActive}
                      title={label}
                      className={cn(
                        "h-full w-8 rounded-lg grid place-items-center transition-colors duration-200 cursor-pointer relative z-0 select-none active:scale-[0.96]",
                        isActive
                          ? "text-primary dark:text-emerald-400"
                          : "text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="facilities-view-pill"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", bounce: 0.15, duration: 0.35 }
                          }
                          className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
                        />
                      )}
                      <Icon className="size-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Multi-Select (Copy & Export) Toggle Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filtered.length === 0 && !selectionMode}
                onClick={() => {
                  if (selectionMode) {
                    handleClearSelection();
                  } else {
                    setSelectionMode(true);
                  }
                }}
                className={cn(
                  "h-9 rounded-xl px-3 border text-xs font-medium shrink-0 cursor-pointer shadow-2xs transition-colors",
                  selectionMode
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                    : "border-border/70 bg-background/90 dark:bg-black/35 hover:bg-muted/60 text-foreground",
                )}
              >
                <CheckCheck className="size-3.5 mr-1.5" />
                <span>
                  {selectionMode
                    ? selectedIds.size > 0
                      ? `${selectedIds.size} Selected`
                      : "Selecting"
                    : "Select"}
                </span>
              </Button>

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

        {/* Content Area: Grid or List with Smooth Staggered Transition */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${statusFilter}-${viewMode}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.14, ease: [0.23, 1, 0.32, 1] }
            }
          >
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
                    ? `No facility matches "${debouncedSearch.trim()}". Try searching by a different name, fax digits, or address.`
                    : "Try adjusting the status filter."
                }
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map((f, i) => {
                  const firstChar = f.name.trim()[0]?.toUpperCase() || "#";
                  const prevChar = i > 0 ? filtered[i - 1].name.trim()[0]?.toUpperCase() || "#" : null;
                  const isNewSection = !debouncedSearch.trim() && firstChar !== prevChar;
                  const delay = reduceMotion ? 0 : Math.min(i * 0.025, 0.22);

                  return (
                    <React.Fragment key={f.id}>
                      {isNewSection && (
                        <motion.div
                          id={`facility-letter-${firstChar}`}
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.22,
                            delay,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          className="col-span-full flex items-center gap-3 pt-2 pb-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                              {firstChar}
                            </span>
                            <span className="text-xs font-semibold text-foreground tracking-tight">
                              {firstChar}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({letterCounts[firstChar] ?? 0}{" "}
                              {letterCounts[firstChar] === 1 ? "facility" : "facilities"})
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-border/50" />
                        </motion.div>
                      )}
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.26,
                          delay,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                        className="h-full"
                      >
                        <FacilityCard
                          f={f}
                          isAdmin={isAdmin}
                          setEditing={setEditing}
                          setDialogOpen={setDialogOpen}
                          setDeleteTarget={setDeleteTarget}
                          upsert={upsert}
                          deleteFacility={deleteFacility}
                          searchQuery={debouncedSearch}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(f.id)}
                          onToggleSelect={handleToggleSelect}
                          onStartSelect={handleStartSelect}
                        />
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2" role="list" aria-label="Facilities list">
                {filtered.map((f, i) => {
                  const firstChar = f.name.trim()[0]?.toUpperCase() || "#";
                  const prevChar = i > 0 ? filtered[i - 1].name.trim()[0]?.toUpperCase() || "#" : null;
                  const isNewSection = !debouncedSearch.trim() && firstChar !== prevChar;
                  const delay = reduceMotion ? 0 : Math.min(i * 0.02, 0.2);

                  return (
                    <React.Fragment key={f.id}>
                      {isNewSection && (
                        <motion.div
                          id={`facility-letter-${firstChar}`}
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          className="flex items-center gap-3 pt-2 pb-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="size-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shadow-2xs">
                              {firstChar}
                            </span>
                            <span className="text-xs font-semibold text-foreground tracking-tight">
                              {firstChar}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({letterCounts[firstChar] ?? 0}{" "}
                              {letterCounts[firstChar] === 1 ? "facility" : "facilities"})
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-border/50" />
                        </motion.div>
                      )}
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.24,
                          delay,
                          ease: [0.23, 1, 0.32, 1],
                        }}
                      >
                        <FacilityRow
                          f={f}
                          isAdmin={isAdmin}
                          setEditing={setEditing}
                          setDialogOpen={setDialogOpen}
                          setDeleteTarget={setDeleteTarget}
                          upsert={upsert}
                          deleteFacility={deleteFacility}
                          searchQuery={debouncedSearch}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(f.id)}
                          onToggleSelect={handleToggleSelect}
                          onStartSelect={handleStartSelect}
                        />
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Bulk Selection & Copy Action Bar */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", bounce: 0.15, duration: 0.3 }
              }
              className="sticky bottom-3 z-30 flex justify-center pointer-events-none pt-2"
            >
              <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 dark:border-white/15 bg-card/95 backdrop-blur-xl px-3.5 py-2 shadow-2xl shadow-black/40">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground px-1.5">
                  <span className="inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-primary font-mono text-[11px] font-bold tabular-nums">
                    {selectedFacilities.length}
                  </span>
                  <span>selected</span>
                </span>

                <div className="h-4 w-px bg-border/60" />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  className="h-8 px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {allFilteredSelected ? "Deselect All" : `Select All (${filtered.length})`}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={selectedFacilities.length === 0}
                  onClick={() => {
                    void copyFacilitiesTable(selectedFacilities);
                    handleClearSelection();
                  }}
                  className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold shadow-xs shadow-primary/20 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Copy className="size-3.5" />
                  <span>
                    Copy Table
                    {selectedFacilities.length > 0 ? ` (${selectedFacilities.length})` : ""}
                  </span>
                </Button>

                {/* Export Selected Dropdown inside Select Dock */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedFacilities.length === 0}
                      className="h-8 px-3 rounded-xl border-border/70 bg-background/80 hover:bg-muted/70 text-foreground text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileDown className="size-3.5 text-muted-foreground" />
                      <span>
                        Export
                        {selectedFacilities.length > 0 ? ` (${selectedFacilities.length})` : ""}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    sideOffset={8}
                    className="w-48 rounded-xl border border-border/80 dark:border-white/10 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl shadow-black/25 space-y-0.5"
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        downloadFacilitiesCSV(
                          selectedFacilities,
                          selectedFacilities.length === facilities.length
                            ? "facilities-directory"
                            : "selected-facilities",
                        );
                        handleClearSelection();
                      }}
                      className="group/csv rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 focus:text-foreground focus:bg-muted/80 dark:focus:bg-white/[0.07] gap-2.5 cursor-pointer transition-colors"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.06] border border-border/60 dark:border-white/10 text-muted-foreground group-focus/csv:text-foreground transition-colors shrink-0">
                        <FileText className="size-3" />
                      </span>
                      <span>CSV Spreadsheet</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        void downloadFacilitiesPDF(
                          selectedFacilities,
                          selectedFacilities.length === facilities.length
                            ? "facilities-directory"
                            : "selected-facilities",
                          "Facilities Directory",
                        );
                        handleClearSelection();
                      }}
                      className="group/pdf rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 focus:text-foreground focus:bg-muted/80 dark:focus:bg-white/[0.07] gap-2.5 cursor-pointer transition-colors"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md bg-muted/70 dark:bg-white/[0.06] border border-border/60 dark:border-white/10 text-muted-foreground group-focus/pdf:text-foreground transition-colors shrink-0">
                        <FileDown className="size-3" />
                      </span>
                      <span>PDF Document</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSelection}
                  title="Exit selection mode (Esc)"
                  aria-label="Exit selection mode"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        <AlertDialogContent className="sm:max-w-[440px] w-full p-0 gap-0 overflow-hidden rounded-3xl sm:rounded-3xl border border-destructive/25 bg-card shadow-2xl">
          {/* Header */}
          <AlertDialogHeader className="px-5 py-4 border-b border-border/60 bg-destructive/[0.04] flex flex-row items-center gap-3 space-y-0 text-left">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/12 border border-destructive/25 text-destructive shrink-0 shadow-2xs">
              <Trash2 className="size-4" />
            </div>
            <div className="min-w-0">
              <AlertDialogTitle className="text-sm sm:text-[15px] font-bold text-foreground tracking-tight leading-snug">
                Delete Facility
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          {/* Body: Target Summary & Warning */}
          <div className="p-5 space-y-3.5">
            {deleteTarget && (
              <div className="rounded-xl border border-border/70 bg-background/70 dark:bg-black/30 p-3.5 space-y-2.5 shadow-2xs">
                {/* Top row: Facility Name + Status Badge */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-bold text-foreground tracking-tight leading-snug break-words">
                      {deleteTarget.name}
                    </h4>
                    {deleteTarget.address ? (
                      <p className="text-xs text-muted-foreground leading-snug break-words">
                        {deleteTarget.address}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/45 italic leading-snug">
                        No street address listed
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {deleteTarget.verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                        <Check className="size-2.5" strokeWidth={3} />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">
                        Standard
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom row: Full-width Fax Bar */}
                <div className="flex items-center gap-2 rounded-lg bg-muted/35 border border-border/60 px-2.5 py-1.5">
                  <Send className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 shrink-0">
                    Fax
                  </span>
                  <span className="text-border select-none shrink-0">•</span>
                  <span className="text-xs font-mono font-semibold text-foreground tabular-nums tracking-tight">
                    {formatFax(deleteTarget.fax_number)}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Removing <span className="font-semibold text-foreground">{deleteTarget?.name}</span> will delete its clinic profile and fax number from the facilities directory.
            </p>

            {/* Footer */}
            <AlertDialogFooter className="pt-3 border-t border-border/60 flex flex-row justify-end gap-2 sm:space-x-0">
              <AlertDialogCancel className="border-border/70 bg-background/60 hover:bg-muted/70 text-xs font-medium h-9 px-4 rounded-xl m-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-50 text-xs font-semibold shadow-xs shadow-destructive/20 h-9 px-4 rounded-xl inline-flex items-center gap-1.5"
                disabled={deleteFacility.isPending}
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteFacility.mutate(deleteTarget);
                  setDeleteTarget(null);
                }}
              >
                <Trash2 className="size-3.5" />
                <span>{deleteFacility.isPending ? "Deleting…" : "Delete Facility"}</span>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

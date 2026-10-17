import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  ShieldCheck,
  X,
  ArrowUp,
} from "@/components/ui/icons";
import { MapPin } from "lucide-react";
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
  extractCity,
  filterAndRankFacilities,
  type FacilityStatusFilter,
} from "@/components/ar/facilities/facility-utils";
import { EmptyState } from "@/components/ar/industrial";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

  // Synchronized city filter (?city=Phoenix|Mesa|...)
  const cityFilter: string = useMemo(() => {
    return searchParams.get("city")?.trim() || "all";
  }, [searchParams]);

  const handleCityFilterChange = (city: string) => {
    updateUrlParams({ city: city === "all" ? null : city });
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
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Available cities aggregation
  const availableCities = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of facilities) {
      const c = extractCity(f.address);
      if (c) {
        map.set(c, (map.get(c) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  }, [facilities]);

  // Dynamically filtered and relevance-ranked list with debounce, status, and city
  const filtered = useMemo(() => {
    return filterAndRankFacilities(facilities, debouncedSearch, statusFilter, cityFilter);
  }, [facilities, debouncedSearch, statusFilter, cityFilter]);

  const verifiedCount = useMemo(() => facilities.filter((f) => f.verified).length, [facilities]);
  const unverifiedCount = facilities.length - verifiedCount;

  // Letter counts for A-Z quick-jump rail
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

  // Smooth scroll to an alphabetical letter group using Lenis or native fallback
  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    const target = document.getElementById(`facility-letter-${letter}`);
    if (target) {
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement | number, o?: Record<string, unknown>) => void } }).__lenis;
      if (lenis) {
        lenis.scrollTo(target, { offset: -24, duration: 0.9 });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const scrollToTop = () => {
    setActiveLetter(null);
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement | number, o?: Record<string, unknown>) => void } }).__lenis;
    if (lenis) {
      lenis.scrollTo(0, { duration: 0.8 });
    } else {
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const hasActiveFilters = Boolean(debouncedSearch.trim() || statusFilter !== "all" || cityFilter !== "all");

  return (
    <main
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6"
    >
      <div className="w-full space-y-3.5">
        {/* Controls Bar: Search, Status Tabs, City Filter, View Switcher & Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
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

          {/* Filter Pills, City Selector & View Mode */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
            {/* Status Filter Tabs */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => handleStatusFilterChange("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 relative",
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
                onClick={() => handleStatusFilterChange("verified")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 relative",
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
                onClick={() => handleStatusFilterChange("unverified")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 relative",
                  statusFilter === "unverified"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Standard</span>
                <span className="text-[10px] opacity-70 font-mono">({unverifiedCount})</span>
              </button>
            </div>

            {/* City Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 rounded-xl border-border/50 text-xs gap-1.5 px-3 bg-muted/30 hover:bg-muted/50 cursor-pointer shrink-0 font-medium",
                    cityFilter !== "all" && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold"
                  )}
                >
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span className="max-w-[100px] truncate">{cityFilter === "all" ? "All Cities" : cityFilter}</span>
                  {cityFilter !== "all" && (
                    <span className="size-4 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] grid place-items-center font-mono">
                      {filtered.length}
                    </span>
                  )}
                  <ChevronDown className="size-3 opacity-60 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto p-1 rounded-xl shadow-lg border-border/60 font-sans">
                <DropdownMenuItem
                  onClick={() => handleCityFilterChange("all")}
                  className="text-xs cursor-pointer rounded-lg font-medium justify-between"
                >
                  <span>All Cities</span>
                  <span className="font-mono text-muted-foreground text-[10px]">({facilities.length})</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableCities.length === 0 ? (
                  <span className="block px-2.5 py-1.5 text-xs text-muted-foreground">No city data found</span>
                ) : (
                  availableCities.map(({ city, count }) => (
                    <DropdownMenuItem
                      key={city}
                      onClick={() => handleCityFilterChange(city)}
                      className={cn(
                        "text-xs cursor-pointer rounded-lg font-medium justify-between",
                        cityFilter.toLowerCase() === city.toLowerCase() && "text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10"
                      )}
                    >
                      <span className="truncate">{city}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">({count})</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View mode toggle */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50">
              <button
                type="button"
                onClick={() => handleViewModeChange("grid")}
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
                onClick={() => handleViewModeChange("list")}
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

        {/* 🔤 Alphabetical (A–Z) Quick-Jump Rail */}
        <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 bg-background/90 backdrop-blur-md border-y border-border/40 shadow-xs">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            {/* A-Z Rail Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={scrollToTop}
                title="Scroll to top"
                className={cn(
                  "h-7 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1",
                  !activeLetter
                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <ArrowUp className="size-3" />
                <span>All</span>
              </button>

              <div className="h-4 w-px bg-border/60 shrink-0 mx-1" />

              {ALPHABET.map((char) => {
                const count = letterCounts[char] ?? 0;
                const hasFacilities = count > 0;
                const isSelected = activeLetter === char;

                return (
                  <button
                    key={char}
                    type="button"
                    disabled={!hasFacilities}
                    onClick={() => scrollToLetter(char)}
                    title={
                      hasFacilities
                        ? `Jump to ${char} (${count} facilities)`
                        : `No facilities starting with ${char}`
                    }
                    className={cn(
                      "size-7 rounded-lg text-xs font-mono font-medium shrink-0 transition-all cursor-pointer flex items-center justify-center relative",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold shadow-xs scale-105"
                        : hasFacilities
                        ? "text-foreground/90 hover:text-foreground hover:bg-muted/80 hover:scale-105 active:scale-95"
                        : "text-muted-foreground/30 cursor-not-allowed select-none"
                    )}
                  >
                    <span>{char}</span>
                    {hasFacilities && count > 1 && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 size-1.5 rounded-full",
                          isSelected ? "bg-white" : "bg-emerald-500"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick summary & Reset filters */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0 pl-2 text-xs text-muted-foreground font-mono">
              <span className="tabular-nums">
                {filtered.length} of {facilities.length}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    updateUrlParams({ q: null, status: null, city: null });
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-sans hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area: Grid or List with Crossfade Transition */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${statusFilter}-${cityFilter}-${viewMode}`}
            initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
                    ? `No facility matches "${debouncedSearch.trim()}". Try searching by a different name, fax digits, or city.`
                    : cityFilter !== "all"
                    ? `No facilities found in ${cityFilter}. Try clearing the city filter.`
                    : "Try adjusting the status filter."
                }
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map((f, i) => {
                  const firstChar = f.name.trim()[0]?.toUpperCase() || "#";
                  const prevChar = i > 0 ? filtered[i - 1].name.trim()[0]?.toUpperCase() || "#" : null;
                  const isNewSection = !debouncedSearch.trim() && firstChar !== prevChar;

                  return (
                    <React.Fragment key={f.id}>
                      {isNewSection && (
                        <div
                          id={`facility-letter-${firstChar}`}
                          className="col-span-full pt-4 pb-1 scroll-mt-28 flex items-center gap-3"
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
                        </div>
                      )}
                      <FacilityCard
                        f={f}
                        isAdmin={isAdmin}
                        setEditing={setEditing}
                        setDialogOpen={setDialogOpen}
                        setDeleteTarget={setDeleteTarget}
                        upsert={upsert}
                        deleteFacility={deleteFacility}
                        searchQuery={debouncedSearch}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5" role="list" aria-label="Facilities list">
                {filtered.map((f, i) => {
                  const firstChar = f.name.trim()[0]?.toUpperCase() || "#";
                  const prevChar = i > 0 ? filtered[i - 1].name.trim()[0]?.toUpperCase() || "#" : null;
                  const isNewSection = !debouncedSearch.trim() && firstChar !== prevChar;

                  return (
                    <React.Fragment key={f.id}>
                      {isNewSection && (
                        <div
                          id={`facility-letter-${firstChar}`}
                          className="pt-4 pb-1 scroll-mt-28 flex items-center gap-3"
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
                        </div>
                      )}
                      <FacilityRow
                        f={f}
                        isAdmin={isAdmin}
                        setEditing={setEditing}
                        setDialogOpen={setDialogOpen}
                        setDeleteTarget={setDeleteTarget}
                        upsert={upsert}
                        deleteFacility={deleteFacility}
                        searchQuery={debouncedSearch}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </motion.div>
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
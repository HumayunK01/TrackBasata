import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Skeleton from "react-loading-skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useProfile, useProfilesMap } from "@/hooks/useProfile";
import { useDebouncedValue } from "@/hooks/useDebounce";
import {
  formatDuration,
  formatTime12h,
  isOvernightWindow,
  useDeleteOvertimeLog,
  useOvertimeLogs,
  type OvertimeLog,
} from "@/hooks/useOvertimeLogs";
import { formatDayName, formatTableDate, isoDate } from "@/types/log";
import {
  copyOvertimeEntry,
  downloadOvertimeCSV,
  downloadOvertimeJSON,
  downloadOvertimePDF,
} from "@/lib/overtime-utils";
import { EmptyState, FigHeader } from "@/components/ar/industrial";
import { StatCard } from "@/components/ar/tracker/StatCard";
import { SortHeader } from "@/components/ar/tracker/SortHeader";
import {
  getWorkerInitials,
  getWorkerName,
  pageNumbersArr,
} from "@/components/ar/tracker/tracker-helpers";
import { HighlightText } from "@/components/ar/HighlightText";
import { Pagination } from "@/components/Pagination";
import { OvertimeEntryDialog } from "@/components/ar/overtime/OvertimeEntryDialog";
import { OvertimeCard } from "@/components/ar/overtime/OvertimeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileJson,
  FileText,
  FileType,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ScopeFilter = "all" | "mine" | "month";
type OvertimeSortKey = "ot_date" | "duration_minutes" | "added_by";

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;
type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];
const DEFAULT_PAGE_SIZE: PageSize = 10;
const PAGE_SIZE_KEY = "overtime-page-size";

const OvertimePage = () => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();
  const { data: profilesMap = {} } = useProfilesMap();
  const { data: rawRows, isLoading, isError, error } = useOvertimeLogs();
  const rows = useMemo(() => {
    const list = Array.isArray(rawRows) ? rawRows : [];
    if (isAdmin) return list;
    return user?.id ? list.filter((r) => r.created_by === user.id) : [];
  }, [rawRows, isAdmin, user?.id]);
  const deleteLog = useDeleteOvertimeLog();
  const reduce = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUserName = useMemo(
    () =>
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0] ||
      "",
    [profile, user],
  );

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, val] of Object.entries(updates)) {
            if (val === null || val === undefined || val === "") {
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

  // Scope filter (?scope=all|mine|month)
  const scopeFilter: ScopeFilter = useMemo(() => {
    const raw = searchParams.get("scope")?.toLowerCase();
    if (raw === "month") return "month";
    if (raw === "mine" && isAdmin) return "mine";
    return "all";
  }, [searchParams, isAdmin]);

  const setScopeFilter = (scope: ScopeFilter) => {
    updateUrlParams({ scope: scope === "all" ? null : scope, page: null });
  };

  // Team member filter (?member=<userId>, admin only)
  const memberFilter = isAdmin ? (searchParams.get("member") ?? "") : "";
  const setMemberFilter = (memberId: string) => {
    updateUrlParams({ member: memberId || null, page: null });
  };

  // Search (?q=...)
  const urlQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(search, 200);

  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === urlQuery) return;
    const t = setTimeout(() => {
      updateUrlParams({ q: trimmed || null, page: null });
    }, 250);
    return () => clearTimeout(t);
  }, [search, urlQuery, updateUrlParams]);

  // Pagination
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
  const handlePageChange = (p: number) => {
    updateUrlParams({ page: p > 1 ? String(p) : null });
  };

  const pageSize: PageSize = useMemo(() => {
    const raw = searchParams.get("limit");
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (ALLOWED_PAGE_SIZES.includes(parsed as PageSize)) return parsed as PageSize;
    }
    try {
      const saved = localStorage.getItem(PAGE_SIZE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (ALLOWED_PAGE_SIZES.includes(parsed as PageSize)) return parsed as PageSize;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_PAGE_SIZE;
  }, [searchParams]);

  const handlePageSizeChange = (n: number) => {
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(n));
    } catch {
      /* ignore */
    }
    updateUrlParams({ limit: n === DEFAULT_PAGE_SIZE ? null : String(n), page: null });
  };

  // Sorting & Dialog states
  const [sort, setSort] = useState<{ key: OvertimeSortKey; dir: "asc" | "desc" } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OvertimeLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OvertimeLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Keyboard shortcut: N to add OT entry (matching DailyLogPage)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) {
        return;
      }
      if (dialogOpen || deleteTarget) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setEditing(null);
        setDialogOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, deleteTarget]);

  const currentMonthPrefix = useMemo(() => isoDate().slice(0, 7), []);

  const addedByFor = useCallback(
    (r: OvertimeLog) => getWorkerName(r.created_by, profilesMap, user?.id, currentUserName),
    [profilesMap, user?.id, currentUserName],
  );

  // Distinct team members from OT logs (admin only)
  const distinctMembers = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.created_by && !map.has(r.created_by)) {
        map.set(r.created_by, addedByFor(r));
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isAdmin, rows, addedByFor]);

  // Overview KPI stats
  const overview = useMemo(() => {
    let totalMinutes = 0;
    let myMinutes = 0;
    let myCount = 0;
    let monthMinutes = 0;
    let monthCount = 0;

    for (const r of rows) {
      totalMinutes += r.duration_minutes;
      if (user?.id && r.created_by === user.id) {
        myMinutes += r.duration_minutes;
        myCount++;
      }
      if (r.ot_date.startsWith(currentMonthPrefix)) {
        monthMinutes += r.duration_minutes;
        monthCount++;
      }
    }

    const avgSessionMinutes =
      rows.length > 0 ? Math.round(totalMinutes / rows.length) : 0;

    return {
      totalCount: rows.length,
      totalMinutes,
      avgSessionMinutes,
      myMinutes,
      myCount,
      monthMinutes,
      monthCount,
    };
  }, [rows, user?.id, currentMonthPrefix]);

  // Filtered & sorted rows
  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (scopeFilter === "mine" && r.created_by !== user?.id) return false;
      if (scopeFilter === "month" && !r.ot_date.startsWith(currentMonthPrefix)) return false;
      if (memberFilter && r.created_by !== memberFilter) return false;
      if (q) {
        const addedBy = isAdmin ? addedByFor(r).toLowerCase() : "";
        const match =
          (r.notes ?? "").toLowerCase().includes(q) ||
          r.ot_date.includes(q) ||
          formatTableDate(r.ot_date).toLowerCase().includes(q) ||
          formatDayName(r.ot_date).toLowerCase().includes(q) ||
          formatTime12h(r.start_time).toLowerCase().includes(q) ||
          formatTime12h(r.end_time).toLowerCase().includes(q) ||
          (isAdmin && addedBy.includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (!sort) return list;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "ot_date") {
        const cmp = a.ot_date.localeCompare(b.ot_date);
        if (cmp !== 0) return cmp * dir;
        return a.start_time.localeCompare(b.start_time) * dir;
      }
      if (sort.key === "duration_minutes") {
        return (a.duration_minutes - b.duration_minutes) * dir;
      }
      return addedByFor(a).localeCompare(addedByFor(b), undefined, { sensitivity: "base" }) * dir;
    });
  }, [rows, scopeFilter, memberFilter, debouncedSearch, sort, user?.id, currentMonthPrefix, addedByFor, isAdmin]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      handlePageChange(totalPages);
    }
  }, [page, totalPages]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );
  const pageNumbers = useMemo(() => pageNumbersArr(totalPages, page), [totalPages, page]);

  const toggleSort = (key: OvertimeSortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const hasActiveFilters =
    search.trim() !== "" || scopeFilter !== "all" || memberFilter !== "";

  const clearAllFilters = () => {
    setSearch("");
    updateUrlParams({ scope: null, member: null, q: null, page: null });
  };

  const handleCopy = async (row: OvertimeLog) => {
    const ok = await copyOvertimeEntry(row);
    if (ok) {
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((prev) => (prev === row.id ? null : prev)), 1500);
    }
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const selectedMemberName = memberFilter
        ? distinctMembers.find((m) => m.id === memberFilter)?.name
        : null;
      const subtitle = [
        !isAdmin
          ? scopeFilter === "month"
            ? "Scope: This Month (My OT)"
            : "Scope: My Overtime"
          : scopeFilter === "mine"
          ? "Scope: My Entries"
          : scopeFilter === "month"
          ? "Scope: This Month (Team)"
          : "Scope: All Team Entries",
        selectedMemberName ? `Added By: ${selectedMemberName}` : null,
        search.trim() ? `Search: "${search.trim()}"` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");

      const filename = `overtime-report-${isoDate()}.pdf`;
      await downloadOvertimePDF(filtered, filename, {
        subtitle,
        userName: currentUserName || user?.email,
        addedBy: isAdmin ? addedByFor : undefined,
      });
      toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? "entry" : "entries"} to ${filename}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const canModifyRow = (row: OvertimeLog) =>
    isAdmin || (!!user?.id && row.created_by === user.id);

  const colCount = isAdmin ? 6 : 5;

  return (
    <>
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1] [overscroll-behavior-y:contain]">
        <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
          {/* ── Section 1: Overtime Overview ── */}
          <section className="space-y-3.5">
            <FigHeader
              title={isAdmin ? "Team Overtime Overview" : "My Overtime Overview"}
              sub={
                isAdmin
                  ? `${overview.totalCount} total ${overview.totalCount === 1 ? "session" : "sessions"} · ${formatDuration(overview.totalMinutes)} logged across team`
                  : `${overview.totalCount} total ${overview.totalCount === 1 ? "session" : "sessions"} · ${formatDuration(overview.totalMinutes)} logged`
              }
            />
            <div
              className={cn(
                "grid gap-3.5",
                isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-3",
              )}
            >
              <StatCard
                label={isAdmin ? "Total Team OT" : "My Total OT"}
                value={overview.totalMinutes}
                displayValue={formatDuration(overview.totalMinutes)}
                unit={`${overview.totalCount} ${overview.totalCount === 1 ? "entry" : "entries"}`}
                tone="neutral"
                loading={isLoading}
                active={scopeFilter === "all"}
                footerLabel={scopeFilter === "all" ? "Showing all entries" : "Click to show all"}
                onClick={scopeFilter !== "all" ? () => setScopeFilter("all") : undefined}
              />
              {isAdmin && (
                <StatCard
                  label="My OT Hours"
                  value={overview.myMinutes}
                  displayValue={formatDuration(overview.myMinutes)}
                  unit={`${overview.myCount} ${overview.myCount === 1 ? "entry" : "entries"}`}
                  tone="emerald"
                  loading={isLoading}
                  active={scopeFilter === "mine"}
                  footerLabel={scopeFilter === "mine" ? "Active filter" : "Click to filter mine"}
                  onClick={() => setScopeFilter(scopeFilter === "mine" ? "all" : "mine")}
                />
              )}
              <StatCard
                label="This Month"
                value={overview.monthMinutes}
                displayValue={formatDuration(overview.monthMinutes)}
                unit={`${overview.monthCount} ${overview.monthCount === 1 ? "entry" : "entries"}`}
                tone="sky"
                loading={isLoading}
                active={scopeFilter === "month"}
                footerLabel={scopeFilter === "month" ? "Active filter" : "Click to filter month"}
                onClick={() => setScopeFilter(scopeFilter === "month" ? "all" : "month")}
              />
              <StatCard
                label="Avg / Session"
                value={overview.avgSessionMinutes}
                displayValue={formatDuration(overview.avgSessionMinutes)}
                unit="per shift"
                tone={isAdmin ? "slate" : "emerald"}
                loading={isLoading}
                footerLabel={
                  isAdmin
                    ? `${distinctMembers.length} ${distinctMembers.length === 1 ? "member" : "members"} logged OT`
                    : "Average OT duration"
                }
              />
            </div>
          </section>

          {/* ── Section 2: Overtime Records ── */}
          <section className="space-y-4">
            <FigHeader
              title={isAdmin ? "Team Overtime Logs" : "My Overtime Logs"}
              sub={`${filtered.length} matching ${filtered.length === 1 ? "entry" : "entries"}`}
            />

            {/* Unified Command Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Scope Segmented Filter */}
              <div
                role="tablist"
                aria-label="Filter overtime logs"
                className="inline-flex h-10 items-center gap-0.5 rounded-xl bg-card/80 dark:bg-black/35 p-1 border border-border/70 shadow-2xs text-xs shrink-0"
              >
                {(isAdmin
                  ? ([
                      { id: "all", label: "All Team", count: overview.totalCount },
                      { id: "mine", label: "Mine", count: overview.myCount },
                      { id: "month", label: "This Month", count: overview.monthCount },
                    ] as const)
                  : ([
                      { id: "all", label: "All", count: overview.totalCount },
                      { id: "month", label: "This Month", count: overview.monthCount },
                    ] as const)
                ).map((tab) => {
                  const active = scopeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setScopeFilter(tab.id)}
                      className={cn(
                        "relative z-0 h-full px-2.5 sm:px-3 rounded-lg font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 select-none",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="overtime-scope-pill"
                          className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-2xs -z-10"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 420, damping: 32 }
                          }
                        />
                      )}
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          "text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-md transition-colors",
                          active
                            ? "bg-primary/15 text-primary font-semibold"
                            : "bg-muted/70 text-muted-foreground/80",
                        )}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Team Member Filter Dropdown (Admin Only) */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "group h-10 shrink-0 max-w-[14rem] rounded-xl border-border/65 bg-card/80 hover:bg-muted/70 data-[state=open]:bg-muted/80 shadow-2xs gap-1.5 cursor-pointer text-xs",
                        memberFilter
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "text-foreground font-medium",
                      )}
                    >
                      <Users className="size-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {memberFilter
                          ? distinctMembers.find((m) => m.id === memberFilter)?.name ?? "Member"
                          : "All Members"}
                      </span>
                      <ChevronDown className="size-3.5 opacity-70 shrink-0 ml-0.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-60 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl p-1.5 max-h-72 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                      Filter by added by
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={() => setMemberFilter("")}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <span>All Members</span>
                      {!memberFilter && <Check className="size-3.5 text-emerald-500" />}
                    </DropdownMenuItem>
                    {distinctMembers.length > 0 && <DropdownMenuSeparator className="my-1" />}
                    {distinctMembers.map((m) => {
                      const active = memberFilter === m.id;
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => setMemberFilter(m.id)}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          <span className="truncate">{m.name}</span>
                          {active && <Check className="size-3.5 text-emerald-500 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Search Input */}
              <div className="group relative flex-1 min-w-48">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors duration-200 pointer-events-none" />
                <Input
                  placeholder={
                    isAdmin
                      ? "Search member, date, time, or notes…"
                      : "Search date, time, or notes…"
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-10 rounded-xl bg-card/80 border-border/65 focus-visible:bg-background/90 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 text-xs sm:text-sm font-medium shadow-2xs"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      type="button"
                      onClick={() => {
                        setSearch("");
                        updateUrlParams({ q: null, page: null });
                      }}
                      title="Clear search"
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 shrink-0 text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium gap-1.5 cursor-pointer"
                  onClick={clearAllFilters}
                >
                  <X className="size-4" /> Clear all
                </Button>
              )}

              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filtered.length === 0 || exportingPdf}
                    className="group h-10 px-3.5 rounded-xl font-semibold border-border/65 bg-card/80 hover:bg-muted/70 text-foreground shrink-0 text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {exportingPdf ? (
                      <Loader2 className="size-4 animate-spin text-emerald-500" />
                    ) : (
                      <Download className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                    <span>{exportingPdf ? "Exporting…" : "Export"}</span>
                    <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 p-1.5 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl space-y-0.5"
                >
                  <DropdownMenuLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase px-2.5 py-1.5">
                    Export {filtered.length} {filtered.length === 1 ? "Entry" : "Entries"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() =>
                      downloadOvertimeCSV(
                        filtered,
                        isAdmin ? addedByFor : undefined,
                        `overtime-logs-${isoDate()}.csv`,
                      )
                    }
                    className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs"
                  >
                    <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center shrink-0">
                      <FileText className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">CSV Spreadsheet</p>
                      <p className="text-[10px] text-muted-foreground">Excel, Google Sheets (.csv)</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      downloadOvertimeJSON(
                        filtered,
                        isAdmin ? addedByFor : undefined,
                        `overtime-logs-${isoDate()}.json`,
                      )
                    }
                    className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs"
                  >
                    <div className="size-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 grid place-items-center shrink-0">
                      <FileJson className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">JSON Dataset</p>
                      <p className="text-[10px] text-muted-foreground">Structured backup (.json)</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportPDF}
                    className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs"
                  >
                    <div className="size-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 grid place-items-center shrink-0">
                      <FileType className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">PDF Report</p>
                      <p className="text-[10px] text-muted-foreground">Formatted print summary (.pdf)</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Primary CTA: Add OT */}
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
                className="group h-10 px-4 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs shadow-emerald-600/20 cursor-pointer text-xs gap-1.5 active:scale-[0.97] transition-all"
              >
                <Plus className="size-4 transition-transform duration-200 group-hover:rotate-90" />
                <span>Add OT</span>
                <kbd className="ml-0.5 text-[10px] font-mono border border-white/25 bg-white/15 rounded px-1.5 py-0.2 hidden sm:inline">
                  N
                </kbd>
              </Button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-card/80 border border-border/65 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <Table className="w-full text-xs [&_tbody_tr]:border-0">
                  <TableHeader className="bg-muted/40 border-b border-border/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 py-3 text-left w-40">
                        <SortHeader
                          label="OT Date"
                          sortKey="ot_date"
                          sort={sort}
                          onSort={toggleSort}
                          align="left"
                        />
                      </TableHead>
                      <TableHead className="px-3 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground w-52">
                        Overtime Window
                      </TableHead>
                      <TableHead className="px-3 py-3 text-center w-28">
                        <SortHeader
                          label="Duration"
                          sortKey="duration_minutes"
                          sort={sort}
                          onSort={toggleSort}
                          align="center"
                        />
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="px-3 py-3 text-left w-44">
                          <SortHeader
                            label="Added by"
                            sortKey="added_by"
                            sort={sort}
                            onSort={toggleSort}
                            align="left"
                          />
                        </TableHead>
                      )}
                      <TableHead className="px-4 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                        Notes
                      </TableHead>
                      <TableHead className="px-3 py-3 text-center w-20" aria-label="Actions" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={colCount} className="px-4 py-3">
                            <Skeleton height={28} borderRadius={8} />
                          </td>
                        </tr>
                      ))
                    ) : isError ? (
                      <TableRow>
                        <TableCell colSpan={colCount} className="px-4">
                          <EmptyState
                            className="py-14"
                            icon={Clock}
                            title="Unable to Load Overtime Logs"
                            hint={
                              error instanceof Error
                                ? error.message
                                : "Could not load overtime entries. Please check your connection or database migration."
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={colCount} className="px-4">
                          <EmptyState
                            className="py-14"
                            icon={Clock}
                            title={
                              rows.length === 0
                                ? "No Overtime Entries Yet"
                                : "No Matching Overtime Entries"
                            }
                            hint={
                              rows.length === 0
                                ? "Record your overtime date, window, and notes."
                                : "Try clearing your search or switching the active filter."
                            }
                            action={
                              rows.length === 0 ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditing(null);
                                    setDialogOpen(true);
                                  }}
                                  className="h-9 gap-1.5 rounded-xl cursor-pointer"
                                >
                                  <Plus className="size-4" /> Log first OT entry
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={clearAllFilters}
                                  className="h-8 text-xs rounded-xl cursor-pointer"
                                >
                                  Clear filters
                                </Button>
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((row) => {
                        const addedByName = addedByFor(row);
                        const initials = getWorkerInitials(addedByName);
                        const isMe = !!user?.id && row.created_by === user.id;
                        const canModify = canModifyRow(row);
                        const overnight = isOvernightWindow(row.start_time, row.end_time);

                        return (
                          <TableRow
                            key={row.id}
                            className="transition-colors hover:bg-muted/20 group"
                          >
                            <TableCell className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold tabular-nums text-foreground">
                                  {formatTableDate(row.ot_date)}
                                </span>
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded uppercase tracking-wider font-heading bg-muted/60 text-muted-foreground border border-border/40">
                                  {formatDayName(row.ot_date)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="px-3 py-2.5 font-mono tabular-nums text-foreground/90 whitespace-nowrap">
                              <span>
                                {formatTime12h(row.start_time)} → {formatTime12h(row.end_time)}
                              </span>
                              {overnight && (
                                <span className="ml-1.5 text-[10px] text-amber-500 font-semibold">
                                  +1d
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 tabular-nums">
                                {formatDuration(row.duration_minutes)}
                              </span>
                            </TableCell>

                            {isAdmin && (
                              <TableCell className="px-3 py-2.5 max-w-[12rem] truncate">
                                <div
                                  className="inline-flex items-center gap-1.5 min-w-0 max-w-full"
                                  title={`Added by ${addedByName}`}
                                >
                                  <span
                                    className={cn(
                                      "size-5 rounded-full font-mono text-[9px] font-bold flex items-center justify-center shrink-0 border select-none",
                                      isMe
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                        : "bg-muted border-border/80 text-muted-foreground",
                                    )}
                                  >
                                    {initials}
                                  </span>
                                  <span className="truncate text-xs font-medium text-foreground/90">
                                    <HighlightText text={addedByName} query={debouncedSearch} />
                                  </span>
                                </div>
                              </TableCell>
                            )}

                            <TableCell className="px-4 py-2.5 text-muted-foreground max-w-[22rem] truncate">
                              {row.notes ? (
                                <span title={row.notes}>
                                  <HighlightText text={row.notes} query={debouncedSearch} />
                                </span>
                              ) : (
                                <span className="font-mono text-muted-foreground/35">—</span>
                              )}
                            </TableCell>

                            <TableCell className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                                  onClick={() => void handleCopy(row)}
                                  title="Copy OT details"
                                >
                                  {copiedId === row.id ? (
                                    <Check className="size-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </Button>
                                {canModify && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                        aria-label="Entry options"
                                      >
                                        <MoreVertical className="size-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-36 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5"
                                    >
                                      <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium hover:bg-muted rounded-xl transition-colors cursor-pointer text-foreground"
                                        onClick={() => {
                                          setEditing(row);
                                          setDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="size-3.5" /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                                        onClick={() => setDeleteTarget(row)}
                                      >
                                        <Trash2 className="size-3.5" /> Delete
                                      </button>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs space-y-2.5"
                  >
                    <Skeleton height={20} width="60%" borderRadius={6} />
                    <Skeleton height={84} borderRadius={10} />
                  </div>
                ))
              ) : isError ? (
                <div className="rounded-2xl border border-border/65 bg-card/80 p-4">
                  <EmptyState
                    icon={Clock}
                    title="Unable to Load Overtime Logs"
                    hint={
                      error instanceof Error
                        ? error.message
                        : "Could not load overtime entries. Please check your connection or database migration."
                    }
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-border/65 bg-card/80 p-4">
                  <EmptyState
                    icon={Clock}
                    title={
                      rows.length === 0
                        ? "No Overtime Entries Yet"
                        : "No Matching Overtime Entries"
                    }
                    hint={
                      rows.length === 0
                        ? "Tap Add OT to record your extra shift hours."
                        : "Try clearing your search or switching the active filter."
                    }
                    action={
                      rows.length === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditing(null);
                            setDialogOpen(true);
                          }}
                          className="h-9 gap-1.5 rounded-xl cursor-pointer"
                        >
                          <Plus className="size-4" /> Log first OT entry
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-8 text-xs rounded-xl cursor-pointer"
                        >
                          Clear filters
                        </Button>
                      )
                    }
                  />
                </div>
              ) : (
                paginated.map((row) => (
                  <OvertimeCard
                    key={row.id}
                    row={row}
                    addedByName={addedByFor(row)}
                    showAddedBy={isAdmin}
                    isMe={!!user?.id && row.created_by === user.id}
                    canModify={canModifyRow(row)}
                    isCopied={copiedId === row.id}
                    searchQuery={debouncedSearch}
                    onCopy={(r) => void handleCopy(r)}
                    onEdit={(r) => {
                      setEditing(r);
                      setDialogOpen(true);
                    }}
                    onDelete={setDeleteTarget}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                pageNumbers={pageNumbers}
                onPageChange={handlePageChange}
                showFirstLast
                itemsPerPage={pageSize}
                onItemsPerPageChange={handlePageSizeChange}
                entityLabel="entries"
              />
            )}
          </section>
        </div>
      </main>

      {/* Add / Edit OT Dialog */}
      <OvertimeEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Delete overtime entry?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This permanently removes the{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget ? formatDuration(deleteTarget.duration_minutes) : ""}
              </span>{" "}
              OT log on{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget ? formatTableDate(deleteTarget.ot_date) : ""}
              </span>
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm font-semibold cursor-pointer"
              onClick={() => {
                if (deleteTarget) deleteLog.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OvertimePage;

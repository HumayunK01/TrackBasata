import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { useFaxTracker, useDeleteFax, useUpdateStep as useFaxUpdateStep } from "@/hooks/useFaxTracker";
import { useIndexableTracker, useDeleteIndexable, useUpdateStep as useIndexableUpdateStep } from "@/hooks/useIndexableTracker";
import { useFaxAccounts, useDeleteFaxAccount, type FaxAccount } from "@/hooks/useFaxAccounts";
import { EmptyState } from "@/components/ar/industrial";
import { FaxEntryDialog } from "@/components/ar/fax/FaxEntryDialog";
import { IndexableEntryDialog } from "@/components/ar/indexable/IndexableEntryDialog";
import { NewAccountDialog } from "@/components/ar/fax/NewAccountDialog";
import { RenameAccountDialog } from "@/components/ar/fax/RenameAccountDialog";
import { StepCell } from "@/components/ar/tracker/StepCell";
import { StatusIcon } from "@/components/ar/tracker/StepPicker";
import { FaxCard } from "@/components/ar/tracker/FaxCard";
import { SortHeader } from "@/components/ar/tracker/SortHeader";
import type { SortKey } from "@/components/ar/tracker/SortHeader";
import { StatCard } from "@/components/ar/tracker/StatCard";
import { Pagination } from "@/components/Pagination";
import { copyName, displayStatus, statusGroup,
  stepLabels, pageNumbersArr, STATUS_GROUPS, type TrackerMode,
} from "@/components/ar/tracker/tracker-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Search, ListFilter, FileWarning, MoreVertical, X, Check, ChevronDown, Users, Download, Loader2, FileText, Copy, FileCheck } from "@/components/ui/icons";
import { toast } from "sonner";
import { exportTrackerServer, downloadTrackerPDF, getTrackerReportFilename, FAX_PDF_CONFIG, INDEXABLE_PDF_CONFIG } from "@/lib/tracker-utils";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";

const ACCOUNT_KEY = "fax-tracker-account";
const MODE_KEY = "tracker-mode";
const STATUS_FILTER_KEY = "tracker-status-filter";
const PAGE_SIZE_KEY = "tracker-page-size";
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;
type PageSize = (typeof ALLOWED_PAGE_SIZES)[number];

const MODES: { id: TrackerMode; label: string }[] = [
  { id: "fax", label: "Fax" },
  { id: "indexable", label: "Indexable" },
];

function parseStatuses(raw: string | null): Set<string> {
  if (!raw) return new Set();
  const parts = raw.split(",").map((s) => s.trim().toLowerCase());
  const valid = new Set<string>();
  for (const group of STATUS_GROUPS) {
    if (parts.includes(group.toLowerCase())) {
      valid.add(group);
    }
  }
  return valid;
}

const FaxTrackerPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: accounts = [], isLoading: accountsLoading } = useFaxAccounts();

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

  const mode: TrackerMode = useMemo(() => {
    const m = searchParams.get("mode")?.toLowerCase();
    if (m === "indexable" || m === "fax") return m as TrackerMode;
    const saved = localStorage.getItem(MODE_KEY) as TrackerMode | null;
    if (saved === "indexable" || saved === "fax") return saved;
    return "fax";
  }, [searchParams]);

  const handleModeChange = (newMode: TrackerMode) => {
    localStorage.setItem(MODE_KEY, newMode);
    updateUrlParams({
      mode: newMode === "fax" ? null : newMode,
      page: null,
    });
  };

  const deleteAccount = useDeleteFaxAccount();
  const [accountId, setAccountId] = useState<string | null>(() => localStorage.getItem(ACCOUNT_KEY));
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<FaxAccount | null>(null);
  const [accountToRename, setAccountToRename] = useState<FaxAccount | null>(null);

  useEffect(() => {
    if (accountsLoading || accounts.length === 0) return;

    const urlAccount = searchParams.get("account")?.trim();
    let targetAccount: FaxAccount | undefined;

    if (urlAccount) {
      targetAccount = accounts.find(
        (a) => a.id === urlAccount || a.name.toLowerCase() === urlAccount.toLowerCase(),
      );
    }

    if (!targetAccount && accountId) {
      targetAccount = accounts.find((a) => a.id === accountId);
    }

    if (!targetAccount) {
      const savedId = localStorage.getItem(ACCOUNT_KEY);
      targetAccount = accounts.find((a) => a.id === savedId) ?? accounts[0];
    }

    if (targetAccount) {
      if (targetAccount.id !== accountId) {
        setAccountId(targetAccount.id);
      }
      localStorage.setItem(ACCOUNT_KEY, targetAccount.id);
      // Keep URL parameter synchronized using human-friendly account name
      if (urlAccount !== targetAccount.name && urlAccount !== targetAccount.id) {
        updateUrlParams({ account: targetAccount.name });
      }
    }
  }, [accounts, accountsLoading, searchParams, accountId, updateUrlParams]);

  const handleSelectAccount = (a: FaxAccount) => {
    setAccountId(a.id);
    localStorage.setItem(ACCOUNT_KEY, a.id);
    updateUrlParams({ account: a.name, page: null });
  };

  useEffect(() => {
    setEditing(null);
    setDeleteTarget(null);
    seenIds.current = null;
  }, [mode]);

  const activeAccount = accounts.find((a) => a.id === accountId) ?? null;
  const isFax = mode === "fax";

  const faxQuery = useFaxTracker(isFax ? (accountId ?? undefined) : undefined);
  const indexableQuery = useIndexableTracker(isFax ? undefined : (accountId ?? undefined));
  const { data: rows = [], isLoading } = isFax ? faxQuery : indexableQuery;

  const deleteFax = useDeleteFax();
  const deleteIndexable = useDeleteIndexable();
  const updateFaxStep = useFaxUpdateStep();
  const updateIndexableStep = useIndexableUpdateStep();
  const deleteRow = isFax ? deleteFax : deleteIndexable;

  const pickStep = (row: FaxRow, field: StepField, value: FaxStepStatus) => {
    if (isFax) updateFaxStep.mutate({ row, field, value });
    else updateIndexableStep.mutate({ row, field, value });
  };

  const labels = stepLabels(mode);

  const [search, setSearch] = useState(() => searchParams.get("q") ?? searchParams.get("search") ?? "");

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? searchParams.get("search") ?? "";
    if (urlQ !== search) {
      setSearch(urlQ);
    }
  }, [searchParams]);

  useEffect(() => {
    const currentUrlQ = searchParams.get("q") ?? searchParams.get("search") ?? "";
    const trimmed = search.trim();
    if (trimmed === currentUrlQ) return;

    const t = setTimeout(() => {
      updateUrlParams({ q: trimmed || null, page: null });
    }, 250);
    return () => clearTimeout(t);
  }, [search, searchParams, updateUrlParams]);

  const statusFilter = useMemo(() => {
    const raw = searchParams.get("status");
    if (raw !== null) {
      return parseStatuses(raw);
    }
    try {
      const rawLocal = localStorage.getItem(STATUS_FILTER_KEY);
      if (rawLocal) {
        const arr = JSON.parse(rawLocal);
        if (Array.isArray(arr) && arr.length > 0) {
          return new Set(arr.filter((s: string) => (STATUS_GROUPS as readonly string[]).includes(s)));
        }
      }
    } catch {
      /* ignore */
    }
    return new Set<string>();
  }, [searchParams]);

  const toggleStatus = (s: string) => {
    const next = new Set(statusFilter);
    if (next.has(s)) next.delete(s);
    else next.add(s);

    try {
      localStorage.setItem(STATUS_FILTER_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }

    updateUrlParams({
      status: next.size > 0 ? Array.from(next).join(",") : null,
      page: null,
    });
  };

  const clearStatusFilter = () => {
    try {
      localStorage.removeItem(STATUS_FILTER_KEY);
    } catch {
      /* ignore */
    }
    updateUrlParams({ status: null, page: null });
  };

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);

  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const page = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;

  const handlePageChange = (p: number) => {
    updateUrlParams({ page: p > 1 ? String(p) : null });
  };

  const pageSize: PageSize = useMemo(() => {
    const rawParam = searchParams.get("limit") || searchParams.get("pageSize") || searchParams.get("per_page");
    if (rawParam) {
      const parsed = parseInt(rawParam, 10);
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
    const paramKey = searchParams.has("pageSize") ? "pageSize" : "limit";
    updateUrlParams({
      [paramKey]: n === DEFAULT_PAGE_SIZE ? null : String(n),
      page: null,
    });
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FaxRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaxRow | null>(null);

  const matchesFilters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (r: FaxRow) => {
      if (statusFilter.size) {
        const group = statusGroup(r.overall_status);
        if (!group || !statusFilter.has(group)) return false;
      }
      if (q && !r.patient_name.toLowerCase().includes(q) && !(r.notes ?? "").toLowerCase().includes(q)) return false;
      return true;
    };
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    const rowsFiltered = rows.filter(matchesFilters);
    if (!sort) {
      return [...rowsFiltered].sort((a, b) => {
        const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bt - at;
      });
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rowsFiltered].sort((a, b) => {
      if (sort.key === "updated_at") {
        const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return (at - bt) * dir;
      }
      const av = sort.key === "patient_name" ? a.patient_name : displayStatus(a.overall_status);
      const bv = sort.key === "patient_name" ? b.patient_name : displayStatus(b.overall_status);
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
  }, [rows, matchesFilters, sort]);

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

  const seenIds = useRef<Set<string> | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(rows.map((r) => r.id));
    if (seenIds.current === null) {
      seenIds.current = current;
      return;
    }
    const added = [...current].filter((id) => !seenIds.current!.has(id));
    seenIds.current = current;
    if (added.length === 0) return;
    setNewIds(new Set(added));
    const t = setTimeout(() => setNewIds(new Set()), 400);
    return () => clearTimeout(t);
  }, [rows]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { Resolved: 0, Failed: 0, Waiting: 0, Incomplete: 0 };
    for (const r of rows) {
      const g = statusGroup(r.overall_status);
      if (g) counts[g]++;
    }
    return counts;
  }, [rows]);

  const stats = useMemo(
    () => ({
      resolved: groupCounts.Resolved,
      allFailed: groupCounts.Failed,
      waiting: groupCounts.Waiting,
      incomplete: groupCounts.Incomplete,
      total: rows.length,
    }),
    [groupCounts, rows.length],
  );

  const hasActiveFilters = search.trim() !== "" || statusFilter.size > 0;
  const clearAll = () => {
    setSearch("");
    try {
      localStorage.removeItem(STATUS_FILTER_KEY);
    } catch {
      /* ignore */
    }
    updateUrlParams({ status: null, q: null, page: null });
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxRow) => { setEditing(row); setDialogOpen(true); };

  const EntryDialog = isFax ? FaxEntryDialog : IndexableEntryDialog;

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  const [exporting, setExporting] = useState<"csv" | "json" | "pdf" | null>(null);

  const handleExportServer = async (format: "csv" | "json") => {
    setExporting(format);
    try {
      const statuses = statusFilter.size > 0 ? Array.from(statusFilter) : undefined;
      const { count, filename } = await exportTrackerServer({
        mode,
        accountId: accountId || undefined,
        accountName: activeAccount?.name,
        statuses,
        search: search.trim() || undefined,
        format,
        sort: sort?.key === "patient_name" || sort?.key === "updated_at" || sort?.key === "overall_status" ? sort.key : undefined,
        sortDir: sort?.dir,
      });
      toast.success(`Exported ${count} ${count === 1 ? "patient" : "patients"} to ${filename}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to export tracker records";
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const subtitle = [
        activeAccount ? `Account: ${activeAccount.name}` : "All Accounts",
        statusFilter.size > 0 ? `Status: ${Array.from(statusFilter).join(", ")}` : null,
        search.trim() ? `Search: "${search.trim()}"` : null,
      ].filter(Boolean).join("  ·  ");

      const filename = getTrackerReportFilename(mode, "pdf");

      await downloadTrackerPDF(
        filtered,
        isFax ? FAX_PDF_CONFIG : INDEXABLE_PDF_CONFIG,
        filename,
        {
          subtitle,
          userName: user?.email,
        }
      );
      toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? "patient" : "patients"} to ${filename}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate PDF";
      toast.error(message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 sm:py-6">
        <div key={mode} className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              label="Resolved"
              value={stats.resolved}
              tone="emerald"
              loading={isLoading}
              active={statusFilter.has("Resolved")}
              onClick={() => toggleStatus("Resolved")}
            />
            <StatCard
              label="All Steps Failed"
              value={stats.allFailed}
              tone="rose"
              loading={isLoading}
              active={statusFilter.has("Failed")}
              onClick={() => toggleStatus("Failed")}
            />
            <StatCard
              label="Waiting"
              value={stats.waiting}
              tone="sky"
              loading={isLoading}
              active={statusFilter.has("Waiting")}
              onClick={() => toggleStatus("Waiting")}
            />
            <StatCard
              label="Incomplete"
              value={stats.incomplete}
              tone="slate"
              loading={isLoading}
              active={statusFilter.has("Incomplete")}
              onClick={() => toggleStatus("Incomplete")}
            />
            <StatCard
              label="Total Patients"
              value={stats.total}
              tone="neutral"
              loading={isLoading}
              active={statusFilter.size === 0}
              onClick={statusFilter.size > 0 ? clearStatusFilter : undefined}
            />
          </div>

          {/* Unified Command Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Mode Switcher (Fax vs Indexable) */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs h-10 shrink-0 shadow-2xs">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={cn(
                    "h-8 px-3.5 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none flex items-center justify-center font-medium",
                    mode === m.id
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Account Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 max-w-[14rem] rounded-xl border-border/50 bg-muted/40 hover:bg-muted/70 text-foreground shadow-2xs gap-1.5 cursor-pointer"
                  disabled={accountsLoading}
                >
                  <Users className="size-4 text-muted-foreground shrink-0" />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={activeAccount?.id ?? "none"}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="truncate font-semibold text-xs"
                    >
                      {activeAccount?.name ?? (accountsLoading ? "Loading…" : "No account")}
                    </motion.span>
                  </AnimatePresence>
                  <ChevronDown className="size-3.5 opacity-70 shrink-0 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl p-1.5">
                <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Switch account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {sortedAccounts.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => handleSelectAccount(a)}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {a.id === accountId ? (
                        <Check className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="truncate">{a.name}</span>
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        title={`Rename ${a.name}`}
                        onClick={(e) => { e.stopPropagation(); setAccountToRename(a); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Delete ${a.name}`}
                        onClick={(e) => { e.stopPropagation(); setAccountToDelete(a); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => setAccountDialogOpen(true)}
                  className="text-primary rounded-lg px-2 py-1.5 text-xs font-semibold cursor-pointer focus:text-primary"
                >
                  <Plus className="size-3.5 mr-1.5" /> New account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search input */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search patient or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-9 h-10 rounded-xl bg-muted/40 border-border/50 focus-visible:bg-background/90 focus-visible:border-primary/50 text-xs sm:text-sm font-medium shadow-2xs transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    updateUrlParams({ q: null, page: null });
                  }}
                  title="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 shrink-0 rounded-xl border-border/50 bg-muted/40 hover:bg-muted/70 shadow-2xs text-xs font-semibold gap-1.5 cursor-pointer",
                    statusFilter.size > 0
                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 shadow-2xs"
                      : "text-foreground",
                  )}
                >
                  <ListFilter className="size-4 shrink-0 text-muted-foreground" />
                  <span>Status</span>
                  <AnimatePresence>
                    {statusFilter.size > 0 && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="size-5 rounded-full bg-primary/20 text-primary text-[10px] font-mono grid place-items-center ml-0.5"
                      >
                        {statusFilter.size}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-xl p-1.5">
                <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Filter by status
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                {STATUS_GROUPS.map((s) => {
                  const active = statusFilter.has(s);
                  return (
                    <DropdownMenuItem
                      key={s}
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => toggleStatus(s)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <span className={cn("flex items-center gap-2", active && "text-primary font-semibold")}>
                        <StatusIcon status={
                          s === "Resolved" ? "Successfully Sent"
                          : s === "Failed" ? "Failed"
                          : s === "Waiting" ? "Waiting"
                          : "Pending"
                        } />
                        <span>{s}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {active && <Check className="size-3.5 text-primary" />}
                        <span className="font-mono text-2xs text-muted-foreground tabular-nums">{groupCounts[s]}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                {statusFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <button
                      className="w-full text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={clearStatusFilter}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 shrink-0 text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium gap-1.5 animate-fade-in cursor-pointer"
                onClick={clearAll}
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
                  className={cn(
                    "group h-10 px-3.5 rounded-xl font-semibold border-border/50 bg-muted/40 hover:bg-muted/70 data-[state=open]:bg-muted/80 text-foreground shrink-0 text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                    statusFilter.size > 0 && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                  disabled={exporting !== null}
                  title="Export tracker records with active filters"
                >
                  {exporting ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <Download className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                  <span>{exporting ? "Exporting…" : "Export"}</span>
                  <ChevronDown className="size-3.5 opacity-70 ml-0.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 p-1.5 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl font-sans select-none space-y-1 z-50"
              >
                <div className="px-2.5 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                      Export {isFax ? "Fax Tracker" : "Indexable"}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                      {filtered.length} {filtered.length === 1 ? "patient" : "patients"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                    {activeAccount?.name || "All Accounts"}
                    {statusFilter.size > 0 && ` · ${Array.from(statusFilter).join(", ")}`}
                    {search.trim() && ` · "${search.trim()}"`}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-border/60 -mx-1" />
                <DropdownMenuItem
                  onClick={() => handleExportServer("csv")}
                  disabled={exporting !== null}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground tracking-tight">CSV Spreadsheet</div>
                      <div className="text-[10px] text-muted-foreground truncate">Server export with active filters</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                    .csv
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportServer("json")}
                  disabled={exporting !== null}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Copy className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground tracking-tight">JSON Dataset</div>
                      <div className="text-[10px] text-muted-foreground truncate">Structured server payload</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                    .json
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportPDF}
                  disabled={exporting !== null}
                  className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground tracking-tight">PDF Document</div>
                      <div className="text-[10px] text-muted-foreground truncate">Formatted print report</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                    .pdf
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add patient action */}
            <Button
              size="sm"
              className="h-10 px-3.5 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs shadow-primary/20 cursor-pointer text-xs gap-1.5 active:scale-[0.98] transition-all"
              onClick={openAdd}
              disabled={!accountId}
              title={!accountId ? "Create an account first" : undefined}
            >
              <Plus className="size-4" />
              <span>Add Patient</span>
            </Button>
          </div>

          {/* Patients section header */}
          <div className="flex items-center justify-between px-0.5 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-foreground">
                {isFax ? "Fax Patients" : "Indexable Patients"}
              </h3>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={filtered.length}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {filtered.length}
                </motion.span>
              </AnimatePresence>
            </div>
            {activeAccount && (
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-flex items-center gap-1.5">
                Account:{" "}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={activeAccount.id}
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="text-foreground font-semibold"
                  >
                    {activeAccount.name}
                  </motion.span>
                </AnimatePresence>
              </span>
            )}
          </div>

          {/* Patients Content Area with Smooth Crossfade Animation */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${accountId ?? "empty"}-${Array.from(statusFilter).sort().join(",")}-${mode}-${page}-${pageSize}`}
              initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              {/* Desktop Patients Table */}
          <div className="hidden md:block bg-card/60 backdrop-blur-md border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-muted/30 text-xs font-mono font-semibold tracking-wider text-muted-foreground border-b border-border/60 uppercase">
                    <th className="px-4 py-3 text-left w-[22%]">
                      <SortHeader label="Patient" sortKey="patient_name" sort={sort} onSort={toggleSort} align="left" />
                    </th>
                    <th className="px-3 py-3 text-center w-[12%]">{labels[0]}</th>
                    <th className="px-3 py-3 text-center w-[12%]">{labels[1]}</th>
                    <th className="px-3 py-3 text-center w-[12%]">{labels[2]}</th>
                    <th className="px-3 py-3 text-center w-[15%]">
                      <SortHeader label="Overall Status" sortKey="overall_status" sort={sort} onSort={toggleSort} align="center" />
                    </th>
                    <th className="px-4 py-3 text-left w-[21%]">Notes</th>
                    <th className="px-3 py-3 text-center w-[6%]" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3">
                          <Skeleton height={28} borderRadius={8} />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 animate-fade-in">
                        <EmptyState
                          className="py-14"
                          icon={FileWarning}
                          title="No Patients"
                          hint={rows.length === 0 ? "Add your first patient to start tracking." : "No patients match your current filters."}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginated.map((row) => {
                      const mine = row.created_by === user?.id;
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "transition-colors hover:bg-muted/30 group",
                            newIds.has(row.id) && "animate-row-in",
                          )}
                        >
                          <td className="px-4 py-2.5 max-w-[16rem]">
                            <button
                              type="button"
                              onClick={() => copyName(row.patient_name)}
                              title="Tap to copy patient name"
                              className="inline-flex items-center gap-2 font-semibold text-foreground rounded-lg px-1.5 py-0.5 -mx-1.5 text-left hover:bg-foreground/5 hover:text-primary active:scale-98 transition-all cursor-pointer max-w-full"
                            >
                              <img src="/pdf.png" alt="" className="size-5 shrink-0 object-contain" />
                              <span className="truncate min-w-0">{row.patient_name}</span>
                            </button>
                          </td>
                          {(["step1", "step2", "step3"] as StepField[]).map((field) => (
                            <StepCell
                              key={field}
                              row={row}
                              field={field}
                              editable={mine}
                              onPick={(value) => pickStep(row, field, value)}
                              labels={labels}
                              mode={mode}
                            />
                          ))}
                          <td className="px-3 py-2.5 text-center text-xs font-semibold text-foreground truncate">
                            <span className="inline-flex items-center justify-center gap-1.5 w-full min-w-0 overflow-hidden">
                              <span className="shrink-0">
                                <StatusIcon status={
                                  statusGroup(row.overall_status) === "Resolved" ? "Successfully Sent"
                                  : statusGroup(row.overall_status) === "Failed" ? "Failed"
                                  : statusGroup(row.overall_status) === "Waiting" ? "Waiting"
                                  : "Pending"
                                } />
                              </span>
                              <span className="truncate">{displayStatus(row.overall_status)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground max-w-[16rem] truncate text-xs font-medium" title={row.notes ?? ""}>
                            {row.notes || <span className="font-mono text-muted-foreground/40">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {mine ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" aria-label={`Edit ${row.patient_name}`}>
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36 rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl p-1.5">
                                  <button
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium hover:bg-muted rounded-xl transition-colors cursor-pointer text-foreground"
                                    onClick={() => openEdit(row)}
                                  >
                                    <Pencil className="size-3.5" /> Edit
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                                    onClick={() => setDeleteTarget(row)}
                                  >
                                    <Trash2 className="size-3.5" /> Delete
                                  </button>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono text-xs" title="Only the creator can edit this row">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Patient Cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-2xs">
                  <Skeleton height={20} width="55%" borderRadius={6} />
                  <Skeleton height={14} width="40%" borderRadius={4} className="!mt-2" />
                  <Skeleton height={64} borderRadius={8} className="!mt-3" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={FileWarning}
                title="No Patients"
                hint={rows.length === 0 ? "Add your first patient to start tracking." : "No patients match your current filters."}
              />
            ) : (
              <div className="space-y-3">
                {paginated.map((row) => (
                  <FaxCard
                    key={row.id}
                    row={row}
                    mine={row.created_by === user?.id}
                    isNew={newIds.has(row.id)}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onPickStep={(field, value) => pickStep(row, field, value)}
                    labels={labels}
                    mode={mode}
                  />
                ))}
              </div>
            )}
          </div>
          </motion.div>
        </AnimatePresence>

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
            />
          )}
        </div>
      </main>

      <EntryDialog open={dialogOpen} onOpenChange={setDialogOpen} row={editing} accountId={accountId ?? undefined} />

      <NewAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={(account) => handleSelectAccount(account)}
      />

      <RenameAccountDialog
        open={!!accountToRename}
        onOpenChange={(o) => !o && setAccountToRename(null)}
        account={accountToRename}
      />

      {/* Delete Patient Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete this patient?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This permanently removes <span className="font-semibold text-foreground">{deleteTarget?.patient_name}</span> from the {mode} tracker. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm font-semibold"
              onClick={() => {
                if (deleteTarget) deleteRow.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(o) => !o && setAccountToDelete(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl border border-border/70 bg-background/95 backdrop-blur-xl shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete account?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This deletes the account <span className="font-semibold text-foreground">{accountToDelete?.name}</span>
              {" "}and <span className="font-semibold text-destructive">all of its patients in both Fax and Indexable</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel className="rounded-xl border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm font-semibold"
              onClick={() => {
                const target = accountToDelete;
                if (!target) return;
                deleteAccount.mutate(target.id, {
                  onSuccess: () => {
                    if (target.id === accountId) {
                      const next = accounts.find((a) => a.id !== target.id);
                      if (next) {
                        handleSelectAccount(next);
                      } else {
                        setAccountId(null);
                        updateUrlParams({ account: null, page: null });
                      }
                    }
                  },
                });
                setAccountToDelete(null);
              }}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FaxTrackerPage;
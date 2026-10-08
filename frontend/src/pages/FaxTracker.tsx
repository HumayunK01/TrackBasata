import { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, Pencil, Trash2, Search, ListFilter, FileWarning, MoreVertical, X, Check, ChevronDown, Users } from "@/components/ui/icons";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import type { FaxRow, FaxStepStatus, StepField } from "@/hooks/useFaxTracker";

const ACCOUNT_KEY = "fax-tracker-account";
const MODE_KEY = "tracker-mode";
const STATUS_FILTER_KEY = "tracker-status-filter";
const DEFAULT_PAGE_SIZE = 10;

const MODES: { id: TrackerMode; label: string }[] = [
  { id: "fax", label: "Fax" },
  { id: "indexable", label: "Indexable" },
];

const FaxTrackerPage = () => {
  const { user } = useAuth();
  const { data: accounts = [], isLoading: accountsLoading } = useFaxAccounts();

  const [mode, setMode] = useState<TrackerMode>(
    () => (localStorage.getItem(MODE_KEY) as TrackerMode) || "fax",
  );
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);

  const deleteAccount = useDeleteFaxAccount();
  const [accountId, setAccountId] = useState<string | null>(() => localStorage.getItem(ACCOUNT_KEY));
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<FaxAccount | null>(null);
  const [accountToRename, setAccountToRename] = useState<FaxAccount | null>(null);

  useEffect(() => {
    if (accountsLoading || accounts.length === 0) return;
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountsLoading, accountId]);

  useEffect(() => {
    if (accountId) localStorage.setItem(ACCOUNT_KEY, accountId);
    setPage(1);
  }, [accountId]);

  useEffect(() => {
    setPage(1);
    setSearch("");
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    () => {
      try {
        const raw = localStorage.getItem(STATUS_FILTER_KEY);
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
      } catch {
        return new Set();
      }
    },
  );
  useEffect(() => {
    try { localStorage.setItem(STATUS_FILTER_KEY, JSON.stringify([...statusFilter])); } catch { /* ignore */ }
  }, [statusFilter]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
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
  const clearAll = () => { setSearch(""); setStatusFilter(new Set()); };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (row: FaxRow) => { setEditing(row); setDialogOpen(true); };

  const toggleStatus = (s: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const EntryDialog = isFax ? FaxEntryDialog : IndexableEntryDialog;

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  return (
    <>
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-5 sm:py-6">
        <div key={mode} className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard label="Resolved" value={stats.resolved} tone="emerald" loading={isLoading} />
            <StatCard label="All Steps Failed" value={stats.allFailed} tone="rose" loading={isLoading} />
            <StatCard label="Waiting" value={stats.waiting} tone="sky" loading={isLoading} />
            <StatCard label="Incomplete" value={stats.incomplete} tone="slate" loading={isLoading} />
            <StatCard label="Total Patients" value={stats.total} tone="neutral" loading={isLoading} />
          </div>

          {/* Unified Command Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Mode Switcher (Fax vs Indexable) */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs h-10 shrink-0 shadow-2xs">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
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
                  <span className="truncate font-semibold text-xs">
                    {activeAccount?.name ?? (accountsLoading ? "Loading…" : "No account")}
                  </span>
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
                    onClick={() => setAccountId(a.id)}
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
                  onClick={() => setSearch("")}
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
                  {statusFilter.size > 0 && (
                    <span className="size-5 rounded-full bg-primary/20 text-primary text-[10px] font-mono grid place-items-center ml-0.5">
                      {statusFilter.size}
                    </span>
                  )}
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
                      onClick={() => setStatusFilter(new Set())}
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
                className="h-10 shrink-0 text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium gap-1.5 animate-fade-in"
                onClick={clearAll}
              >
                <X className="size-4" /> Clear all
              </Button>
            )}

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
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {filtered.length}
              </span>
            </div>
            {activeAccount && (
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-flex items-center gap-1.5">
                Account: <span className="text-foreground font-semibold">{activeAccount.name}</span>
              </span>
            )}
          </div>

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

          {/* Pagination */}
          {!isLoading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              onPageChange={setPage}
              showFirstLast
              itemsPerPage={pageSize}
              onItemsPerPageChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          )}
        </div>
      </main>

      <EntryDialog open={dialogOpen} onOpenChange={setDialogOpen} row={editing} accountId={accountId ?? undefined} />

      <NewAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        onCreated={(account) => setAccountId(account.id)}
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
                      setAccountId(next ? next.id : null);
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
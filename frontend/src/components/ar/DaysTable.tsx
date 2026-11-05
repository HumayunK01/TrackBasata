import { useState, useMemo, useReducer } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { pageNumbersArr as sharedPageNumbers } from "@/components/ar/tracker/tracker-helpers";
import { Pagination } from "@/components/Pagination";
import {
  formatTableDate,
  formatDayName,
  groupDailyLogs,
  getLeaveBadgeClasses,
  addDaysISO,
  type DailyLog,
  type GroupedDailyLog,
} from "@/types/log";
import { useDeleteLog } from "@/hooks/useDailyLogs";
import { useCategories, type Category } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";
import { downloadCSV, downloadJSON, downloadPDF } from "@/lib/log-utils";
import {
  Trash2,
  Pencil,
  Search,
  BedDouble,
  Copy,
  Check,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  Download,
  Plus,
  ChevronDown,
  FileText,
  FileJson,
  FileType,
} from "@/components/ui/icons";
import { EmptyState } from "@/components/ar/industrial";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────
function getVal(l: Pick<DailyLog, "counts">, key: string): number {
  return (l.counts ?? {})[key] ?? 0;
}

function DateDayCell({
  startIso,
  endIso,
  dayCount = 1,
  isOff,
}: {
  startIso: string;
  endIso?: string;
  dayCount?: number;
  isOff?: boolean;
}) {
  const isRange = dayCount > 1 && endIso && endIso !== startIso;

  if (isRange) {
    return (
      <div className="flex flex-col items-center justify-center leading-tight py-1 gap-0.5">
        <div className="flex items-center gap-1 tabular-nums font-semibold text-[11px] tracking-tight text-foreground/90">
          <span>{formatTableDate(startIso)}</span>
          <ArrowRight className="size-3 text-sky-500 shrink-0" />
          <span>{formatTableDate(endIso)}</span>
        </div>
        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wider font-heading bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
          {formatDayName(startIso)} – {formatDayName(endIso)} · {dayCount}D
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center leading-tight py-1">
      <span
        className={`tabular-nums font-semibold text-xs tracking-tight ${
          isOff ? "text-muted-foreground/80" : "text-foreground"
        }`}
      >
        {formatTableDate(startIso)}
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wider font-heading bg-muted/60 text-muted-foreground border border-border/40">
        {formatDayName(startIso)}
      </span>
    </div>
  );
}

type FilterStatus = "all" | "working" | "weekends" | "off";

// ── Table Component ────────────────────────────────────────────────────────
interface DesktopTableProps {
  paginated: GroupedDailyLog[];
  categories: Category[];
  search: string;
  copiedId: string | null;
  onEdit: (l: GroupedDailyLog) => void;
  onDelete: (l: GroupedDailyLog) => void;
  onCopy: (l: GroupedDailyLog) => void;
  onClearSearch?: () => void;
}

function DesktopTable({
  paginated,
  categories,
  search,
  copiedId,
  onEdit,
  onDelete,
  onCopy,
  onClearSearch,
}: DesktopTableProps) {
  const thCls =
    "relative z-10 font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-center py-2.5 px-3 whitespace-nowrap font-heading";

  const colTotals = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c) => [
          c.key,
          paginated.reduce((s, l) => s + (l.is_off_day ? 0 : getVal(l, c.key)), 0),
        ]),
      ) as Record<string, number>,
    [paginated, categories],
  );
  const grandTotal = useMemo(
    () => Object.values(colTotals).reduce((a, b) => a + b, 0),
    [colTotals],
  );

  return (
    <div className="flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto no-scrollbar">
        <Table className="min-w-[600px] [&_tbody_tr]:border-0 text-xs">
          <TableHeader className="sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border/60 shadow-2xs">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${thCls} w-44`}>
                <span>Date</span>
              </TableHead>
              {categories.map((c) => (
                <TableHead key={c.key} title={c.label} className={thCls}>
                  <span className="block truncate">{c.short}</span>
                </TableHead>
              ))}
              <TableHead className={`${thCls} w-20`}>
                <span>Total</span>
              </TableHead>
              <TableHead className={`${thCls} w-28`}>
                <span>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={categories.length + 3} className="text-center py-12">
                  {search ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">No logs match "{search}"</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your date or search query.</p>
                      {onClearSearch && (
                        <Button variant="outline" size="sm" onClick={onClearSearch} className="h-8 text-xs cursor-pointer">
                          Clear search filter
                        </Button>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      className="py-10"
                      icon={CalendarDays}
                      title="No Days Logged Yet"
                      hint="Click 'Log day' or 'Add Leave' to record your schedule."
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
            {paginated.map((l) => {
              const total = categories.reduce((s, c) => s + getVal(l, c.key), 0);
              const isOff = l.is_off_day;
              const isMultiDay = l.day_count > 1;
              const isNamedLeave =
                l.leave_type !== "Weekend Off" && l.leave_type !== "Scheduled Off Day";
              const resumesOn = formatTableDate(addDaysISO(l.end_date, 1));

              return isOff ? (
                <TableRow
                  key={`${l.start_date}-${l.end_date}`}
                  className={cn(
                    "border-b border-border/30 transition-colors",
                    isNamedLeave || isMultiDay
                      ? "bg-sky-500/[0.04] hover:bg-sky-500/[0.08]"
                      : "bg-muted/15 hover:bg-muted/25",
                  )}
                >
                  <TableCell className="text-center py-2.5">
                    <DateDayCell
                      startIso={l.start_date}
                      endIso={l.end_date}
                      dayCount={l.day_count}
                      isOff
                    />
                  </TableCell>
                  <TableCell colSpan={categories.length + 1} className="py-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Leave Type Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                            getLeaveBadgeClasses(l.leave_type),
                          )}
                        >
                          {isNamedLeave || isMultiDay ? (
                            <CalendarRange className="size-3.5 shrink-0" />
                          ) : (
                            <BedDouble className="size-3.5 shrink-0 opacity-75" />
                          )}
                          <span>{l.leave_type}</span>
                        </span>

                        {/* Duration Pill */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-muted/60 text-foreground/80 border border-border/50">
                          {l.day_count} {l.day_count === 1 ? "Day" : "Days"}
                        </span>

                        {/* User Note */}
                        {l.clean_notes && (
                          <span
                            className="text-xs text-muted-foreground/90 italic font-normal truncate max-w-md"
                            title={l.clean_notes}
                          >
                            &ldquo;{l.clean_notes}&rdquo;
                          </span>
                        )}
                      </div>

                      {/* Continuity Indicator showing date continues right after leave */}
                      <span
                        className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/75 bg-background/60 px-2 py-0.5 rounded-md border border-border/40"
                        title={`Dates continue from ${resumesOn} after this leave`}
                      >
                        <ArrowRight className="size-2.5 text-sky-500" />
                        <span>Continues {resumesOn}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                        onClick={() => onCopy(l)}
                        title="Copy to clipboard"
                      >
                        {copiedId === l.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
                        onClick={() => onEdit(l)}
                        title={isMultiDay ? "Edit leave range" : "Edit leave"}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => onDelete(l)}
                        title={isMultiDay ? `Delete leave (${l.day_count} days)` : "Delete log"}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={l.id}
                  title={l.notes ?? undefined}
                  className="border-b border-border/30 bg-card hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="text-center py-2.5">
                    <DateDayCell startIso={l.log_date} />
                  </TableCell>
                  {categories.map((c) => {
                    const v = getVal(l, c.key);
                    return (
                      <TableCell key={c.key} className="text-center tabular-nums text-xs py-2.5">
                        {v > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-foreground bg-muted/30 border border-border/30">
                            {v}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 font-mono select-none" aria-hidden="true">
                            —
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center tabular-nums py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs text-primary bg-primary/10 border border-primary/20">
                      {total}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                        onClick={() => onCopy(l)}
                        title="Copy to clipboard"
                      >
                        {copiedId === l.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer"
                        onClick={() => onEdit(l)}
                        title="Edit day"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => onDelete(l)}
                        title="Delete log"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {paginated.length > 0 && (
            <TableFooter className="bg-muted/20 border-t border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center py-2.5">
                  Page Total
                </TableHead>
                {categories.map((c) => (
                  <TableHead
                    key={c.key}
                    className="text-center tabular-nums text-xs font-bold"
                    style={{ color: colorForKey(c.key) }}
                  >
                    {colTotals[c.key] || <span className="text-muted-foreground/30">—</span>}
                  </TableHead>
                ))}
                <TableHead className="text-center tabular-nums text-xs font-bold text-primary">
                  {grandTotal}
                </TableHead>
                <TableHead aria-hidden />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ── Reducer ────────────────────────────────────────────────────────────────
interface TableState {
  page: number;
  itemsPerPage: number;
  search: string;
  deleteTarget: GroupedDailyLog | null;
  copiedId: string | null;
}
type TableAction =
  | { type: "set_page"; p: number }
  | { type: "set_per_page"; n: number }
  | { type: "set_search"; q: string }
  | { type: "set_delete"; log: GroupedDailyLog | null }
  | { type: "set_copied"; id: string | null };

const tableInit: TableState = {
  page: 1,
  itemsPerPage: 10,
  search: "",
  deleteTarget: null,
  copiedId: null,
};

function tableReducer(s: TableState, a: TableAction): TableState {
  switch (a.type) {
    case "set_page":
      return { ...s, page: a.p };
    case "set_per_page":
      return { ...s, itemsPerPage: a.n, page: 1 };
    case "set_search":
      return { ...s, search: a.q, page: 1 };
    case "set_delete":
      return { ...s, deleteTarget: a.log };
    case "set_copied":
      return { ...s, copiedId: a.id };
    default:
      return s;
  }
}

// ── Main Component ─────────────────────────────────────────────────────────
interface Props {
  logs: DailyLog[];
  onEdit: (log: GroupedDailyLog) => void;
  onNew?: () => void;
  onNewLeave?: () => void;
  userName?: string;
}

export function DaysTable({ logs, onEdit, onNew, onNewLeave, userName }: Props) {
  const [{ page, itemsPerPage, search, deleteTarget, copiedId }, tDispatch] = useReducer(
    tableReducer,
    tableInit,
  );
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const reduce = useReducedMotion();
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();
  const [hideZeroCategories, setHideZeroCategories] = useState(true);

  // Track categories that have > 0 contributions across this user's logs
  const userContributedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      if (l.is_off_day || !l.counts) continue;
      for (const [k, v] of Object.entries(l.counts)) {
        if (typeof v === "number" && v > 0) set.add(k);
      }
    }
    return set;
  }, [logs]);

  // Count how many categories have 0 contributions
  const zeroContributionCount = useMemo(() => {
    return categories.filter((c) => !userContributedKeys.has(c.key)).length;
  }, [categories, userContributedKeys]);

  // When hideZeroCategories is active, don't show categories having 0 contribution
  const visibleCategories = useMemo(() => {
    if (!hideZeroCategories) return categories;
    const filtered = categories.filter((c) => userContributedKeys.has(c.key));
    return filtered.length > 0 ? filtered : categories;
  }, [categories, hideZeroCategories, userContributedKeys]);

  // Group consecutive leave/off days into single consolidated rows
  const allGrouped = useMemo(() => groupDailyLogs(logs), [logs]);

  const counts = useMemo(() => {
    const working = allGrouped.filter((l) => !l.is_off_day).length;
    const weekends = allGrouped.filter((l) => l.is_off_day && l.leave_type === "Weekend Off").length;
    const off = allGrouped.filter((l) => l.is_off_day && l.leave_type !== "Weekend Off").length;
    return { all: allGrouped.length, working, weekends, off };
  }, [allGrouped]);

  const filtered = useMemo(() => {
    let list = allGrouped;

    // Filter by status tab
    if (statusFilter === "working") {
      list = list.filter((l) => !l.is_off_day);
    } else if (statusFilter === "weekends") {
      list = list.filter((l) => l.is_off_day && l.leave_type === "Weekend Off");
    } else if (statusFilter === "off") {
      list = list.filter((l) => l.is_off_day && l.leave_type !== "Weekend Off");
    }

    // Filter by search query
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.start_date.includes(q) ||
        l.end_date.includes(q) ||
        formatTableDate(l.start_date).toLowerCase().includes(q) ||
        formatTableDate(l.end_date).toLowerCase().includes(q) ||
        formatDayName(l.start_date).toLowerCase().includes(q) ||
        formatDayName(l.end_date).toLowerCase().includes(q) ||
        (l.is_off_day && l.leave_type.toLowerCase().includes(q)) ||
        l.clean_notes.toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q),
    );
  }, [allGrouped, statusFilter, search]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const avgTotal = useMemo(() => {
    if (!workingLogs.length) return 0;
    return Math.round(
      workingLogs.reduce(
        (s, l) => s + categories.reduce((cs, c) => cs + getVal(l, c.key), 0),
        0,
      ) / workingLogs.length,
    );
  }, [workingLogs, categories]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const goTo = (p: number) =>
    tDispatch({ type: "set_page", p: Math.max(1, Math.min(totalPages, p)) });

  const copyLog = (l: GroupedDailyLog) => {
    const dateLabel =
      l.day_count > 1
        ? `${formatTableDate(l.start_date)} – ${formatTableDate(l.end_date)} (${l.day_count} Days)`
        : formatTableDate(l.start_date);

    const rows = l.is_off_day
      ? [
          ["Date", dateLabel],
          ["Status", l.leave_type],
          ...(l.clean_notes ? [["Notes", l.clean_notes]] : []),
        ]
      : [
          ["Date", dateLabel],
          ...categories.reduce<string[][]>((acc, c) => {
            if (getVal(l, c.key) > 0)
              acc.push([c.label, String(getVal(l, c.key)).padStart(2, "0")]);
            return acc;
          }, []),
        ];

    const tdStyle = "border:1px solid #444;padding:4px 12px;text-align:left;";
    const thStyle = `${tdStyle}font-weight:600;background:#1e2130;color:#e2e8f0;`;
    const html = `<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="${thStyle}">${k}</td><td style="${tdStyle}">${v}</td></tr>`,
      )
      .join("")}</table>`;
    const plain = rows.map(([k, v]) => `${k}\t${v}`).join("\n");

    const onCopied = () => {
      tDispatch({ type: "set_copied", id: l.id });
      setTimeout(() => tDispatch({ type: "set_copied", id: null }), 1500);
    };

    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard
        .write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ])
        .then(onCopied);
    } else {
      navigator.clipboard.writeText(plain).then(onCopied);
    }
  };

  const pageNumbers = useMemo(
    () => sharedPageNumbers(totalPages, page),
    [totalPages, page],
  );

  const sharedProps = {
    paginated,
    categories: visibleCategories,
    search,
    copiedId,
    onEdit,
    onDelete: (l: GroupedDailyLog) => tDispatch({ type: "set_delete", log: l }),
    onCopy: copyLog,
    onClearSearch: () => tDispatch({ type: "set_search", q: "" }),
  };

  return (
    <>
      <div className="flex flex-col min-h-0 gap-3.5">
        {/* Unified Two-Tier Command Surface */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden divide-y divide-border/50">
          {/* Top Tier: Segmented Status Filter + Pace KPI (Left) · Export + Primary Actions (Right) */}
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left Cluster: Status Filter Tabs & Daily Pace */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div
                role="tablist"
                aria-label="Filter daily logs by status"
                className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-muted/45 dark:bg-black/35 p-1 border border-border/60 text-xs"
              >
                {(
                  [
                    { id: "all", label: "All", count: counts.all },
                    { id: "working", label: "Working", count: counts.working },
                    { id: "weekends", label: "Weekends", count: counts.weekends },
                    { id: "off", label: "Leaves & Off", count: counts.off },
                  ] as const
                ).map((tab) => {
                  const active = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setStatusFilter(tab.id);
                        tDispatch({ type: "set_page", p: 1 });
                      }}
                      className={cn(
                        "relative z-0 h-full px-2.5 sm:px-3 rounded-lg font-medium transition-colors duration-150 cursor-pointer inline-flex items-center gap-1.5 select-none",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="daily-log-status-pill"
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

              <div className="hidden lg:block h-5 w-px bg-border/60" aria-hidden="true" />

              {/* Daily Average Pace Pill */}
              <div className="hidden sm:inline-flex h-9 items-center gap-1.5 text-xs text-muted-foreground bg-muted/25 border border-border/50 px-3 rounded-xl">
                <span>Avg</span>
                <strong className="font-mono font-semibold text-primary tabular-nums">
                  {avgTotal}
                </strong>
                <span className="text-muted-foreground/75">/ day</span>
              </div>
            </div>

            {/* Right Cluster: Export Dropdown + Add Leave + Log Day */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs font-medium border-border/65 bg-background/90 hover:bg-muted text-foreground rounded-xl shadow-2xs gap-1.5 cursor-pointer"
                    disabled={logs.length === 0}
                    aria-label="Export logs"
                  >
                    <Download className="size-3.5 text-muted-foreground" />
                    <span>Export</span>
                    <ChevronDown className="size-3 opacity-70 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-border/60 shadow-lg">
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-heading">
                    Export Records
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => downloadCSV(logs, hideZeroCategories ? visibleCategories : categories, "daily-log.csv")}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs focus:bg-muted/70"
                  >
                    <div className="size-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                      <FileText className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">CSV Spreadsheet</p>
                      <p className="text-[10px] text-muted-foreground">Excel, Google Sheets (.csv)</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadJSON(logs, hideZeroCategories ? visibleCategories : categories, "daily-log.json")}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs focus:bg-muted/70"
                  >
                    <div className="size-7 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
                      <FileJson className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">JSON Backup</p>
                      <p className="text-[10px] text-muted-foreground">Raw structured data (.json)</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => downloadPDF(logs, hideZeroCategories ? visibleCategories : categories, "daily-log.pdf", { title: "Daily Log Export", userName })}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs focus:bg-muted/70"
                  >
                    <div className="size-7 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0">
                      <FileType className="size-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">PDF Document</p>
                      <p className="text-[10px] text-muted-foreground">Formatted report (.pdf)</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden sm:block h-5 w-px bg-border/60 mx-0.5" aria-hidden="true" />

              {/* Add Leave / Planned Leave Secondary Action */}
              {onNewLeave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNewLeave}
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5 border-border/75 bg-secondary/50 hover:bg-sky-500/10 hover:border-sky-500/35 text-foreground hover:text-sky-600 dark:hover:text-sky-400 shadow-2xs cursor-pointer transition-colors"
                  title="Add short or long leave / planned leave in one row (Shortcut: L)"
                >
                  <CalendarRange className="size-3.5 text-sky-500 dark:text-sky-400" />
                  <span>Add Leave</span>
                  <kbd className="ml-0.5 text-[10px] font-mono border border-border/70 bg-background/70 text-muted-foreground rounded px-1.5 py-0.2 hidden sm:inline">
                    L
                  </kbd>
                </Button>
              )}

              {/* Primary CTA: Log Day */}
              {onNew && (
                <Button
                  size="sm"
                  onClick={onNew}
                  className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Log day</span>
                  <kbd className="ml-0.5 text-[10px] font-mono border border-primary-foreground/30 bg-primary-foreground/15 rounded px-1.5 py-0.2 hidden sm:inline">
                    N
                  </kbd>
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Tier: Full-Width Search Input (Left) · Table Column Filter & Row Count (Right) */}
          <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-muted/15 flex flex-wrap items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 pr-8 h-8 text-xs w-full rounded-lg bg-background/90 border-border/60 focus:border-primary/50"
                placeholder="Search by date, leave type, weekday, or notes…"
                aria-label="Search days by date, leave type, day name, or notes"
                value={search}
                onChange={(e) => tDispatch({ type: "set_search", q: e.target.value })}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => tDispatch({ type: "set_search", q: "" })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Right View Controls: Row Count + Contributed Categories Toggle */}
            <div className="flex items-center gap-2.5 ml-auto">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                Showing{" "}
                <strong className="text-foreground font-semibold tabular-nums">
                  {filtered.length}
                </strong>{" "}
                {filtered.length === 1 ? "row" : "rows"}
              </span>

              {zeroContributionCount > 0 && (
                <>
                  <div className="hidden md:block h-4 w-px bg-border/60" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setHideZeroCategories((v) => !v)}
                    className={cn(
                      "h-8 px-2.5 text-xs font-medium rounded-lg border inline-flex items-center gap-1.5 transition-all cursor-pointer select-none",
                      hideZeroCategories
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                        : "border-border/60 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                    title={
                      hideZeroCategories
                        ? "Showing only categories with contributions. Click to show all columns."
                        : `Hide ${zeroContributionCount} categories with 0 contributions.`
                    }
                    aria-label="Toggle hiding zero contribution categories"
                  >
                    {hideZeroCategories ? (
                      <EyeOff className="size-3.5 shrink-0" />
                    ) : (
                      <Eye className="size-3.5 shrink-0" />
                    )}
                    <span>{hideZeroCategories ? "Contributed Only" : "All Columns"}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded font-mono tabular-nums",
                        hideZeroCategories
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {hideZeroCategories
                        ? `${visibleCategories.length}/${categories.length}`
                        : `${categories.length}/${categories.length}`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <DesktopTable {...sharedProps} />

        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          onPageChange={goTo}
          total={filtered.length}
          pageSize={itemsPerPage}
          entityLabel="rows"
          showFirstLast
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(n) => tDispatch({ type: "set_per_page", n })}
        />
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && tDispatch({ type: "set_delete", log: null })}
      >
        <AlertDialogContent className="sm:max-w-md border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.day_count > 1
                ? `Delete ${deleteTarget.leave_type} (${deleteTarget.day_count} days)?`
                : "Delete this log?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                {deleteTarget && deleteTarget.day_count > 1 ? (
                  <>
                    The leave from{" "}
                    <strong className="text-foreground">
                      {formatTableDate(deleteTarget.start_date)}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-foreground">
                      {formatTableDate(deleteTarget.end_date)}
                    </strong>{" "}
                    ({deleteTarget.day_count} days) will be permanently deleted from your records.
                  </>
                ) : (
                  <>
                    The log for{" "}
                    <strong className="text-foreground">
                      {deleteTarget ? formatTableDate(deleteTarget.start_date) : ""}
                    </strong>{" "}
                    will be permanently deleted from your records.
                  </>
                )}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteLog.mutate(deleteTarget.dates);
                  tDispatch({ type: "set_delete", log: null });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

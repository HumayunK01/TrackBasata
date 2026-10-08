import { useState, useMemo, useReducer } from "react";
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
import { formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
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
function getVal(l: DailyLog, key: string): number {
  return (l.counts ?? {})[key] ?? 0;
}

function DateDayCell({ iso, isOff }: { iso: string; isOff?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center leading-tight py-1">
      <span className={`tabular-nums font-semibold text-xs tracking-tight ${isOff ? "text-muted-foreground/70" : "text-foreground"}`}>
        {formatTableDate(iso)}
      </span>
      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded mt-0.5 uppercase tracking-wider font-heading bg-muted/60 text-muted-foreground border border-border/40">
        {formatDayName(iso)}
      </span>
    </div>
  );
}

type FilterStatus = "all" | "working" | "weekends" | "off";

// ── Table Component ────────────────────────────────────────────────────────
interface DesktopTableProps {
  paginated: DailyLog[];
  categories: Category[];
  search: string;
  copiedId: string | null;
  onEdit: (l: DailyLog) => void;
  onDelete: (l: DailyLog) => void;
  onCopy: (l: DailyLog) => void;
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
          <TableHeader className="relative z-10 bg-muted/25 border-b border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${thCls} w-28`}>
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
                      hint="Click 'Log day' to record your document throughput."
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
            {paginated.map((l) => {
              const total = categories.reduce((s, c) => s + getVal(l, c.key), 0);
              const isOff = l.is_off_day;
              const weekend = isWeekend(l.log_date);

              return isOff ? (
                <TableRow
                  key={l.id}
                  className="border-b border-border/30 bg-muted/15 hover:bg-muted/25 transition-colors"
                >
                  <TableCell className="text-center py-2.5">
                    <DateDayCell iso={l.log_date} isOff />
                  </TableCell>
                  <TableCell colSpan={categories.length + 1} className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/50">
                        <BedDouble className="size-3.5 text-muted-foreground/70" />
                        <span>{weekend ? "Weekend Off" : "Scheduled Off Day"}</span>
                      </span>
                      {l.notes && (
                        <span
                          className="text-xs text-muted-foreground/80 italic font-normal truncate max-w-md"
                          title={l.notes}
                        >
                          &ldquo;{l.notes}&rdquo;
                        </span>
                      )}
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
              ) : (
                <TableRow
                  key={l.id}
                  title={l.notes ?? undefined}
                  className="border-b border-border/30 bg-card hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="text-center py-2.5">
                    <DateDayCell iso={l.log_date} />
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
  deleteTarget: DailyLog | null;
  copiedId: string | null;
}
type TableAction =
  | { type: "set_page"; p: number }
  | { type: "set_per_page"; n: number }
  | { type: "set_search"; q: string }
  | { type: "set_delete"; log: DailyLog | null }
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
  onEdit: (log: DailyLog) => void;
  onNew?: () => void;
  userName?: string;
}

export function DaysTable({ logs, onEdit, onNew, userName }: Props) {
  const [{ page, itemsPerPage, search, deleteTarget, copiedId }, tDispatch] = useReducer(
    tableReducer,
    tableInit,
  );
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const deleteLog = useDeleteLog();
  const { data: categories = [] } = useCategories();

  const allSorted = useMemo(
    () => [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)),
    [logs],
  );

  const counts = useMemo(() => {
    const working = allSorted.filter((l) => !l.is_off_day).length;
    const weekends = allSorted.filter((l) => l.is_off_day && isWeekend(l.log_date)).length;
    const off = allSorted.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length;
    return { all: allSorted.length, working, weekends, off };
  }, [allSorted]);

  const filtered = useMemo(() => {
    let list = allSorted;

    // Filter by status tab
    if (statusFilter === "working") {
      list = list.filter((l) => !l.is_off_day);
    } else if (statusFilter === "weekends") {
      list = list.filter((l) => l.is_off_day && isWeekend(l.log_date));
    } else if (statusFilter === "off") {
      list = list.filter((l) => l.is_off_day && !isWeekend(l.log_date));
    }

    // Filter by search query
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l.log_date.includes(q) ||
        formatTableDate(l.log_date).toLowerCase().includes(q) ||
        formatDayName(l.log_date).toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q),
    );
  }, [allSorted, statusFilter, search]);

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

  const copyLog = (l: DailyLog) => {
    const rows = l.is_off_day
      ? [
          ["Date", formatTableDate(l.log_date)],
          ["Status", isWeekend(l.log_date) ? "Weekend" : "Off Day"],
        ]
      : [
          ["Date", formatTableDate(l.log_date)],
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
    categories,
    search,
    copiedId,
    onEdit,
    onDelete: (l: DailyLog) => tDispatch({ type: "set_delete", log: l }),
    onCopy: copyLog,
    onClearSearch: () => tDispatch({ type: "set_search", q: "" }),
  };

  return (
    <>
      <div className="flex flex-col min-h-0 gap-3.5">
        {/* Unified Command Toolbar: Search + Interactive Status Tabs + Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-3 sm:p-3.5 shadow-2xs">
          {/* Search input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 pr-8 h-9 text-xs sm:text-sm w-full bg-background border-border/60 focus:border-primary/50"
              placeholder="Search by date, weekday, or notes…"
              aria-label="Search days by date, day name, or notes"
              value={search}
              onChange={(e) => tDispatch({ type: "set_search", q: e.target.value })}
            />
            {search && (
              <button
                type="button"
                onClick={() => tDispatch({ type: "set_search", q: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Segmented Status Filter Tabs + Export + Add Day */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between md:justify-end">
            {/* Interactive Status Tabs */}
            <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); tDispatch({ type: "set_page", p: 1 }); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>All</span>
                <span className="text-[10px] opacity-70 font-mono">({counts.all})</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("working"); tDispatch({ type: "set_page", p: 1 }); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "working"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Working</span>
                <span className="text-[10px] opacity-70 font-mono">({counts.working})</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("weekends"); tDispatch({ type: "set_page", p: 1 }); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "weekends"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Weekends</span>
                <span className="text-[10px] opacity-70 font-mono">({counts.weekends})</span>
              </button>
              <button
                type="button"
                onClick={() => { setStatusFilter("off"); tDispatch({ type: "set_page", p: 1 }); }}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "off"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Off Days</span>
                <span className="text-[10px] opacity-70 font-mono">({counts.off})</span>
              </button>
            </div>

            {/* Average badge */}
            <span className="hidden xl:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 border border-border/40 px-2.5 py-1 rounded-xl">
              Avg <strong className="text-primary font-semibold">{avgTotal}</strong> / day
            </span>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium border-border/60 bg-background hover:bg-muted text-foreground rounded-xl shadow-2xs gap-1.5 cursor-pointer"
                  disabled={logs.length === 0}
                  aria-label="Export logs"
                >
                  <Download className="size-3.5" />
                  <span>Export</span>
                  <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-border/60 shadow-lg">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-heading">
                  Export Records
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => downloadCSV(logs, categories, "daily-log.csv")}
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
                  onClick={() => downloadJSON(logs, categories, "daily-log.json")}
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
                  onClick={() => downloadPDF(logs, categories, "daily-log.pdf", { title: "Daily Log Export", userName })}
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

            {/* Add Log Button */}
            {onNew && (
              <Button
                size="sm"
                onClick={onNew}
                className="h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Log day</span>
                <kbd className="ml-1 text-[10px] font-mono border border-primary-foreground/30 bg-primary-foreground/10 rounded px-1.5 py-0.2 hidden sm:inline">
                  N
                </kbd>
              </Button>
            )}
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
          entityLabel="days"
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
            <AlertDialogTitle>Delete this log?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                The log for{" "}
                <strong className="text-foreground">
                  {deleteTarget ? formatTableDate(deleteTarget.log_date) : ""}
                </strong>{" "}
                will be permanently deleted from your records.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteLog.mutate(deleteTarget.id);
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

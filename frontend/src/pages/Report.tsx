import { useMemo, useReducer } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useCategories } from "@/hooks/useCategories";
import { useFaxResolvedByDay, FAX_CATEGORY_KEY, FAX_CATEGORY_LABEL, FAX_CATEGORY_SHORT } from "@/hooks/useFaxTracker";
import { useIndexableResolvedByDay, INDEXABLE_CATEGORY_KEY, INDEXABLE_CATEGORY_LABEL, INDEXABLE_CATEGORY_SHORT } from "@/hooks/useIndexableTracker";
import { useProfile } from "@/hooks/useProfile";
import { isoDate, formatTableDate, isWeekend, totalForLog } from "@/types/log";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { downloadCSV, downloadJSON, downloadPDF, formatUSDate } from "@/lib/log-utils";
import { Download, FileJson, FileText, FileType, ChevronDown, CalendarRange, CalendarDays } from "@/components/ui/icons";
import Skeleton from "react-loading-skeleton";
import { colorForKey } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";

// Import modular components
import { ProgressMetricCard } from "@/components/ui/progress-metric-card";
import { ReportStatsGrid } from "@/components/ar/report/ReportStatsGrid";
import { CategoryBreakdown } from "@/components/ar/report/CategoryBreakdown";
import { ReportDayTable } from "@/components/ar/report/ReportDayTable";

const TABLE_PAGE_SIZE = 20;

// ── Date presets ───────────────────────────────────────────────────────────
function getPresetRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const todayIso = isoDate(today);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "this_week") {
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { start: toIso(monday), end: todayIso };
  }
  if (preset === "last_week") {
    const day = today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    return { start: toIso(lastMonday), end: toIso(lastSunday) };
  }
  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toIso(start), end: todayIso };
  }
  if (preset === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toIso(start), end: toIso(end) };
  }
  if (preset === "last_30") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { start: toIso(start), end: todayIso };
  }
  if (preset === "last_90") {
    const start = new Date(today);
    start.setDate(today.getDate() - 89);
    return { start: toIso(start), end: todayIso };
  }
  return { start: todayIso, end: todayIso };
}

const PRESETS = [
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "last_90", label: "Last 90 Days" },
  { id: "all_time", label: "All Time" },
];

// ── Reducer ────────────────────────────────────────────────────────────────
interface ReportFilter {
  startDate: string;
  endDate: string;
  activePreset: string;
  tablePage: number;
}

type ReportAction =
  | { type: "preset"; id: string; start: string; end: string }
  | { type: "set_start"; v: string }
  | { type: "set_end"; v: string }
  | { type: "set_page"; p: number };

function reportReducer(s: ReportFilter, a: ReportAction): ReportFilter {
  switch (a.type) {
    case "preset": return { startDate: a.start, endDate: a.end, activePreset: a.id, tablePage: 1 };
    case "set_start": return { ...s, startDate: a.v, activePreset: "", tablePage: 1 };
    case "set_end": return { ...s, endDate: a.v, activePreset: "", tablePage: 1 };
    case "set_page": return { ...s, tablePage: a.p };
    default: return s;
  }
}

// ── Page ───────────────────────────────────────────────────────────────────
const ReportPage = () => {
  const { data: logs = [], isLoading } = useDailyLogs();
  const { data: categories = [] } = useCategories();
  const { data: faxByDay = {} } = useFaxResolvedByDay();
  const { data: indexableByDay = {} } = useIndexableResolvedByDay();
  const { data: profile } = useProfile();
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || undefined;
  const [filter, filterDispatch] = useReducer(reportReducer, undefined, () => {
    const r = getPresetRange("this_week");
    return { startDate: r.start, endDate: r.end, activePreset: "this_week", tablePage: 1 };
  });
  const { startDate, endDate, activePreset, tablePage } = filter;

  const applyPreset = (id: string) => {
    const range = id === "all_time"
      ? {
          start: logs.length
            ? logs.reduce((min, l) => (l.log_date < min ? l.log_date : min), logs[0].log_date)
            : isoDate(),
          end: isoDate(),
        }
      : getPresetRange(id);
    filterDispatch({ type: "preset", id, start: range.start, end: range.end });
  };

  const reduce = useReducedMotion();

  const filtered = useMemo(() => {
    if (!startDate || !endDate) return [];
    return logs
      .filter((l) => l.log_date >= startDate && l.log_date <= endDate)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
  }, [logs, startDate, endDate]);

  const workingLogs = useMemo(() => filtered.filter((l) => !l.is_off_day), [filtered]);
  const sortedWorkingAsc = useMemo(
    () => [...workingLogs].sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [workingLogs]
  );
  const weekendDays = useMemo(() => filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length, [filtered]);
  const offDays = filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length;
  const totalDocs = useMemo(() => workingLogs.reduce((s, l) => s + totalForLog(l), 0), [workingLogs]);
  const avgPerDay = workingLogs.length ? Math.round(totalDocs / workingLogs.length) : 0;
  const bestDay = useMemo(() => {
    if (!workingLogs.length) return null;
    return workingLogs.reduce((best, l) => totalForLog(l) > totalForLog(best) ? l : best, workingLogs[0]);
  }, [workingLogs]);

  const categoryBreakdown = useMemo(() => {
    const recent14 = sortedWorkingAsc.slice(-14);
    const breakdown = categories.reduce<{
      key: string;
      label: string;
      short: string;
      value: number;
      color: string;
      sparkline: number[];
    }[]>((acc, c) => {
      const value = workingLogs.reduce((s, l) => s + ((l.counts ?? {})[c.key] ?? 0), 0);
      if (value > 0) {
        acc.push({
          key: c.key,
          label: c.label,
          short: c.short,
          value,
          color: c.key.startsWith("#") ? c.key : colorForKey(c.key),
          sparkline: recent14.map((l) => (l.counts ?? {})[c.key] ?? 0),
        });
      }
      return acc;
    }, []);

    const faxValue = Object.entries(faxByDay).reduce(
      (s, [day, n]) => (day >= startDate && day <= endDate ? s + n : s),
      0,
    );
    if (faxValue > 0) {
      breakdown.push({
        key: FAX_CATEGORY_KEY,
        label: FAX_CATEGORY_LABEL,
        short: FAX_CATEGORY_SHORT,
        value: faxValue,
        color: colorForKey(FAX_CATEGORY_KEY),
        sparkline: recent14.map((l) => faxByDay[l.log_date] ?? 0),
      });
    }

    const indexableValue = Object.entries(indexableByDay).reduce(
      (s, [day, n]) => (day >= startDate && day <= endDate ? s + n : s),
      0,
    );
    if (indexableValue > 0) {
      breakdown.push({
        key: INDEXABLE_CATEGORY_KEY,
        label: INDEXABLE_CATEGORY_LABEL,
        short: INDEXABLE_CATEGORY_SHORT,
        value: indexableValue,
        color: colorForKey(INDEXABLE_CATEGORY_KEY),
        sparkline: recent14.map((l) => indexableByDay[l.log_date] ?? 0),
      });
    }
    return breakdown;
  }, [categories, workingLogs, sortedWorkingAsc, faxByDay, indexableByDay, startDate, endDate]);

  const dailySeries = useMemo(() =>
    sortedWorkingAsc.map((l) => ({
      date: formatTableDate(l.log_date),
      value: totalForLog(l),
    })),
    [sortedWorkingAsc]
  );

  const categorySeries = useMemo(() =>
    categoryBreakdown.slice(0, 6).map((c) => ({
      name: c.short,
      color: c.color,
      data: sortedWorkingAsc.map((l) => ({
        date: formatTableDate(l.log_date),
        value: c.key === FAX_CATEGORY_KEY
          ? (faxByDay[l.log_date] ?? 0)
          : c.key === INDEXABLE_CATEGORY_KEY
          ? (indexableByDay[l.log_date] ?? 0)
          : ((l.counts ?? {})[c.key] ?? 0),
      })),
    })),
    [categoryBreakdown, sortedWorkingAsc, faxByDay, indexableByDay]
  );

  const totalTablePages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const paginatedRows = filtered.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const tablePageNumbers = useMemo(() => {
    if (totalTablePages <= 7) return Array.from({ length: totalTablePages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (tablePage > 3) pages.push("…");
    for (let i = Math.max(2, tablePage - 1); i <= Math.min(totalTablePages - 1, tablePage + 1); i++) pages.push(i);
    if (tablePage < totalTablePages - 2) pages.push("…");
    pages.push(totalTablePages);
    return pages;
  }, [totalTablePages, tablePage]);

  const exportedLogs = useMemo(
    () => [...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date)),
    [filtered]
  );
  const exportFilename = `report-${startDate}-to-${endDate}`;
  const handleExportCSV = () => downloadCSV(exportedLogs, categories, `${exportFilename}.csv`);
  const handleExportJSON = () => downloadJSON(exportedLogs, categories, `${exportFilename}.json`);
  const handleExportPDF = () =>
    downloadPDF(exportedLogs, categories, `${exportFilename}.pdf`, {
      title: "Basata Tracker Report",
      subtitle: `${formatUSDate(startDate)} to ${formatUSDate(endDate)}`,
      userName,
    });

  return (
    <div className="flex flex-col min-h-full">
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 relative z-[1]">
        <div className="w-full space-y-6 sm:space-y-8">
          {/* ── Elevated Date Range & Filter Toolbar ── */}
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-3.5 sm:p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            {/* Presets Segmented Capsule */}
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="relative inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
                {PRESETS.map((p) => {
                  const active = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      aria-pressed={active}
                      className={cn(
                        "relative z-10 shrink-0 rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-colors duration-150 select-none",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="report-preset-active-pill"
                          className="absolute inset-0 rounded-lg bg-background dark:bg-white/[0.12] border border-border/80 dark:border-white/15 shadow-xs -z-10"
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 420, damping: 32 }
                          }
                        />
                      )}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
                {activePreset === "" && (
                  <span className="relative z-10 shrink-0 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold text-foreground select-none">
                    <motion.div
                      layoutId="report-preset-active-pill"
                      className="absolute inset-0 rounded-lg bg-background dark:bg-white/[0.12] border border-border/80 dark:border-white/15 shadow-xs -z-10"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 32 }
                      }
                    />
                    Custom
                  </span>
                )}
              </div>
            </div>

            {/* Date Range Inputs & Export Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 bg-muted/20 border border-border/60 rounded-xl px-3 py-1.5 focus-within:border-primary transition-colors">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-muted-foreground/70">From</span>
                  <input
                    type="date"
                    aria-label="Start date"
                    value={startDate}
                    onChange={(e) => filterDispatch({ type: "set_start", v: e.target.value })}
                    className="bg-transparent border-0 text-foreground text-xs font-mono tabular-nums focus:outline-none cursor-pointer w-[125px]"
                  />
                  <span className="text-muted-foreground/50">—</span>
                  <span className="text-muted-foreground/70">To</span>
                  <input
                    type="date"
                    aria-label="End date"
                    value={endDate}
                    onChange={(e) => filterDispatch({ type: "set_end", v: e.target.value })}
                    className="bg-transparent border-0 text-foreground text-xs font-mono tabular-nums focus:outline-none cursor-pointer w-[125px]"
                  />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="group h-9 px-3.5 rounded-xl font-medium border-border/80 bg-card/60 hover:bg-muted/80 data-[state=open]:bg-muted data-[state=open]:border-primary/40 shrink-0 text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    disabled={filtered.length === 0}
                  >
                    <Download className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>Export</span>
                    <ChevronDown className="size-3.5 opacity-70 ml-0.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 p-1.5 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/40 font-sans select-none space-y-1"
                >
                  <div className="px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                        Download Report
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                        {exportedLogs.length} {exportedLogs.length === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">
                      {formatUSDate(startDate)} — {formatUSDate(endDate)} · {totalDocs.toLocaleString()} documents
                    </p>
                  </div>
                  <DropdownMenuSeparator className="bg-border/60 -mx-1" />
                  <DropdownMenuItem
                    onClick={handleExportCSV}
                    className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground tracking-tight">CSV Spreadsheet</div>
                        <div className="text-[10px] text-muted-foreground truncate">Open in Excel or Google Sheets</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                      .csv
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportJSON}
                    className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileJson className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground tracking-tight">JSON File</div>
                        <div className="text-[10px] text-muted-foreground truncate">Full backup with all details</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                      .json
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportPDF}
                    className="group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer hover:bg-muted/80 focus:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileType className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground tracking-tight">PDF Document</div>
                        <div className="text-[10px] text-muted-foreground truncate">Easy to print or share</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground/90 border border-border/50 shrink-0">
                      .pdf
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Content Sections ── */}
          {isLoading ? (
            <div className="space-y-6 sm:space-y-8">
              <section>
                <FigHeader title="Overview Summary" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-4.5 space-y-3">
                      <Skeleton width={80} height={12} />
                      <Skeleton width={60} height={28} />
                      <Skeleton width={110} height={12} />
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <FigHeader title="Category Breakdown" />
                <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(192px,1fr))]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-4.5 space-y-3">
                      <Skeleton width={72} height={12} />
                      <Skeleton width={56} height={28} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8">
              <EmptyState
                icon={CalendarRange}
                title="No Records Found"
                hint={`No activity was logged between ${formatUSDate(startDate)} and ${formatUSDate(endDate)}. Try selecting a different date range.`}
              />
            </div>
          ) : (
            <>
              {/* 1. Overview Summary KPIs */}
              <section>
                <FigHeader title="Overview Summary" sub={`${workingLogs.length} working days · ${totalDocs.toLocaleString()} documents`} />
                <ReportStatsGrid
                  totalDocs={totalDocs}
                  filteredCount={filtered.length}
                  workingCount={workingLogs.length}
                  weekendDays={weekendDays}
                  offDays={offDays}
                  avgPerDay={avgPerDay}
                  bestDay={bestDay}
                />
              </section>

              {/* 2. Category Breakdown Grid */}
              <section>
                <FigHeader title="Category Breakdown" sub={`${categoryBreakdown.length} active categories`} />
                <CategoryBreakdown breakdown={categoryBreakdown} totalDocs={totalDocs} />
              </section>

              {/* 3. Trends & Breakdown */}
              {dailySeries.length >= 2 && (
                <section>
                  <FigHeader title="Trends & Daily Output" sub={`${dailySeries.length} days with activity`} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <ProgressMetricCard
                      title="Daily Document Output"
                      unit="docs"
                      accent="emerald"
                      data={dailySeries}
                      deltaLabel="volume"
                    />
                    <ProgressMetricCard
                      title="Category Distribution"
                      accent="blue"
                      series={categorySeries}
                      stacked={true}
                    />
                  </div>
                </section>
              )}

              {/* 4. Daily Activity Log */}
              <section>
                <FigHeader title="Daily Activity Log" sub={`${filtered.length} total days`} />
                <ReportDayTable
                  filtered={filtered}
                  categories={categories}
                  workingLogs={workingLogs}
                  totalDocs={totalDocs}
                  avgPerDay={avgPerDay}
                  tablePage={tablePage}
                  totalTablePages={totalTablePages}
                  tablePageNumbers={tablePageNumbers}
                  paginatedRows={paginatedRows}
                  onPageChange={(p) => filterDispatch({ type: "set_page", p })}
                />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportPage;

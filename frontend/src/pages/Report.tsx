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
import { WeekdayProfile } from "@/components/ar/report/WeekdayProfile";
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
  { id: "last_30", label: "30 Days" },
  { id: "last_90", label: "90 Days" },
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
    case "preset":
      return { startDate: a.start, endDate: a.end, activePreset: a.id, tablePage: 1 };
    case "set_start":
      return { ...s, startDate: a.v, activePreset: "", tablePage: 1 };
    case "set_end":
      return { ...s, endDate: a.v, activePreset: "", tablePage: 1 };
    case "set_page":
      return { ...s, tablePage: a.p };
    default:
      return s;
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
    const range =
      id === "all_time"
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
    [workingLogs],
  );
  const weekendDays = useMemo(
    () => filtered.filter((l) => l.is_off_day && isWeekend(l.log_date)).length,
    [filtered],
  );
  const offDays = filtered.filter((l) => l.is_off_day && !isWeekend(l.log_date)).length;
  const totalDocs = useMemo(() => workingLogs.reduce((s, l) => s + totalForLog(l), 0), [workingLogs]);
  const avgPerDay = workingLogs.length ? Math.round(totalDocs / workingLogs.length) : 0;
  const bestDay = useMemo(() => {
    if (!workingLogs.length) return null;
    return workingLogs.reduce((best, l) => (totalForLog(l) > totalForLog(best) ? l : best), workingLogs[0]);
  }, [workingLogs]);

  const categoryBreakdown = useMemo(() => {
    const recent14 = sortedWorkingAsc.slice(-14);
    const breakdown = categories.reduce<
      {
        key: string;
        label: string;
        short: string;
        value: number;
        color: string;
        sparkline: number[];
      }[]
    >((acc, c) => {
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

  const dailySeries = useMemo(
    () =>
      sortedWorkingAsc.map((l) => ({
        date: formatTableDate(l.log_date),
        value: totalForLog(l),
      })),
    [sortedWorkingAsc],
  );

  const activeReportCategories = useMemo(() => {
    const active = categories.filter((c) =>
      workingLogs.some((l) => ((l.counts ?? {})[c.key] ?? 0) > 0),
    );
    return active.length > 0 ? active : categories;
  }, [categories, workingLogs]);

  const categorySeries = useMemo(
    () =>
      categoryBreakdown.slice(0, 6).map((c) => ({
        name: c.short,
        color: c.color,
        data: sortedWorkingAsc.map((l) => ({
          date: formatTableDate(l.log_date),
          value:
            c.key === FAX_CATEGORY_KEY
              ? (faxByDay[l.log_date] ?? 0)
              : c.key === INDEXABLE_CATEGORY_KEY
                ? (indexableByDay[l.log_date] ?? 0)
                : ((l.counts ?? {})[c.key] ?? 0),
        })),
      })),
    [categoryBreakdown, sortedWorkingAsc, faxByDay, indexableByDay],
  );

  const totalTablePages = Math.ceil(filtered.length / TABLE_PAGE_SIZE);
  const paginatedRows = filtered.slice(
    (tablePage - 1) * TABLE_PAGE_SIZE,
    tablePage * TABLE_PAGE_SIZE,
  );
  const tablePageNumbers = useMemo(() => {
    if (totalTablePages <= 7) return Array.from({ length: totalTablePages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [1];
    if (tablePage > 3) pages.push("…");
    for (
      let i = Math.max(2, tablePage - 1);
      i <= Math.min(totalTablePages - 1, tablePage + 1);
      i++
    )
      pages.push(i);
    if (tablePage < totalTablePages - 2) pages.push("…");
    pages.push(totalTablePages);
    return pages;
  }, [totalTablePages, tablePage]);

  const exportedLogs = useMemo(
    () => [...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date)),
    [filtered],
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
    <div className="flex-1 min-h-0 flex flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-8 relative z-[1] [overscroll-behavior-y:contain]">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* ── Sticky Date Range & Export Command Bar ── */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/85 backdrop-blur-xl border-b border-border/50 flex flex-wrap items-center justify-between gap-2.5">
            {/* Presets Segmented Capsule */}
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div
                role="tablist"
                aria-label="Date range presets"
                className="relative inline-flex h-9 items-center gap-0.5 rounded-xl border border-border/70 bg-background/90 dark:bg-black/35 p-1 shadow-2xs"
              >
                {PRESETS.map((p) => {
                  const active = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => applyPreset(p.id)}
                      className={cn(
                        "relative z-0 h-full shrink-0 rounded-lg px-2.5 text-xs font-medium transition-colors duration-150 select-none cursor-pointer inline-flex items-center",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="report-preset-active-pill"
                          className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
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
                  <span className="relative z-0 h-full shrink-0 rounded-lg px-2.5 text-xs font-semibold text-foreground select-none inline-flex items-center">
                    <motion.span
                      layoutId="report-preset-active-pill"
                      className="absolute inset-0 rounded-lg bg-card dark:bg-white/[0.09] border border-border/80 dark:border-white/12 shadow-xs -z-10"
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

            {/* Date Range Inputs & Export Dropdown (Single Non-Wrapping Cluster) */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <div className="h-9 inline-flex items-center gap-2 bg-background/90 dark:bg-black/35 border border-border/70 rounded-xl px-3 shadow-2xs focus-within:border-emerald-500/50 transition-colors">
                <CalendarDays className="size-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-muted-foreground/65 hidden sm:inline text-[11px]">From</span>
                  <input
                    type="date"
                    aria-label="Start date"
                    value={startDate}
                    onChange={(e) => filterDispatch({ type: "set_start", v: e.target.value })}
                    className="bg-transparent border-0 text-foreground text-xs font-mono tabular-nums focus:outline-none cursor-pointer w-[112px]"
                  />
                  <span className="text-muted-foreground/40">→</span>
                  <span className="text-muted-foreground/65 hidden sm:inline text-[11px]">To</span>
                  <input
                    type="date"
                    aria-label="End date"
                    value={endDate}
                    onChange={(e) => filterDispatch({ type: "set_end", v: e.target.value })}
                    className="bg-transparent border-0 text-foreground text-xs font-mono tabular-nums focus:outline-none cursor-pointer w-[112px]"
                  />
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="group h-9 px-3.5 rounded-xl font-medium border-border/70 bg-background/90 dark:bg-black/35 hover:bg-muted/60 data-[state=open]:bg-muted data-[state=open]:border-emerald-500/40 shrink-0 text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    disabled={filtered.length === 0}
                  >
                    <Download className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>Export</span>
                    <ChevronDown className="size-3 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
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
            <div className="space-y-6">
              <section>
                <FigHeader title="Overview Summary" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/65 bg-card/80 p-4 space-y-3">
                      <Skeleton width={80} height={12} />
                      <Skeleton width={60} height={28} />
                      <Skeleton width={110} height={12} />
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <FigHeader title="Category Breakdown" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/65 bg-card/80 p-4 space-y-3">
                      <Skeleton width={72} height={12} />
                      <Skeleton width={56} height={28} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/65 bg-card/80 p-8">
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
                <FigHeader
                  title="Overview Summary"
                  sub={`${workingLogs.length} working ${workingLogs.length === 1 ? "shift" : "shifts"} · ${totalDocs.toLocaleString()} documents`}
                />
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
                <FigHeader
                  title="Category Breakdown"
                  sub={`${categoryBreakdown.length} active ${categoryBreakdown.length === 1 ? "category" : "categories"}`}
                />
                <CategoryBreakdown breakdown={categoryBreakdown} totalDocs={totalDocs} />
              </section>

              {/* 3. Weekday Performance Profile */}
              {workingLogs.length > 0 && (
                <section>
                  <FigHeader
                    title="Weekday Performance Profile"
                    sub="Mon–Fri pace & volume distribution"
                  />
                  <WeekdayProfile
                    workingLogs={workingLogs}
                    totalDocs={totalDocs}
                    avgPerDay={avgPerDay}
                  />
                </section>
              )}

              {/* 4. Trends & Daily Output */}
              {dailySeries.length >= 2 && (
                <section>
                  <FigHeader
                    title="Trends & Daily Output"
                    sub={`${dailySeries.length} active shifts in range`}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <ProgressMetricCard
                      title="Daily Document Output"
                      unit="docs"
                      accent="emerald"
                      data={dailySeries}
                      deltaLabel="vs prev shift"
                      hidePeriodSelect
                    />
                    <ProgressMetricCard
                      title="Category Distribution"
                      unit="docs"
                      accent="blue"
                      series={categorySeries}
                      deltaLabel="vs prev shift"
                      stacked={true}
                      hidePeriodSelect
                    />
                  </div>
                </section>
              )}

              {/* 4. Day-by-Day Ledger */}
              <section>
                <FigHeader
                  title="Day-by-Day Ledger"
                  sub={`${filtered.length} ${filtered.length === 1 ? "day" : "days"} (${workingLogs.length} active, ${weekendDays + offDays} off)`}
                />
                <ReportDayTable
                  filtered={filtered}
                  categories={activeReportCategories}
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

import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  FileText,
  Search,
  Download,
  BedDouble,
  ArrowUpDown,
  Flame,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/Pagination";
import { pageNumbersArr } from "@/components/ar/tracker/tracker-helpers";
import { isWeekend, totalForLog, formatTableDate, formatDayName, type DailyLog } from "@/types/log";
import type { TeamUserCategoryContribution } from "./TeamOverviewTab";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";

interface TeamMemberLogsTabProps {
  logs: DailyLog[];
  allUserLogs: DailyLog[];
  totalLogsCount: number;
  loading: boolean;
  page: number;
  pageSize?: number;
  search: string;
  onSearchChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onExport: (kind: "csv" | "pdf") => void;
  exporting: boolean;
  selectedCategories: TeamUserCategoryContribution[];
}

export const TeamMemberLogsTab = React.memo(function TeamMemberLogsTab({
  logs,
  allUserLogs,
  totalLogsCount,
  loading,
  page,
  pageSize = 30,
  search,
  onSearchChange,
  onPageChange,
  onExport,
  exporting,
  selectedCategories,
}: TeamMemberLogsTabProps) {
  const [dayFilter, setDayFilter] = useState<"all" | "working" | "off">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "volume">("newest");

  // Summary KPIs calculated across all user logs
  const stats = useMemo(() => {
    const working = allUserLogs.filter((l) => !l.is_off_day);
    const totalDocs = working.reduce((sum, l) => sum + totalForLog(l), 0);
    const offDays = allUserLogs.filter((l) => l.is_off_day).length;
    const highVolumeDays = working.filter((l) => totalForLog(l) >= 80).length;
    return {
      workingDays: working.length,
      totalDocs,
      offDays,
      highVolumeDays,
    };
  }, [allUserLogs]);

  // Client-side filtering & sorting applied on current slice
  const processedLogs = useMemo(() => {
    let list = [...logs];
    if (dayFilter === "working") {
      list = list.filter((l) => !l.is_off_day);
    } else if (dayFilter === "off") {
      list = list.filter((l) => l.is_off_day);
    }

    if (sortOrder === "oldest") {
      list.sort((a, b) => a.log_date.localeCompare(b.log_date));
    } else if (sortOrder === "volume") {
      list.sort((a, b) => totalForLog(b) - totalForLog(a));
    } else {
      list.sort((a, b) => b.log_date.localeCompare(a.log_date));
    }
    return list;
  }, [logs, dayFilter, sortOrder]);

  const totalPages = Math.ceil(totalLogsCount / pageSize);

  return (
    <div className="space-y-4">
      {/* 1. Summary KPIs Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Working Days
          </span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1 flex items-center gap-1.5">
            <CalendarCheck className="size-4 text-emerald-500" />
            <span>{stats.workingDays} days</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Total Output
          </span>
          <div className="text-xl font-bold tabular-nums text-emerald-500 mt-1 flex items-center gap-1.5">
            <FileText className="size-4" />
            <span>{stats.totalDocs.toLocaleString()} docs</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            High Pace Shifts
          </span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1 flex items-center gap-1.5">
            <Flame className="size-4 text-amber-500" />
            <span>{stats.highVolumeDays} days (≥80)</span>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Off Days / Rest
          </span>
          <div className="text-xl font-bold tabular-nums text-muted-foreground mt-1 flex items-center gap-1.5">
            <BedDouble className="size-4" />
            <span>{stats.offDays} days</span>
          </div>
        </div>
      </div>

      {/* 2. Controls Toolbar */}
      <div className="bg-card border border-border/60 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search by date */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 h-9 text-xs w-full bg-background border-border/60"
              placeholder="Search by date (YYYY-MM-DD)…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Day type filter pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-xs">
              {(["all", "working", "off"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDayFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer capitalize",
                    dayFilter === t
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === "all" ? "All Days" : t === "working" ? "Working" : "Off Days"}
                </button>
              ))}
            </div>

            {/* Sort order */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="size-3.5" />
              <select
                aria-label="Sort logs by"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="h-8 px-2.5 text-xs bg-muted/40 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
              >
                <option value="newest">Newest Date</option>
                <option value="oldest">Oldest Date</option>
                <option value="volume">Highest Volume</option>
              </select>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-1.5 border-l border-border/50 pl-2">
              <button
                type="button"
                onClick={() => onExport("csv")}
                disabled={exporting}
                className="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="size-3" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => onExport("pdf")}
                disabled={exporting}
                className="h-8 px-2.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="size-3" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Daily Logs List */}
      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton height={44} count={5} />
          </div>
        ) : processedLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No daily log entries match the active criteria.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {processedLogs.map((l) => {
              const weekend = isWeekend(l.log_date);
              const isOff = l.is_off_day;
              const total = totalForLog(l);
              return (
                <div
                  key={l.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-muted/40 border border-border/50 grid place-items-center text-xs font-mono font-bold text-foreground shrink-0">
                      {l.log_date.slice(8, 10)}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                        <span>{formatTableDate(l.log_date)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDayName(l.log_date)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        Log ID: {l.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>

                  {isOff ? (
                    <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase font-mono flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40 w-fit">
                      <BedDouble className="size-3.5" />
                      <span>{weekend ? "Weekend Rest" : "Scheduled Off"}</span>
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCategories.map((c) => {
                          const v = (l.counts ?? {})[c.key] ?? 0;
                          return v > 0 ? (
                            <span
                              key={c.key}
                              className="text-xs font-medium px-2 py-0.5 rounded-md tabular-nums bg-muted/40 border border-border/40 text-foreground"
                            >
                              <span className="text-muted-foreground mr-1">{c.short}</span>
                              <strong className="text-emerald-500 font-mono">{v}</strong>
                            </span>
                          ) : null;
                        })}
                      </div>
                      <span className="text-sm font-extrabold tabular-nums text-foreground font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-emerald-500 shrink-0">
                        {total} docs
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageNumbers={pageNumbersArr(totalPages, page)}
          onPageChange={onPageChange}
          total={totalLogsCount}
          pageSize={pageSize}
          entityLabel="logs"
        />
      )}
    </div>
  );
});

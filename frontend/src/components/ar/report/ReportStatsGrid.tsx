import { formatTableDate, totalForLog, type DailyLog } from "@/types/log";
import { FileCheck, CalendarDays, TrendingUp, Award } from "@/components/ui/icons";
import { ActivityRing } from "@/components/ar/ActivityRing";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

interface StatsGridProps {
  totalDocs: number;
  filteredCount: number;
  workingCount: number;
  weekendDays: number;
  offDays: number;
  avgPerDay: number;
  bestDay: DailyLog | null;
  sparkline?: number[];
}

export function ReportStatsGrid({
  totalDocs,
  filteredCount,
  workingCount,
  weekendDays,
  offDays,
  avgPerDay,
  bestDay,
}: StatsGridProps) {
  const bestDayVal = bestDay ? totalForLog(bestDay) : 0;
  const docsTarget = Math.max(50, workingCount * 50);
  const animTotal = useAnimatedNumber(totalDocs);
  const animWorking = useAnimatedNumber(workingCount);
  const animAvg = useAnimatedNumber(avgPerDay);
  const animBest = useAnimatedNumber(bestDayVal);

  const shiftRate = filteredCount > 0 ? Math.round((workingCount / filteredCount) * 100) : 0;
  const peakVsAvg =
    avgPerDay > 0 && bestDayVal > 0 ? Math.round(((bestDayVal - avgPerDay) / avgPerDay) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Documents */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-colors duration-150 hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Total Documents</span>
          <ActivityRing
            value={totalDocs}
            target={docsTarget}
            size={26}
            strokeWidth={2.5}
            color="hsl(var(--primary))"
            className="shrink-0"
          >
            <FileCheck className="size-3 text-primary" />
          </ActivityRing>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
            {animTotal.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
            docs
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/45 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>{filteredCount} days in range</span>
          <span className="text-emerald-500 dark:text-emerald-400 font-semibold">Volume</span>
        </div>
      </div>

      {/* 2. Working Shifts */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-colors duration-150 hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Working Shifts</span>
          <ActivityRing
            value={workingCount}
            target={filteredCount || 1}
            size={26}
            strokeWidth={2.5}
            color="rgb(56, 189, 248)"
            className="shrink-0"
          >
            <CalendarDays className="size-3 text-sky-400" />
          </ActivityRing>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
            {animWorking}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
            {workingCount === 1 ? "shift" : "shifts"}
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/45 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>
            {weekendDays} wknd · {offDays} off
          </span>
          <span className="text-sky-400 font-semibold">{shiftRate}% active</span>
        </div>
      </div>

      {/* 3. Average Velocity */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-colors duration-150 hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Average Velocity</span>
          <ActivityRing
            value={avgPerDay}
            target={50}
            size={26}
            strokeWidth={2.5}
            color="rgb(168, 85, 247)"
            className="shrink-0"
          >
            <TrendingUp className="size-3 text-purple-400" />
          </ActivityRing>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
            {animAvg}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
            docs / shift
          </span>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/45 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Per active workday</span>
          <span className="text-purple-400 font-semibold">Pace</span>
        </div>
      </div>

      {/* 4. Peak Shift */}
      <div className="group relative flex flex-col justify-between rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs transition-colors duration-150 hover:border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Peak Shift</span>
          <ActivityRing
            value={bestDayVal}
            target={Math.max(60, avgPerDay || 60)}
            size={26}
            strokeWidth={2.5}
            color="rgb(245, 158, 11)"
            className="shrink-0"
          >
            <Award className="size-3 text-amber-400" />
          </ActivityRing>
        </div>

        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
            {bestDay ? animBest : "—"}
          </span>
          {bestDay && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70">
              docs
            </span>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/45 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>{bestDay ? formatTableDate(bestDay.log_date) : "No shifts"}</span>
          <span className="text-amber-400 font-semibold">
            {peakVsAvg > 0 ? `+${peakVsAvg}% vs avg` : "Record"}
          </span>
        </div>
      </div>
    </div>
  );
}

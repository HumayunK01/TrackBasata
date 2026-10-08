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

function StatCardAmbientGlow({ color, patternId }: { color: string; patternId: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-xl transition-opacity duration-300 opacity-20 group-hover:opacity-35"
        style={{ background: color }}
      />
      <div
        className="pointer-events-none absolute inset-0 text-foreground/[0.04]"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent, black 70%)",
          maskImage: "linear-gradient(to right, transparent, black 70%)",
        }}
      >
        <svg className="h-full w-full" aria-hidden>
          <defs>
            <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
    </>
  );
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Total Docs */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
        <StatCardAmbientGlow color="hsl(var(--primary))" patternId="rpt-total-docs" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground/90 tracking-tight">Total Documents</p>
          <ActivityRing
            value={totalDocs}
            target={docsTarget}
            size={28}
            strokeWidth={3}
            color="hsl(var(--primary))"
            className="shrink-0"
          >
            <FileCheck className="size-3 text-primary opacity-90" />
          </ActivityRing>
        </div>
        <div className="relative z-10 mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white leading-none">
              {animTotal}
            </span>
            <span className="mt-1.5 text-[11px] font-mono text-muted-foreground leading-none">
              {filteredCount} days tracked
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
            Volume
          </span>
        </div>
      </div>

      {/* Working Days */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
        <StatCardAmbientGlow color="rgb(56, 189, 248)" patternId="rpt-working-days" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground/90 tracking-tight">Working Days</p>
          <ActivityRing
            value={workingCount}
            target={filteredCount || 1}
            size={28}
            strokeWidth={3}
            color="rgb(56, 189, 248)"
            className="shrink-0"
          >
            <CalendarDays className="size-3 text-sky-400 opacity-90" />
          </ActivityRing>
        </div>
        <div className="relative z-10 mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white leading-none">
              {animWorking}
            </span>
            <span className="mt-1.5 text-[11px] font-mono text-muted-foreground leading-none">
              {weekendDays} weekends · {offDays} off
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded-md">
            Shifts
          </span>
        </div>
      </div>

      {/* Avg / Day */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
        <StatCardAmbientGlow color="rgb(168, 85, 247)" patternId="rpt-avg-docs" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground/90 tracking-tight">Average Velocity</p>
          <ActivityRing
            value={avgPerDay}
            target={50}
            size={28}
            strokeWidth={3}
            color="rgb(168, 85, 247)"
            className="shrink-0"
          >
            <TrendingUp className="size-3 text-purple-400 opacity-90" />
          </ActivityRing>
        </div>
        <div className="relative z-10 mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white leading-none">
              {animAvg}
            </span>
            <span className="mt-1.5 text-[11px] font-mono text-muted-foreground leading-none">
              docs per working shift
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-purple-400 bg-purple-400/10 border border-purple-400/20 px-1.5 py-0.5 rounded-md">
            Speed
          </span>
        </div>
      </div>

      {/* Best Day */}
      <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5">
        <StatCardAmbientGlow color="rgb(245, 158, 11)" patternId="rpt-best-day" />
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground/90 tracking-tight">Peak Shift</p>
          <ActivityRing
            value={bestDayVal}
            target={60}
            size={28}
            strokeWidth={3}
            color="rgb(245, 158, 11)"
            className="shrink-0"
          >
            <Award className="size-3 text-amber-400 opacity-90" />
          </ActivityRing>
        </div>
        <div className="relative z-10 mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground dark:text-white leading-none">
              {bestDay ? animBest : "—"}
            </span>
            <span className="mt-1.5 text-[11px] font-mono text-muted-foreground leading-none">
              {bestDay ? formatTableDate(bestDay.log_date) : "No logs"}
            </span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
            Record
          </span>
        </div>
      </div>
    </div>
  );
}


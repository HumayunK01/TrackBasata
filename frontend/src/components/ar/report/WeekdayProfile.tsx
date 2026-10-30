import { useMemo } from "react";
import { totalForLog, type DailyLog } from "@/types/log";
import { Award, TrendingUp } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface WeekdayProfileProps {
  workingLogs: DailyLog[];
  totalDocs: number;
  avgPerDay: number;
}

interface WeekdayBucket {
  dayIndex: number; // 1 = Mon ... 5 = Fri, 6 = Sat, 0 = Sun
  short: string;
  full: string;
  shifts: number;
  total: number;
  avg: number;
  peak: number;
  share: number;
}

const WEEKDAY_META: { dayIndex: number; short: string; full: string }[] = [
  { dayIndex: 1, short: "Mon", full: "Monday" },
  { dayIndex: 2, short: "Tue", full: "Tuesday" },
  { dayIndex: 3, short: "Wed", full: "Wednesday" },
  { dayIndex: 4, short: "Thu", full: "Thursday" },
  { dayIndex: 5, short: "Fri", full: "Friday" },
  { dayIndex: 6, short: "Sat", full: "Saturday" },
  { dayIndex: 0, short: "Sun", full: "Sunday" },
];

function getDayOfWeek(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 1;
  return new Date(y, m - 1, d).getDay();
}

export function WeekdayProfile({ workingLogs, totalDocs, avgPerDay }: WeekdayProfileProps) {
  const buckets = useMemo<WeekdayBucket[]>(() => {
    const map = new Map<number, { shifts: number; total: number; peak: number }>();
    for (const meta of WEEKDAY_META) {
      map.set(meta.dayIndex, { shifts: 0, total: 0, peak: 0 });
    }

    for (const log of workingLogs) {
      const dow = getDayOfWeek(log.log_date);
      const val = totalForLog(log);
      const entry = map.get(dow);
      if (entry) {
        entry.shifts += 1;
        entry.total += val;
        if (val > entry.peak) entry.peak = val;
      }
    }

    const all = WEEKDAY_META.map((meta) => {
      const stats = map.get(meta.dayIndex)!;
      const avg = stats.shifts > 0 ? Math.round(stats.total / stats.shifts) : 0;
      const share = totalDocs > 0 ? (stats.total / totalDocs) * 100 : 0;
      return {
        ...meta,
        shifts: stats.shifts,
        total: stats.total,
        avg,
        peak: stats.peak,
        share,
      };
    });

    // Always show Mon–Fri; include Sat/Sun only if work was logged on those days
    return all.filter((b) => (b.dayIndex >= 1 && b.dayIndex <= 5) || b.shifts > 0);
  }, [workingLogs, totalDocs]);

  const activeBuckets = useMemo(() => buckets.filter((b) => b.shifts > 0), [buckets]);

  const strongest = useMemo(() => {
    if (activeBuckets.length === 0) return null;
    return activeBuckets.reduce((best, b) =>
      b.avg > best.avg || (b.avg === best.avg && b.total > best.total) ? b : best,
    );
  }, [activeBuckets]);

  const lightest = useMemo(() => {
    if (activeBuckets.length < 2) return null;
    const min = activeBuckets.reduce((low, b) =>
      b.avg < low.avg || (b.avg === low.avg && b.total < low.total) ? b : low,
    );
    return min.dayIndex !== strongest?.dayIndex ? min : null;
  }, [activeBuckets, strongest]);

  const maxAvg = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.avg)),
    [buckets],
  );

  if (workingLogs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/65 bg-card/80 p-4 shadow-2xs space-y-3.5">
      {/* Top Insight Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/45">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
            <TrendingUp className="size-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground leading-tight">
              Weekday Output Rhythm
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Average pace and total volume across each day of the week
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          {strongest && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 font-medium">
              <Award className="size-3 shrink-0" />
              <span>
                Strongest: <strong className="font-semibold">{strongest.short}</strong> ({strongest.avg}/shift)
              </span>
            </span>
          )}
          {lightest && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground">
              <span>
                Lightest: <strong className="font-semibold text-foreground/85">{lightest.short}</strong> ({lightest.avg}/shift)
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Weekday Columns Grid */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3",
          buckets.length === 5 && "lg:grid-cols-5",
          buckets.length === 6 && "lg:grid-cols-6",
          buckets.length >= 7 && "lg:grid-cols-7",
        )}
      >
        {buckets.map((b) => {
          const isStrongest = strongest?.dayIndex === b.dayIndex && b.shifts > 0;
          const hasActivity = b.shifts > 0;
          const barWidth = hasActivity ? Math.max(8, Math.round((b.avg / maxAvg) * 100)) : 0;
          const diffPct =
            hasActivity && avgPerDay > 0
              ? Math.round(((b.avg - avgPerDay) / avgPerDay) * 100)
              : 0;

          return (
            <div
              key={b.dayIndex}
              className={cn(
                "rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-colors",
                isStrongest
                  ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                  : hasActivity
                    ? "border-border/55 bg-background/40 dark:bg-black/20 hover:border-border/80"
                    : "border-border/35 bg-muted/10 opacity-60",
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-semibold tracking-tight",
                      isStrongest ? "text-emerald-500 dark:text-emerald-400" : "text-foreground",
                    )}
                  >
                    {b.full}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {b.shifts} {b.shifts === 1 ? "shift" : "shifts"}
                </span>
              </div>

              {/* Average Velocity Display */}
              <div>
                <div className="flex items-baseline justify-between gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
                      {hasActivity ? b.avg.toLocaleString() : "—"}
                    </span>
                    {hasActivity && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                        avg/day
                      </span>
                    )}
                  </div>

                  {hasActivity && avgPerDay > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-mono font-semibold tabular-nums",
                        diffPct > 0
                          ? "text-emerald-500 dark:text-emerald-400"
                          : diffPct < 0
                            ? "text-muted-foreground"
                            : "text-muted-foreground/70",
                      )}
                      title="Compared to period average"
                    >
                      {diffPct > 0 ? `+${diffPct}%` : diffPct < 0 ? `${diffPct}%` : "avg"}
                    </span>
                  )}
                </div>

                {/* Proportional Bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  {hasActivity && (
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isStrongest
                          ? "bg-emerald-500"
                          : b.avg >= avgPerDay
                            ? "bg-emerald-500/75"
                            : "bg-sky-500/70",
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Footer: Total Volume & Share */}
              <div className="pt-2 border-t border-border/35 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>
                  {hasActivity ? (
                    <>
                      <strong className="font-semibold text-foreground/85">
                        {b.total.toLocaleString()}
                      </strong>{" "}
                      docs
                    </>
                  ) : (
                    "No logs"
                  )}
                </span>
                {hasActivity && (
                  <span className="text-muted-foreground/75 tabular-nums">
                    {b.share.toFixed(0)}% share
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

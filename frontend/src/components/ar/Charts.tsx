import { memo, useMemo } from "react";
import { ProgressMetricCard, type MetricSeries } from "@/components/ui/progress-metric-card";
import { totalForLog, formatShortDate, type DailyLog } from "@/types/log";
import type { Category } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";

interface Props {
  logs: DailyLog[];
  categories: Category[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ponytail: local-date key (not toISOString) so week bucketing is correct in +UTC zones
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const Charts = memo(function Charts({ logs, categories }: Props) {
  const workingLogs = useMemo(() => logs.filter((l) => !l.is_off_day), [logs]);
  const sorted = useMemo(
    () => [...workingLogs].sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [workingLogs],
  );

  const trend = useMemo(() =>
    sorted.slice(-21).map((l) => ({ date: formatShortDate(l.log_date), docs: totalForLog(l) })),
    [sorted],
  );

  const dailySeries = useMemo(() =>
    trend.map((t) => ({ date: t.date, value: t.docs })),
    [trend],
  );

  const weeklyTotals = useMemo(() => {
    const map = new Map<string, number>();
    workingLogs.forEach((l) => {
      const d = new Date(`${l.log_date}T12:00:00`);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = localDateKey(monday);
      map.set(key, (map.get(key) ?? 0) + totalForLog(l));
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([iso, total]) => {
        const [y, m, day] = iso.split("-").map(Number);
        const d = new Date(y, m - 1, day);
        return {
          week: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          total,
        };
      });
  }, [workingLogs]);

  const weeklySeries = useMemo(() =>
    weeklyTotals.map((w) => ({ date: w.week, value: w.total })),
    [weeklyTotals],
  );

  const dowAvg = useMemo(() => {
    const buckets: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    workingLogs.forEach((l) => {
      const d = new Date(`${l.log_date}T12:00:00`).getDay();
      if (buckets[d]) buckets[d].push(totalForLog(l));
    });
    return [1, 2, 3, 4, 5].map((d) => ({
      day: DAYS[d],
      avg: buckets[d].length ? Math.round(buckets[d].reduce((s, v) => s + v, 0) / buckets[d].length) : 0,
    }));
  }, [workingLogs]);

  const dowOverallAvg = useMemo(() => {
    const totalDocs = workingLogs.reduce((s, l) => s + totalForLog(l), 0);
    return workingLogs.length ? Math.round(totalDocs / workingLogs.length) : 0;
  }, [workingLogs]);

  const dowBestDay = useMemo(() => {
    if (!dowAvg.length) return null;
    return [...dowAvg].sort((a, b) => b.avg - a.avg)[0];
  }, [dowAvg]);

  const dowSeries = useMemo(() =>
    dowAvg.map((d) => ({ date: d.day, value: d.avg })),
    [dowAvg],
  );

  const categorySeries: MetricSeries[] = useMemo(() =>
    categories.map((c) => ({
      name: c.label,
      color: colorForKey(c.key),
      data: sorted.slice(-30).map((l) => ({
        date: formatShortDate(l.log_date),
        value: (l.counts ?? {})[c.key] ?? 0,
      })),
    })),
    [categories, sorted],
  );

  if (workingLogs.length === 0) return null;

  return (
    <div className="space-y-4">

      {/* Row 1: Daily trend */}
      <div>
        <ProgressMetricCard
          title="Daily Documents"
          unit="docs"
          data={dailySeries}
          accent="emerald"
          defaultView="curve"
          period="Past 21 days"
          periodOptions={[
            { label: "Past 7 days", points: 7 },
            { label: "Past 14 days", points: 14 },
            { label: "Past 21 days", points: 21 },
          ]}
        />
      </div>

      {/* Row 2: Weekly totals + Day-of-week avg */}
      <div className="cv-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressMetricCard
          title="Weekly Totals"
          unit="docs"
          data={weeklySeries}
          accent="emerald"
          defaultView="bars"
          period="Past 10 weeks"
          periodOptions={[
            { label: "Past 4 weeks", points: 4 },
            { label: "Past 8 weeks", points: 8 },
            { label: "Past 10 weeks", points: 10 },
          ]}
          deltaLabel="vs previous week"
        />

        <ProgressMetricCard
          title="Avg by Day of Week"
          unit="docs/day"
          data={dowSeries}
          accent="emerald"
          defaultView="bars"
          period="Mon-Fri"
          periodOptions={[
            { label: "Mon-Fri", points: 5 },
          ]}
          total={dowOverallAvg}
          delta={dowBestDay ? `${dowBestDay.avg} (${dowBestDay.day})` : undefined}
          deltaLabel="peak day"
        />
      </div>

      {/* Row 3: Category area trend */}
      <div className="cv-auto">
        <ProgressMetricCard
          title="Category Trends"
          unit="docs"
          series={categorySeries}
          defaultView="curve"
          period="Past 30 days"
          periodOptions={[
            { label: "Past 7 days", points: 7 },
            { label: "Past 14 days", points: 14 },
            { label: "Past 30 days", points: 30 },
          ]}
          deltaLabel="vs prev day"
        />
      </div>

      {/* Row 4: Full-width stacked bar breakdown */}
      <div id="breakdown" className="cv-auto">
        <ProgressMetricCard
          title="Document Breakdown"
          unit="docs"
          series={categorySeries}
          defaultView="bars"
          stacked={true}
          period="Past 14 days"
          periodOptions={[
            { label: "Past 7 days", points: 7 },
            { label: "Past 14 days", points: 14 },
            { label: "Past 30 days", points: 30 },
          ]}
          deltaLabel="vs prev day"
        />
      </div>

    </div>
  );
});

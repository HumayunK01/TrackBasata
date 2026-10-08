import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "@/components/ui/icons";
import {
  ACCENTS,
  formatCompact,
  MetricChart,
  SERIES_COLORS,
  type ChartSeries,
  type ChartView,
  type MetricAccent,
  type MetricSeries,
  type SeriesPoint,
} from "./metric-chart";
import { PeriodSelect, ViewToggle, type PeriodOption } from "./metric-controls";

export type { SeriesPoint, MetricSeries, MetricAccent, ChartView, PeriodOption };

export type CardSize = "sm" | "md" | "lg";

export interface ProgressMetricCardProps {
  title: string;
  total?: string | number;
  delta?: string;
  deltaLabel?: string;
  percent?: string;
  trend?: "up" | "down";
  unit?: string;
  period?: string;
  periodOptions?: PeriodOption[];
  onPeriodChange?: (option: PeriodOption) => void;
  defaultView?: ChartView;
  accent?: MetricAccent;
  data?: SeriesPoint[];
  series?: MetricSeries[];
  defaultIndex?: number;
  size?: CardSize;
  showStats?: boolean;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
  loading?: boolean;
  className?: string;
  stacked?: boolean;
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { label: "Past 7 days", points: 7 },
  { label: "Past 14 days", points: 14 },
  { label: "Past 30 days", points: 30 },
];

const REGION_W = 60; // %
const NEUTRAL_PCT = 0.5;

const SIZES: Record<
  CardSize,
  { minH: string; pad: string; footer: string; title: string; headline: string }
> = {
  sm: { minH: "min-h-[220px]", pad: "px-5 pt-4", footer: "px-5 py-2.5", title: "text-sm", headline: "text-3xl" },
  md: { minH: "min-h-[280px]", pad: "px-6 pt-5", footer: "px-6 py-3.5", title: "text-base", headline: "text-4xl" },
  lg: { minH: "min-h-[360px]", pad: "px-8 pt-7", footer: "px-8 py-4", title: "text-lg", headline: "text-5xl" },
};

const sliceWindow = (points: SeriesPoint[], n?: number) =>
  n && n < points.length ? points.slice(-n) : points;

export function ProgressMetricCard({
  title,
  total,
  delta,
  deltaLabel = "today",
  percent,
  trend,
  unit,
  period = "Past 30 days",
  periodOptions,
  onPeriodChange,
  defaultView = "curve",
  accent,
  data,
  series,
  defaultIndex,
  size = "md",
  showStats = true,
  valueFormatter,
  dateFormatter,
  loading = false,
  className = "",
  stacked,
}: ProgressMetricCardProps) {
  const gridId = `grid-${useId().replace(/:/g, "")}`;
  const sz = SIZES[size];
  const shell = `relative flex ${sz.minH} w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${className}`;

  const periods = periodOptions ?? DEFAULT_PERIODS;
  const [selectedLabel, setSelectedLabel] = useState(period);
  const [view, setView] = useState<ChartView>(defaultView);

  const baseSeries: MetricSeries[] = useMemo(
    () => (series?.length ? series : [{ name: title, data: data ?? [], accent }]),
    [series, data, title, accent]
  );

  const selectedOption =
    periods.find((p) => p.label === selectedLabel) ?? periods[periods.length - 1];

  const visibleSeries = useMemo(
    () => baseSeries.map((s) => ({ ...s, data: sliceWindow(s.data, selectedOption?.points) })),
    [baseSeries, selectedOption]
  );

  const primary = visibleSeries[0];
  const isMulti = visibleSeries.length > 1;
  const hasData = visibleSeries.some((s) => (s.data.length ?? 0) >= 2);

  const stats = useMemo(() => {
    if (!visibleSeries.length) {
      return { sum: 0, net: 0, pct: 0, step: 0, peak: 0, low: 0, avg: 0 };
    }

    const pointCount = visibleSeries[0]?.data.length ?? 0;
    // Aggregate values per time point across all series
    const aggregatedVals: number[] = [];
    for (let i = 0; i < pointCount; i++) {
      let ptSum = 0;
      for (const s of visibleSeries) {
        ptSum += s.data[i]?.value ?? 0;
      }
      aggregatedVals.push(ptSum);
    }

    const vals = isMulti ? aggregatedVals : (primary?.data.map((d) => d.value) ?? []);
    const sum = vals.reduce((a, b) => a + b, 0);
    const first = vals[0] ?? 0;
    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? first;
    const net = last - first;

    let pct = 0;
    if (first > 0) {
      pct = (net / first) * 100;
    } else {
      const firstNonZero = vals.find((v) => v > 0);
      if (firstNonZero && firstNonZero !== last) {
        pct = ((last - firstNonZero) / firstNonZero) * 100;
      } else if (last > 0) {
        pct = 100;
      }
    }

    const nonZeroVals = vals.filter((v) => v > 0);
    const low = nonZeroVals.length > 0 ? Math.min(...nonZeroVals) : (vals.length ? Math.min(...vals) : 0);
    const peak = vals.length ? Math.max(...vals) : 0;
    const avg = vals.length ? sum / vals.length : 0;

    return {
      sum,
      net,
      pct,
      step: last - prev,
      peak,
      low,
      avg,
    };
  }, [visibleSeries, isMulti, primary]);

  const resolvedTrend: "up" | "down" | "flat" =
    trend ?? (Math.abs(stats.pct) < NEUTRAL_PCT ? "flat" : stats.net >= 0 ? "up" : "down");
  const resolvedAccent: MetricAccent =
    accent ?? (resolvedTrend === "up" ? "emerald" : resolvedTrend === "down" ? "rose" : "neutral");
  const color = ACCENTS[resolvedAccent];
  const TrendIcon =
    resolvedTrend === "flat" ? ArrowRight : resolvedTrend === "down" ? ArrowDown : ArrowUp;

  const fmtCompact = valueFormatter ?? formatCompact;
  const fmtFull = valueFormatter ?? ((n: number) => n.toLocaleString() + (unit ? ` ${unit}` : ""));
  const fmtDate = dateFormatter ?? ((d: string) => d);
  const sign = (n: number) => (n >= 0 ? "+" : "−") + fmtCompact(Math.abs(n));

  const displayTotal =
    total !== undefined
      ? typeof total === "number"
        ? fmtCompact(total)
        : total
      : fmtCompact(stats.sum);
  const displayDelta = delta ?? sign(stats.step);
  const resolvedDeltaLabel = deltaLabel ?? (isMulti ? "vs prev day" : "today");
  const displayPercent = percent ?? `${Math.abs(stats.pct).toFixed(1)}%`;

  const chartSeries: ChartSeries[] = visibleSeries.map((s, i) => ({
    name: s.name,
    data: s.data,
    color: s.color
      ? s.color
      : s.accent
        ? ACCENTS[s.accent].stroke
        : isMulti
          ? SERIES_COLORS[i % SERIES_COLORS.length]
          : color.stroke,
  }));

  const dominantSeries = useMemo(() => {
    if (!chartSeries.length) return null;
    let maxTotal = -1;
    let best = chartSeries[0];
    for (const s of chartSeries) {
      const sSum = s.data.reduce((acc, p) => acc + p.value, 0);
      if (sSum > maxTotal) {
        maxTotal = sSum;
        best = s;
      }
    }
    return best;
  }, [chartSeries]);

  const lastIndex = (primary?.data.length ?? 1) - 1;
  const fallback = Math.min(defaultIndex ?? lastIndex, lastIndex);

  const handlePeriodChange = (option: PeriodOption) => {
    setSelectedLabel(option.label);
    onPeriodChange?.(option);
  };

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-6 h-12 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="mt-auto h-20 w-full animate-pulse rounded-lg bg-muted/50" />
        </div>
        <div className={`border-t border-border ${sz.footer}`}>
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={shell}>
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <h3 className={`${sz.title} font-semibold tracking-tight text-foreground`}>{title}</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">
              Metrics will appear once shift logs are recorded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* Background Chart Area */}
      <div className="absolute inset-y-0 right-0 z-0" style={{ width: `${REGION_W}%` }}>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to left, ${(dominantSeries?.color || color.stroke)}18, transparent 80%)`,
          }}
        />
        <div
          className="absolute inset-0 text-foreground/[0.06]"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 60%)",
            maskImage: "linear-gradient(to right, transparent, black 60%)",
          }}
        >
          <svg className="h-full w-full" aria-hidden>
            <defs>
              <pattern id={gridId} width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </div>

        <MetricChart
          series={chartSeries}
          view={view}
          defaultIndex={fallback}
          valueFormatter={fmtFull}
          dateFormatter={fmtDate}
          stacked={stacked}
        />
      </div>

      {/* Main Content */}
      <div className={`pointer-events-none relative z-10 flex flex-1 flex-col ${sz.pad}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <h3 className={`${sz.title} font-semibold tracking-tight text-foreground`}>{title}</h3>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div className="pointer-events-auto flex items-center gap-3 text-xs sm:text-sm">
            <span className="flex items-center gap-1 font-semibold" style={{ color: color.text }}>
              <TrendIcon size={14} strokeWidth={2.5} />
              {displayPercent}
            </span>
            <PeriodSelect
              value={selectedLabel}
              options={periods}
              onChange={handlePeriodChange}
              accentText={color.text}
            />
          </div>
        </div>

        {/* Legend for multi-series */}
        {isMulti && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {chartSeries.map((s) => (
              <span
                key={s.name}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div
          className={`mt-4 ${sz.headline} flex items-baseline gap-2 font-bold leading-none tracking-tight text-foreground font-mono`}
        >
          <span>{displayTotal}</span>
          {unit && (
            <span className="text-xs sm:text-sm font-medium text-muted-foreground font-sans uppercase tracking-wider">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`relative z-10 flex items-center justify-between gap-4 border-t border-border bg-card/90 backdrop-blur-xs ${sz.footer} text-xs sm:text-sm`}
      >
        <div>
          <span className="font-semibold" style={{ color: color.text }}>
            {displayDelta}
          </span>{" "}
          <span className="text-muted-foreground">{resolvedDeltaLabel}</span>
        </div>
        {showStats && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{fmtCompact(stats.peak)}</span> peak
            </span>
            <span className="opacity-40">·</span>
            <span>
              <span className="font-semibold text-foreground">{fmtCompact(stats.low)}</span> low
            </span>
            <span className="opacity-40">·</span>
            <span>
              <span className="font-semibold text-foreground">
                {fmtCompact(Math.round(stats.avg))}
              </span>{" "}
              avg
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressMetricCard;

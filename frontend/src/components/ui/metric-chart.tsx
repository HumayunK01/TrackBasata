/* eslint-disable react-refresh/only-export-components */
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

export type MetricAccent = "emerald" | "rose" | "neutral" | "blue" | "purple";
export type ChartView = "curve" | "bars";

export const ACCENTS: Record<
  MetricAccent,
  { stroke: string; text: string; fill: string }
> = {
  emerald: {
    stroke: "#10b981",
    text: "#059669",
    fill: "#10b981",
  },
  rose: {
    stroke: "#f43f5e",
    text: "#e11d48",
    fill: "#f43f5e",
  },
  neutral: {
    stroke: "#64748b",
    text: "#475569",
    fill: "#64748b",
  },
  blue: {
    stroke: "#3b82f6",
    text: "#2563eb",
    fill: "#3b82f6",
  },
  purple: {
    stroke: "#8b5cf6",
    text: "#7c3aed",
    fill: "#8b5cf6",
  },
};

export const SERIES_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toLocaleString();
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
}

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => v.toLocaleString(),
  dateFormatter = (d) => d,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const isMulti = payload.length > 1;
  const total = isMulti ? payload.reduce((s, item) => s + (item.value ?? 0), 0) : null;
  const nonZero = payload.filter((item) => (item.value ?? 0) > 0);
  const itemsToShow = isMulti && nonZero.length > 0 ? nonZero : payload;

  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md min-w-[140px]">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-1 font-medium text-foreground">
        <span>{dateFormatter(label ?? "")}</span>
        {total !== null && (
          <span className="font-bold text-foreground font-mono">
            {valueFormatter(total)}
          </span>
        )}
      </div>
      <div className="mt-1.5 space-y-1">
        {itemsToShow.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground truncate max-w-[130px]">{item.name}</span>
            </div>
            <span className="font-semibold text-foreground font-mono shrink-0">
              {valueFormatter(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  defaultIndex?: number;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
  stacked?: boolean;
}

export function MetricChart({
  series,
  view,
  valueFormatter,
  dateFormatter,
  stacked,
}: MetricChartProps) {
  const chartId = React.useId().replace(/:/g, "");

  const chartData = React.useMemo(() => {
    if (!series.length || !series[0]?.data) return [];
    return series[0].data.map((point, index) => {
      const entry: Record<string, string | number> = { date: point.date };
      series.forEach((s) => {
        entry[s.name] = s.data[index]?.value ?? 0;
      });
      return entry;
    });
  }, [series]);

  if (!chartData.length) return null;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        {view === "bars" ? (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              content={
                <CustomTooltip
                  valueFormatter={valueFormatter}
                  dateFormatter={dateFormatter}
                />
              }
            />
            {series.map((s, idx) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                stackId={stacked || (series.length > 1 && stacked !== false) ? "stack" : undefined}
                fill={s.color}
                radius={
                  stacked || series.length > 1
                    ? idx === series.length - 1
                      ? [3, 3, 0, 0]
                      : [0, 0, 0, 0]
                    : [4, 4, 0, 0]
                }
                opacity={0.88}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              {series.map((s, idx) => (
                <linearGradient
                  key={s.name}
                  id={`gradient-${chartId}-${idx}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip
              content={
                <CustomTooltip
                  valueFormatter={valueFormatter}
                  dateFormatter={dateFormatter}
                />
              }
            />
            {series.map((s, idx) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#gradient-${chartId}-${idx})`}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

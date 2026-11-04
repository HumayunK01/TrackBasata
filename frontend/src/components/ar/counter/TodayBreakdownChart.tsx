import { useMemo } from "react";
import type { Category } from "@/hooks/useCategories";
import { colorForKey } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";

interface TodayBreakdownChartProps {
  activeCategories: Category[];
  counts: Record<string, number>;
  total: number;
  className?: string;
}

export function TodayBreakdownChart({
  activeCategories,
  counts,
  total,
  className,
}: TodayBreakdownChartProps) {
  const items = useMemo(() => {
    return activeCategories.map((cat) => {
      const count = counts[cat.key] ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const clr = colorForKey(cat.key);
      return { cat, count, pct, clr };
    });
  }, [activeCategories, counts, total]);

  // Categories that have documents counted today
  const countedItems = useMemo(() => {
    return items.filter((it) => it.count > 0);
  }, [items]);

  // SVG Geometry for Donut Chart
  const size = 88;
  const strokeWidth = 7;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute SVG stroke slices
  const slices = useMemo(() => {
    if (total <= 0 || countedItems.length === 0) return [];
    let cumulative = 0;
    const gap = countedItems.length > 1 ? 2 : 0;

    return countedItems.map((it) => {
      const ratio = it.count / total;
      const rawLength = ratio * circumference;
      const strokeDash = Math.max(0, rawLength - gap);
      const strokeOffset = -cumulative;
      cumulative += rawLength;

      return {
        ...it,
        strokeDash,
        strokeOffset,
      };
    });
  }, [countedItems, total, circumference]);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 min-w-0", className)}>
      {/* ── Donut Circle Chart ── */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] overflow-visible"
          aria-hidden="true"
        >
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />

          {/* Slices */}
          {slices.map((slice) => (
            <circle
              key={slice.cat.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.clr}
              strokeWidth={strokeWidth}
              strokeDasharray={`${slice.strokeDash} ${circumference}`}
              strokeDashoffset={slice.strokeOffset}
              className="transition-[stroke-dashoffset,stroke-dasharray] duration-500 ease-out"
              style={{
                filter: "drop-shadow(0 0 2px rgba(0,0,0,0.2))",
              }}
            />
          ))}
        </svg>

        {/* Center: 100% Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-foreground leading-none tracking-tight">
            {total > 0 ? "100%" : "0%"}
          </span>
          <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground/60 font-semibold mt-0.5">
            Total
          </span>
        </div>
      </div>

      {/* ── What is Being Counted Breakdown ── */}
      <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5 w-full">
        <div className="flex items-center justify-between gap-2 text-2xs font-mono font-semibold uppercase tracking-wider text-muted-foreground/75">
          <span>What's Being Counted</span>
          {total > 0 && (
            <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
              {countedItems.length} active ({total} docs)
            </span>
          )}
        </div>

        {countedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {countedItems.map(({ cat, count, pct, clr }) => (
              <div
                key={cat.key}
                className="flex items-center justify-between gap-2 min-w-0 bg-muted/25 px-2 py-1 rounded-md border border-border/30"
                title={`${cat.label}: ${count} docs (${pct}%)`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: clr }}
                    aria-hidden
                  />
                  <span className="truncate text-foreground/90 font-medium text-[11px] sm:text-xs">
                    {cat.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] tabular-nums shrink-0">
                  <span className="font-semibold text-foreground/90">{count}</span>
                  <span className="text-muted-foreground/70">({pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic py-1">
            Tap cards below to begin counting today's documents.
          </p>
        )}
      </div>
    </div>
  );
}

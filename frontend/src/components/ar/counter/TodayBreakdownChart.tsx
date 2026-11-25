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
  const countedItems = useMemo(() => {
    return activeCategories
      .map((cat) => {
        const count = counts[cat.key] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const exactPct = total > 0 ? (count / total) * 100 : 0;
        const clr = colorForKey(cat.key);
        return { cat, count, pct, exactPct, clr };
      })
      .filter((it) => it.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [activeCategories, counts, total]);

  const topItem = countedItems[0] ?? null;

  const gridColsClass = useMemo(() => {
    const n = countedItems.length;
    if (n <= 1) return "grid-cols-1 sm:max-w-xs";
    if (n === 2) return "grid-cols-1 sm:grid-cols-2";
    if (n === 3) return "grid-cols-1 sm:grid-cols-3";
    return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
  }, [countedItems.length]);

  return (
    <div className={cn("flex flex-col justify-center min-w-0 w-full space-y-3", className)}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">Category Breakdown</span>
        {topItem ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground min-w-0">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: topItem.clr }}
              aria-hidden="true"
            />
            <span className="truncate max-w-[180px] font-medium text-foreground/85">
              {topItem.cat.label}
            </span>
            <span className="font-mono font-semibold text-foreground tabular-nums shrink-0">
              {topItem.pct}%
            </span>
          </span>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground/65">0%</span>
        )}
      </div>

      {/* Proportional Segmented Volume Bar */}
      <div
        className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden flex gap-[2px]"
        role="img"
        aria-label={
          countedItems.length > 0
            ? `Category volume breakdown across ${countedItems.length} categories`
            : "No documents counted yet"
        }
      >
        {countedItems.map((item) => (
          <div
            key={item.cat.key}
            style={{
              width: `${Math.max(item.exactPct, 1.5)}%`,
              backgroundColor: item.clr,
            }}
            title={`${item.cat.label}: ${item.count} docs (${item.pct}%)`}
            className="h-full first:rounded-l-full last:rounded-r-full transition-[width] duration-300 ease-out"
          />
        ))}
      </div>

      {/* Sorted Category Share Pills */}
      {countedItems.length > 0 ? (
        <div className={cn("grid gap-2 pt-0.5", gridColsClass)}>
          {countedItems.map(({ cat, count, pct, clr }) => (
            <div
              key={cat.key}
              className="flex items-center justify-between gap-2.5 min-w-0 rounded-xl bg-muted/35 border border-border/45 px-3 py-2"
              title={`${cat.label}: ${count} docs (${pct}%)`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: clr }}
                  aria-hidden="true"
                />
                <span className="truncate text-xs font-medium text-foreground">
                  {cat.label}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 font-mono tabular-nums shrink-0">
                <span className="text-xs font-bold text-foreground">
                  {String(count).padStart(2, "0")}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/75 pt-0.5">
          {activeCategories.length > 0
            ? "Tap any counter card below to start logging today's volume."
            : "Add categories from the tray below to begin counting."}
        </p>
      )}
    </div>
  );
}

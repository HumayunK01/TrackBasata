import { CategoryStatCard, EmptyState } from "@/components/ar/industrial";
import { Tags } from "@/components/ui/icons";

export interface CategoryBreakdownEntry {
  key: string;
  label: string;
  short: string;
  value: number;
  color: string;
  sparkline?: number[];
}

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownEntry[];
  totalDocs: number;
}

export function CategoryBreakdown({ breakdown, totalDocs }: CategoryBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div className="rounded-2xl border border-border/65 bg-card/80 p-6">
        <EmptyState
          icon={Tags}
          title="No Category Activity"
          hint="No category activity recorded in this date range."
        />
      </div>
    );
  }

  const sorted = [...breakdown].sort((a, b) => b.value - a.value);
  const categorySum = sorted.reduce((s, c) => s + c.value, 0) || totalDocs || 1;

  return (
    <div className="space-y-3">
      {/* Proportional Composition Bar */}
      <div className="rounded-2xl border border-border/65 bg-card/80 px-4 py-3 shadow-2xs space-y-2.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50 gap-0.5">
          {sorted.map((c) => {
            const pct = Math.max(1.5, (c.value / categorySum) * 100);
            return (
              <div
                key={c.key}
                style={{ width: `${pct}%`, backgroundColor: c.color }}
                title={`${c.label}: ${c.value.toLocaleString()} (${((c.value / categorySum) * 100).toFixed(1)}%)`}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          {sorted.map((c) => {
            const share = (c.value / categorySum) * 100;
            return (
              <div key={c.key} className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-muted-foreground font-medium truncate">{c.label}</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {c.value.toLocaleString()}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
                  ({share.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Width Category Cards Grid (aligns with the 4-column KPI strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {sorted.map((c) => {
          const share = (c.value / categorySum) * 100;
          return (
            <CategoryStatCard
              key={c.key}
              label={c.label}
              value={c.value}
              color={c.color}
              share={share}
              sparkline={c.sparkline}
            />
          );
        })}
      </div>
    </div>
  );
}

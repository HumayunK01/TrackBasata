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
      <div className="rounded-2xl border border-border bg-card p-6">
        <EmptyState
          icon={Tags}
          title="No Category Activity"
          hint="No category activity recorded in this date range."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(168px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(192px,1fr))]">
      {[...breakdown]
        .sort((a, b) => b.value - a.value)
        .map((c) => {
          const share = totalDocs > 0 ? (c.value / totalDocs) * 100 : 0;
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
  );
}

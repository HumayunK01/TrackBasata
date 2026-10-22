import React, { useMemo } from "react";
import {
  Tags,
  Award,
  FileText,
  Sparkles,
} from "@/components/ui/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { TeamUserCategoryContribution } from "./TeamOverviewTab";
import { colorForKey } from "@/lib/cat-colors";
import Skeleton from "react-loading-skeleton";

interface TeamMemberCategoriesTabProps {
  categories: TeamUserCategoryContribution[];
  loading: boolean;
  memberName: string;
}

export const TeamMemberCategoriesTab = React.memo(function TeamMemberCategoriesTab({
  categories,
  loading,
  memberName,
}: TeamMemberCategoriesTabProps) {
  const totalDocsAllCategories = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.totalDocs ?? 0), 0);
  }, [categories]);

  const topCategory = categories[0] ?? null;

  // Chart data
  const chartData = useMemo(() => {
    return categories.map((c) => ({
      name: c.short || c.key,
      fullName: c.label,
      docs: c.totalDocs ?? 0,
      share: c.share ?? 0,
      color: colorForKey(c.key),
    }));
  }, [categories]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height={140} className="rounded-2xl" />
        <Skeleton height={200} className="rounded-2xl" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-2xl p-12 text-center space-y-2 shadow-xs">
        <div className="size-10 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground grid place-items-center mx-auto">
          <Tags className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">No Category Contributions Yet</p>
        <p className="text-xs text-muted-foreground">
          {memberName} has not logged any categorized document processing entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Category Intelligence KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Active Categories
          </span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1 flex items-center gap-1.5">
            <Tags className="size-4 text-primary" />
            <span>{categories.length} categories</span>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Primary Specialty
          </span>
          <div className="text-base sm:text-lg font-bold text-emerald-500 mt-1 flex items-center gap-1.5 truncate">
            <Award className="size-4 shrink-0" />
            <span className="truncate">{topCategory?.label || "None"}</span>
            {topCategory?.share !== undefined && (
              <span className="text-xs font-mono font-bold text-foreground">
                ({topCategory.share}%)
              </span>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Total Categorized Output
          </span>
          <div className="text-xl font-bold tabular-nums text-foreground mt-1 flex items-center gap-1.5">
            <FileText className="size-4 text-emerald-500" />
            <span>{totalDocsAllCategories.toLocaleString()} docs</span>
          </div>
        </div>
      </div>

      {/* 2. Visual Category Distribution Chart */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500" />
              Category Workload Distribution
            </h4>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Comparative output volume per document workflow
            </p>
          </div>
          <span className="text-2xs font-mono text-muted-foreground">
            Ranked by volume
          </span>
        </div>

        <div className="h-56 sm:h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#333333", strokeOpacity: 0.2 }}
              />
              <YAxis
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-2.5 shadow-xl text-xs space-y-1">
                      <p className="font-bold text-foreground">{d.fullName}</p>
                      <p className="text-muted-foreground flex justify-between gap-4">
                        <span>Documents:</span>
                        <strong className="text-emerald-500 font-mono">
                          {d.docs.toLocaleString()} docs
                        </strong>
                      </p>
                      <p className="text-muted-foreground flex justify-between gap-4">
                        <span>Share:</span>
                        <strong className="text-foreground font-mono">{d.share}%</strong>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="docs" radius={[6, 6, 2, 2]} maxBarSize={44}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Detailed Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((c, index) => {
          const color = colorForKey(c.key);
          const docs = c.totalDocs ?? 0;
          const share = c.share ?? 0;

          return (
            <div
              key={c.key}
              className="bg-card border border-border/60 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-emerald-500/35 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border font-mono shrink-0"
                    style={{
                      backgroundColor: `${color}15`,
                      color: color,
                      borderColor: `${color}35`,
                    }}
                  >
                    {c.short}
                  </span>
                  <h5 className="text-xs font-semibold text-foreground truncate">{c.label}</h5>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  #{index + 1}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-extrabold text-foreground font-mono tabular-nums">
                    {docs.toLocaleString()} docs
                  </span>
                  <span className="text-xs font-bold text-emerald-500 font-mono">{share}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${share}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  LineChart,
  PieChart as PieIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMemberItem } from "./TeamMemberCard";
import type { DailyLog } from "@/types/log";
import { totalForLog } from "@/types/log";

interface TeamAnalyticsChartsProps {
  members: TeamMemberItem[];
  allLogs: DailyLog[];
  onSelectMember?: (id: string) => void;
}

type MetricType = "totalDocs" | "avg" | "daysWorked";
type ChartTab = "comparison" | "timeline" | "distribution";

const CHART_PALETTE = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
];

export const TeamAnalyticsCharts = React.memo(function TeamAnalyticsCharts({
  members,
  allLogs,
  onSelectMember,
}: TeamAnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>("comparison");
  const [metric, setMetric] = useState<MetricType>("totalDocs");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Data for Member Comparison Bar Chart
  const comparisonData = useMemo(() => {
    return members.map((m) => {
      const name = `${m.first_name || ""} ${m.last_name || ""}`.trim() || "User";
      return {
        id: m.id,
        name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
        fullName: name,
        totalDocs: m.totalDocs,
        avg: m.avg,
        daysWorked: m.daysWorked,
        role: m.role,
        isDisabled: m.is_disabled,
      };
    });
  }, [members]);

  // 2. Data for 14-Day Team Throughput Timeline
  const timelineData = useMemo(() => {
    // Generate last 14 dates YYYY-MM-DD
    const days: { date: string; label: string; docs: number; activeMembers: number }[] = [];
    const dateMap = new Map<string, { docs: number; users: Set<string> }>();

    for (const log of allLogs) {
      if (log.is_off_day) continue;
      const d = log.log_date;
      const count = totalForLog(log);
      const existing = dateMap.get(d) ?? { docs: 0, users: new Set<string>() };
      existing.docs += count;
      if (count > 0) existing.users.add(log.user_id);
      dateMap.set(d, existing);
    }

    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const info = dateMap.get(iso) ?? { docs: 0, users: new Set() };
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({
        date: iso,
        label,
        docs: info.docs,
        activeMembers: info.users.size,
      });
    }

    return days;
  }, [allLogs]);

  // 3. Data for Workload Distribution Donut
  const distributionData = useMemo(() => {
    const totalDocsAll = members.reduce((sum, m) => sum + m.totalDocs, 0);
    return members
      .filter((m) => m.totalDocs > 0)
      .map((m, idx) => {
        const name = `${m.first_name || ""} ${m.last_name || ""}`.trim() || "User";
        const share = totalDocsAll > 0 ? Math.round((m.totalDocs / totalDocsAll) * 100) : 0;
        return {
          id: m.id,
          name,
          value: m.totalDocs,
          share,
          color: CHART_PALETTE[idx % CHART_PALETTE.length],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [members]);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center">
            {activeTab === "comparison" ? (
              <BarChart3 className="size-4" />
            ) : activeTab === "timeline" ? (
              <LineChart className="size-4" />
            ) : (
              <PieIcon className="size-4" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              Team Productivity Analytics
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Visualized
              </span>
            </h2>
            <p className="text-2xs text-muted-foreground mt-0.5">
              {activeTab === "comparison"
                ? "Compare associate throughput side-by-side"
                : activeTab === "timeline"
                ? "14-day team production velocity curve"
                : "Share of total team document output"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("comparison")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "comparison"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>Comparison</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "timeline"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LineChart className="size-3.5" />
              <span>14-Day Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("distribution")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "distribution"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PieIcon className="size-3.5" />
              <span>Workload Share</span>
            </button>
          </div>

          {/* Metric Selector for Comparison Bar Chart */}
          {activeTab === "comparison" && (
            <div className="flex items-center p-0.5 rounded-lg bg-muted/40 border border-border/40 text-2xs">
              <button
                type="button"
                onClick={() => setMetric("totalDocs")}
                className={cn(
                  "px-2 py-1 rounded transition-colors cursor-pointer",
                  metric === "totalDocs"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Docs
              </button>
              <button
                type="button"
                onClick={() => setMetric("avg")}
                className={cn(
                  "px-2 py-1 rounded transition-colors cursor-pointer",
                  metric === "avg"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Avg/Day
              </button>
              <button
                type="button"
                onClick={() => setMetric("daysWorked")}
                className={cn(
                  "px-2 py-1 rounded transition-colors cursor-pointer",
                  metric === "daysWorked"
                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Days
              </button>
            </div>
          )}

          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? "Expand charts" : "Collapse charts"}
            className="size-7 rounded-lg border border-border/50 bg-card hover:bg-muted/50 grid place-items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {!isCollapsed && (
        <div className="pt-4">
          {/* TAB 1: Comparison Bar Chart */}
          {activeTab === "comparison" && (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData}
                  margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
                  onClick={(state) => {
                    const activePayload = state?.activePayload?.[0]?.payload;
                    if (activePayload?.id && onSelectMember) {
                      onSelectMember(activePayload.id);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="barEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#333333", strokeOpacity: 0.2 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(16, 185, 129, 0.08)", radius: 6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl text-xs space-y-1 z-50">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            {d.fullName}
                            {d.role === "admin" && (
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
                                Admin
                              </span>
                            )}
                          </p>
                          <div className="text-muted-foreground pt-1 border-t border-border/40 space-y-0.5">
                            <p className="flex justify-between gap-4">
                              <span>Total Docs:</span>
                              <strong className="text-emerald-500 font-mono">
                                {d.totalDocs.toLocaleString()}
                              </strong>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Daily Avg:</span>
                              <strong className="text-foreground font-mono">{d.avg} docs/day</strong>
                            </p>
                            <p className="flex justify-between gap-4">
                              <span>Days Worked:</span>
                              <strong className="text-foreground font-mono">{d.daysWorked} days</strong>
                            </p>
                          </div>
                          <p className="text-[10px] text-primary/80 pt-1 italic">Click bar to view profile</p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={metric}
                    fill="url(#barEmerald)"
                    radius={[6, 6, 2, 2]}
                    maxBarSize={48}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TAB 2: 14-Day Timeline Area Chart */}
          {activeTab === "timeline" && (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 15, right: 10, left: -10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="timelineEmerald" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#333333", strokeOpacity: 0.2 }}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{d.label}</p>
                          <p className="text-muted-foreground flex justify-between gap-4">
                            <span>Team Output:</span>
                            <strong className="text-emerald-500 font-mono">
                              {d.docs.toLocaleString()} docs
                            </strong>
                          </p>
                          <p className="text-muted-foreground flex justify-between gap-4">
                            <span>Active Associates:</span>
                            <strong className="text-foreground font-mono">{d.activeMembers} logging</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="docs"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#timelineEmerald)"
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#047857" }}
                    activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TAB 3: Workload Share Donut */}
          {activeTab === "distribution" && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-64 sm:h-72 w-full">
              <div className="size-52 sm:size-60 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl p-2.5 shadow-xl text-xs space-y-0.5">
                            <p className="font-bold text-foreground">{d.name}</p>
                            <p className="text-emerald-500 font-mono font-semibold">
                              {d.value.toLocaleString()} docs ({d.share}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with shares */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full max-w-md">
                {distributionData.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectMember?.(d.id)}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="font-medium text-foreground truncate">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-2xs font-mono">
                      <span className="font-bold text-foreground">{d.share}%</span>
                      <span className="text-muted-foreground">({d.value.toLocaleString()})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

import React, { useMemo, useState, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { DailyLog } from "@/types/log";
import type { Category } from "@/hooks/useCategories";
import type { Profile } from "@/hooks/useProfile";
import { colorForKey } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";
import { CheckCheck, ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { PieChart as PieIcon, BarChart3, LayoutGrid } from "lucide-react";

interface Props {
  categories: Category[];
  logs: DailyLog[];
  profiles: Profile[];
  currentUserId?: string;
  className?: string;
}

export interface ContributorStat {
  userId: string;
  name: string;
  initials: string;
  role: string;
  count: number;
  sharePercent: number; // Share of category total (0-100)
  color: string;
}

export interface CategoryWorkloadItem {
  key: string;
  label: string;
  short: string;
  color: string;
  totalDocs: number;
  contributors: ContributorStat[];
}

export interface MemberCategoryShare {
  key: string;
  label: string;
  short: string;
  color: string;
  count: number;
  sharePercent: number; // Share of member's total work (0-100)
}

export interface MemberWorkloadItem {
  userId: string;
  name: string;
  initials: string;
  role: string;
  totalDocs: number;
  categories: MemberCategoryShare[];
}

// Curated vibrant colors for team member donut slices
const MEMBER_COLORS = [
  "#38bdf8", // Sky blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#e11d48", // Rose
];

/**
 * Filter out categories explicitly excluded from the Console dashboard:
 * Worked on NG, banchod, Patient Chart Created, moved_to_inbox, Faxback
 */
export function isConsoleExcludedCategory(key?: string, label?: string): boolean {
  if (!key && !label) return false;
  const k = (key ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  const l = (label ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  const excluded = new Set([
    "workedonng",
    "banchod",
    "patientchartcreated",
    "movedtoinbox",
  ]);
  return excluded.has(k) || excluded.has(l);
}


/**
 * Reusable Circular SVG Progress Ring Gauge
 */
export function CirclePercentRing({
  value,
  size = 52,
  strokeWidth = 4.5,
  color = "hsl(var(--primary))",
  className,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const safePct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safePct / 100) * circumference;

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform pointer-events-none">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-foreground">
        {children ?? `${Math.round(safePct)}%`}
      </div>
    </div>
  );
}

// Custom tooltip for Recharts donut charts
const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-popover border border-border px-3.5 py-2.5 rounded-xl shadow-2xl text-xs z-[9999] relative pointer-events-none select-none">
      <div className="flex items-center gap-2 mb-1">
        <span className="size-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-foreground truncate">{data.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-muted-foreground">
        <span>{data.value?.toLocaleString()} docs</span>
        <span className="font-bold text-foreground">{data.percent}% of 100%</span>
      </div>
    </div>
  );
};

export const CategoryContributionMatrix = React.memo(function CategoryContributionMatrix({
  categories,
  logs,
  profiles,
  currentUserId,
  className,
}: Props) {
  const [activeTab, setActiveTab] = useState<"donut-focus" | "team-graph" | "all-donuts">("donut-focus");
  const [selectedCatKey, setSelectedCatKey] = useState<string>("");
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Horizontal drag & slide controllers for category pills
  const pillBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingPills, setIsDraggingPills] = useState(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handlePillMouseDown = (e: React.MouseEvent) => {
    if (!pillBarRef.current) return;
    setIsDraggingPills(true);
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - pillBarRef.current.offsetLeft;
    startScrollLeftRef.current = pillBarRef.current.scrollLeft;
  };

  const handlePillMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPills || !pillBarRef.current) return;
    const x = e.pageX - pillBarRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    pillBarRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handlePillMouseUp = () => {
    setIsDraggingPills(false);
  };

  const handlePillWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!pillBarRef.current) return;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      pillBarRef.current.scrollLeft += e.deltaX || e.deltaY;
    }
  };

  const scrollPills = (delta: number) => {
    if (pillBarRef.current) {
      pillBarRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  const profileMap = useMemo(() => new Map<string, Profile>(profiles.map((p) => [p.id, p])), [profiles]);
  const catMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.key, c])), [categories]);

  // Aggregate category workload: Category -> contributors & share of 100%
  const categoryWorkload: CategoryWorkloadItem[] = useMemo(() => {
    const workingLogs = logs.filter((l) => !l.is_off_day);
    const catTotals: Record<string, number> = {};
    const catUserTotals: Record<string, Record<string, number>> = {};

    for (const log of workingLogs) {
      if (!log.counts) continue;
      const uid = log.user_id;
      for (const [k, v] of Object.entries(log.counts)) {
        if (isConsoleExcludedCategory(k, catMap.get(k)?.label)) continue;
        if (typeof v === "number" && v > 0) {
          catTotals[k] = (catTotals[k] ?? 0) + v;
          if (!catUserTotals[k]) catUserTotals[k] = {};
          catUserTotals[k][uid] = (catUserTotals[k][uid] ?? 0) + v;
        }
      }
    }

    return Object.entries(catTotals)
      .filter(([key, total]) => total > 0 && !isConsoleExcludedCategory(key, catMap.get(key)?.label))
      .map(([key, totalDocs]) => {
        const cat = catMap.get(key);
        const userCounts = catUserTotals[key] || {};
        const contributors: ContributorStat[] = Object.entries(userCounts)
          .filter(([_, count]) => count > 0)
          .map(([uid, count], idx) => {
            const prof = profileMap.get(uid);
            const name = prof
              ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "Team Member"
              : "Team Member";
            const initials =
              prof
                ? ((prof.first_name?.[0] || "") + (prof.last_name?.[0] || "")).toUpperCase() || "?"
                : "?";
            return {
              userId: uid,
              name,
              initials,
              role: prof?.role || "user",
              count,
              sharePercent: totalDocs > 0 ? Math.round((count / totalDocs) * 1000) / 10 : 0,
              color: MEMBER_COLORS[idx % MEMBER_COLORS.length],
            };
          })
          .sort((a, b) => b.count - a.count);

        return {
          key,
          label: cat?.label || key,
          short: cat?.short || key.slice(0, 4).toUpperCase(),
          color: colorForKey(key),
          totalDocs,
          contributors,
        };
      })
      .sort((a, b) => b.totalDocs - a.totalDocs);
  }, [categories, logs, profiles, catMap, profileMap]);

  // Aggregate member workload: Member -> category shares of 100%
  const memberWorkload: MemberWorkloadItem[] = useMemo(() => {
    const workingLogs = logs.filter((l) => !l.is_off_day);
    const userTotals: Record<string, number> = {};
    const userCatTotals: Record<string, Record<string, number>> = {};

    for (const log of workingLogs) {
      if (!log.counts) continue;
      const uid = log.user_id;
      for (const [k, v] of Object.entries(log.counts)) {
        if (isConsoleExcludedCategory(k, catMap.get(k)?.label)) continue;
        if (typeof v === "number" && v > 0) {
          userTotals[uid] = (userTotals[uid] ?? 0) + v;
          if (!userCatTotals[uid]) userCatTotals[uid] = {};
          userCatTotals[uid][k] = (userCatTotals[uid][k] ?? 0) + v;
        }
      }
    }

    return Object.entries(userTotals)
      .filter(([_, total]) => total > 0)
      .map(([uid, totalDocs]) => {
        const prof = profileMap.get(uid);
        const name = prof
          ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "Team Member"
          : "Team Member";
        const initials =
          prof
            ? ((prof.first_name?.[0] || "") + (prof.last_name?.[0] || "")).toUpperCase() || "?"
            : "?";

        const catCounts = userCatTotals[uid] || {};
        const catList: MemberCategoryShare[] = Object.entries(catCounts)
          .filter(([_, count]) => count > 0)
          .map(([k, count]) => {
            const cat = catMap.get(k);
            return {
              key: k,
              label: cat?.label || k,
              short: cat?.short || k.slice(0, 4).toUpperCase(),
              color: colorForKey(k),
              count,
              sharePercent: totalDocs > 0 ? Math.round((count / totalDocs) * 1000) / 10 : 0,
            };
          })
          .sort((a, b) => b.count - a.count);

        return {
          userId: uid,
          name,
          initials,
          role: prof?.role || "user",
          totalDocs,
          categories: catList,
        };
      })
      .sort((a, b) => b.totalDocs - a.totalDocs);
  }, [categories, logs, profiles, catMap, profileMap]);

  // Selected category in Donut view (default to top category)
  const currentCategory = useMemo(() => {
    if (!categoryWorkload.length) return null;
    return categoryWorkload.find((c) => c.key === selectedCatKey) || categoryWorkload[0];
  }, [categoryWorkload, selectedCatKey]);

  // Pie chart dataset for the current category focus donut
  const categoryPieData = useMemo(() => {
    if (!currentCategory) return [];
    return currentCategory.contributors.map((c) => ({
      name: c.name,
      userId: c.userId,
      value: c.count,
      percent: c.sharePercent,
      color: c.color,
    }));
  }, [currentCategory]);

  // Team stacked bar dataset
  const stackedBarData = useMemo(() => {
    return memberWorkload.map((m) => {
      const entry: Record<string, any> = {
        name: m.name.split(" ")[0] || m.name,
        fullName: m.name,
        totalDocs: m.totalDocs,
      };
      m.categories.forEach((c) => {
        entry[c.key] = c.count;
      });
      return entry;
    });
  }, [memberWorkload]);

  // Active category keys for stacked bar
  const activeCategoryKeys = useMemo(() => {
    return categoryWorkload.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.color,
    }));
  }, [categoryWorkload]);

  if (categoryWorkload.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Top Header & Tab Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              <PieIcon className="size-4 text-primary" />
              <span>Who Worked On What</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
              100% Breakdown
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            See who handled each category and each person's share of the work.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("donut-focus")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "donut-focus"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PieIcon className="size-3.5" />
              <span>By Category</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("team-graph")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "team-graph"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>By Team Member</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all-donuts")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "all-donuts"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span>All Categories</span>
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── VIEW 1: CATEGORY DONUT CIRCLE & CONTRIBUTOR RINGS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "donut-focus" && currentCategory && (
        <div className="space-y-4">
          {/* Category Chips Bar with Click-to-Drag & Smooth Arrows */}
          <div className="relative flex items-center gap-1.5 group/pills">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollPills(-220)}
              className="hidden sm:flex size-7 rounded-xl bg-card border border-border/70 items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 shrink-0 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Slide left"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            {/* Draggable & Scrollable Pills container */}
            <div
              ref={pillBarRef}
              onMouseDown={handlePillMouseDown}
              onMouseMove={handlePillMouseMove}
              onMouseUp={handlePillMouseUp}
              onMouseLeave={handlePillMouseUp}
              onWheel={handlePillWheel}
              className={cn(
                "flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 select-none transition-colors",
                isDraggingPills ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              {categoryWorkload.map((c) => {
                const isSelected = (selectedCatKey || categoryWorkload[0].key) === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      if (!hasDraggedRef.current) {
                        setSelectedCatKey(c.key);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border flex items-center gap-2",
                      isSelected
                        ? "bg-card text-foreground font-semibold shadow-xs border-primary scale-[1.02]"
                        : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <span className="size-2.5 rounded-full shrink-0 shadow-xs pointer-events-none" style={{ backgroundColor: c.color }} />
                    <span className="pointer-events-none">{c.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted/60 text-foreground/80 font-bold pointer-events-none">
                      {c.totalDocs.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollPills(220)}
              className="hidden sm:flex size-7 rounded-xl bg-card border border-border/70 items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 shrink-0 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Slide right"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Main Visual Card: Donut Chart on Left, Contributor Circular Gauges on Right */}
          <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Big Interactive Donut Chart with Center Metric Circle */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 relative">
                <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                  {/* Centered Circle Metrics - placed behind chart at z-0 so Tooltip renders on top */}
                  <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
                    <span
                      className="size-2 rounded-full mb-1 shadow-xs"
                      style={{ backgroundColor: currentCategory.color }}
                    />
                    <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                      {currentCategory.totalDocs.toLocaleString()}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground font-semibold">
                      {currentCategory.short} · 100%
                    </span>
                    <span className="text-[9px] text-muted-foreground/75 mt-0.5">
                      {currentCategory.contributors.length} {currentCategory.contributors.length === 1 ? "member" : "members"}
                    </span>
                  </div>

                  {/* Chart placed in relative z-10 with high wrapperStyle z-index on Tooltip */}
                  <div className="relative z-10 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={<CustomPieTooltip />}
                          wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
                        />
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={105}
                          paddingAngle={categoryPieData.length > 1 ? 3 : 0}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {categoryPieData.map((entry) => (
                            <Cell
                              key={`slice-${entry.userId}`}
                              fill={entry.color}
                              stroke="hsl(var(--card))"
                              strokeWidth={hoveredSlice === entry.userId ? 4 : 2}
                              className="transition-all duration-200 cursor-pointer"
                              opacity={hoveredSlice && hoveredSlice !== entry.userId ? 0.45 : 1}
                              onMouseEnter={() => setHoveredSlice(entry.userId)}
                              onMouseLeave={() => setHoveredSlice(null)}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Subtitle / Donut legend */}
                <div className="mt-2 text-center">
                  <p className="text-xs font-semibold text-foreground">{currentCategory.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Work distribution across team members
                  </p>
                </div>
              </div>

              {/* Right Column: Contributor Circular Gauges */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    Team Members
                  </span>
                  <span className="text-xs font-mono text-emerald-500 flex items-center gap-1 font-semibold">
                    <CheckCheck className="size-3.5" />
                    <span>Total: 100%</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentCategory.contributors.map((contrib, rank) => {
                    const isMe = contrib.userId === currentUserId;
                    const isHovered = hoveredSlice === contrib.userId;

                    return (
                      <div
                        key={contrib.userId}
                        onMouseEnter={() => setHoveredSlice(contrib.userId)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                          isHovered
                            ? "bg-muted/40 border-primary shadow-xs scale-[1.01]"
                            : "bg-card/80 border-border/60 hover:border-border hover:bg-muted/20"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular SVG Ring Gauge */}
                          <CirclePercentRing
                            value={contrib.sharePercent}
                            size={48}
                            strokeWidth={4.5}
                            color={contrib.color}
                          >
                            <span className="text-[10px] font-mono font-bold">{contrib.sharePercent}%</span>
                          </CirclePercentRing>

                          {/* Member info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {contrib.name}
                              </span>
                              {isMe && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={cn(
                                  "text-[9px] font-bold font-mono px-1.5 py-0.2 rounded",
                                  rank === 0
                                    ? "bg-amber-500/15 text-amber-500"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                #{rank + 1}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {contrib.count.toLocaleString()} docs
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Color swatch dot */}
                        <span
                          className="size-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: contrib.color }}
                          title={`${contrib.sharePercent}% share`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── VIEW 2: TEAM WORKLOAD GRAPH & RADIAL MEMBER DONUTS ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "team-graph" && (
        <div className="space-y-4">
          {/* Top Hero: 100% Stacked Workload Bar Chart */}
          <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span>Work Split by Team Member</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  See how each person's completed documents were divided across categories.
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-lg bg-muted/50 border border-border/50">
                {memberWorkload.length} Active Members
              </span>
            </div>

            {/* Stacked Recharts Bar Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "hsl(var(--accent) / 0.5)", radius: 6 }}
                  />
                  {activeCategoryKeys.map((cat, idx) => (
                    <Bar
                      key={cat.key}
                      dataKey={cat.key}
                      name={cat.label}
                      stackId="workload"
                      fill={cat.color}
                      isAnimationActive={false}
                      radius={idx === activeCategoryKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Color Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40 text-xs">
              {activeCategoryKeys.map((cat) => (
                <div key={cat.key} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-muted-foreground">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid: Circular Donut Gauges per Team Member */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberWorkload.map((m) => {
              const isMe = m.userId === currentUserId;
              const memberPieData = m.categories.map((c) => ({
                name: c.label,
                value: c.count,
                percent: c.sharePercent,
                color: c.color,
              }));

              return (
                <div
                  key={m.userId}
                  className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:border-border transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0 border border-primary/20">
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">{m.name}</span>
                          {isMe && (
                            <span className="text-[9px] uppercase font-bold px-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize">{m.role}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-foreground">
                        {m.totalDocs.toLocaleString()}
                      </span>
                      <span className="block text-[9px] text-muted-foreground uppercase font-mono">docs</span>
                    </div>
                  </div>

                  {/* Circular Donut of Member's Category Split (100% of their output) */}
                  <div className="relative h-44 flex items-center justify-center">
                    {/* Center stats in donut - placed at z-0 behind chart */}
                    <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
                      <span className="text-sm font-bold font-mono text-foreground">
                        {m.totalDocs.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">100% Work</span>
                    </div>

                    <div className="relative z-10 w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomPieTooltip />} wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }} />
                          <Pie
                            data={memberPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={memberPieData.length > 1 ? 3 : 0}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {memberPieData.map((entry, idx) => (
                              <Cell key={`mem-slice-${idx}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top categories breakdown */}
                  <div className="space-y-1.5 pt-1 border-t border-border/40">
                    {m.categories.slice(0, 3).map((c) => (
                      <div key={c.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-muted-foreground truncate text-[11px]">{c.label}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-muted-foreground">{c.count.toLocaleString()}</span>
                          <span
                            className="font-bold px-1.5 py-0.2 rounded text-[10px]"
                            style={{ backgroundColor: `${c.color}15`, color: c.color }}
                          >
                            {c.sharePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── VIEW 3: ALL CATEGORIES CIRCULAR DONUTS MATRIX ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "all-donuts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryWorkload.map((c) => {
            const pieData = c.contributors.map((contrib) => ({
              name: contrib.name,
              value: contrib.count,
              percent: contrib.sharePercent,
              color: contrib.color,
            }));

            return (
              <div
                key={c.key}
                onClick={() => {
                  setSelectedCatKey(c.key);
                  setActiveTab("donut-focus");
                }}
                className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs hover:border-primary/50 transition-all cursor-pointer group space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: c.color }} />
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {c.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {c.totalDocs.toLocaleString()}{" "}
                    <span className="text-[9px] text-muted-foreground font-normal">docs</span>
                  </span>
                </div>

                {/* Circular Donut in center */}
                <div className="relative h-44 flex items-center justify-center">
                  {/* Center circle text - placed at z-0 behind chart */}
                  <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
                    <span className="text-sm font-bold font-mono text-foreground">100%</span>
                    <span className="text-[9px] uppercase font-mono text-muted-foreground">
                      {c.contributors.length} {c.contributors.length === 1 ? "user" : "users"}
                    </span>
                  </div>

                  <div className="relative z-10 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }} />
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={68}
                          paddingAngle={pieData.length > 1 ? 3 : 0}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`cat-cell-${idx}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Contributor preview with circular gauge */}
                {c.contributors[0] && (
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CirclePercentRing
                        value={c.contributors[0].sharePercent}
                        size={32}
                        strokeWidth={3}
                        color={c.contributors[0].color}
                      >
                        <span className="text-[8px] font-mono">{Math.round(c.contributors[0].sharePercent)}%</span>
                      </CirclePercentRing>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-foreground truncate block">
                          {c.contributors[0].name}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          Top Contributor · #{1}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-primary">
                      {c.contributors[0].sharePercent}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

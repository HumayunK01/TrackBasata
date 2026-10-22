import React, { useMemo } from "react";
import {
  CalendarCheck,
  FileText,
  TrendingUp,
  FileCheck2,
  Tags,
  History,
  Sun,
  BedDouble,
  Target,
  Clock,
  Download,
} from "@/components/ui/icons";
import {
  Award,
  Zap,
  Sparkles,
  CheckCircle2,
  BarChart3,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { isWeekend, totalForLog, formatTableDate, formatDayName, type DailyLog } from "@/types/log";
import { formatDateTime } from "@/components/ar/tracker/tracker-helpers";
import type { TeamMemberItem } from "./TeamMemberCard";
import type { TeamCategory, TeamAuditLog } from "@/hooks/useTeamData";
import type { Profile } from "@/hooks/useProfile";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import { colorForKey } from "@/lib/cat-colors";

export interface TeamUserCategoryContribution extends TeamCategory {
  totalDocs?: number;
  share?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  highlight = false,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  subtext?: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-card border border-border/60 hover:border-emerald-500/35 rounded-2xl p-4 transition-all duration-200 shadow-xs group">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono truncate">
          {label}
        </span>
        <div
          className={cn(
            "size-8 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105",
            highlight
              ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20"
              : "text-primary bg-primary/[0.08] border border-primary/15"
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums text-foreground flex items-baseline gap-2">
          <span>{value}</span>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              {badge}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-muted-foreground mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );
}

interface TeamOverviewTabProps {
  member: TeamMemberItem;
  todayEntry: DailyLog | null;
  faxedBackTotal: number;
  categoriesTotal: number;
  auditTotal: number;
  selectedCategories: TeamUserCategoryContribution[];
  selectedLogs: DailyLog[];
  logsLoading: boolean;
  selectedAudit: TeamAuditLog[];
  auditLoading: boolean;
  profiles: Profile[];
  allUserLogs?: DailyLog[];
  rank?: number;
  onExportLogs?: (kind: "csv" | "pdf") => void;
  onSelectTab?: (tab: "logs" | "faxed-back" | "categories" | "activity") => void;
  describeEvent: (
    event: string,
    details: Record<string, unknown> | null,
    nameForId: (id: string) => string | null,
  ) => string;
}

export const TeamOverviewTab = React.memo(function TeamOverviewTab({
  member,
  todayEntry,
  faxedBackTotal,
  categoriesTotal,
  auditTotal,
  selectedCategories,
  selectedLogs,
  logsLoading,
  selectedAudit,
  auditLoading,
  profiles,
  allUserLogs = [],
  rank,
  onExportLogs,
  onSelectTab,
  describeEvent,
}: TeamOverviewTabProps) {
  const goalProgress = member.daily_goal
    ? Math.min(100, Math.round((member.avg / member.daily_goal) * 100))
    : 0;

  // Performance Tier calculation
  const tier = useMemo(() => {
    if (member.avg >= 100) {
      return {
        label: "Elite Producer",
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        icon: Award,
      };
    }
    if (member.avg >= 70) {
      return {
        label: "High Velocity",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        icon: Zap,
      };
    }
    if (member.avg >= 40) {
      return {
        label: "Core Contributor",
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        icon: CheckCircle2,
      };
    }
    return {
      label: "Standard Pace",
      color: "text-muted-foreground bg-muted/40 border-border/40",
      icon: Sparkles,
    };
  }, [member.avg]);

  // Peak single-day record calculation
  const peakRecord = useMemo(() => {
    const validLogs = allUserLogs.filter((l) => !l.is_off_day);
    if (validLogs.length === 0) return { docs: 0, date: "" };
    let best = validLogs[0];
    let max = totalForLog(best);
    for (const l of validLogs) {
      const c = totalForLog(l);
      if (c > max) {
        max = c;
        best = l;
      }
    }
    return { docs: max, date: formatTableDate(best.log_date) };
  }, [allUserLogs]);

  // 14-Day Production Velocity Trend
  const trendData = useMemo(() => {
    const days: { date: string; label: string; docs: number; isOff: boolean }[] = [];
    const dateMap = new Map<string, DailyLog>();
    for (const l of allUserLogs) {
      dateMap.set(l.log_date, l);
    }

    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const entry = dateMap.get(iso);
      const docs = entry && !entry.is_off_day ? totalForLog(entry) : 0;
      const isOff = entry?.is_off_day ?? false;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ date: iso, label, docs, isOff });
    }
    return days;
  }, [allUserLogs]);

  // Consistency Score (% of non-off days meeting benchmark)
  const consistencyScore = useMemo(() => {
    const working = allUserLogs.filter((l) => !l.is_off_day);
    if (working.length === 0) return 0;
    const target = member.daily_goal && member.daily_goal > 0 ? member.daily_goal * 0.85 : member.avg;
    const metTarget = working.filter((l) => totalForLog(l) >= target).length;
    return Math.round((metTarget / working.length) * 100);
  }, [allUserLogs, member.daily_goal, member.avg]);

  return (
    <div className="space-y-4">
      {/* 1. Associate Hero Summary Banner */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-extrabold text-base grid place-items-center shadow-xs">
            {((member.first_name?.[0] ?? "") + (member.last_name?.[0] ?? "")).toUpperCase() || "?"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                {member.first_name} {member.last_name}
              </h3>
              {rank && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                  {rank === 1 ? "🥇 Rank #1" : rank === 2 ? "🥈 Rank #2" : rank === 3 ? "🥉 Rank #3" : `#${rank} on Team`}
                </span>
              )}
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono inline-flex items-center gap-1", tier.color)}>
                <tier.icon className="size-3" />
                {tier.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{member.role === "admin" ? "System Administrator" : "AR Processing Associate"}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {consistencyScore}% Target Consistency
              </span>
            </p>
          </div>
        </div>

        {/* Quick Export Actions */}
        {onExportLogs && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onExportLogs("csv")}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>CSV Log</span>
            </button>
            <button
              type="button"
              onClick={() => onExportLogs("pdf")}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="size-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Key Performance Indicators Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={FileText}
          label="Total Output"
          value={member.totalDocs.toLocaleString()}
          subtext={`${member.logCount} total logs submitted`}
          highlight
        />
        <StatCard
          icon={CalendarCheck}
          label="Days Logged"
          value={member.daysWorked}
          subtext="Active productive days"
        />
        <StatCard
          icon={TrendingUp}
          label="Daily Velocity"
          value={member.avg}
          subtext="Docs per active day"
          badge={member.avg >= 80 ? "High" : undefined}
        />
        <StatCard
          icon={Flame}
          label="Personal Peak"
          value={peakRecord.docs > 0 ? `${peakRecord.docs} docs` : "—"}
          subtext={peakRecord.date ? `Achieved on ${peakRecord.date}` : "Awaiting records"}
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => onSelectTab?.("faxed-back")}
          className="bg-card/70 hover:bg-card border border-border/50 hover:border-primary/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer text-left"
        >
          <span className="text-muted-foreground flex items-center gap-2 font-medium">
            <FileCheck2 className="size-3.5 text-primary" /> Faxed Back Documents
          </span>
          <span className="font-bold text-foreground font-mono tabular-nums">{faxedBackTotal}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab?.("categories")}
          className="bg-card/70 hover:bg-card border border-border/50 hover:border-primary/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer text-left"
        >
          <span className="text-muted-foreground flex items-center gap-2 font-medium">
            <Tags className="size-3.5 text-primary" /> Active Categories
          </span>
          <span className="font-bold text-foreground font-mono tabular-nums">{categoriesTotal}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab?.("activity")}
          className="bg-card/70 hover:bg-card border border-border/50 hover:border-primary/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-2xs transition-colors cursor-pointer text-left"
        >
          <span className="text-muted-foreground flex items-center gap-2 font-medium">
            <History className="size-3.5 text-primary" /> Audit Trail Events
          </span>
          <span className="font-bold text-foreground font-mono tabular-nums">{auditTotal}</span>
        </button>
      </div>

      {/* 3. Production Velocity Area Chart */}
      <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                14-Day Production Velocity
              </h4>
              <p className="text-2xs text-muted-foreground">
                Recent document output volume per day
              </p>
            </div>
          </div>
          {member.daily_goal && (
            <div className="text-2xs font-mono text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500/80" />
              <span>Goal: {member.daily_goal} docs/day</span>
            </div>
          )}
        </div>

        <div className="h-56 sm:h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="userEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
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
                      <p className="font-bold text-foreground">{d.label}</p>
                      <p className="text-muted-foreground flex justify-between gap-4">
                        <span>Documents:</span>
                        <strong className="text-emerald-500 font-mono">
                          {d.docs} docs
                        </strong>
                      </p>
                      {d.isOff && (
                        <p className="text-[10px] text-amber-500 font-mono">Scheduled Off Day</p>
                      )}
                    </div>
                  );
                }}
              />
              {member.daily_goal && (
                <ReferenceLine
                  y={member.daily_goal}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
              )}
              <Area
                type="monotone"
                dataKey="docs"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#userEmeraldGradient)"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#047857" }}
                activeDot={{ r: 5, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Today Breakdown & Daily Target */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Today's status */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-mono font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Sun className="size-3.5 text-amber-500" /> Today's Shift Output
            </p>
            {!todayEntry ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No entry logged yet today.
              </div>
            ) : todayEntry.is_off_day ? (
              <div className="flex items-center gap-2 py-4 text-sm font-medium text-muted-foreground">
                <BedDouble className="size-4" />
                <span>{isWeekend(todayEntry.log_date) ? "Weekend Off" : "Scheduled Off Day"}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tabular-nums text-emerald-500">
                    {totalForLog(todayEntry)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">documents completed today</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {selectedCategories.map((c) => {
                    const v = (todayEntry.counts ?? {})[c.key] ?? 0;
                    return v > 0 ? (
                      <span
                        key={c.key}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg tabular-nums bg-muted/40 border border-border/50 text-foreground"
                      >
                        <span className="text-muted-foreground mr-1.5">{c.short}</span>
                        <strong className="font-bold text-emerald-500">{v}</strong>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Target Progress */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-mono font-semibold text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Target className="size-3.5 text-emerald-500" /> Daily Target Goal
            </p>
            {member.daily_goal ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tabular-nums text-foreground">{member.avg}</span>
                    <span className="text-xs text-muted-foreground">avg / {member.daily_goal} target</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-emerald-500 font-mono">
                    {goalProgress}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/60 mt-3.5 overflow-hidden border border-border/30">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <p className="text-2xs text-muted-foreground mt-2 font-mono">
                  {member.avg >= member.daily_goal
                    ? "Target goal achieved on average 🎉"
                    : `${member.daily_goal - member.avg} docs/day below target pace`}
                </p>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No custom daily goal target specified for this associate.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Top Categories Breakdown (Workload Distribution) */}
      {selectedCategories.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <Tags className="size-3.5 text-primary" />
              Category Contributions
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground font-mono">
                {categoriesTotal} active categories
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("categories")}
                  className="text-2xs font-semibold text-primary hover:underline cursor-pointer ml-1"
                >
                  View all →
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
            {selectedCategories.slice(0, 6).map((c) => (
              <div
                key={c.key}
                className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border font-mono truncate"
                    style={{
                      backgroundColor: `${colorForKey(c.key)}15`,
                      color: colorForKey(c.key),
                      borderColor: `${colorForKey(c.key)}35`,
                    }}
                  >
                    {c.short}
                  </span>
                  <span className="text-xs font-bold text-foreground font-mono tabular-nums">
                    {(c.totalDocs ?? 0).toLocaleString()} docs
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{c.label}</span>
                    <span className="font-mono">{c.share ?? 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${c.share ?? 0}%`,
                        backgroundColor: colorForKey(c.key),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Recent Logs & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Recent logs */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Recent Daily Logs
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">Latest 6 logs</span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("logs")}
                  className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
          {logsLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton height={28} count={4} />
            </div>
          ) : selectedLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No daily logs recorded yet.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {selectedLogs.slice(0, 6).map((l) => {
                const weekend = isWeekend(l.log_date);
                const isOff = l.is_off_day;
                return (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {formatTableDate(l.log_date)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading">
                        {formatDayName(l.log_date)}
                      </span>
                    </div>
                    {isOff ? (
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide font-heading flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                        <BedDouble className="size-3" /> {weekend ? "Weekend" : "Off Day"}
                      </span>
                    ) : (
                      <span className="text-sm font-bold tabular-nums text-emerald-500 font-mono">
                        {totalForLog(l)} docs
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Recent Activity Trail
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">Latest 6 events</span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("activity")}
                  className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
          {auditLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton height={28} count={4} />
            </div>
          ) : selectedAudit.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No recent activity events.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {selectedAudit.slice(0, 6).map((a) => {
                const dt = formatDateTime(a.created_at);
                return (
                  <div key={a.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/10 transition-colors">
                    <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {describeEvent(a.event, a.details, (id) => {
                          const p = profiles.find((pr) => pr.id === id);
                          return p ? `${p.first_name} ${p.last_name}`.trim() : null;
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 font-mono">
                        {dt ? `${dt.date} · ${dt.time}` : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

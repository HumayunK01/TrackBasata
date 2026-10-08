import React from "react";
import {
  CalendarCheck,
  FileText,
  TrendingUp,
  ChevronRight,
  FileCheck2,
  Tags,
  History,
  Sun,
  BedDouble,
  Target,
  Clock,
} from "@/components/ui/icons";
import { isWeekend, totalForLog, formatTableDate, formatDayName, type DailyLog } from "@/types/log";
import { formatDateTime } from "@/components/ar/tracker/tracker-helpers";
import type { TeamMemberItem } from "./TeamMemberCard";
import type { TeamCategory, TeamAuditLog } from "@/hooks/useTeamData";
import type { Profile } from "@/hooks/useProfile";
import Skeleton from "react-loading-skeleton";

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border border-border/50 hover:border-border/80 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-all shadow-xs">
      <div
        className={`size-9 sm:size-10 rounded-xl grid place-items-center shrink-0 ${
          highlight
            ? "text-primary bg-primary/10 border border-primary/20"
            : "text-primary bg-primary/[0.07] border border-primary/10"
        }`}
      >
        <Icon className="size-4 sm:size-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-bold tabular-nums tracking-tight text-foreground mt-0.5">
          {value}
        </p>
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
  selectedCategories: TeamCategory[];
  selectedLogs: DailyLog[];
  logsLoading: boolean;
  selectedAudit: TeamAuditLog[];
  auditLoading: boolean;
  profiles: Profile[];
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
  describeEvent,
}: TeamOverviewTabProps) {
  const todayDocs = !todayEntry || todayEntry.is_off_day ? 0 : totalForLog(todayEntry);
  const goalProgress = member.daily_goal
    ? Math.min(100, Math.round((member.avg / member.daily_goal) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Primary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard icon={CalendarCheck} label="Days Worked" value={member.daysWorked} />
        <StatCard icon={FileText} label="Total Documents" value={member.totalDocs} />
        <StatCard icon={TrendingUp} label="Daily Average" value={member.avg} />
        <StatCard icon={ChevronRight} label="Today's Docs" value={todayDocs} highlight={todayDocs > 0} />
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <StatCard icon={FileCheck2} label="Faxed Back Docs" value={faxedBackTotal} />
        <StatCard icon={Tags} label="Active Categories" value={categoriesTotal} />
        <StatCard icon={History} label="Audit Events Logged" value={auditTotal} />
      </div>

      {/* Today Breakdown & Daily Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Today's breakdown */}
        <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Sun className="size-3 text-amber-500" /> Today's Status
            </p>
            {!todayEntry ? (
              <p className="text-sm text-muted-foreground">No entry logged yet today.</p>
            ) : todayEntry.is_off_day ? (
              <div className="flex items-center gap-2 py-1 text-sm font-medium text-muted-foreground">
                <BedDouble className="size-4" />
                <span>{isWeekend(todayEntry.log_date) ? "Weekend Off" : "Scheduled Off Day"}</span>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-primary">
                    {totalForLog(todayEntry)}
                  </span>
                  <span className="text-xs text-muted-foreground">documents completed today</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedCategories.map((c) => {
                    const v = (todayEntry.counts ?? {})[c.key] ?? 0;
                    return v > 0 ? (
                      <span
                        key={c.key}
                        className="text-xs font-medium px-2.5 py-1 rounded-md tabular-nums bg-muted/50 border border-border/50 text-foreground"
                      >
                        <span className="text-muted-foreground mr-1.5">{c.short}</span>
                        <strong className="font-semibold text-primary">{v}</strong>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Goal card */}
        <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground mb-2.5 flex items-center gap-1.5">
              <Target className="size-3 text-primary" /> Daily Target
            </p>
            {member.daily_goal ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums text-foreground">{member.avg}</span>
                    <span className="text-xs text-muted-foreground">avg / {member.daily_goal} goal</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-primary">{goalProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/60 mt-3 overflow-hidden border border-border/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No daily goal specified for this member.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Logs & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent logs */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Recent Daily Logs</h4>
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
                      <span className="text-sm font-bold tabular-nums text-primary">
                        {totalForLog(l)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/10">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Recent Activity Trail</h4>
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
                      <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
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

import React from "react";
import {
  FileText,
  Users,
  TrendingUp,
  Award,
  CalendarCheck,
  Ban,
  Sparkles,
} from "@/components/ui/icons";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMemberItem } from "./TeamMemberCard";

interface TeamStatsGridProps {
  members: TeamMemberItem[];
  activeTodayCount: number;
  totalTeamDocs: number;
  totalWorkingDays: number;
  teamDailyAvg: number;
  topPerformer: TeamMemberItem | null;
  onSelectMember?: (id: string) => void;
}

export const TeamStatsGrid = React.memo(function TeamStatsGrid({
  members,
  activeTodayCount,
  totalTeamDocs,
  totalWorkingDays,
  teamDailyAvg,
  topPerformer,
  onSelectMember,
}: TeamStatsGridProps) {
  const activeMembersCount = members.filter((m) => !m.is_disabled).length;
  const disabledCount = members.filter((m) => m.is_disabled).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Team Documents */}
      <div className="relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/60 hover:border-emerald-500/35 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs group">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Total Output
          </span>
          <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 grid place-items-center group-hover:scale-105 transition-transform">
            <FileText className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
            {totalTeamDocs.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CalendarCheck className="size-3" />
              {totalWorkingDays} days logged
            </span>
            <span>•</span>
            <span className="truncate">All members</span>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 size-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. Active Workforce Today */}
      <div className="relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/60 hover:border-emerald-500/35 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs group">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Workforce Active
          </span>
          <div className="size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 grid place-items-center group-hover:scale-105 transition-transform">
            <Users className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
              {activeTodayCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              / {activeMembersCount} active today
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {Math.round((activeTodayCount / Math.max(1, activeMembersCount)) * 100)}% shift rate
            </span>
            {disabledCount > 0 && (
              <>
                <span>•</span>
                <span className="text-muted-foreground/80 flex items-center gap-1">
                  <Ban className="size-3 text-destructive/70" />
                  {disabledCount} disabled
                </span>
              </>
            )}
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 size-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 3. Team Daily Velocity */}
      <div className="relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/60 hover:border-emerald-500/35 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs group">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Team Velocity
          </span>
          <div className="size-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 grid place-items-center group-hover:scale-105 transition-transform">
            <TrendingUp className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
              {teamDailyAvg}
            </span>
            <span className="text-xs text-muted-foreground font-medium">docs / day</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
              <CheckCircle2 className="size-3" />
              Per associate avg
            </span>
            <span>•</span>
            <span className="text-muted-foreground truncate">
              {teamDailyAvg >= 80 ? "High pace" : "Standard pace"}
            </span>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 size-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 4. Top Performer / MVP Spotlight */}
      <div
        onClick={() => topPerformer && onSelectMember?.(topPerformer.id)}
        className={cn(
          "relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs group cursor-pointer hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/5",
          topPerformer ? "cursor-pointer" : "cursor-default"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1">
            <Sparkles className="size-3" /> MVP Leader
          </span>
          <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 grid place-items-center group-hover:rotate-12 transition-transform">
            <Award className="size-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate group-hover:text-amber-500 transition-colors">
            {topPerformer
              ? `${topPerformer.first_name || ""} ${topPerformer.last_name || ""}`.trim() || "Top Associate"
              : "No logs yet"}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {topPerformer ? (
              <>
                <span className="font-semibold text-foreground tabular-nums">
                  {topPerformer.totalDocs.toLocaleString()} docs
                </span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                  {topPerformer.avg} avg/day
                </span>
              </>
            ) : (
              <span>Awaiting log entries</span>
            )}
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 size-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
      </div>
    </div>
  );
});

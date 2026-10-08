import React from "react";
import {
  CalendarCheck,
  FileText,
  TrendingUp,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  MoreVertical,
  ChevronRight,
  BedDouble,
  Sparkles,
  Ban,
  UserCheck,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isWeekend, totalForLog, type DailyLog } from "@/types/log";

export interface TeamMemberItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "user";
  daily_goal?: number | null;
  daysWorked: number;
  totalDocs: number;
  avg: number;
  logCount: number;
  is_disabled?: boolean;
}

interface TeamMemberCardProps {
  member: TeamMemberItem;
  isMe: boolean;
  todayEntry?: DailyLog | null;
  onSelect: () => void;
  onToggleRole: (targetUserId: string, currentRole: "admin" | "user") => void;
  onDeleteRequest: (targetUserId: string, name: string) => void;
  onToggleDisabled?: (targetUserId: string, name: string, shouldDisable: boolean) => void;
  isRolePending?: boolean;
  isDisabledPending?: boolean;
}

export const TeamMemberCard = React.memo(function TeamMemberCard({
  member,
  isMe,
  todayEntry,
  onSelect,
  onToggleRole,
  onDeleteRequest,
  onToggleDisabled,
  isRolePending = false,
  isDisabledPending = false,
}: TeamMemberCardProps) {
  const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "Team Member";
  const initials =
    ((member.first_name?.[0] ?? "") + (member.last_name?.[0] ?? "")).toUpperCase() || "?";

  const hasTodayDocs = todayEntry && !todayEntry.is_off_day && totalForLog(todayEntry) > 0;
  const isOffToday = todayEntry?.is_off_day;
  const isWeekendToday = todayEntry ? isWeekend(todayEntry.log_date) : false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative bg-card border rounded-xl p-4 sm:p-5 text-left transition-all duration-200 hover:shadow-md hover:shadow-primary/5 cursor-pointer flex flex-col justify-between gap-4",
        member.is_disabled
          ? "opacity-75 border-dashed border-destructive/40 bg-destructive/[0.02]"
          : "border-border/60 hover:border-primary/35",
      )}
    >
      {/* Top row: Avatar, Name, Role, Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-11 rounded-xl bg-primary/[0.08] border border-primary/20 grid place-items-center text-sm font-bold text-primary shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {fullName}
              </h3>
              {member.role === "admin" ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Shield className="size-3" /> Admin
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                  Member
                </span>
              )}
              {member.is_disabled && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">
                  <Ban className="size-3" /> Disabled
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span>{member.logCount} {member.logCount === 1 ? "log entry" : "log entries"}</span>
              {isMe && (
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  You
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action dropdown for other users */}
        {!isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="size-8 -mr-1 shrink-0 rounded-md grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                aria-label={`Actions for ${fullName}`}
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRole(member.id, member.role);
                }}
                disabled={isRolePending}
                className="cursor-pointer"
              >
                {member.role === "admin" ? (
                  <ShieldX className="size-4 mr-2" />
                ) : (
                  <ShieldCheck className="size-4 mr-2" />
                )}
                {member.role === "admin" ? "Revoke admin" : "Make admin"}
              </DropdownMenuItem>
              {onToggleDisabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDisabled(member.id, fullName, !member.is_disabled);
                    }}
                    disabled={isDisabledPending}
                    className={cn(
                      "cursor-pointer",
                      member.is_disabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {member.is_disabled ? (
                      <>
                        <UserCheck className="size-4 mr-2" />
                        Re-enable user
                      </>
                    ) : (
                      <>
                        <Ban className="size-4 mr-2" />
                        Disable user
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRequest(member.id, fullName);
                }}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="size-4 mr-2" />
                Delete user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stats row: 3-column pill */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1">
            <CalendarCheck className="size-3" /> Days
          </p>
          <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{member.daysWorked}</p>
        </div>
        <div className="border-x border-border/40">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1">
            <FileText className="size-3" /> Docs
          </p>
          <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{member.totalDocs}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading flex items-center justify-center gap-1">
            <TrendingUp className="size-3" /> Avg
          </p>
          <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{member.avg}</p>
        </div>
      </div>

      {/* Footer row: Today's activity chip and drill-down affordance */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {hasTodayDocs ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Today: {totalForLog(todayEntry!)} docs</span>
            </span>
          ) : isOffToday ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <BedDouble className="size-3.5 shrink-0" />
              <span>{isWeekendToday ? "Weekend" : "Off day"}</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
              <Sparkles className="size-3 text-muted-foreground/60 shrink-0" />
              <span>No logs today</span>
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-primary flex items-center gap-0.5 font-medium transition-colors shrink-0">
          View details
          <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
});

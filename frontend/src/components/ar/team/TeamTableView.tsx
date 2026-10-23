import React from "react";
import {
  Shield,
  ShieldCheck,
  Ban,
  UserCheck,
  TrendingUp,
  FileText,
  MoreVertical,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { TeamMemberItem } from "./TeamMemberCard";
import type { DailyLog } from "@/types/log";
import { totalForLog } from "@/types/log";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamTableViewProps {
  members: TeamMemberItem[];
  currentUserId?: string;
  logsByUser: Map<string, DailyLog[]>;
  today: string;
  topDocsMax: number;
  onSelectMember: (id: string) => void;
  onToggleRole: (id: string, currentRole: "admin" | "user") => void;
  onToggleDisabled: (id: string, name: string, shouldDisable: boolean) => void;
  onDeleteRequest: (id: string, name: string) => void;
}

export const TeamTableView = React.memo(function TeamTableView({
  members,
  currentUserId,
  logsByUser,
  today,
  topDocsMax,
  onSelectMember,
  onToggleRole,
  onToggleDisabled,
  onDeleteRequest,
}: TeamTableViewProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left relative">
          <thead className="sticky top-0 z-10 bg-card/90 backdrop-blur-md shadow-2xs">
            <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider font-mono">
              <th className="px-4 py-3 text-center w-12">#</th>
              <th className="px-4 py-3">Associate</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total Docs</th>
              <th className="px-4 py-3 text-right">Days Logged</th>
              <th className="px-4 py-3 text-right">Daily Avg</th>
              <th className="px-4 py-3 text-right">Today's Output</th>
              <th className="px-4 py-3 text-right w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {members.map((m, index) => {
              const fullName = `${m.first_name || ""} ${m.last_name || ""}`.trim() || "User";
              const initials =
                ((m.first_name?.[0] ?? "") + (m.last_name?.[0] ?? "")).toUpperCase() || "?";
              const isMe = m.id === currentUserId;
              const todayEntry = (logsByUser.get(m.id) ?? []).find((l) => l.log_date === today);
              const todayCount = todayEntry && !todayEntry.is_off_day ? totalForLog(todayEntry) : 0;
              const isOffToday = todayEntry?.is_off_day;
              const percentOfMax = topDocsMax > 0 ? Math.round((m.totalDocs / topDocsMax) * 100) : 0;

              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectMember(m.id)}
                  className={cn(
                    "hover:bg-muted/30 transition-colors cursor-pointer group",
                    m.is_disabled && "opacity-60 bg-destructive/[0.02]"
                  )}
                >
                  {/* Rank / Podium Badge */}
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    {index === 0 && m.totalDocs > 0 ? (
                      <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-500/15 text-amber-500 text-xs shadow-2xs">
                        🥇
                      </span>
                    ) : index === 1 && m.totalDocs > 0 ? (
                      <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-300/20 text-slate-300 text-xs shadow-2xs">
                        🥈
                      </span>
                    ) : index === 2 && m.totalDocs > 0 ? (
                      <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-700/20 text-amber-600 text-xs shadow-2xs">
                        🥉
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70">{index + 1}</span>
                    )}
                  </td>

                  {/* Associate Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold grid place-items-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          <span className="truncate">{fullName}</span>
                          {isMe && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{m.logCount} entries recorded</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3">
                    {m.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                        <Shield className="size-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 font-mono">
                        Member
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    {m.is_disabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25 font-mono">
                        <Ban className="size-3" /> Disabled
                      </span>
                    ) : todayCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Logged Today
                      </span>
                    ) : isOffToday ? (
                      <span className="text-[10px] text-muted-foreground font-mono">Off Day</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/80 font-mono">No logs today</span>
                    )}
                  </td>

                  {/* Total Docs with spark progress bar */}
                  <td className="px-4 py-3 text-right">
                    <div className="font-bold text-foreground tabular-nums text-sm">
                      {m.totalDocs.toLocaleString()}
                    </div>
                    <div className="w-20 ml-auto h-1 rounded-full bg-muted/60 overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percentOfMax}%` }}
                      />
                    </div>
                  </td>

                  {/* Days Worked */}
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground font-medium">
                    {m.daysWorked} days
                  </td>

                  {/* Daily Avg */}
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-bold text-foreground tabular-nums">
                      <TrendingUp className="size-3 text-emerald-500" />
                      {m.avg}
                    </span>
                  </td>

                  {/* Today's Output */}
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {todayCount > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">+{todayCount}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* Quick Actions */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="size-7 rounded-lg hover:bg-muted/60 grid place-items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onSelectMember(m.id)}>
                          <FileText className="size-3.5 mr-2 text-primary" />
                          <span>View Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onToggleRole(m.id, m.role)}
                          disabled={isMe}
                        >
                          <ShieldCheck className="size-3.5 mr-2 text-muted-foreground" />
                          <span>{m.role === "admin" ? "Demote to Member" : "Promote to Admin"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onToggleDisabled(m.id, fullName, !m.is_disabled)}
                          disabled={isMe}
                        >
                          {m.is_disabled ? (
                            <>
                              <UserCheck className="size-3.5 mr-2 text-emerald-500" />
                              <span>Re-enable Member</span>
                            </>
                          ) : (
                            <>
                              <Ban className="size-3.5 mr-2 text-amber-500" />
                              <span>Disable Member</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteRequest(m.id, fullName)}
                          disabled={isMe}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="size-3.5 mr-2" />
                          <span>Delete Member</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

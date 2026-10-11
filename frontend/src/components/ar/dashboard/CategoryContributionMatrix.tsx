import React, { useMemo, useState } from "react";
import type { DailyLog } from "@/types/log";
import type { Category } from "@/hooks/useCategories";
import type { Profile } from "@/hooks/useProfile";
import { colorForKey } from "@/lib/cat-colors";
import { cn } from "@/lib/utils";
import { Users, Search, Shield, LayoutGrid, Trophy, CheckCheck } from "@/components/ui/icons";

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
  sharePercent: number; // Percentage out of 100% of this category
}

export interface CategoryWorkloadItem {
  key: string;
  label: string;
  short: string;
  color: string;
  totalDocs: number;
  contributors: ContributorStat[];
}

export interface MemberWorkloadItem {
  userId: string;
  name: string;
  initials: string;
  role: string;
  totalDocs: number;
  categories: {
    key: string;
    label: string;
    short: string;
    color: string;
    count: number;
    sharePercent: number; // Share of this member's total work out of 100%
  }[];
}

export const CategoryContributionMatrix = React.memo(function CategoryContributionMatrix({
  categories,
  logs,
  profiles,
  currentUserId,
  className,
}: Props) {
  const [activeTab, setActiveTab] = useState<"by-category" | "by-member">("by-category");
  const [selectedCatKey, setSelectedCatKey] = useState<string>("all");
  const [search, setSearch] = useState("");

  const profileMap = useMemo(() => new Map<string, Profile>(profiles.map((p) => [p.id, p])), [profiles]);
  const catMap = useMemo(() => new Map<string, Category>(categories.map((c) => [c.key, c])), [categories]);

  // Aggregate category workload: Who worked on which category & share out of 100%
  const categoryWorkload: CategoryWorkloadItem[] = useMemo(() => {
    const workingLogs = logs.filter((l) => !l.is_off_day);
    const catTotals: Record<string, number> = {};
    const catUserTotals: Record<string, Record<string, number>> = {};

    for (const log of workingLogs) {
      if (!log.counts) continue;
      const uid = log.user_id;
      for (const [k, v] of Object.entries(log.counts)) {
        if (typeof v === "number" && v > 0) {
          catTotals[k] = (catTotals[k] ?? 0) + v;
          if (!catUserTotals[k]) catUserTotals[k] = {};
          catUserTotals[k][uid] = (catUserTotals[k][uid] ?? 0) + v;
        }
      }
    }

    return Object.entries(catTotals)
      .filter(([_, total]) => total > 0)
      .map(([key, totalDocs]) => {
        const cat = catMap.get(key);
        const userCounts = catUserTotals[key] || {};
        const contributors: ContributorStat[] = Object.entries(userCounts)
          .filter(([_, count]) => count > 0)
          .map(([uid, count]) => {
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

  // Aggregate member workload: For each member, their category distribution totaling 100%
  const memberWorkload: MemberWorkloadItem[] = useMemo(() => {
    const workingLogs = logs.filter((l) => !l.is_off_day);
    const userTotals: Record<string, number> = {};
    const userCatTotals: Record<string, Record<string, number>> = {};

    for (const log of workingLogs) {
      if (!log.counts) continue;
      const uid = log.user_id;
      for (const [k, v] of Object.entries(log.counts)) {
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
        const catList = Object.entries(catCounts)
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

  // Filtered views based on search query and category chip
  const filteredCategories = useMemo(() => {
    let list = categoryWorkload;
    if (selectedCatKey !== "all") {
      list = list.filter((c) => c.key === selectedCatKey);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.short.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q) ||
        c.contributors.some((u) => u.name.toLowerCase().includes(q))
    );
  }, [categoryWorkload, selectedCatKey, search]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memberWorkload;
    return memberWorkload.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.categories.some((c) => c.label.toLowerCase().includes(q) || c.short.toLowerCase().includes(q))
    );
  }, [memberWorkload, search]);

  if (categoryWorkload.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Header & Mode Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span>Team Category Attribution</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
              100% Breakdown
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            See who worked on each document category and their exact percentage share of throughput.
          </p>
        </div>

        {/* Tab switcher: By Category vs By Member */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center rounded-xl bg-muted/40 p-1 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("by-category")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "by-category"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span>By Category</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("by-member")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "by-member"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>By Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-toolbar: Category filter chips & quick search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {activeTab === "by-category" && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedCatKey("all")}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 border",
                selectedCatKey === "all"
                  ? "bg-primary text-primary-foreground font-semibold border-primary shadow-2xs"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              All Categories ({categoryWorkload.length})
            </button>
            {categoryWorkload.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCatKey(c.key)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 border flex items-center gap-1.5",
                  selectedCatKey === c.key
                    ? "bg-card text-foreground font-semibold shadow-2xs border-primary"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span>{c.short}</span>
                <span className="text-[10px] opacity-70 font-mono">({c.contributors.length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative min-w-[220px] max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "by-category" ? "Search category or member…" : "Search member name…"}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-card border border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* ── View 1: By Category ── */}
      {activeTab === "by-category" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCategories.map((c) => (
            <div
              key={c.key}
              className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 hover:border-border transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="size-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{c.label}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {c.short} · {c.contributors.length} {c.contributors.length === 1 ? "contributor" : "contributors"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {c.totalDocs.toLocaleString()}
                    </span>
                    <span className="block text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Total Docs
                    </span>
                  </div>
                </div>

                {/* Stacked multi-segment bar showing the 100% share */}
                <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden flex my-3 border border-border/40">
                  {c.contributors.map((contrib, idx) => (
                    <div
                      key={contrib.userId}
                      style={{
                        width: `${contrib.sharePercent}%`,
                        backgroundColor: c.color,
                        opacity: 1 - idx * 0.18,
                      }}
                      className="h-full transition-all duration-300 relative group"
                      title={`${contrib.name}: ${contrib.count.toLocaleString()} docs (${contrib.sharePercent}%)`}
                    />
                  ))}
                </div>

                {/* Contributor rows breakdown */}
                <div className="divide-y divide-border/40 mt-3">
                  {c.contributors.map((contrib, rank) => {
                    const isMe = contrib.userId === currentUserId;
                    return (
                      <div
                        key={contrib.userId}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Rank badge */}
                          <span
                            className={cn(
                              "size-5 rounded-md text-[10px] font-bold font-mono grid place-items-center shrink-0",
                              rank === 0
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                : rank === 1
                                ? "bg-slate-400/15 text-slate-400 border border-slate-400/30"
                                : "bg-muted text-muted-foreground"
                            )}
                            title={`Rank #${rank + 1}`}
                          >
                            {rank + 1}
                          </span>

                          {/* Avatar */}
                          <div className="size-6 rounded-md bg-primary/10 text-primary font-bold text-[10px] grid place-items-center shrink-0 border border-primary/20">
                            {contrib.initials}
                          </div>

                          {/* Contributor Name */}
                          <div className="min-w-0">
                            <span className="font-medium text-foreground truncate block">
                              {contrib.name}
                              {isMe && (
                                <span className="ml-1.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Contributor stats & share out of 100% */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="tabular-nums font-semibold text-foreground">
                            {contrib.count.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">docs</span>
                          </span>
                          <span
                            className="font-bold tabular-nums text-xs px-2 py-0.5 rounded-md min-w-[52px] text-right"
                            style={{
                              backgroundColor: `${c.color}15`,
                              color: c.color,
                            }}
                          >
                            {contrib.sharePercent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom footer summary */}
              <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <CheckCheck className="size-3.5 text-emerald-500" />
                  <span>Category Total: 100%</span>
                </span>
                <span className="text-foreground/80 font-medium">
                  Top Contributor: <strong className="text-foreground">{c.contributors[0]?.name}</strong> ({c.contributors[0]?.sharePercent}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 2: By Member ── */}
      {activeTab === "by-member" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMembers.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div
                key={m.userId}
                className="bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 hover:border-border transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Member header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary font-bold text-sm grid place-items-center shrink-0 border border-primary/25 shadow-2xs">
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold text-foreground truncate">{m.name}</h4>
                          {isMe && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="capitalize">{m.role}</span>
                          <span>·</span>
                          <span>{m.categories.length} active {m.categories.length === 1 ? "category" : "categories"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-bold tabular-nums text-foreground">
                        {m.totalDocs.toLocaleString()}
                      </span>
                      <span className="block text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                        Total Output
                      </span>
                    </div>
                  </div>

                  {/* Multi-category distribution bar totaling 100% of member's output */}
                  <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden flex my-3 border border-border/40">
                    {m.categories.map((c) => (
                      <div
                        key={c.key}
                        style={{
                          width: `${c.sharePercent}%`,
                          backgroundColor: c.color,
                        }}
                        className="h-full transition-all duration-300"
                        title={`${c.label}: ${c.count.toLocaleString()} docs (${c.sharePercent}%)`}
                      />
                    ))}
                  </div>

                  {/* Categories list for this member */}
                  <div className="divide-y divide-border/40 mt-3">
                    {m.categories.map((c) => (
                      <div
                        key={c.key}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="font-medium text-foreground truncate">{c.label}</span>
                          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded bg-muted/60">
                            {c.short}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="tabular-nums font-semibold text-foreground">
                            {c.count.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">docs</span>
                          </span>
                          <span
                            className="font-bold tabular-nums text-xs px-2 py-0.5 rounded-md min-w-[52px] text-right"
                            style={{
                              backgroundColor: `${c.color}15`,
                              color: c.color,
                            }}
                          >
                            {c.sharePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <CheckCheck className="size-3.5 text-emerald-500" />
                    <span>Member Output: 100%</span>
                  </span>
                  <span className="text-foreground/80 font-medium">
                    Primary Focus: <strong className="text-foreground">{m.categories[0]?.label}</strong> ({m.categories[0]?.sharePercent}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

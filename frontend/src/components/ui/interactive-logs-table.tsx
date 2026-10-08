/* eslint-disable react-refresh/only-export-components */
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Filter, Info, Search } from "@/components/ui/icons";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LogLevel = "info" | "warning" | "error";

export interface LogChange {
  label: string;
  before: string;
  after: string;
}

export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  status: string;
  tags: string[];
  actor?: string;
  help?: string;
  changes?: LogChange[];
  details?: Record<string, unknown> | null;
}

export type Filters = {
  level: string[];
  service: string[];
  status: string[];
};

const levelStyles: Record<LogLevel, string> = {
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
  error: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
};

function getStatusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("delete") || s.includes("error") || s.includes("fail") || s.includes("reject") || s === "502" || s === "503") {
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-200 dark:border-rose-900/50";
  }
  if (s.includes("warn") || s.includes("role") || s.includes("pending") || s === "429") {
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-200 dark:border-amber-900/50";
  }
  return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50";
}

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: Log;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dateObj = new Date(log.timestamp);
  const formattedTime = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div>
      <motion.button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 flex items-center justify-between gap-4"
        whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>

          <Badge
            variant="secondary"
            className={`flex-shrink-0 text-[11px] capitalize ${levelStyles[log.level]}`}
          >
            {log.level}
          </Badge>

          <div className="flex flex-col flex-shrink-0 w-24">
            <time className="font-mono text-xs text-foreground font-medium">
              {formattedTime}
            </time>
            <span className="text-[10px] text-muted-foreground">
              {formattedDate}
            </span>
          </div>

          <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-xs font-medium text-foreground">
            {log.service}
          </span>

          <p className="flex-1 truncate text-sm text-foreground/90 font-normal">
            {log.message}
          </p>

          <Badge
            variant="outline"
            className={`flex-shrink-0 text-[11px] font-semibold ${getStatusStyle(log.status)}`}
          >
            {log.status}
          </Badge>

          {log.actor && (
            <span className="hidden sm:inline-block max-w-[130px] truncate text-right text-xs text-muted-foreground font-mono">
              {log.actor}
            </span>
          )}
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-muted/30"
          >
            <div className="space-y-4 p-5 text-sm">
              {/* Event Description */}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Action Summary
                </p>
                <div className="rounded-lg border border-border/60 bg-background/80 p-3 font-medium text-foreground">
                  {log.message}
                </div>
              </div>

              {/* Helpful Explanation / Context */}
              {log.help && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Compliance & Audit Meaning</p>
                    <p className="opacity-90">{log.help}</p>
                  </div>
                </div>
              )}

              {/* Before / After Field Diffs */}
              {log.changes && log.changes.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recorded Changes
                  </p>
                  <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3">
                    {log.changes.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="font-medium text-foreground min-w-[100px]">{c.label}:</span>
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground line-through decoration-destructive/60 border border-border/40">
                          {c.before}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold">
                          {c.after}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-md border border-border/40 bg-background/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Record ID
                  </p>
                  <p className="font-mono text-foreground truncate mt-0.5">{log.id}</p>
                </div>
                <div className="rounded-md border border-border/40 bg-background/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Timestamp (ISO)
                  </p>
                  <p className="font-mono text-foreground truncate mt-0.5">{log.timestamp}</p>
                </div>
                {log.actor && (
                  <div className="rounded-md border border-border/40 bg-background/50 p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      User / Actor
                    </p>
                    <p className="font-medium text-foreground truncate mt-0.5">{log.actor}</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              {log.tags && log.tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {log.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[11px] font-normal">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
  logs,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  logs: Log[];
}) {
  const levels = Array.from(new Set(logs.map((log) => log.level)));
  const services = Array.from(new Set(logs.map((log) => log.service)));
  const statuses = Array.from(new Set(logs.map((log) => log.status)));

  const toggleFilter = (category: keyof Filters, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

    onChange({
      ...filters,
      [category]: updated,
    });
  };

  const clearAll = () => {
    onChange({
      level: [],
      service: [],
      status: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (group) => group.length > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.05 }}
      className="flex h-full flex-col space-y-6 overflow-y-auto bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filter Events</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Severity Level
        </p>
        <div className="space-y-1.5">
          {levels.map((level) => {
            const selected = filters.level.includes(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleFilter("level", level)}
                className={`flex w-full items-center justify-between gap-2 border rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className="capitalize">{level}</span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Module / Service
        </p>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {services.map((service) => {
            const selected = filters.service.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleFilter("service", service)}
                className={`flex w-full items-center justify-between gap-2 border rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className="truncate">{service}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Audit Status
        </p>
        <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
          {statuses.map((status) => {
            const selected = filters.status.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleFilter("status", status)}
                className={`flex w-full items-center justify-between gap-2 border rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <span className="truncate">{status}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export interface InteractiveLogsTableProps {
  logs: Log[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function InteractiveLogsTable({
  logs,
  title = "Audit & Operations Log",
  subtitle,
  className = "",
}: InteractiveLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    level: [],
    service: [],
    status: [],
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const lowerQuery = searchQuery.toLowerCase().trim();

      const matchSearch =
        !lowerQuery ||
        log.message.toLowerCase().includes(lowerQuery) ||
        log.service.toLowerCase().includes(lowerQuery) ||
        log.status.toLowerCase().includes(lowerQuery) ||
        (log.actor && log.actor.toLowerCase().includes(lowerQuery)) ||
        log.tags.some((t) => t.toLowerCase().includes(lowerQuery));

      const matchLevel =
        filters.level.length === 0 || filters.level.includes(log.level);
      const matchService =
        filters.service.length === 0 || filters.service.includes(log.service);
      const matchStatus =
        filters.status.length === 0 || filters.status.includes(log.status);

      return matchSearch && matchLevel && matchService && matchStatus;
    });
  }, [logs, filters, searchQuery]);

  const activeFilters =
    filters.level.length + filters.service.length + filters.status.length;

  return (
    <div className={`w-full rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* Table Header */}
      <div className="border-b border-border/60 bg-card p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle ?? `${filteredLogs.length} of ${logs.length} events matching filters`}
              </p>
            </div>
            {logs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-full px-2.5 py-1 w-fit">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Immutable
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events by message, service, actor, or status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 pl-9 text-xs sm:text-sm"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="relative h-9 px-3"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Filters</span>
              {activeFilters > 0 && (
                <Badge className="ml-1.5 flex h-4 w-4 items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex flex-1 overflow-hidden min-h-[300px]">
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-r border-border/60 flex-shrink-0"
            >
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                logs={logs}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto max-h-[560px]">
          <div className="divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      duration: 0.15,
                      delay: Math.min(index * 0.015, 0.2),
                    }}
                  >
                    <LogRow
                      log={log}
                      expanded={expandedId === log.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === log.id ? null : log.id
                        )
                      }
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-12 text-center"
                >
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No activity logs match your search or filters.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper to convert an event name into a real service domain module ─────────
export function getServiceForEvent(event: string): string {
  if (event.startsWith("log_")) return "Daily Log";
  if (event.startsWith("fax_")) return "Fax Tracker";
  if (event.startsWith("indexable_")) return "Indexable";
  if (event.startsWith("faxed_back_")) return "Faxed Back";
  if (event.startsWith("category_") || event === "categories_reordered") return "Categories";
  if (event.startsWith("facility_")) return "Facilities";
  if (event === "role_changed") return "Admin Permissions";
  if (event === "password_changed" || event === "account_deleted") return "Security";
  if (event === "data_exported") return "Reports & Export";
  return "System";
}

// ── Helper to convert an event name into a real status label ──────────────────
export function getStatusForEvent(event: string): string {
  if (event.endsWith("_deleted")) return "Deleted";
  if (event.endsWith("_updated")) return "Updated";
  if (event.endsWith("_created")) return "Created";
  if (event === "role_changed") return "Role Changed";
  if (event === "data_exported") return "Exported";
  if (event === "password_changed") return "Secured";
  if (event === "categories_reordered") return "Reordered";
  return "Recorded";
}

// ── Helper to get a helpful explanation for compliance and records ────────────
export function getHelpForEvent(event: string): string {
  switch (event) {
    case "log_updated":
      return "Daily document counts were recorded or updated for this shift. Synchronized across workstations.";
    case "log_deleted":
      return "A daily log entry was removed. Audit trail retains this action for legal record retention.";
    case "fax_updated":
      return "Patient fax workflow status advanced through the 3-step verification process.";
    case "fax_created":
      return "A new inbound patient fax document was received and queued for review.";
    case "fax_deleted":
      return "Patient entry was removed from the active fax workflow.";
    case "indexable_updated":
      return "Indexable patient document state modified.";
    case "indexable_created":
      return "New patient record registered in the indexable document queue.";
    case "faxed_back_updated":
      return "Faxed Back transmission status updated (Pending, Sent, Failed, or Rejected).";
    case "category_created":
      return "A new user-defined document category was configured for daily tracking.";
    case "category_updated":
      return "An existing category label or key identifier was edited.";
    case "category_deleted":
      return "A category was removed from active tracking.";
    case "categories_reordered":
      return "Custom category order modified for rapid tap counting.";
    case "role_changed":
      return "Security privileges or administrative role permissions were modified.";
    case "password_changed":
      return "Account authentication password changed.";
    case "data_exported":
      return "User generated a CSV, JSON, or PDF data export of historical records.";
    default:
      return "Append-only immutable record captured in the database to satisfy AR compliance requirements.";
  }
}

import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  useTeamProfiles,
  useTeamDailyLogs,
  useSetUserRole,
  useDeleteUser,
  useSetUserDisabled,
  useTeamUserFaxedBack,
  useTeamUserCategories,
  useTeamUserAuditLogs,
  useTeamUserLogs,
  fetchAllUserLogs,
  fetchAllUserFaxedBack,
  type TeamFaxedBackDoc,
} from "@/hooks/useTeamData";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useProfile } from "@/hooks/useProfile";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { isoDate, totalForLog, formatTableDate, formatDayName, isWeekend, type DailyLog } from "@/types/log";
import { downloadCSV, downloadPDF, formatUSDate } from "@/lib/log-utils";
import {
  Users,
  CalendarCheck,
  Search,
  ArrowLeft,
  BedDouble,
  Shield,
  FileCheck2,
  Tags,
  History,
  LayoutGrid,
  Loader2,
  CheckCheck,
  X,
  Ban,
  UserCheck,
  Download,
  UserPlus,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FigHeader, EmptyState } from "@/components/ar/industrial";
import { labelFor, pageNumbersArr } from "@/components/ar/tracker/tracker-helpers";
import { Pagination } from "@/components/Pagination";
import { NewMemberDialog } from "@/components/ar/team/NewMemberDialog";
import {
  InteractiveLogsTable,
  getServiceForEvent,
  getStatusForEvent,
  getHelpForEvent,
  type Log,
} from "@/components/ui/interactive-logs-table";
import Skeleton from "react-loading-skeleton";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeamMemberCard, type TeamMemberItem } from "@/components/ar/team/TeamMemberCard";
import { TeamOverviewTab } from "@/components/ar/team/TeamOverviewTab";

function computeStats(logs: DailyLog[]) {
  const working = logs.filter((l) => !l.is_off_day);
  const daysWorked = working.length;
  const totalDocs = working.reduce((s, l) => s + totalForLog(l), 0);
  const avg = working.length > 0 ? Math.round(totalDocs / working.length) : 0;
  return { daysWorked, totalDocs, avg };
}

type Tab = "overview" | "logs" | "faxed-back" | "categories" | "activity";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "logs", label: "Daily Logs", icon: CalendarCheck },
  { id: "faxed-back", label: "Faxed Back", icon: FileCheck2 },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "activity", label: "Activity", icon: History },
];

// Highlights the first case-insensitive match of `query` in `text`.
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-primary rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function FBStatusIcon({ status }: { status: string }) {
  if (status === "Pending") return <Loader2 className="size-3.5 text-emerald-500 animate-spin" />;
  if (status === "Sent") return <CheckCheck className="size-3.5 text-emerald-500" />;
  if (status === "Failed") return <X className="size-3.5 text-rose-500" />;
  if (status === "Rejected") return <Ban className="size-3.5 text-amber-500" />;
  return null;
}

const FB_FILTERS_INITIAL = { search: "" };

const withPdf = (name: string) => (/\.pdf$/i.test(name) ? name : `${name}.pdf`);

function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function faxedBackCSV(rows: TeamFaxedBackDoc[]): string {
  const safe = (v: unknown) => {
    const s = v == null ? "" : /^[=+@\-|%]/.test(String(v)) ? `'${v}` : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["File Name", "Patient Name", "Patient DOB", "Worked On", "Status", "Fax Back Message"];
  const body = rows.map((r) =>
    [withPdf(r.file_name), r.patient_name, r.patient_dob ? formatUSDate(r.patient_dob) : "", r.worked_on, r.status, r.notes ?? ""]
      .map(safe)
      .join(","),
  );
  return [headers.join(","), ...body].join("\n");
}

function SectionCard({ title, sub, children, actions }: { title: string; sub?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <FigHeader title={title} sub={sub} />
        {actions}
      </div>
      {children}
    </div>
  );
}

function describeEvent(
  event: string,
  details: Record<string, unknown> | null,
  nameForId: (id: string) => string | null,
): string {
  const d = details ?? {};
  switch (event) {
    case "log_updated": return `Saved the daily log for ${d.log_date ?? "that day"}`;
    case "log_deleted": return "Deleted a daily log entry";
    case "category_created": return `Created the category "${d.key ?? "unknown"}"`;
    case "category_updated": return `Renamed the category "${d.key ?? "unknown"}"`;
    case "category_deleted": return `Deleted the category "${d.key ?? "unknown"}"`;
    case "categories_reordered": return "Reordered categories";
    case "account_deleted": return "Deleted a fax account";
    case "password_changed": return "Changed the account password";
    case "data_exported": return "Exported data";
    case "fax_created": return `Added ${d.patient_name ?? "a patient"} to the Fax tracker`;
    case "fax_updated": return d.field
      ? `Updated ${stepLabel(d.field)} of a Fax tracker entry to ${statusLabel(d.value)}`
      : "Updated a Fax tracker entry";
    case "fax_deleted": return "Removed a Fax tracker entry";
    case "indexable_created": return `Added ${d.patient_name ?? "a patient"} to the Indexable tracker`;
    case "indexable_updated": return d.field
      ? `Updated ${stepLabel(d.field)} of an Indexable tracker entry to ${statusLabel(d.value)}`
      : "Updated an Indexable tracker entry";
    case "indexable_deleted": return "Removed an Indexable tracker entry";
    case "faxed_back_created": return `Added "${d.file_name ?? "a document"}" to Faxed Back`;
    case "faxed_back_updated": return d.field === "status"
      ? `Changed a Faxed Back document to "${d.value}"`
      : "Updated a Faxed Back document";
    case "faxed_back_deleted": return "Removed a Faxed Back document";
    case "faxed_back_section_deleted": return "Deleted a whole Faxed Back section";
    case "role_changed": {
      const name = typeof d.target_user_id === "string" ? nameForId(d.target_user_id) : null;
      const who = name ?? "A team member";
      return d.role === "admin" ? `Made ${who} an admin` : `Removed admin from ${who}`;
    }
    default: return event.replace(/_/g, " ");
  }
}

function changeRows(
  event: string,
  details: Record<string, unknown> | null,
): { label: string; before: string; after: string }[] {
  const d = details ?? {};
  const out: { label: string; before: string; after: string }[] = [];
  const push = (label: string, before: unknown, after: unknown) => {
    const b = before === null || before === undefined ? "—" : String(before);
    const a = after === null || after === undefined ? "—" : String(after);
    if (b === a) return;
    out.push({ label, before: b, after: a });
  };

  switch (event) {
    case "fax_updated":
    case "indexable_updated":
      if (d.field) push(stepLabel(d.field), d.prev, d.value);
      if (d.patient_name) push("Patient name", undefined, d.patient_name);
      break;
    case "faxed_back_updated":
      if (d.field) push(d.field === "status" ? "Status" : String(d.field), d.prev, d.value);
      if (d.file_name) push("File name", undefined, d.file_name);
      break;
    case "role_changed":
      push("Role", d.prev_role ?? "user", d.role);
      break;
    case "category_updated":
      if (d.key) push("Category", undefined, d.key);
      break;
    case "log_updated":
      if (d.log_date) push("Log date", undefined, d.log_date);
      break;
  }
  return out;
}

function stepLabel(field: unknown): string {
  return field === "step1" ? "Step 1" : field === "step2" ? "Step 2" : field === "step3" ? "Step 3" : String(field ?? "a step");
}

function statusLabel(value: unknown): string {
  return typeof value === "string" ? labelFor(value) : String(value ?? "");
}

export default function TeamPage() {
  const { user, loading } = useAuth();
  const { data: profiles = [], isLoading: profilesLoading } = useTeamProfiles();
  const { data: allLogs = [], isLoading: logsLoading } = useTeamDailyLogs();
  const isAdmin = useIsAdmin();
  const { isPending: profilePending } = useProfile();
  const setRole = useSetUserRole();
  const deleteUser = useDeleteUser();
  const setUserDisabled = useSetUserDisabled();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [disableTarget, setDisableTarget] = useState<{ id: string; name: string; shouldDisable: boolean } | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [searchMember, setSearchMember] = useState("");
  const [search, setSearch] = useState("");
  const [pages, setPages] = useState({ logs: 1, faxedBack: 1, categories: 1, activity: 1 });
  const [faxFilters, setFaxFilters] = useState(FB_FILTERS_INITIAL);
  const debouncedFaxSearch = useDebouncedValue(faxFilters.search);
  const [exporting, setExporting] = useState<"logs-csv" | "logs-pdf" | "faxed" | null>(null);

  const { data: logsPage = { rows: [], total: 0 }, isLoading: logsLoading2 } = useTeamUserLogs(
    selectedUserId,
    pages.logs,
    search.trim() || undefined,
  );
  const { data: faxedBackPage = { rows: [], total: 0 }, isLoading: faxedBackLoading } = useTeamUserFaxedBack(
    selectedUserId,
    pages.faxedBack,
    { search: debouncedFaxSearch.trim() || undefined },
  );
  const { data: categoriesPage = { rows: [], total: 0 }, isLoading: categoriesLoading } = useTeamUserCategories(
    selectedUserId,
    pages.categories,
  );
  const { data: auditPage = { rows: [], total: 0 }, isLoading: auditLoading } = useTeamUserAuditLogs(
    selectedUserId,
    pages.activity,
  );

  const selectedLogs = logsPage.rows;
  const selectedFaxedBack = faxedBackPage.rows;
  const selectedCategories = categoriesPage.rows;
  const selectedAudit = auditPage.rows;
  const logsTotal = logsPage.total;
  const faxedBackTotal = faxedBackPage.total;
  const categoriesTotal = categoriesPage.total;
  const auditTotal = auditPage.total;

  const isLoading = profilesLoading || logsLoading;

  const logsByUser = useMemo(() => {
    const map = new Map<string, DailyLog[]>();
    for (const log of allLogs) {
      const arr = map.get(log.user_id);
      if (arr) arr.push(log);
      else map.set(log.user_id, [log]);
    }
    return map;
  }, [allLogs]);

  // Compute stats and maintain strict alphabetical sorting A-Z
  const memberCards: TeamMemberItem[] = useMemo(() => {
    const list = profiles.map((p) => {
      const logs = logsByUser.get(p.id) ?? [];
      const stats = computeStats(logs);
      return { ...p, ...stats, logCount: logs.length };
    });

    return list.sort((a, b) => {
      const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim();
      const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
    });
  }, [profiles, logsByUser]);

  // Filter members by search input
  const filteredMembers = useMemo(() => {
    const q = searchMember.trim().toLowerCase();
    if (!q) return memberCards;
    return memberCards.filter((m) => {
      const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      const role = m.role.toLowerCase();
      return fullName.includes(q) || role.includes(q);
    });
  }, [memberCards, searchMember]);

  const selectedMember = selectedUserId ? memberCards.find((m) => m.id === selectedUserId) : null;

  const today = isoDate();
  const todayEntry = selectedUserId
    ? (logsByUser.get(selectedUserId) ?? []).find((l) => l.log_date === today)
    : null;

  const isMe = selectedUserId === user?.id;

  const deleteDialog = (
    <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
      <AlertDialogContent className="sm:max-w-md border-destructive/20">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This permanently deletes the user's account, their profile, all daily logs, categories, trackers, and audit history.
            </span>
            <span className="block text-destructive font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/95 text-destructive-foreground disabled:opacity-50"
            disabled={deleteUser.isPending}
            onClick={() => {
              if (!deleteTarget) return;
              deleteUser.mutate(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            {deleteUser.isPending ? "Deleting…" : "Delete forever"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const disableDialog = (
    <AlertDialog open={!!disableTarget} onOpenChange={(open) => !open && setDisableTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {disableTarget?.shouldDisable ? `Disable ${disableTarget?.name}?` : `Re-enable ${disableTarget?.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {disableTarget?.shouldDisable ? (
              <>
                <span className="block text-foreground font-medium">
                  Login access will immediately be blocked for this user.
                </span>
                <span className="block text-muted-foreground">
                  All historical records (daily logs, categorized counts, faxed-back records, and audit events) will remain 100% intact and untouched.
                </span>
              </>
            ) : (
              <>
                <span className="block text-foreground font-medium">
                  Re-enable login access for this user account.
                </span>
                <span className="block text-muted-foreground">
                  They will be able to log in to the dashboard again.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border/60">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              disableTarget?.shouldDisable
                ? "bg-amber-600 hover:bg-amber-600/90 text-white"
                : "bg-emerald-600 hover:bg-emerald-600/90 text-white"
            }
            disabled={setUserDisabled.isPending}
            onClick={() => {
              if (!disableTarget) return;
              setUserDisabled.mutate({
                targetUserId: disableTarget.id,
                shouldDisable: disableTarget.shouldDisable,
              });
              setDisableTarget(null);
            }}
          >
            {setUserDisabled.isPending
              ? "Saving…"
              : disableTarget?.shouldDisable
              ? "Disable account"
              : "Re-enable account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const memberName = selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}`.trim() : "member";
  const memberSlug = memberName.replace(/\s+/g, "-").toLowerCase();

  const memberAuditLogs: Log[] = useMemo(() => {
    return selectedAudit.map((a) => {
      const isError = a.event.includes("deleted");
      const isWarn = a.event.includes("updated") || a.event.includes("password") || a.event.includes("role");
      const changes = changeRows(a.event, a.details);
      const service = getServiceForEvent(a.event);
      const status = getStatusForEvent(a.event);
      const help = getHelpForEvent(a.event);
      const message = describeEvent(a.event, a.details, (id) => {
        const p = profiles.find((pr) => pr.id === id);
        return p ? `${p.first_name} ${p.last_name}`.trim() : null;
      });

      return {
        id: a.id,
        timestamp: a.created_at,
        level: isError ? "error" : isWarn ? "warning" : "info",
        service,
        message,
        status,
        actor: memberName,
        help,
        changes,
        details: a.details,
        tags: [a.event.split("_")[0], "audit"],
      };
    });
  }, [selectedAudit, profiles, memberName]);

  const handleExportLogs = async (kind: "csv" | "pdf") => {
    if (!selectedUserId) return;
    setExporting(kind === "csv" ? "logs-csv" : "logs-pdf");
    try {
      const logs = await fetchAllUserLogs(selectedUserId);
      const filename = `${memberSlug}-daily-log.${kind}`;
      if (kind === "csv") downloadCSV(logs, selectedCategories, filename);
      else await downloadPDF(logs, selectedCategories, filename, { title: `${memberName} — Daily Log`, userName: memberName });
    } finally {
      setExporting(null);
    }
  };

  const handleExportFaxedBack = async () => {
    if (!selectedUserId) return;
    setExporting("faxed");
    try {
      const rows = await fetchAllUserFaxedBack(selectedUserId, { search: debouncedFaxSearch.trim() || undefined });
      downloadTextFile(faxedBackCSV(rows), `${memberSlug}-faxed-back.csv`, "text/csv;charset=utf-8;");
    } finally {
      setExporting(null);
    }
  };

  if (loading || profilePending) return null;
  if (!isAdmin) return <Navigate to="/log" replace />;

  // ── Team grid overview ─────────────────────────────────────────────────────
  if (!selectedUserId) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
        <div className="w-full space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Team Management</h1>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-2.5 py-0.5 shadow-xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {profiles.length} team members · Sorted alphabetically A–Z
              </p>
            </div>

            {/* Search & Actions toolbar */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 pr-8 h-9 text-xs w-full bg-card border-border/60 focus-visible:border-primary/50 shadow-xs"
                  placeholder="Search member by name or role…"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                />
                {searchMember && (
                  <button
                    type="button"
                    onClick={() => setSearchMember("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {isAdmin && (
                <Button
                  onClick={() => setAddMemberOpen(true)}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs shadow-primary/20 h-9 px-3.5 text-xs font-semibold rounded-xl cursor-pointer shrink-0"
                >
                  <UserPlus className="size-3.5 mr-1.5" />
                  <span>Add Member</span>
                </Button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton circle width={44} height={44} />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton width="60%" height={16} />
                      <Skeleton width="40%" height={12} />
                    </div>
                  </div>
                  <Skeleton height={52} className="rounded-lg" />
                  <Skeleton height={20} width="50%" />
                </div>
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState icon={Users} title="No Team Members Found" hint="Invite team members to begin tracking." />
          ) : filteredMembers.length === 0 ? (
            <div className="bg-card border border-border/60 rounded-xl p-8 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">No members match "{searchMember}"</p>
              <p className="text-xs text-muted-foreground">Try clearing your search query to view all team members.</p>
              <button
                type="button"
                onClick={() => setSearchMember("")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((m) => {
                const memberTodayLog = (logsByUser.get(m.id) ?? []).find((l) => l.log_date === today);
                return (
                  <TeamMemberCard
                    key={m.id}
                    member={m}
                    isMe={m.id === user?.id}
                    todayEntry={memberTodayLog}
                    onSelect={() => {
                      setSelectedUserId(m.id);
                      setTab("overview");
                      setSearch("");
                      setFaxFilters(FB_FILTERS_INITIAL);
                      setPages({ logs: 1, faxedBack: 1, categories: 1, activity: 1 });
                    }}
                    onToggleRole={(targetUserId, currentRole) => {
                      setRole.mutate({
                        targetUserId,
                        role: currentRole === "admin" ? "user" : "admin",
                        prevRole: currentRole,
                      });
                    }}
                    onDeleteRequest={(targetUserId, name) => {
                      setDeleteTarget({ id: targetUserId, name });
                    }}
                    onToggleDisabled={(targetUserId, name, shouldDisable) => {
                      setDisableTarget({ id: targetUserId, name, shouldDisable });
                    }}
                    isRolePending={setRole.isPending}
                    isDisabledPending={setUserDisabled.isPending}
                  />
                );
              })}
            </div>
          )}
        </div>
        {deleteDialog}
        {disableDialog}
        <NewMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} />
      </main>
    );
  }

  // ── Drill-down Member View ──────────────────────────────────────────────────
  return (
    <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
      <div className="w-full space-y-4">
        {/* Header toolbar with back button and member badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedUserId(null);
                setSearch("");
                setFaxFilters(FB_FILTERS_INITIAL);
              }}
              className="size-9 rounded-xl border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border transition-colors shrink-0 grid place-items-center shadow-xs cursor-pointer"
              aria-label="Back to team overview"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="size-10 rounded-xl bg-primary/[0.08] border border-primary/20 grid place-items-center text-sm font-bold text-primary shadow-xs">
              {((selectedMember?.first_name?.[0] ?? "") + (selectedMember?.last_name?.[0] ?? "")).toUpperCase() || "?"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  {selectedMember?.first_name} {selectedMember?.last_name}
                </h2>
                {selectedMember?.role === "admin" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Shield className="size-3" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                    Member
                  </span>
                )}
                {selectedMember?.is_disabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">
                    <Ban className="size-3" /> Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{isMe ? "Your Personal Panel" : "Team Member Profile"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isMe && selectedMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDisableTarget({
                    id: selectedMember.id,
                    name: `${selectedMember.first_name || ""} ${selectedMember.last_name || ""}`.trim() || "User",
                    shouldDisable: !selectedMember.is_disabled,
                  });
                }}
                disabled={setUserDisabled.isPending}
                className={cn(
                  "h-8 text-xs font-semibold gap-1.5",
                  selectedMember.is_disabled
                    ? "text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                    : "text-amber-600 border-amber-500/30 hover:bg-amber-500/10",
                )}
              >
                {selectedMember.is_disabled ? (
                  <>
                    <UserCheck className="size-3.5" />
                    Re-enable ID
                  </>
                ) : (
                  <>
                    <Ban className="size-3.5" />
                    Disable ID
                  </>
                )}
              </Button>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-3 py-1 shadow-xs">
              <span className="size-1.5 rounded-full bg-emerald-500" /> {selectedMember?.first_name}'s panel
            </span>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 bg-card border border-border/60 rounded-xl p-1 w-fit max-w-full shadow-xs">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  active
                    ? "bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-600/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <t.icon className={cn("size-3.5", active ? "text-white" : "text-muted-foreground")} />
                <span>{t.label}</span>
                {t.id === "logs" && logsTotal > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full tabular-nums", active ? "bg-white/20 text-white font-semibold" : "bg-muted/60 text-muted-foreground")}>
                    {logsTotal}
                  </span>
                )}
                {t.id === "faxed-back" && faxedBackTotal > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full tabular-nums", active ? "bg-white/20 text-white font-semibold" : "bg-muted/60 text-muted-foreground")}>
                    {faxedBackTotal}
                  </span>
                )}
                {t.id === "categories" && categoriesTotal > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full tabular-nums", active ? "bg-white/20 text-white font-semibold" : "bg-muted/60 text-muted-foreground")}>
                    {categoriesTotal}
                  </span>
                )}
                {t.id === "activity" && auditTotal > 0 && (
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full tabular-nums", active ? "bg-white/20 text-white font-semibold" : "bg-muted/60 text-muted-foreground")}>
                    {auditTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {tab === "overview" && selectedMember && (
          <TeamOverviewTab
            member={selectedMember}
            todayEntry={todayEntry ?? null}
            faxedBackTotal={faxedBackTotal}
            categoriesTotal={categoriesTotal}
            auditTotal={auditTotal}
            selectedCategories={selectedCategories}
            selectedLogs={selectedLogs}
            logsLoading={logsLoading2}
            selectedAudit={selectedAudit}
            auditLoading={auditLoading}
            profiles={profiles}
            describeEvent={describeEvent}
          />
        )}

        {/* Tab 2: Daily Logs */}
        {tab === "logs" && (
          <SectionCard
            title="Daily Logs"
            sub={`${logsTotal} total recorded days`}
            actions={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExportLogs("csv")}
                  disabled={exporting !== null}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Download className="size-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportLogs("pdf")}
                  disabled={exporting !== null}
                  className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Download className="size-3.5" /> PDF
                </button>
              </div>
            }
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-xs w-full bg-card border-border/60"
                placeholder="Search by date (YYYY-MM-DD)…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPages((p) => ({ ...p, logs: 1 }));
                }}
              />
            </div>
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-xs">
              {logsLoading2 ? (
                <div className="space-y-2 p-4">
                  <Skeleton height={40} count={4} />
                </div>
              ) : selectedLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No log entries found for this member matching the filter.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {selectedLogs.map((l) => {
                    const weekend = isWeekend(l.log_date);
                    const isOff = l.is_off_day;
                    const total = totalForLog(l);
                    return (
                      <div key={l.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/10 transition-colors">
                        <div className="tabular-nums text-xs font-medium min-w-[120px]">
                          <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-foreground">{formatTableDate(l.log_date)}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-heading">
                              {formatDayName(l.log_date)}
                            </span>
                          </div>
                        </div>
                        {isOff ? (
                          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase font-heading flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                            <BedDouble className="size-3.5" /> {weekend ? "Weekend" : "Off Day"}
                          </span>
                        ) : (
                          <>
                            <div className="flex-1 flex flex-wrap gap-1.5">
                              {selectedCategories.map((c) => {
                                const v = (l.counts ?? {})[c.key] ?? 0;
                                return v > 0 ? (
                                  <span
                                    key={c.key}
                                    className="text-xs font-medium px-2 py-0.5 rounded-md tabular-nums bg-muted/50 border border-border/40 text-foreground"
                                  >
                                    <span className="text-muted-foreground mr-1">{c.short}</span>
                                    <strong className="text-primary">{v}</strong>
                                  </span>
                                ) : null;
                              })}
                            </div>
                            <span className="text-base font-bold tabular-nums text-primary">{total}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {logsTotal > 30 && (
              <Pagination
                page={pages.logs}
                totalPages={Math.ceil(logsTotal / 30)}
                pageNumbers={pageNumbersArr(Math.ceil(logsTotal / 30), pages.logs)}
                onPageChange={(p) => setPages((prev) => ({ ...prev, logs: p }))}
                total={logsTotal}
                pageSize={30}
                entityLabel="logs"
              />
            )}
          </SectionCard>
        )}

        {/* Tab 3: Faxed Back */}
        {tab === "faxed-back" && (
          <SectionCard
            title="Faxed Back"
            sub={`${faxedBackTotal} documents logged`}
            actions={
              <button
                type="button"
                onClick={handleExportFaxedBack}
                disabled={exporting !== null}
                title="Export all matching results as CSV"
                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Download className="size-3.5" /> CSV
              </button>
            }
          >
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-xs w-full bg-card border-border/60"
                placeholder="Search file name, patient name, notes…"
                value={faxFilters.search}
                onChange={(e) => {
                  setFaxFilters((f) => ({ ...f, search: e.target.value }));
                  setPages((p) => ({ ...p, faxedBack: 1 }));
                }}
              />
            </div>
            {faxedBackLoading ? (
              <div className="space-y-2">
                <Skeleton height={44} count={4} />
              </div>
            ) : selectedFaxedBack.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-xl p-8 text-center text-xs text-muted-foreground">
                No faxed-back documents found for this member.
              </div>
            ) : (
              <>
                <div className="bg-card border border-border/60 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-muted/10">
                        <th className="px-4 py-2.5 font-semibold">File</th>
                        <th className="px-3 py-2.5 font-semibold">Patient</th>
                        <th className="px-3 py-2.5 font-semibold">Worked On</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {selectedFaxedBack.map((d) => (
                        <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">
                            <span className="inline-flex items-center">
                              <img src="/pdf.png" alt="" className="size-5 shrink-0 object-contain mr-1.5" />
                              <Highlight text={d.file_name} query={faxFilters.search} />
                              {!/\.pdf$/i.test(d.file_name) && <span>.pdf</span>}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 truncate max-w-[160px]">
                            {d.patient_name ? <Highlight text={d.patient_name} query={faxFilters.search} /> : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatTableDate(d.worked_on)}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <FBStatusIcon status={d.status} />
                              {d.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground truncate max-w-[200px]">
                            {d.notes ? <Highlight text={d.notes} query={faxFilters.search} /> : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pages.faxedBack}
                  totalPages={Math.ceil(faxedBackTotal / 25)}
                  pageNumbers={pageNumbersArr(Math.ceil(faxedBackTotal / 25), pages.faxedBack)}
                  onPageChange={(p) => setPages((prev) => ({ ...prev, faxedBack: p }))}
                  total={faxedBackTotal}
                  pageSize={25}
                  entityLabel="documents"
                />
              </>
            )}
          </SectionCard>
        )}

        {/* Tab 4: Categories */}
        {tab === "categories" && (
          <SectionCard title="Categories" sub={`${categoriesTotal} custom categories configured`}>
            {categoriesLoading ? (
              <div className="space-y-2">
                <Skeleton height={44} count={4} />
              </div>
            ) : selectedCategories.length === 0 ? (
              <div className="bg-card border border-border/60 rounded-xl p-8 text-center text-xs text-muted-foreground">
                No custom categories set up for this member.
              </div>
            ) : (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-xs">
                <div className="divide-y divide-border/40">
                  {selectedCategories.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted/80 border border-border/50 font-mono">
                        {c.key}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{c.label}</span>
                      <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/40 border border-border/40">
                        {c.short}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                        Position #{c.position}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* Tab 5: Activity */}
        {tab === "activity" && (
          <div className="space-y-4">
            {auditLoading ? (
              <div className="space-y-2">
                <Skeleton height={44} count={4} />
              </div>
            ) : selectedAudit.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-border/60 rounded-xl bg-card shadow-xs">
                No audit activity logged for {memberName} yet.
              </div>
            ) : (
              <>
                <InteractiveLogsTable
                  title={`${memberName} · Audit Trail`}
                  subtitle={`Showing ${memberAuditLogs.length} events · Total: ${auditTotal} recorded (Page ${pages.activity} of ${Math.ceil(auditTotal / 25)})`}
                  logs={memberAuditLogs}
                />
                <Pagination
                  page={pages.activity}
                  totalPages={Math.ceil(auditTotal / 25)}
                  pageNumbers={pageNumbersArr(Math.ceil(auditTotal / 25), pages.activity)}
                  onPageChange={(p) => setPages((prev) => ({ ...prev, activity: p }))}
                  total={auditTotal}
                  pageSize={25}
                  entityLabel="events"
                />
              </>
            )}
          </div>
        )}
      </div>
      {deleteDialog}
      {disableDialog}
    </main>
  );
}

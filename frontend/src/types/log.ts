export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  counts: Record<string, number>;
  is_off_day: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DailyLogInsert = Omit<DailyLog, "id" | "user_id" | "created_at" | "updated_at">;

export function totalForLog(log: Pick<DailyLog, "counts">): number {
  return Object.values(log.counts ?? {}).reduce((sum, v) => sum + (v || 0), 0);
}

const US_LOCALE = "en-US";
const ORG_TZ = "America/Phoenix";

function displayTz(): string {
  try { return localStorage.getItem("tz_preference") === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone : ORG_TZ; } catch { return ORG_TZ; }
}

function isoFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), year: "numeric", month: "2-digit", day: "2-digit" }); }
function weekdayFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), weekday: "short" }); }
function shortDateFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), month: "short", day: "numeric" }); }
function dayNameFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), weekday: "short" }); }
function shortHeaderDateFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), weekday: "short", month: "short", day: "numeric" }); }
function headerTimeFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), hour: "numeric", minute: "2-digit", hour12: true }); }
function tableDateFmt() { return new Intl.DateTimeFormat(US_LOCALE, { timeZone: displayTz(), month: "2-digit", day: "2-digit", year: "numeric" }); }

export function isoDate(d: Date = new Date()) {
  const parts = isoFmt().formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isWeekend(iso: string): boolean {
  const day = weekdayFmt().format(new Date(`${iso}T12:00:00Z`));
  return day === "Sun" || day === "Sat";
}

export function formatShortDate(iso: string) {
  return shortDateFmt().format(new Date(`${iso}T12:00:00Z`));
}

export function formatDayName(iso: string) {
  return dayNameFmt().format(new Date(`${iso}T12:00:00Z`));
}

export function formatHeaderDate(d: Date = new Date()) {
  return `${shortHeaderDateFmt().format(d)} · ${headerTimeFmt().format(d)}`;
}

export function formatTableDate(iso: string) {
  return tableDateFmt().format(new Date(`${iso}T12:00:00Z`));
}

// ── Leave & Planned Leave Helpers ────────────────────────────────────────────

export const LEAVE_TYPES = [
  {
    id: "Planned Leave",
    label: "Planned Leave",
    short: "Planned",
    badgeCls: "bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  {
    id: "Annual Leave",
    label: "Annual / Vacation",
    short: "Vacation",
    badgeCls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    id: "Sick Leave",
    label: "Sick Leave",
    short: "Sick",
    badgeCls: "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  {
    id: "Personal Leave",
    label: "Personal Leave",
    short: "Personal",
    badgeCls: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/30",
  },
  {
    id: "Holiday",
    label: "Public Holiday",
    short: "Holiday",
    badgeCls: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    id: "Scheduled Off Day",
    label: "Scheduled Off Day",
    short: "Off Day",
    badgeCls: "bg-muted/60 text-muted-foreground border-border/60",
  },
] as const;

export type LeaveTypeId = (typeof LEAVE_TYPES)[number]["id"] | "Weekend Off";

const LEAVE_PREFIX_RE =
  /^\[(Planned Leave|Annual Leave|Sick Leave|Personal Leave|Holiday|Scheduled Off Day|Weekend Off)\]\s*(.*)$/s;

export function parseLeaveNotes(
  notes: string | null | undefined,
  logDate?: string,
): { leaveType: LeaveTypeId; cleanNotes: string } {
  const raw = (notes ?? "").trim();
  const match = raw.match(LEAVE_PREFIX_RE);
  if (match) {
    return {
      leaveType: match[1] as LeaveTypeId,
      cleanNotes: match[2].trim(),
    };
  }
  const defaultType: LeaveTypeId =
    logDate && isWeekend(logDate) ? "Weekend Off" : "Scheduled Off Day";
  return {
    leaveType: defaultType,
    cleanNotes: raw,
  };
}

export function formatLeaveNotes(
  leaveType: LeaveTypeId,
  cleanNotes: string | null | undefined,
): string | null {
  const clean = (cleanNotes ?? "").trim();
  if (leaveType === "Weekend Off" || leaveType === "Scheduled Off Day") {
    return clean || null;
  }
  return clean ? `[${leaveType}] ${clean}` : `[${leaveType}]`;
}

export function getLeaveBadgeClasses(leaveType: LeaveTypeId): string {
  if (leaveType === "Weekend Off") {
    return "bg-muted/50 text-muted-foreground border-border/50";
  }
  const found = LEAVE_TYPES.find((t) => t.id === leaveType);
  return found ? found.badgeCls : "bg-muted/60 text-muted-foreground border-border/60";
}

export function addDaysISO(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00Z`).getTime();
  if (Number.isNaN(base)) return iso;
  const d = new Date(base + days * 86_400_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function diffDaysISO(a: string, b: string): number {
  const ta = new Date(`${a}T12:00:00Z`).getTime();
  const tb = new Date(`${b}T12:00:00Z`).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round(Math.abs(ta - tb) / 86_400_000);
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [startDate];
  const dates: string[] = [];
  const DAY_MS = 86_400_000;
  for (let t = start, i = 0; t <= end && i < 366; t += DAY_MS, i++) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

/**
 * Given existing logs, returns the next unlogged date continuing after the most recent
 * leave/log if today is already covered by a leave or log, otherwise returns today.
 */
export function getNextContinuingDate(logs: DailyLog[], fallbackToday = isoDate()): string {
  if (logs.length === 0) return fallbackToday;
  const existingSet = new Set(logs.map((l) => l.log_date));
  // If today is not yet logged, check if there is an active/planned leave ending >= today
  const offDates = logs.filter((l) => l.is_off_day).map((l) => l.log_date).sort();
  const latestOff = offDates[offDates.length - 1];

  if (!existingSet.has(fallbackToday) && (!latestOff || latestOff < fallbackToday)) {
    return fallbackToday;
  }

  // Start from the day after the latest logged date (or today) and find the first unlogged date
  const allDatesSorted = [...existingSet].sort();
  const latestAny = allDatesSorted[allDatesSorted.length - 1];
  const anchor = latestAny >= fallbackToday ? addDaysISO(latestAny, 1) : fallbackToday;
  let candidate = anchor;
  for (let i = 0; i < 366; i++) {
    if (!existingSet.has(candidate)) return candidate;
    candidate = addDaysISO(candidate, 1);
  }
  return fallbackToday;
}

export interface GroupedDailyLog {
  id: string;
  user_id: string;
  /** Earliest date in the span (YYYY-MM-DD) */
  start_date: string;
  /** Latest date in the span (YYYY-MM-DD) */
  end_date: string;
  /** Alias for start_date for compatibility */
  log_date: string;
  /** All ISO dates covered by this row, sorted ascending */
  dates: string[];
  /** Number of calendar days in this row */
  day_count: number;
  counts: Record<string, number>;
  is_off_day: boolean;
  leave_type: LeaveTypeId;
  clean_notes: string;
  notes: string | null;
  logs: DailyLog[];
}

/**
 * Collapses consecutive off-days / leave days into a single unified row so
 * short or long leaves take only 1 row in the Daily Log table and working dates
 * continue seamlessly before and after the leave.
 */
export function groupDailyLogs(logs: DailyLog[]): GroupedDailyLog[] {
  const sortedDesc = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const result: GroupedDailyLog[] = [];

  for (const log of sortedDesc) {
    if (!log.is_off_day) {
      result.push({
        id: log.id,
        user_id: log.user_id,
        start_date: log.log_date,
        end_date: log.log_date,
        log_date: log.log_date,
        dates: [log.log_date],
        day_count: 1,
        counts: log.counts ?? {},
        is_off_day: false,
        leave_type: "Scheduled Off Day",
        clean_notes: log.notes ?? "",
        notes: log.notes,
        logs: [log],
      });
      continue;
    }

    const { leaveType, cleanNotes } = parseLeaveNotes(log.notes, log.log_date);
    const prev = result[result.length - 1];

    // Merge consecutive off/leave days that share the same leave type & notes
    // (or consecutive weekend off days) into one consolidated row
    const canMerge =
      prev &&
      prev.is_off_day &&
      diffDaysISO(prev.start_date, log.log_date) === 1 &&
      prev.leave_type === leaveType &&
      prev.clean_notes === cleanNotes;

    if (canMerge) {
      prev.start_date = log.log_date;
      prev.log_date = log.log_date;
      prev.dates.unshift(log.log_date);
      prev.day_count = prev.dates.length;
      prev.logs.unshift(log);
    } else {
      result.push({
        id: log.id,
        user_id: log.user_id,
        start_date: log.log_date,
        end_date: log.log_date,
        log_date: log.log_date,
        dates: [log.log_date],
        day_count: 1,
        counts: {},
        is_off_day: true,
        leave_type: leaveType,
        clean_notes: cleanNotes,
        notes: log.notes,
        logs: [log],
      });
    }
  }

  return result;
}

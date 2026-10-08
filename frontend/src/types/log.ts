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

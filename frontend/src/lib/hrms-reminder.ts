const ORG_TZ = "America/Phoenix";
const STORAGE_KEY = "hrms_reminder_ack";

// The org runs on Phoenix time, not the user's local clock, so the day that
// gates the daily HRMS reminder is the org date.
export function orgToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ORG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function readAck(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return ""; // storage blocked: reminder shows once per visit
  }
}

export function ackToday(): void {
  try {
    localStorage.setItem(STORAGE_KEY, orgToday());
  } catch {
    // storage blocked: reminder shows again next visit, harmless
  }
}

export function reminderDue(stored: string, today: string = orgToday()): boolean {
  return stored !== today;
}
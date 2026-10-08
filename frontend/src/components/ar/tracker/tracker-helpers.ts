import type { FaxStepStatus, StepField } from "@/hooks/useFaxTracker";
import type { TrackerMode } from "./types";
export { type TrackerMode } from "./types";

// ponytail: display label for step statuses — "Successfully Sent" is verbose for the
// dropdown/cell, so the picker shows "Sent". The backend value stays "Successfully Sent"
// (it's a stored enum) so no DB migration is needed.
export const STATUS_LABEL: Record<string, string> = {
  "Successfully Sent": "Sent",
  "Failed": "Failed",
  "Waiting": "Waiting",
  "Pending": "Pending",
};

export function labelFor(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function stepClasses(status: FaxStepStatus | null): string {
  switch (status) {
     case "Successfully Sent": return "text-emerald-700 dark:text-white";
    case "Failed":            return "text-rose-700 dark:text-white";
    case "Waiting":           return "text-amber-600 dark:text-white";
    case "Pending":           return "text-foreground dark:text-white";
    default:                  return "text-foreground";
  }
}

export function stepMenuClasses(status: FaxStepStatus | null): string {
  // ponytail: only differs from stepClasses on dark variants; avoids a second switch
  const dark: Record<string, string> = {
    "Failed": "dark:text-rose-300",
    "Waiting": "dark:text-amber-300",
  };
  return stepClasses(status).replace("dark:text-white", dark[status ?? ""] ?? "").trim();
}

export function overallClasses(status: string): string {
  if (status.startsWith("Resolved"))    return "text-emerald-700 dark:text-white";
  if (status === "All Steps Failed")    return "text-rose-700 dark:text-white";
  if (status.startsWith("Waiting"))     return "text-amber-700 dark:text-white";
  if (status.startsWith("Move to"))     return "text-amber-600 dark:text-white";
  return "text-foreground dark:text-white";
}

export function displayStatus(status: string): string {
  // The SQL view appends "– Refax Same/New/ROI #" after "Resolved"; users only need the
  // top-level outcome, so collapse all "Resolved – …" variants to plain "Resolved".
  if (status.startsWith("Resolved")) return "Resolved";
  return status.replace(/\s*#\s*$/, "").trim();
}


export function formatDateTime(value: string | null | undefined): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const STATUS_GROUPS = ["Resolved", "Failed", "Waiting", "Incomplete"] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number];

export function statusGroup(s: string): StatusGroup | null {
  if (s.startsWith("Resolved")) return "Resolved";
  if (s === "All Steps Failed") return "Failed";
  if (s.startsWith("Waiting")) return "Waiting";
  if (s.startsWith("Move to") || s === "Pending") return "Incomplete";
  return null;
}

export function rowClasses(status: string): string {
  switch (statusGroup(status)) {
    case "Resolved":   return "bg-emerald-500/[0.16] hover:bg-emerald-500/25 dark:bg-emerald-500/[0.04] dark:hover:bg-emerald-500/[0.08]";
    case "Failed":     return "bg-rose-500/[0.16] hover:bg-rose-500/25 dark:bg-rose-500/[0.04] dark:hover:bg-rose-500/[0.08]";
    case "Waiting":    return "bg-amber-400/[0.16] hover:bg-amber-400/25 dark:bg-amber-400/[0.045] dark:hover:bg-amber-400/[0.09]";
    case "Incomplete": return "bg-slate-400/[0.12] hover:bg-slate-400/20 dark:bg-slate-400/[0.04] dark:hover:bg-slate-400/[0.08]";
    default:           return "hover:bg-muted/30";
  }
}

export function stepIsActive(row: { step1: FaxStepStatus; step2: FaxStepStatus | null; step3: FaxStepStatus | null }, field: StepField, mode: TrackerMode): boolean {
  if (mode === "indexable") return true;
  if (field === "step1") return true;
  if (field === "step2") return row.step1 === "Failed";
  return row.step1 === "Failed" && row.step2 === "Failed";
}

export function stepIsSkipped(row: { step1: FaxStepStatus; step2: FaxStepStatus | null; step3: FaxStepStatus | null }, field: StepField, mode: TrackerMode): boolean {
  if (mode !== "indexable") return false;
  const status = row[field];
  if (status && status !== "Pending") return false;
  return (["step1", "step2", "step3"] as StepField[])
    .filter((f) => f !== field)
    .some((f) => row[f] === "Successfully Sent");
}

// ponytail: labels are static today; take a mode param again if fax/indexable diverge
export function stepLabels(_mode: TrackerMode): [string, string, string] {
  return [
    "Step 1",
    "Step 2",
    "Step 3",
  ];
}

import { toast } from "sonner";

export async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name);
    toast.success(`Copied "${name}"`);
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}

// Mask DOB input as MM/DD/YYYY while typing — strips non-digits, inserts "/" every 2 digits.
export function formatDobInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d.replace(/(\d{2})(?=\d)/g, "$1/");
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function pageNumbersArr(totalPages: number, page: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const nums: (number | "…")[] = [1];
  if (page > 3) nums.push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
  if (page < totalPages - 2) nums.push("…");
  nums.push(totalPages);
  return nums;
}

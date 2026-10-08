import { describe, it, expect } from "vitest";
import { orgToday, reminderDue } from "@/lib/hrms-reminder";

describe("hrms reminder", () => {
  it("is due when never acknowledged or acknowledged on a past org date", () => {
    expect(reminderDue("")).toBe(true);
    expect(reminderDue("2020-01-01")).toBe(true);
  });

  it("is not due when acknowledged for the current org date", () => {
    expect(reminderDue("2026-09-04", "2026-09-04")).toBe(false);
    expect(reminderDue("2026-09-03", "2026-09-04")).toBe(true);
  });

  it("orgToday returns a YYYY-MM-DD date", () => {
    expect(orgToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
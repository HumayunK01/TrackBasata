import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addMinutesToTime,
  computeDurationMinutes,
  formatDuration,
  formatTime12h,
  isOvernightWindow,
  OvertimeLogSchema,
  type OvertimeLog,
} from "@/hooks/useOvertimeLogs";
import {
  copyOvertimeEntry,
  overtimeToCSV,
  overtimeToJSON,
} from "@/lib/overtime-utils";

describe("Overtime time & duration helpers", () => {
  it("computes same-day durations accurately", () => {
    expect(computeDurationMinutes("17:00", "19:30")).toBe(150);
    expect(computeDurationMinutes("09:15", "10:00")).toBe(45);
  });

  it("supports overnight wraparound durations", () => {
    expect(computeDurationMinutes("22:30", "01:00")).toBe(150);
    expect(isOvernightWindow("22:30", "01:00")).toBe(true);
    expect(isOvernightWindow("17:00", "19:00")).toBe(false);
  });

  it("returns 0 when start and end match or inputs are invalid", () => {
    expect(computeDurationMinutes("17:00", "17:00")).toBe(0);
    expect(computeDurationMinutes("25:00", "18:00")).toBe(0);
  });

  it("adds preset minutes across midnight cleanly", () => {
    expect(addMinutesToTime("23:00", 120)).toBe("01:00");
    expect(addMinutesToTime("17:30", 90)).toBe("19:00");
  });

  it("formats durations and 12-hour times cleanly", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(150)).toBe("2h 30m");
    expect(formatTime12h("00:05")).toBe("12:05 AM");
    expect(formatTime12h("12:30")).toBe("12:30 PM");
    expect(formatTime12h("17:45")).toBe("5:45 PM");
  });
});

describe("OvertimeLogSchema validation", () => {
  it("accepts valid overtime entries with OT Date, Overtime Window, and Notes", () => {
    const parsed = OvertimeLogSchema.parse({
      ot_date: "2026-11-20",
      start_time: "17:00",
      end_time: "19:30",
      duration_minutes: 150,
      notes: "Cleared backlog",
    });
    expect(parsed.duration_minutes).toBe(150);
    expect(parsed.notes).toBe("Cleared backlog");
  });

  it("rejects zero duration", () => {
    expect(() =>
      OvertimeLogSchema.parse({
        ot_date: "2026-11-20",
        start_time: "17:00",
        end_time: "17:00",
        duration_minutes: 0,
      }),
    ).toThrow();
  });
});

describe("Overtime export & copy helpers", () => {
  const sampleRow: OvertimeLog = {
    id: "ot-1",
    ot_date: "2026-11-20",
    start_time: "17:00",
    end_time: "19:30",
    duration_minutes: 150,
    account_name: "-",
    doc_count: 0,
    notes: "=Urgent faxes",
    created_by: "user-1",
    created_at: "2026-11-20T20:00:00Z",
    updated_at: "2026-11-20T20:00:00Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("neutralizes spreadsheet formula prefixes in CSV export and includes Added By when provided", () => {
    const csvWithAdmin = overtimeToCSV([sampleRow], () => "Alex Doe");
    expect(csvWithAdmin).toContain("Added By");
    expect(csvWithAdmin).toContain("Alex Doe");
    expect(csvWithAdmin).toContain("'=Urgent faxes");
    expect(csvWithAdmin).toContain("2h 30m");

    const csvUser = overtimeToCSV([sampleRow]);
    expect(csvUser).not.toContain("Added By");
  });

  it("marks overnight end times with (+1d) in CSV export", () => {
    const overnightRow: OvertimeLog = {
      ...sampleRow,
      start_time: "22:30",
      end_time: "01:00",
      duration_minutes: 150,
    };
    const csv = overtimeToCSV([overnightRow]);
    expect(csv).toContain("1:00 AM (+1d)");
  });

  it("includes summary totals in JSON export without account or doc fields", () => {
    const json = JSON.parse(overtimeToJSON([sampleRow], () => "Alex Doe"));
    expect(json.summary.entries).toBe(1);
    expect(json.summary.total_minutes).toBe(150);
    expect(json.summary.total_duration).toBe("2h 30m");
    expect(json.entries[0].added_by).toBe("Alex Doe");
    expect(json.entries[0].account_name).toBeUndefined();
    expect(json.entries[0].doc_count).toBeUndefined();
  });

  it("copies OT Date, Overtime Window, Duration, and Notes without Added By", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const ok = await copyOvertimeEntry({
      ...sampleRow,
      notes: "Stayed for urgent faxes",
    });

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain("OT Date\t");
    expect(copiedText).toContain("Overtime Window\t5:00 PM – 7:30 PM");
    expect(copiedText).toContain("Duration\t2h 30m");
    expect(copiedText).toContain("Notes\tStayed for urgent faxes");
    expect(copiedText).not.toContain("Added By");
  });
});

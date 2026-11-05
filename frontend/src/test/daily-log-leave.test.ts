import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  diffDaysISO,
  formatLeaveNotes,
  getDatesInRange,
  getNextContinuingDate,
  groupDailyLogs,
  parseLeaveNotes,
  type DailyLog,
} from "@/types/log";

function makeLog(overrides: Partial<DailyLog> & { log_date: string }): DailyLog {
  return {
    id: `id-${overrides.log_date}`,
    user_id: "u1",
    log_date: overrides.log_date,
    counts: overrides.counts ?? {},
    is_off_day: overrides.is_off_day ?? false,
    notes: overrides.notes ?? null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };
}

describe("Daily Log Leave & Consolidated Row Helpers", () => {
  it("formats and parses leave notes with structured leave types", () => {
    const raw = formatLeaveNotes("Planned Leave", "Family trip");
    expect(raw).toBe("[Planned Leave] Family trip");
    expect(parseLeaveNotes(raw, "2026-11-05")).toEqual({
      leaveType: "Planned Leave",
      cleanNotes: "Family trip",
    });

    const rawNoNote = formatLeaveNotes("Sick Leave", "");
    expect(rawNoNote).toBe("[Sick Leave]");
    expect(parseLeaveNotes(rawNoNote, "2026-11-05")).toEqual({
      leaveType: "Sick Leave",
      cleanNotes: "",
    });
  });

  it("expands inclusive date ranges accurately", () => {
    expect(getDatesInRange("2026-11-05", "2026-11-08")).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(diffDaysISO("2026-11-05", "2026-11-08")).toBe(3);
    expect(diffDaysISO("2026-11-05", "2026-11-06")).toBe(1);
    expect(addDaysISO("2026-11-08", 1)).toBe("2026-11-09");
  });

  it("consolidates multi-day consecutive leaves into a single row and continues dates cleanly", () => {
    const logs: DailyLog[] = [
      // Working day before leave
      makeLog({ log_date: "2026-11-04", counts: { ref: 45 }, is_off_day: false }),
      // 4-day Planned Leave (Nov 5 - Nov 8)
      makeLog({ log_date: "2026-11-05", is_off_day: true, notes: "[Planned Leave] Vacation" }),
      makeLog({ log_date: "2026-11-06", is_off_day: true, notes: "[Planned Leave] Vacation" }),
      makeLog({ log_date: "2026-11-07", is_off_day: true, notes: "[Planned Leave] Vacation" }),
      makeLog({ log_date: "2026-11-08", is_off_day: true, notes: "[Planned Leave] Vacation" }),
      // Working day continuing after leave (Nov 9)
      makeLog({ log_date: "2026-11-09", counts: { ref: 52 }, is_off_day: false }),
    ];

    const grouped = groupDailyLogs(logs);
    // 6 calendar days collapse into 3 rows: Nov 9 (work), Nov 5–8 (1 leave row), Nov 4 (work)
    expect(grouped).toHaveLength(3);

    // Latest row: Nov 9 work day
    expect(grouped[0].log_date).toBe("2026-11-09");
    expect(grouped[0].is_off_day).toBe(false);
    expect(grouped[0].day_count).toBe(1);

    // Middle row: Consolidated 4-day Planned Leave in ONE row
    expect(grouped[1].is_off_day).toBe(true);
    expect(grouped[1].start_date).toBe("2026-11-05");
    expect(grouped[1].end_date).toBe("2026-11-08");
    expect(grouped[1].day_count).toBe(4);
    expect(grouped[1].leave_type).toBe("Planned Leave");
    expect(grouped[1].clean_notes).toBe("Vacation");
    expect(grouped[1].dates).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);

    // Earliest row: Nov 4 work day
    expect(grouped[2].log_date).toBe("2026-11-04");
    expect(grouped[2].is_off_day).toBe(false);
  });

  it("keeps distinct consecutive leaves separate if leave type or notes differ", () => {
    const logs: DailyLog[] = [
      makeLog({ log_date: "2026-11-05", is_off_day: true, notes: "[Sick Leave] Flu" }),
      makeLog({ log_date: "2026-11-06", is_off_day: true, notes: "[Planned Leave] Trip" }),
      makeLog({ log_date: "2026-11-07", is_off_day: true, notes: "[Planned Leave] Trip" }),
    ];

    const grouped = groupDailyLogs(logs);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].leave_type).toBe("Planned Leave");
    expect(grouped[0].day_count).toBe(2);
    expect(grouped[0].start_date).toBe("2026-11-06");
    expect(grouped[0].end_date).toBe("2026-11-07");

    expect(grouped[1].leave_type).toBe("Sick Leave");
    expect(grouped[1].day_count).toBe(1);
    expect(grouped[1].start_date).toBe("2026-11-05");
  });

  it("computes the next continuing date after a planned leave", () => {
    const logs: DailyLog[] = [
      makeLog({ log_date: "2099-01-05", is_off_day: true, notes: "[Planned Leave]" }),
      makeLog({ log_date: "2099-01-06", is_off_day: true, notes: "[Planned Leave]" }),
      makeLog({ log_date: "2099-01-07", is_off_day: true, notes: "[Planned Leave]" }),
    ];
    expect(getNextContinuingDate(logs)).toBe("2099-01-08");
  });
});

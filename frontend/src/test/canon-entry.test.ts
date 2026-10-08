import { describe, it, expect } from "vitest";
import { canonEntry } from "@/lib/log-utils";
import type { DailyLogInsert } from "@/types/log";

const draft = (over: Partial<DailyLogInsert> = {}): DailyLogInsert => ({
  log_date: "2026-01-05",
  counts: {},
  is_off_day: false,
  notes: null,
  ...over,
});

describe("canonEntry", () => {
  it("treats a counter touched back to zero as unchanged", () => {
    expect(canonEntry(draft({ counts: { ng: 0 } }))).toBe(canonEntry(draft()));
  });

  it("ignores count key order", () => {
    const a = canonEntry(draft({ counts: { ng: 2, fax: 3 } }));
    const b = canonEntry(draft({ counts: { fax: 3, ng: 2 } }));
    expect(a).toBe(b);
  });

  it("detects real changes", () => {
    expect(canonEntry(draft({ counts: { ng: 1 } }))).not.toBe(canonEntry(draft()));
    expect(canonEntry(draft({ notes: "hi" }))).not.toBe(canonEntry(draft()));
    expect(canonEntry(draft({ is_off_day: true }))).not.toBe(canonEntry(draft()));
  });

  it("treats blank/whitespace notes as no notes", () => {
    expect(canonEntry(draft({ notes: "   " }))).toBe(canonEntry(draft({ notes: null })));
  });
});

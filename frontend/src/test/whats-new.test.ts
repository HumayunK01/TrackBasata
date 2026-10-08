import { describe, it, expect } from "vitest";
import { groupEntriesByDate, unreadIds, type WhatsNewEntry } from "@/components/ar/whats-new";

const entry = (id: string, date: string): WhatsNewEntry => ({
  id,
  date,
  title: id,
  description: "",
  body: [],
});

describe("unreadIds", () => {
  it("returns entries without a read receipt", () => {
    expect(unreadIds([entry("a", "2026-09-03"), entry("b", "2026-09-01")], ["b"])).toEqual(["a"]);
  });

  it("returns everything when nothing has been read", () => {
    expect(unreadIds([entry("a", "2026-09-03")], [])).toEqual(["a"]);
  });

  it("returns nothing when everything has been read", () => {
    expect(unreadIds([entry("a", "2026-09-03")], ["a"])).toEqual([]);
  });
});

describe("groupEntriesByDate", () => {
  it("groups entries under their date, preserving order", () => {
    const groups = groupEntriesByDate([
      entry("a", "2026-09-03"),
      entry("b", "2026-09-03"),
      entry("c", "2026-09-01"),
    ]);
    expect(groups.map(([date, entries]) => [date, entries.map((e) => e.id)])).toEqual([
      ["2026-09-03", ["a", "b"]],
      ["2026-09-01", ["c"]],
    ]);
  });

  it("handles an empty list", () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });
});
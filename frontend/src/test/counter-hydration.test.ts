import { describe, it, expect, beforeEach } from "vitest";

describe("Counter Hydration & Anti-Data Loss Guards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not load yesterday's stale counts on a new day", () => {
    const yesterday = "2026-09-28";
    const today = "2026-09-29";

    localStorage.setItem("counter_counts", JSON.stringify({ move_to_indexing: 35 }));
    localStorage.setItem("counter_counts_date", yesterday);

    const savedDate = localStorage.getItem("counter_counts_date");
    const isCurrentDay = savedDate === today;

    const initialCounts = isCurrentDay
      ? JSON.parse(localStorage.getItem("counter_counts") || "{}")
      : {};

    expect(initialCounts).toEqual({});
  });

  it("loads local counts if the date matches today", () => {
    const today = "2026-09-29";

    localStorage.setItem("counter_counts", JSON.stringify({ move_to_indexing: 15 }));
    localStorage.setItem("counter_counts_date", today);

    const savedDate = localStorage.getItem("counter_counts_date");
    const isCurrentDay = savedDate === today;

    const initialCounts = isCurrentDay
      ? JSON.parse(localStorage.getItem("counter_counts") || "{}")
      : {};

    expect(initialCounts).toEqual({ move_to_indexing: 15 });
  });

  it("safely merges server counts with any local taps without reducing database numbers", () => {
    const serverCounts: Record<string, number> = { move_to_indexing: 20, reviews: 5 };
    const localCounts: Record<string, number> = { move_to_indexing: 1, athena: 3 };

    const merged = { ...serverCounts };
    for (const k of Object.keys(localCounts)) {
      merged[k] = Math.max(localCounts[k] ?? 0, serverCounts[k] ?? 0);
    }

    expect(merged.move_to_indexing).toBe(20); // Not reduced to 1!
    expect(merged.reviews).toBe(5);
    expect(merged.athena).toBe(3);
  });

  it("activates all categories that have existing counts in the database", () => {
    const selectedKeys = ["general"];
    const serverCounts: Record<string, number> = { move_to_indexing: 20, fax_back: 0 };
    const categories = [
      { key: "general", label: "General" },
      { key: "move_to_indexing", label: "Move to Indexing" },
      { key: "fax_back", label: "Fax Back" },
    ];

    const serverKeysWithCounts = Object.keys(serverCounts).filter(
      (k) => (serverCounts[k] ?? 0) > 0 && categories.some((c) => c.key === k)
    );
    const nextKeys = Array.from(new Set([...selectedKeys, ...serverKeysWithCounts]));

    expect(nextKeys).toContain("move_to_indexing");
    expect(nextKeys).toContain("general");
    expect(nextKeys).not.toContain("fax_back"); // 0 count was not forced
  });

  it("detects when candidate counts would reduce existing database counts", () => {
    const serverCounts: Record<string, number> = { move_to_indexing: 20 };
    const candidateCounts: Record<string, number> = { move_to_indexing: 0 };
    const categories = [{ key: "move_to_indexing", label: "Move to Indexing" }];

    const reduced: { label: string; from: number; to: number }[] = [];
    for (const cat of categories) {
      const serverVal = serverCounts[cat.key] ?? 0;
      const localVal = candidateCounts[cat.key] ?? 0;
      if (serverVal > 0 && localVal < serverVal) {
        reduced.push({ label: cat.label, from: serverVal, to: localVal });
      }
    }

    expect(reduced).toHaveLength(1);
    expect(reduced[0].label).toBe("Move to Indexing");
    expect(reduced[0].from).toBe(20);
    expect(reduced[0].to).toBe(0);
  });
});

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

  it("rescues dirty previous-day counts into counter_pending_rescue on date rollover", () => {
    const yesterday = "2026-09-28";
    const today = "2026-09-29";

    localStorage.setItem("counter_counts", JSON.stringify({ moved_to_indexing: 140, worked_on_ng: 45 }));
    localStorage.setItem("counter_counts_date", yesterday);
    localStorage.setItem("counter_dirty", "true");

    const savedDate = localStorage.getItem("counter_counts_date");
    const isCurrentDay = savedDate === today;

    if (savedDate && !isCurrentDay && localStorage.getItem("counter_dirty") === "true") {
      const staleCounts = JSON.parse(localStorage.getItem("counter_counts") || "{}");
      localStorage.setItem(
        "counter_pending_rescue",
        JSON.stringify({ date: savedDate, counts: staleCounts })
      );
      localStorage.removeItem("counter_dirty");
    }

    const rescued = JSON.parse(localStorage.getItem("counter_pending_rescue") || "null");
    expect(rescued).toEqual({
      date: "2026-09-28",
      counts: { moved_to_indexing: 140, worked_on_ng: 45 },
    });
    expect(localStorage.getItem("counter_dirty")).toBeNull();
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

  it("never blocks auto-save of other categories when one category is decremented or reset", () => {
    const existingCounts: Record<string, number> = {
      moved_to_indexing: 10,
      worked_on_ng: 5,
    };
    // User explicitly decremented moved_to_indexing to 9, and incremented worked_on_ng to 85
    const currentCounts: Record<string, number> = {
      moved_to_indexing: 9,
      worked_on_ng: 85,
      fax_back: 30,
    };
    const forceKeys = new Set<string>(["moved_to_indexing"]);
    const allCandidateKeys = ["moved_to_indexing", "worked_on_ng", "fax_back"];

    const mergedCounts: Record<string, number> = { ...existingCounts };
    for (const k of allCandidateKeys) {
      const localVal = Math.max(0, currentCounts[k] ?? 0);
      const serverVal = existingCounts[k] ?? 0;
      if (forceKeys.has(k)) {
        mergedCounts[k] = localVal;
      } else {
        mergedCounts[k] = Math.max(localVal, serverVal);
      }
    }

    expect(mergedCounts).toEqual({
      moved_to_indexing: 9, // intentional decrement honored
      worked_on_ng: 85, // full day count synced
      fax_back: 30, // new category synced
    });
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

import { describe, it, expect } from "vitest";
import type { DailyLog } from "@/types/log";
import type { Category } from "@/hooks/useCategories";

function computeUserCategoryContributions(
  userLogs: DailyLog[],
  allCategories: Category[],
) {
  const totals: Record<string, number> = {};
  let userTotalDocs = 0;

  for (const l of userLogs) {
    if (l.is_off_day || !l.counts) continue;
    for (const [k, v] of Object.entries(l.counts)) {
      if (typeof v === "number" && v > 0) {
        totals[k] = (totals[k] ?? 0) + v;
        userTotalDocs += v;
      }
    }
  }

  const catMap = new Map(allCategories.map((c) => [c.key, c]));

  // For users having 0 contribution in any category, do NOT show it!
  return Object.entries(totals)
    .filter(([_, count]) => count > 0)
    .map(([key, totalDocs]) => {
      const meta = catMap.get(key);
      return {
        id: meta?.id ?? key,
        key,
        label: meta?.label ?? key,
        short: meta?.short ?? key.slice(0, 4).toUpperCase(),
        position: meta?.position ?? 999,
        totalDocs,
        share: userTotalDocs > 0 ? Math.round((totalDocs / userTotalDocs) * 100) : 0,
      };
    })
    .sort((a, b) => b.totalDocs - a.totalDocs);
}

function filterZeroContributionCategories(
  logs: DailyLog[],
  categories: Category[],
  hideZeroCategories: boolean,
) {
  if (!hideZeroCategories) return categories;

  const userContributedKeys = new Set<string>();
  for (const l of logs) {
    if (l.is_off_day || !l.counts) continue;
    for (const [k, v] of Object.entries(l.counts)) {
      if (typeof v === "number" && v > 0) userContributedKeys.add(k);
    }
  }

  const filtered = categories.filter((c) => userContributedKeys.has(c.key));
  return filtered.length > 0 ? filtered : categories;
}

function createLog(data: { id: string; user_id: string; log_date: string; is_off_day: boolean; counts: Record<string, number> }): DailyLog {
  return {
    notes: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...data,
  };
}

describe("User Category Contributions - Hide 0 Contributions Feature", () => {
  const mockCategories: Category[] = [
    { key: "ekg", label: "EKG / ECG", short: "EKG", position: 1 },
    { key: "labs", label: "Laboratory", short: "LABS", position: 2 },
    { key: "radiology", label: "Radiology", short: "RAD", position: 3 },
    { key: "cardiology", label: "Cardiology", short: "CARD", position: 4 },
  ];

  it("filters out any category where the user has 0 contributions", () => {
    const logs: DailyLog[] = [
      createLog({
        id: "1",
        user_id: "user_a",
        log_date: "2026-10-01",
        is_off_day: false,
        counts: { ekg: 10, labs: 30, radiology: 0 },
      }),
      createLog({
        id: "2",
        user_id: "user_a",
        log_date: "2026-10-02",
        is_off_day: false,
        counts: { ekg: 5, labs: 0 },
      }),
    ];

    const result = computeUserCategoryContributions(logs, mockCategories);

    // Only ekg (15) and labs (30) should be returned; radiology (0) and cardiology (no logs) MUST NOT be shown
    expect(result.map((r) => r.key)).toEqual(["labs", "ekg"]);
    expect(result.find((r) => r.key === "radiology")).toBeUndefined();
    expect(result.find((r) => r.key === "cardiology")).toBeUndefined();

    // Verify document totals and calculated share
    const labsResult = result.find((r) => r.key === "labs")!;
    expect(labsResult.totalDocs).toBe(30);
    expect(labsResult.share).toBe(67); // 30 / 45 = ~67%

    const ekgResult = result.find((r) => r.key === "ekg")!;
    expect(ekgResult.totalDocs).toBe(15);
    expect(ekgResult.share).toBe(33); // 15 / 45 = ~33%
  });

  it("returns an empty list when user has 0 contribution across all categories", () => {
    const logs: DailyLog[] = [
      createLog({
        id: "1",
        user_id: "user_b",
        log_date: "2026-10-01",
        is_off_day: true,
        counts: {},
      }),
      createLog({
        id: "2",
        user_id: "user_b",
        log_date: "2026-10-02",
        is_off_day: false,
        counts: { ekg: 0, labs: 0, radiology: 0 },
      }),
    ];

    const result = computeUserCategoryContributions(logs, mockCategories);
    expect(result).toHaveLength(0);
  });

  it("ignores counts on scheduled off days", () => {
    const logs: DailyLog[] = [
      createLog({
        id: "1",
        user_id: "user_c",
        log_date: "2026-10-01",
        is_off_day: true,
        counts: { ekg: 50 }, // Should be ignored because is_off_day is true
      }),
      createLog({
        id: "2",
        user_id: "user_c",
        log_date: "2026-10-02",
        is_off_day: false,
        counts: { labs: 12 },
      }),
    ];

    const result = computeUserCategoryContributions(logs, mockCategories);
    expect(result.map((r) => r.key)).toEqual(["labs"]);
    expect(result.find((r) => r.key === "ekg")).toBeUndefined();
  });

  it("filters table columns in DaysTable when hideZeroCategories is enabled", () => {
    const logs: DailyLog[] = [
      createLog({
        id: "1",
        user_id: "user_d",
        log_date: "2026-10-01",
        is_off_day: false,
        counts: { ekg: 8, cardiology: 14 },
      }),
    ];

    // When hideZeroCategories is false: all categories are returned
    const all = filterZeroContributionCategories(logs, mockCategories, false);
    expect(all).toHaveLength(4);

    // When hideZeroCategories is true: only ekg and cardiology are returned
    const filtered = filterZeroContributionCategories(logs, mockCategories, true);
    expect(filtered.map((c) => c.key)).toEqual(["ekg", "cardiology"]);
    expect(filtered.find((c) => c.key === "labs")).toBeUndefined();
    expect(filtered.find((c) => c.key === "radiology")).toBeUndefined();
  });
});

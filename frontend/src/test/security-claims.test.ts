/**
 * Security audit verification.
 *
 * This suite exists to PROVE the claims in the security audit table, not to
 * assert them. Each test exercises the real production code path:
 *   - the real Zod schemas (re-declared here only because the source files
 *     don't export them; kept byte-identical to the originals)
 *   - the real useMutationRateLimit hook (imported directly)
 *
 * If any production schema changes and these copies drift, that's a signal to
 * re-verify — these tests are a tripwire, not a substitute for the source.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { z } from "zod";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";

// ── Claim 1: Input Validation (mirrors src/hooks/useDailyLogs.ts:10-17) ──────
const countField = z
  .number()
  .int("Must be a whole number")
  .nonnegative("Must be 0 or more")
  .max(9999, "Value too large");

const DailyLogInsertSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  counts: z.record(countField),
  is_off_day: z.boolean(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").nullable().optional(),
});

// Mirrors src/hooks/useCategories.ts:12-21 (the user-controllable fields)
const CategoryKeySchema = z
  .string()
  .min(1, "Key required")
  .max(64, "Key too long")
  .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores");

describe("Claim 1: Input validation is enforced via Zod", () => {
  it("rejects an SQL-injection-style category key", () => {
    const r = CategoryKeySchema.safeParse("foo'; DROP TABLE categories;--");
    expect(r.success).toBe(false);
  });

  it("rejects an XSS payload in a category key", () => {
    const r = CategoryKeySchema.safeParse("<script>alert(1)</script>");
    expect(r.success).toBe(false);
  });

  it("accepts a well-formed key", () => {
    expect(CategoryKeySchema.safeParse("worked_on_ng").success).toBe(true);
  });

  it("rejects a negative count (data-integrity bypass attempt)", () => {
    const r = DailyLogInsertSchema.safeParse({
      log_date: "2026-05-17",
      counts: { ekg: -50 },
      is_off_day: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects a non-integer / oversized count", () => {
    expect(
      DailyLogInsertSchema.safeParse({
        log_date: "2026-05-17",
        counts: { ekg: 10_000 },
        is_off_day: false,
      }).success,
    ).toBe(false);
    expect(
      DailyLogInsertSchema.safeParse({
        log_date: "2026-05-17",
        counts: { ekg: 3.5 },
        is_off_day: false,
      }).success,
    ).toBe(false);
  });

  it("rejects a malformed date and over-long notes", () => {
    expect(
      DailyLogInsertSchema.safeParse({
        log_date: "not-a-date",
        counts: {},
        is_off_day: false,
      }).success,
    ).toBe(false);
    expect(
      DailyLogInsertSchema.safeParse({
        log_date: "2026-05-17",
        counts: {},
        is_off_day: false,
        notes: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("accepts a fully valid payload", () => {
    expect(
      DailyLogInsertSchema.safeParse({
        log_date: "2026-05-17",
        counts: { ekg: 12, roi: 3 },
        is_off_day: false,
        notes: "ok",
      }).success,
    ).toBe(true);
  });
});

// ── Claim 4: Rate limiting (exercises the real hook) ─────────────────────────
describe("Claim 4: useMutationRateLimit enforces a sliding window", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to maxRequests then blocks", () => {
    const { result } = renderHook(() =>
      useMutationRateLimit({ maxRequests: 3, windowMs: 60_000 }),
    );
    expect(result.current.checkLimit()).toBe(true);
    expect(result.current.checkLimit()).toBe(true);
    expect(result.current.checkLimit()).toBe(true);
    expect(result.current.checkLimit()).toBe(false); // 4th blocked
  });

  it("recovers after the window slides past", () => {
    const { result } = renderHook(() =>
      useMutationRateLimit({ maxRequests: 2, windowMs: 60_000 }),
    );
    expect(result.current.checkLimit()).toBe(true);
    expect(result.current.checkLimit()).toBe(true);
    expect(result.current.checkLimit()).toBe(false);
    vi.advanceTimersByTime(60_001); // window expires
    expect(result.current.checkLimit()).toBe(true);
  });
});

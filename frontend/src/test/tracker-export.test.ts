import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportTrackerServer } from "@/lib/tracker-utils";

describe("exportTrackerServer", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-export-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("sends correct query parameters including active filters", async () => {
    let capturedUrl = "";

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        headers: new Headers({
          "content-disposition": 'attachment; filename="fax-tracker-export.csv"',
          "x-export-count": "5",
        }),
        blob: async () => new Blob(["test-csv"], { type: "text/csv" }),
      } as unknown as Response;
    });

    const result = await exportTrackerServer({
      mode: "fax",
      accountId: "11111111-2222-3333-4444-555555555555",
      accountName: "Dr. Smith Clinic",
      statuses: ["Waiting"],
      search: "John",
      format: "csv",
      sort: "patient_name",
      sortDir: "asc",
    });

    expect(capturedUrl).toContain("/api/v1/tracker/export?");
    expect(capturedUrl).toContain("mode=fax");
    expect(capturedUrl).toContain("account_id=11111111-2222-3333-4444-555555555555");
    expect(capturedUrl).toContain("status=Waiting");
    expect(capturedUrl).toContain("q=John");
    expect(capturedUrl).toContain("format=csv");
    expect(capturedUrl).toContain("sort=patient_name");
    expect(capturedUrl).toContain("sort_dir=asc");

    expect(result.count).toBe(5);
    expect(result.filename).toBe("fax-tracker-export.csv");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-export-url");
  });

  it("handles server errors gracefully", async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          success: false,
          error: { message: "Invalid or expired token", code: "UNAUTHORIZED" },
        }),
      } as unknown as Response;
    });

    await expect(
      exportTrackerServer({
        mode: "fax",
        statuses: ["Waiting"],
      })
    ).rejects.toThrow("Invalid or expired token");
  });

  it("formats report filenames as FAX_MMDDYYYY_(10RandomNumbers).ext", async () => {
    const { getTrackerReportFilename, formatMMDDYYYY, generate10RandomDigits } = await import("@/lib/tracker-utils");
    // Oct 21, 2026 (month is 0-indexed: 9 = October)
    const fixedDate = new Date(2026, 9, 21);
    const mockRandom10 = "1234567890";

    expect(formatMMDDYYYY(fixedDate)).toBe("10212026");
    expect(generate10RandomDigits()).toMatch(/^\d{10}$/);

    expect(getTrackerReportFilename("fax", "pdf", fixedDate, mockRandom10)).toBe("FAX_10212026_1234567890.pdf");
    expect(getTrackerReportFilename("fax", "csv", fixedDate, mockRandom10)).toBe("FAX_10212026_1234567890.csv");
    expect(getTrackerReportFilename("indexable", "pdf", fixedDate, mockRandom10)).toBe("INDEXABLE_10212026_1234567890.pdf");
    expect(getTrackerReportFilename("indexable", "csv", fixedDate, mockRandom10)).toBe("INDEXABLE_10212026_1234567890.csv");

    // Dynamic random digits check
    const dynamicName = getTrackerReportFilename("fax", "pdf", fixedDate);
    expect(dynamicName).toMatch(/^FAX_10212026_\d{10}\.pdf$/);
  });
});


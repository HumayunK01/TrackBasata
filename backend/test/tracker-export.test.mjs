import { createApp } from "../dist/app.js";
import { escapeCSVCell, getStatusGroup, displayStatus, formatMMDDYYYY, generate10RandomDigits, getTrackerFilename } from "../dist/services/tracker.service.js";

async function main() {
  console.log("=== RUNNING TRACKER EXPORT UNIT & ENDPOINT TESTS ===");

  // 1. Test getStatusGroup logic
  if (getStatusGroup("Waiting – Refax Same #") !== "Waiting") {
    throw new Error("Failed: Waiting – Refax Same # should be in Waiting group");
  }
  if (getStatusGroup("Waiting – Refax New #") !== "Waiting") {
    throw new Error("Failed: Waiting – Refax New # should be in Waiting group");
  }
  if (getStatusGroup("Resolved – Refax Same #") !== "Resolved") {
    throw new Error("Failed: Resolved – Refax Same # should be in Resolved group");
  }
  if (getStatusGroup("All Steps Failed") !== "Failed") {
    throw new Error("Failed: All Steps Failed should be in Failed group");
  }
  if (getStatusGroup("Move to Refax New #") !== "Incomplete") {
    throw new Error("Failed: Move to Refax New # should be in Incomplete group");
  }
  if (getStatusGroup("Pending") !== "Incomplete") {
    throw new Error("Failed: Pending should be in Incomplete group");
  }
  console.log("✅ getStatusGroup helper tests passed");

  // 2. Test displayStatus logic
  if (displayStatus("Resolved – Refax Same #") !== "Resolved") {
    throw new Error("Failed: displayStatus should format resolved properly");
  }
  if (displayStatus("Waiting – Refax Same #") !== "Waiting – Refax Same") {
    throw new Error("Failed: displayStatus should strip trailing hash");
  }
  console.log("✅ displayStatus helper tests passed");

  // 3. Test formatMMDDYYYY, generate10RandomDigits, and getTrackerFilename logic
  const testDate = new Date(2026, 9, 21); // Oct 21, 2026
  if (formatMMDDYYYY(testDate) !== "10212026") {
    throw new Error(`Failed: formatMMDDYYYY expected 10212026, got ${formatMMDDYYYY(testDate)}`);
  }
  const random10 = generate10RandomDigits();
  if (!/^\d{10}$/.test(random10)) {
    throw new Error(`Failed: generate10RandomDigits must return 10 numeric digits, got ${random10}`);
  }
  const faxFilename = getTrackerFilename("fax", "csv", testDate, "1234567890");
  if (faxFilename !== "FAX_10212026_1234567890.csv") {
    throw new Error(`Failed: expected FAX_10212026_1234567890.csv, got ${faxFilename}`);
  }
  const indexableFilename = getTrackerFilename("indexable", "csv", testDate, "1234567890");
  if (indexableFilename !== "INDEXABLE_10212026_1234567890.csv") {
    throw new Error(`Failed: expected INDEXABLE_10212026_1234567890.csv, got ${indexableFilename}`);
  }
  console.log("✅ formatMMDDYYYY, generate10RandomDigits, and getTrackerFilename tests passed");

  // 4. Test escapeCSVCell RFC 4180 escaping
  if (escapeCSVCell('John "Jack" Doe') !== '"John ""Jack"" Doe"') {
    throw new Error("Failed: escapeCSVCell should escape double quotes");
  }
  if (escapeCSVCell("Smith, John") !== '"Smith, John"') {
    throw new Error("Failed: escapeCSVCell should quote comma strings");
  }
  if (escapeCSVCell("Normal Text") !== "Normal Text") {
    throw new Error("Failed: escapeCSVCell shouldn't quote regular text");
  }
  console.log("✅ escapeCSVCell helper tests passed");

  // 4. Test unauthorized request rejects with 401
  const app = createApp();
  const server = app.listen(5096, "0.0.0.0", async () => {
    try {
      const res = await fetch("http://127.0.0.1:5096/api/v1/tracker/export?mode=fax&status=waiting");
      const data = await res.json();
      console.log("Unauthenticated /api/v1/tracker/export response:", res.status, data.error?.code);
      if (res.status !== 401 || data.error?.code !== "UNAUTHORIZED") {
        throw new Error("Expected 401 UNAUTHORIZED for unauthenticated tracker export");
      }
      console.log("✅ Unauthenticated tracker export correctly rejected with 401");
      console.log("🎉 All tracker export backend tests passed successfully!");
    } catch (err) {
      console.error("❌ Test failed:", err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        process.exit(process.exitCode || 0);
      });
    }
  });
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

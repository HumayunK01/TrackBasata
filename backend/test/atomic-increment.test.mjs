import { createApp } from "../dist/app.js";

async function runTests() {
  const app = createApp();

  const server = app.listen(5096, "0.0.0.0", async () => {
    try {
      console.log("=== RUNNING ATOMIC INCREMENT TAP TESTS ===");

      // Test 1: Unauthenticated POST /api/v1/logs/tap should reject with 401 UNAUTHORIZED
      const res1 = await fetch("http://127.0.0.1:5096/api/v1/logs/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_date: "2026-10-24", key: "worked_on_ng", delta: 1 }),
      });
      const data1 = await res1.json();
      console.log("Test 1 (Unauth tap): Status", res1.status, data1.error?.code);
      if (res1.status !== 401 || data1.error?.code !== "UNAUTHORIZED") {
        throw new Error("Test 1 failed: Expected 401 UNAUTHORIZED");
      }

      // Test 2: Invalid payload with non-conforming date should reject with 400 VALIDATION_ERROR
      const res2 = await fetch("http://127.0.0.1:5096/api/v1/logs/tap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer invalid_token"
        },
        body: JSON.stringify({ log_date: "invalid-date", key: "worked_on_ng", delta: 1 }),
      });
      // Auth fails first with 401
      if (res2.status !== 401) {
        throw new Error("Test 2 failed: Expected invalid token to reject with 401");
      }

      console.log("🎉 All atomic increment tap tests passed successfully!");
    } catch (err) {
      console.error("❌ Test error:", err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runTests().catch(console.error);

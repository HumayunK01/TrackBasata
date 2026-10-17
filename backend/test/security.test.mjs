import { createApp } from "../dist/app.js";

async function main() {
  const app = createApp();

  const server = app.listen(5097, "0.0.0.0", async () => {
    try {
      console.log("=== RUNNING PARAMETERIZED QUERY & SECURITY TESTS ===");

      // Test 1: Parameterized unauthenticated GET /categories?id=test should reject with 401
      const res1 = await fetch("http://127.0.0.1:5097/api/v1/categories?id=00000000-0000-0000-0000-000000000000");
      const data1 = await res1.json();
      console.log("Test 1 (GET /categories?id=... unauth): Status", res1.status, data1.error?.code);
      if (res1.status !== 401 || data1.error?.code !== "UNAUTHORIZED") {
        throw new Error("Test 1 failed: Expected 401 UNAUTHORIZED");
      }

      // Test 2: Parameterized unauthenticated DELETE /categories?id=test should reject with 401
      const res2 = await fetch("http://127.0.0.1:5097/api/v1/categories?id=00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });
      const data2 = await res2.json();
      console.log("Test 2 (DELETE /categories?id=... unauth): Status", res2.status, data2.error?.code);
      if (res2.status !== 401) {
        throw new Error("Test 2 failed: Expected 401 UNAUTHORIZED");
      }

      // Test 3: Parameterized unauthenticated GET /logs?date=2026-10-09 should reject with 401
      const res3 = await fetch("http://127.0.0.1:5097/api/v1/logs?date=2026-10-09");
      const data3 = await res3.json();
      console.log("Test 3 (GET /logs?date=... unauth): Status", res3.status, data3.error?.code);
      if (res3.status !== 401) {
        throw new Error("Test 3 failed: Expected 401 UNAUTHORIZED");
      }

      // Test 4: Parameterized unauthenticated DELETE /logs?date=2026-10-09 should reject with 401
      const res4 = await fetch("http://127.0.0.1:5097/api/v1/logs?date=2026-10-09", {
        method: "DELETE",
      });
      const data4 = await res4.json();
      console.log("Test 4 (DELETE /logs?date=... unauth): Status", res4.status, data4.error?.code);
      if (res4.status !== 401) {
        throw new Error("Test 4 failed: Expected 401 UNAUTHORIZED");
      }

      console.log("🎉 All parameterized query security tests passed successfully!");
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

main().catch(console.error);

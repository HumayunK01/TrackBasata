import { createApp } from "../dist/app.js";

async function main() {
  console.log("Testing app initialization...");
  const app = createApp();

  const server = app.listen(5099, "0.0.0.0", async () => {
    console.log("Test server listening on port 5099");
    try {
      const res = await fetch("http://127.0.0.1:5099/api/v1/health");
      const data = await res.json();
      console.log("Health check response:", JSON.stringify(data, null, 2));

      if (res.status === 200 && data.success) {
        console.log("✅ Health check passed with status 200!");
      } else {
        console.error("❌ Health check failed!");
        process.exitCode = 1;
      }
    } catch (err) {
      console.error("Request failed:", err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log("Test server closed.");
        process.exit(process.exitCode || 0);
      });
    }
  });
}

main().catch((err) => {
  console.error("Boot failed:", err);
  process.exit(1);
});

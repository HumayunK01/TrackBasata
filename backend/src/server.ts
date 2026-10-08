import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 TrackBasata Backend API running on http://localhost:${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forceful shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

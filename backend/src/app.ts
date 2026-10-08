import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import apiRouter from "./routes/index.js";
import proxyRoutes from "./routes/proxy.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendError } from "./utils/response.js";

export function createApp(): Express {
  const app = express();

  // 1. Disable x-powered-by header
  app.disable("x-powered-by");

  // 2. HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // REST API & Swagger UI assets
      frameguard: { action: "deny" },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
    })
  );

  // 3. Strict CORS origin handling
  const allowedOrigins =
    env.CORS_ORIGIN === "*"
      ? []
      : env.CORS_ORIGIN.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server, mobile client, and test requests with no browser origin
        if (!origin) return callback(null, true);
        if (env.CORS_ORIGIN === "*" || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS policy blocked access from this origin"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 86400,
    })
  );

  // 4. Bounded body parsing to prevent memory exhaustion attacks
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  // 5. OpenAPI JSON Schema Export
  app.get(
    ["/docs/swagger.json", "/api/docs/swagger.json", "/api/v1/docs/swagger.json"],
    (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    }
  );

  // 6. Interactive Swagger UI
  const swaggerUiOptions = {
    customSiteTitle: "TrackBasata API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
      tryItOutEnabled: true,
    },
  };

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // 7. Mount Image Proxies (/api/logo, /api/favicon)
  app.use("/api", proxyRoutes);
  app.use("/api/v1", proxyRoutes);

  // 8. Mount API V1 routes
  app.use("/api/v1", apiRouter);

  // 9. Handle 404 routes
  app.use("*", (_req, res) => {
    return sendError(res, "Endpoint not found", 404, "NOT_FOUND");
  });

  // 10. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

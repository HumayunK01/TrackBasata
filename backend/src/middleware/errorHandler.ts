import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error & { status?: number; statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Always log internal errors with full stack for server-side observability
  logger.error(err.message, { stack: err.stack });

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || "INTERNAL_SERVER_ERROR";

  // Prevent information disclosure in production by masking internal runtime/database exceptions
  const message =
    statusCode >= 500 && env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message || "An unexpected error occurred";

  return sendError(res, message, statusCode, errorCode);
}

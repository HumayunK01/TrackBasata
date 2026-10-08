import { Response } from "express";
import { ApiResponse } from "../types/api.js";

export function sendSuccess<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      ...meta,
    },
  };
  return res.status(status).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  status = 500,
  code = "INTERNAL_SERVER_ERROR",
  details?: unknown
): Response {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
  return res.status(status).json(payload);
}

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import { sendError } from "../utils/response.js";

export function adminOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "admin") {
    return sendError(
      res,
      "Forbidden: Administrator privileges required for this action",
      403,
      "FORBIDDEN"
    );
  }
  return next();
}

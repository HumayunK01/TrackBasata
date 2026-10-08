import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import { standardLimiter, mutationLimiter } from "../config/redis.js";
import { sendError } from "../utils/response.js";

export function rateLimit(type: "standard" | "mutation" = "standard") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const limiter = type === "mutation" ? mutationLimiter : standardLimiter;

    if (!limiter) {
      // Redis not configured; proceed
      return next();
    }

    try {
      const identifier =
        req.user?.id ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "anonymous";

      const { success, limit, remaining, reset } = await limiter.limit(identifier);

      res.setHeader("X-RateLimit-Limit", limit.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", reset.toString());

      if (!success) {
        return sendError(
          res,
          "Too many requests. Please slow down and try again shortly.",
          429,
          "RATE_LIMIT_EXCEEDED"
        );
      }

      return next();
    } catch {
      // Fail-open on network timeout or glitch to prevent blocking active associates
      return next();
    }
  };
}

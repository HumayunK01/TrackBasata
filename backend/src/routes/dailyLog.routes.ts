import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UpsertDailyLogSchema, IncrementTapSchema } from "../types/dailyLog.js";
import * as dailyLogController from "../controllers/dailyLog.controller.js";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/logs or /api/v1/logs?date=YYYY-MM-DD or /api/v1/logs?start_date=...&end_date=...
router.get("/", rateLimit("standard"), asyncHandler(dailyLogController.listOrGetDailyLog));
router.get("/:date", rateLimit("standard"), asyncHandler(dailyLogController.listOrGetDailyLog));

// POST /api/v1/logs - Upsert entire day counts
router.post(
  "/",
  rateLimit("mutation"),
  validateBody(UpsertDailyLogSchema),
  asyncHandler(dailyLogController.upsertDailyLog)
);

// POST /api/v1/logs/tap - Rapid atomic tap increment
router.post(
  "/tap",
  rateLimit("mutation"),
  validateBody(IncrementTapSchema),
  asyncHandler(dailyLogController.incrementTap)
);

// DELETE /api/v1/logs?date=YYYY-MM-DD (parameterized) and /:date fallback
router.delete("/", rateLimit("mutation"), asyncHandler(dailyLogController.deleteDailyLog));
router.delete("/:date", rateLimit("mutation"), asyncHandler(dailyLogController.deleteDailyLog));

export default router;

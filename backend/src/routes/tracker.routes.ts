import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimiter.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as trackerController from "../controllers/tracker.controller.js";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/tracker/export - Full-featured server-side export with filter parameters
router.get("/export", rateLimit("standard"), asyncHandler(trackerController.exportTracker));

export default router;

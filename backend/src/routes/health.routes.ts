import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkHealth } from "../controllers/health.controller.js";

const router = Router();

// Public health check endpoint
router.get("/", asyncHandler(checkHealth));

export default router;

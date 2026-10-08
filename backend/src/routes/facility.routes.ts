import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { rateLimit } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CreateFacilitySchema, UpdateFacilitySchema } from "../types/facility.js";
import * as facilityController from "../controllers/facility.controller.js";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/facilities (or /api/v1/facilities?id=...)
router.get("/", rateLimit("standard"), asyncHandler(facilityController.listOrGetFacility));
router.get("/:id", rateLimit("standard"), asyncHandler(facilityController.listOrGetFacility));

// POST /api/v1/facilities - Admin create
router.post(
  "/",
  adminOnly,
  rateLimit("mutation"),
  validateBody(CreateFacilitySchema),
  asyncHandler(facilityController.createFacility)
);

// PATCH /api/v1/facilities?id=... (parameterized) and /:id fallback
router.patch(
  "/",
  adminOnly,
  rateLimit("mutation"),
  validateBody(UpdateFacilitySchema),
  asyncHandler(facilityController.updateFacility)
);
router.patch(
  "/:id",
  adminOnly,
  rateLimit("mutation"),
  validateBody(UpdateFacilitySchema),
  asyncHandler(facilityController.updateFacility)
);

// DELETE /api/v1/facilities?id=... (parameterized) and /:id fallback
router.delete(
  "/",
  adminOnly,
  rateLimit("mutation"),
  asyncHandler(facilityController.deleteFacility)
);
router.delete(
  "/:id",
  adminOnly,
  rateLimit("mutation"),
  asyncHandler(facilityController.deleteFacility)
);

export default router;

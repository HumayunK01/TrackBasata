import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { rateLimit } from "../middleware/rateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  ReorderCategoriesSchema,
} from "../types/category.js";
import * as categoryController from "../controllers/category.controller.js";

const router = Router();

router.use(authenticateToken);

// GET /api/v1/categories or /api/v1/categories?id=...
router.get("/", rateLimit("standard"), asyncHandler(categoryController.listCategories));
router.get("/:id", rateLimit("standard"), asyncHandler(categoryController.listCategories));

// POST /api/v1/categories - Admin create
router.post(
  "/",
  adminOnly,
  rateLimit("mutation"),
  validateBody(CreateCategorySchema),
  asyncHandler(categoryController.createCategory)
);

// PUT /api/v1/categories/reorder - Admin reorder
router.put(
  "/reorder",
  adminOnly,
  rateLimit("mutation"),
  validateBody(ReorderCategoriesSchema),
  asyncHandler(categoryController.reorderCategories)
);

// PATCH /api/v1/categories?id=... (parameterized) and /:id fallback
router.patch(
  "/",
  adminOnly,
  rateLimit("mutation"),
  validateBody(UpdateCategorySchema),
  asyncHandler(categoryController.updateCategory)
);
router.patch(
  "/:id",
  adminOnly,
  rateLimit("mutation"),
  validateBody(UpdateCategorySchema),
  asyncHandler(categoryController.updateCategory)
);

// DELETE /api/v1/categories?id=... (parameterized) and /:id fallback
router.delete(
  "/",
  adminOnly,
  rateLimit("mutation"),
  asyncHandler(categoryController.deleteCategory)
);
router.delete(
  "/:id",
  adminOnly,
  rateLimit("mutation"),
  asyncHandler(categoryController.deleteCategory)
);

export default router;

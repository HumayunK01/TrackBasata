import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import * as categoryService from "../services/category.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function listCategories(req: AuthenticatedRequest, res: Response) {
  const includeInactive = req.query.include_inactive === "true" && req.user?.role === "admin";
  const id = (req.query.id as string) || req.params.id;

  const categories = await categoryService.getCategories(includeInactive);

  // If a specific category is requested by query param (?id=...)
  if (id) {
    const single = categories.find((c) => c.id === id);
    if (!single) return sendError(res, "Category not found", 404, "NOT_FOUND");
    return sendSuccess(res, single);
  }

  return sendSuccess(res, categories);
}

export async function createCategory(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const category = await categoryService.createCategory(req.user.id, req.body);
  return sendSuccess(res, category, 201);
}

export async function updateCategory(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const id = (req.query.id as string) || req.params.id;
  if (!id) {
    return sendError(res, "Category ID required via '?id=' query parameter", 400, "VALIDATION_ERROR");
  }
  const category = await categoryService.updateCategory(req.user.id, id, req.body);
  return sendSuccess(res, category);
}

export async function reorderCategories(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  await categoryService.reorderCategories(req.user.id, req.body);
  return sendSuccess(res, { reordered: true });
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const id = (req.query.id as string) || req.params.id;
  if (!id) {
    return sendError(res, "Category ID required via '?id=' query parameter", 400, "VALIDATION_ERROR");
  }
  await categoryService.deleteCategory(req.user.id, id);
  return sendSuccess(res, { archived: true });
}

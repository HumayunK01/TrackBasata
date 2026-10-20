import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import { TrackerExportQuerySchema } from "../types/tracker.js";
import * as trackerService from "../services/tracker.service.js";
import { sendError } from "../utils/response.js";

export async function exportTracker(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return sendError(res, "Unauthorized", 401, "UNAUTHORIZED");
  }

  const parseResult = TrackerExportQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return sendError(
      res,
      "Invalid query parameters for export",
      400,
      "VALIDATION_ERROR",
      parseResult.error.issues
    );
  }

  const result = await trackerService.exportTrackerData(req.user.id, parseResult.data);

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Export-Count");
  res.setHeader("X-Export-Count", String(result.count));

  return res.status(200).send(result.content);
}

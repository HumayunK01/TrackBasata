import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import * as facilityService from "../services/facility.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function listOrGetFacility(req: AuthenticatedRequest, res: Response) {
  const id = (req.query.id as string) || req.params.id;

  const facilities = await facilityService.getFacilities();

  // If a specific facility is requested by query param (?id=...)
  if (id) {
    const single = facilities.find((f) => f.id === id);
    if (!single) return sendError(res, "Facility not found", 404, "NOT_FOUND");
    return sendSuccess(res, single);
  }

  return sendSuccess(res, facilities);
}

export async function createFacility(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const facility = await facilityService.createFacility(req.user.id, req.body);
  return sendSuccess(res, facility, 201);
}

export async function updateFacility(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const id = (req.query.id as string) || req.params.id;
  if (!id) {
    return sendError(res, "Facility ID required via '?id=' query parameter", 400, "VALIDATION_ERROR");
  }
  const facility = await facilityService.updateFacility(req.user.id, id, req.body);
  return sendSuccess(res, facility);
}

export async function deleteFacility(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const id = (req.query.id as string) || req.params.id;
  if (!id) {
    return sendError(res, "Facility ID required via '?id=' query parameter", 400, "VALIDATION_ERROR");
  }
  await facilityService.deleteFacility(req.user.id, id);
  return sendSuccess(res, { deleted: true });
}

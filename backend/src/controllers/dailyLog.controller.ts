import { Response } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import * as dailyLogService from "../services/dailyLog.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function listOrGetDailyLog(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);

  // Parameterized single date lookup: ?date=YYYY-MM-DD
  const date = (req.query.date as string) || req.params.date;
  if (date) {
    const log = await dailyLogService.getLogByDate(req.user.id, date);
    return sendSuccess(res, log);
  }

  // Date range list lookup: ?start_date=...&end_date=...
  const startDate = req.query.start_date as string | undefined;
  const endDate = req.query.end_date as string | undefined;

  const logs = await dailyLogService.getDailyLogs(req.user.id, startDate, endDate);
  return sendSuccess(res, logs);
}

export async function upsertDailyLog(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const log = await dailyLogService.upsertDailyLog(req.user.id, req.body);
  return sendSuccess(res, log);
}

export async function incrementTap(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const log = await dailyLogService.incrementTap(req.user.id, req.body);
  return sendSuccess(res, log);
}

export async function deleteDailyLog(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return sendError(res, "Unauthorized", 401);
  const date = (req.query.date as string) || req.params.date;
  if (!date) {
    return sendError(res, "Date parameter required via '?date=' query parameter", 400, "VALIDATION_ERROR");
  }
  await dailyLogService.deleteDailyLog(req.user.id, date);
  return sendSuccess(res, { deleted: true });
}

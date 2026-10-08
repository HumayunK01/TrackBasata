import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        formatZodIssues(parsed.error),
        400,
        "VALIDATION_ERROR",
        parsed.error.issues
      );
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(
        res,
        formatZodIssues(parsed.error),
        400,
        "VALIDATION_ERROR",
        parsed.error.issues
      );
    }
    req.query = parsed.data;
    return next();
  };
}

function formatZodIssues(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(", ");
}

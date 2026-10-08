import { z } from "zod";

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  counts: Record<string, number>;
  is_off_day: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const CategoryKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(64, "Key cannot exceed 64 characters")
  .regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers, and underscores");

export const UpsertDailyLogSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "log_date must be in YYYY-MM-DD format"),
  counts: z.record(
    CategoryKeySchema,
    z.number().int("Count must be an integer").nonnegative("Count cannot be negative").max(99999, "Count value exceeds reasonable bounds")
  ),
  is_off_day: z.boolean().optional().default(false),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().default(""),
});

export const IncrementTapSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "log_date must be in YYYY-MM-DD format"),
  key: CategoryKeySchema,
  delta: z.number().int().min(-1000, "Delta too small").max(1000, "Delta too large").default(1),
});

export type UpsertDailyLogDTO = z.infer<typeof UpsertDailyLogSchema>;
export type IncrementTapDTO = z.infer<typeof IncrementTapSchema>;

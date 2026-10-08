import { z } from "zod";

export interface CentralizedCategory {
  id: string;
  key: string;
  label: string;
  short: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CreateCategorySchema = z.object({
  key: z
    .string()
    .min(1, "Key is required")
    .max(64, "Key cannot exceed 64 characters")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores"),
  label: z.string().min(1, "Label is required").max(100, "Label cannot exceed 100 characters"),
  short: z.string().min(1, "Short label is required").max(12, "Short label cannot exceed 12 characters"),
  position: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdateCategorySchema = z.object({
  label: z.string().min(1).max(100).optional(),
  short: z.string().min(1).max(12).optional(),
  position: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
});

export const ReorderCategoriesSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid("Category ID must be a valid UUID"),
      position: z.number().int().nonnegative(),
    })
  ).min(1, "Orders array cannot be empty"),
});

export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategorySchema>;
export type ReorderCategoriesDTO = z.infer<typeof ReorderCategoriesSchema>;

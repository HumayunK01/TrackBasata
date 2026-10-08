import { z } from "zod";

export interface Facility {
  id: string;
  name: string;
  logo_url?: string;
  fax_number: string;
  address?: string;
  verified?: boolean;
  sort_order?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

const SafeUrlSchema = z
  .string()
  .max(2000, "URL too long")
  .regex(/^https?:\/\//i, "URL must use http or https protocol")
  .optional()
  .or(z.literal(""));

export const CreateFacilitySchema = z.object({
  name: z.string().trim().min(1, "Facility name is required").max(150),
  fax_number: z.string().trim().min(1, "Fax number is required").max(50),
  logo_url: SafeUrlSchema,
  address: z.string().trim().max(250).optional().default(""),
  verified: z.boolean().optional().default(false),
  sort_order: z.number().int().optional().default(0),
});

export const UpdateFacilitySchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  fax_number: z.string().trim().min(1).max(50).optional(),
  logo_url: SafeUrlSchema,
  address: z.string().trim().max(250).optional(),
  verified: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateFacilityDTO = z.infer<typeof CreateFacilitySchema>;
export type UpdateFacilityDTO = z.infer<typeof UpdateFacilitySchema>;

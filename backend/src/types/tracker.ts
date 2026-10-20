import { z } from "zod";

export const TrackerExportQuerySchema = z.object({
  mode: z.enum(["fax", "indexable"]).default("fax"),
  account_id: z.string().uuid("Invalid account UUID").optional(),
  status: z.string().max(300).optional(),
  q: z.string().max(200).optional(),
  search: z.string().max(200).optional(),
  format: z.enum(["csv", "json"]).default("csv"),
  sort: z.enum(["patient_name", "updated_at", "created_at", "overall_status"]).default("updated_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
});

export type TrackerExportQuery = z.infer<typeof TrackerExportQuerySchema>;

export interface TrackerExportRow {
  id: string;
  account_id: string;
  account_name?: string;
  patient_name: string;
  step1: string;
  step2: string | null;
  step3: string | null;
  overall_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackerExportResult {
  format: "csv" | "json";
  filename: string;
  contentType: string;
  content: string;
  count: number;
}

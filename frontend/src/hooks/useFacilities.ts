import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import type { Tables } from "@/integrations/supabase/types";

export type Facility = Tables<"facilities">;

const FacilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  fax_number: z.string().trim().min(1, "Fax number is required").max(50, "Fax number too long"),
  logo_url: z
    .string()
    .trim()
    .max(2000, "Logo URL too long")
    .regex(/^https?:\/\//i, "Logo must be a valid http(s) URL")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500, "Address too long").optional().or(z.literal("")),
  verified: z.boolean().optional(),
});

export type FacilityInput = z.infer<typeof FacilitySchema>;

const KEEP_UPPER = new Set(
  "N S E W NE NW SE SW US PO USA II III IV DC AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);

export function formatAddress(raw: string): string {
  let s = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim().replace(/,+$/, ""))
    .filter(Boolean)
    .join(", ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
  s = s.replace(/(\p{L})(?=\d)/gu, "$1 ");
  s = s.replace(/\p{L}+/gu, (w) => {
    if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase();
    let t = w[0].toUpperCase() + w.slice(1).toLowerCase();
    if (t.length > 2 && t.startsWith("Mc")) t = "Mc" + t[2].toUpperCase() + t.slice(3);
    return t;
  });
  return s.trim();
}

function cleanLogo(input: FacilityInput) {
  return {
    ...input,
    logo_url: input.logo_url ? input.logo_url : undefined,
    address: input.address ? formatAddress(input.address) : undefined,
  };
}

function formatError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Validation error";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function useFacilities() {
  const { user } = useAuth();
  return useQuery<Facility[]>({
    queryKey: ["facilities"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      return await api.get<Facility[]>("/facilities");
    },
  });
}

export function useUpsertFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { row: Facility | null; values: FacilityInput }) => {
      const validated = FacilitySchema.parse(input.values);
      const payload = cleanLogo(validated);
      if (input.row) {
        return await api.patch<Facility>(`/facilities?id=${encodeURIComponent(input.row.id)}`, payload);
      } else {
        return await api.post<Facility>("/facilities", payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
      toast.success("Facility saved");
    },
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Facility) => {
      return await api.delete(`/facilities?id=${encodeURIComponent(row.id)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
      toast.success("Facility deleted");
    },
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}
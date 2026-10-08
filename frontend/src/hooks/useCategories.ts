import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional().nullable(),
  key: z.string()
    .min(1, "Key required")
    .max(64, "Key too long")
    .regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores"),
  label: z.string().min(1, "Label required").max(100, "Label too long"),
  short: z.string().min(1, "Short name required").max(12, "Short name must be 12 characters or fewer"),
  position: z.number().int().nonnegative(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

function formatError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Validation error";
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Category[]> => {
      const data = await api.get<Category[]>("/categories");
      if (!data || data.length === 0) return [];
      return z.array(CategorySchema).parse(data);
    },
  });
}

export function useAddCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<Category, "id">) => {
      const validated = CategorySchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).parse(cat);
      return await api.post<Category>("/categories", validated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
    },
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, key, updates }: { id?: string; key?: string; updates: Partial<Omit<Category, "key" | "id">> }) => {
      let targetId = id;
      if (!targetId && key) {
        const cached = qc.getQueryData<Category[]>(["categories"]);
        targetId = cached?.find((c) => c.key === key)?.id;
        if (!targetId) {
          const fresh = await api.get<Category[]>("/categories");
          targetId = fresh.find((c) => c.key === key)?.id;
        }
      }
      if (!targetId) throw new Error("Category not found");
      return await api.patch<Category>(`/categories?id=${encodeURIComponent(targetId)}`, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
    },
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (idOrKey: string) => {
      let targetId = idOrKey;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey)) {
        const cached = qc.getQueryData<Category[]>(["categories"]);
        targetId = cached?.find((c) => c.key === idOrKey)?.id || idOrKey;
        if (targetId === idOrKey) {
          const fresh = await api.get<Category[]>("/categories");
          targetId = fresh.find((c) => c.key === idOrKey)?.id || idOrKey;
        }
      }
      return await api.delete(`/categories?id=${encodeURIComponent(targetId)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category archived");
    },
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cats: Category[]) => {
      const orders = cats
        .filter((c) => !!c.id)
        .map((c, i) => ({ id: c.id as string, position: i }));

      return await api.put("/categories/reorder", { orders });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e: unknown) => toast.error(formatError(e)),
  });
}

import { supabaseAdmin } from "../config/supabase.js";
import {
  CentralizedCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  ReorderCategoriesDTO,
} from "../types/category.js";
import { logAuditEvent } from "./audit.service.js";

export async function getCategories(includeInactive = false): Promise<CentralizedCategory[]> {
  let query = supabaseAdmin
    .from("categories")
    .select("id, key, label, short, position, is_active, created_at, updated_at")
    .order("position", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as CentralizedCategory[];
}

export async function createCategory(
  adminId: string,
  dto: CreateCategoryDTO
): Promise<CentralizedCategory> {
  // Determine next position if not specified
  let position = dto.position;
  if (position === undefined) {
    const { data: latest } = await supabaseAdmin
      .from("categories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    position = (latest?.position ?? -1) + 1;
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      key: dto.key,
      label: dto.label,
      short: dto.short,
      position,
      is_active: dto.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(adminId, "category_created", {
    category_id: data.id,
    key: data.key,
    label: data.label,
  });

  return data as CentralizedCategory;
}

export async function updateCategory(
  adminId: string,
  id: string,
  dto: UpdateCategoryDTO
): Promise<CentralizedCategory> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({
      ...dto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(adminId, "category_updated", {
    category_id: id,
    changes: dto,
  });

  return data as CentralizedCategory;
}

export async function reorderCategories(
  adminId: string,
  dto: ReorderCategoriesDTO
): Promise<void> {
  for (const item of dto.orders) {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ position: item.position, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) throw error;
  }

  await logAuditEvent(adminId, "categories_reordered", {
    count: dto.orders.length,
  });
}

export async function deleteCategory(adminId: string, id: string): Promise<void> {
  // Soft delete to protect historical daily log relations
  const { error } = await supabaseAdmin
    .from("categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  await logAuditEvent(adminId, "category_archived", { category_id: id });
}

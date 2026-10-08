import { supabaseAdmin } from "../config/supabase.js";
import { Facility, CreateFacilityDTO, UpdateFacilityDTO } from "../types/facility.js";
import { logAuditEvent } from "./audit.service.js";

export async function getFacilities(): Promise<Facility[]> {
  const { data, error } = await supabaseAdmin
    .from("facilities")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []) as Facility[];
}

export async function createFacility(
  adminId: string,
  dto: CreateFacilityDTO
): Promise<Facility> {
  const { data, error } = await supabaseAdmin
    .from("facilities")
    .insert({
      ...dto,
      created_by: adminId,
    })
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(adminId, "facility_created", {
    facility_id: data.id,
    name: data.name,
  });

  return data as Facility;
}

export async function updateFacility(
  adminId: string,
  id: string,
  dto: UpdateFacilityDTO
): Promise<Facility> {
  const { data, error } = await supabaseAdmin
    .from("facilities")
    .update({
      ...dto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(adminId, "facility_updated", {
    facility_id: id,
    changes: dto,
  });

  return data as Facility;
}

export async function deleteFacility(adminId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("facilities").delete().eq("id", id);
  if (error) throw error;

  await logAuditEvent(adminId, "facility_deleted", { facility_id: id });
}

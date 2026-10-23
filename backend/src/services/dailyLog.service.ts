import { supabaseAdmin } from "../config/supabase.js";
import { DailyLog, UpsertDailyLogDTO, IncrementTapDTO } from "../types/dailyLog.js";
import { logAuditEvent } from "./audit.service.js";

export async function getDailyLogs(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyLog[]> {
  let query = supabaseAdmin
    .from("daily_logs")
    .select("id, user_id, log_date, counts, is_off_day, notes, created_at, updated_at")
    .eq("user_id", userId)
    .order("log_date", { ascending: false });

  if (startDate) {
    query = query.gte("log_date", startDate);
  }
  if (endDate) {
    query = query.lte("log_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DailyLog[];
}

export async function getLogByDate(
  userId: string,
  logDate: string
): Promise<DailyLog | null> {
  const { data, error } = await supabaseAdmin
    .from("daily_logs")
    .select("id, user_id, log_date, counts, is_off_day, notes, created_at, updated_at")
    .eq("user_id", userId)
    .eq("log_date", logDate)
    .maybeSingle();

  if (error) throw error;
  return data as DailyLog | null;
}

export async function upsertDailyLog(
  userId: string,
  dto: UpsertDailyLogDTO
): Promise<DailyLog> {
  const { data, error } = await supabaseAdmin
    .from("daily_logs")
    .upsert(
      {
        user_id: userId,
        log_date: dto.log_date,
        counts: dto.counts,
        is_off_day: dto.is_off_day,
        notes: dto.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, log_date" }
    )
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent(userId, "daily_log_saved", {
    log_date: dto.log_date,
    total_categories: Object.keys(dto.counts).length,
  });

  return data as DailyLog;
}

export async function incrementTap(
  userId: string,
  dto: IncrementTapDTO
): Promise<DailyLog> {
  // 1. Primary path: Atomic in-database JSONB increment via PostgreSQL RPC
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("increment_daily_log_count", {
    p_user_id: userId,
    p_log_date: dto.log_date,
    p_key: dto.key,
    p_delta: dto.delta,
  });

  if (!rpcError && rpcData) {
    const row = rpcData as DailyLog;
    return {
      ...row,
      counts: (row.counts || {}) as Record<string, number>,
    };
  }

  // 2. Fallback path for unmigrated environments
  const existing = await getLogByDate(userId, dto.log_date);

  const existingCounts = existing?.counts || {};
  const currentVal = existingCounts[dto.key] || 0;
  const newVal = Math.max(0, currentVal + dto.delta);

  const updatedCounts = {
    ...existingCounts,
    [dto.key]: newVal,
  };

  const { data, error } = await supabaseAdmin
    .from("daily_logs")
    .upsert(
      {
        user_id: userId,
        log_date: dto.log_date,
        counts: updatedCounts,
        is_off_day: existing?.is_off_day ?? false,
        notes: existing?.notes ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, log_date" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as DailyLog;
}

export async function deleteDailyLog(userId: string, logDate: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("daily_logs")
    .delete()
    .eq("user_id", userId)
    .eq("log_date", logDate);

  if (error) throw error;
  await logAuditEvent(userId, "daily_log_deleted", { log_date: logDate });
}


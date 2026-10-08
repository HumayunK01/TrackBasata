import { supabaseAdmin } from "../config/supabase.js";
import { logger } from "../utils/logger.js";

export async function logAuditEvent(
  userId: string,
  event: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      event,
      details: details ?? {},
    });

    if (error) {
      logger.error(`Failed to record audit event "${event}" for user ${userId}`, error);
    }
  } catch (err) {
    logger.error(`Exception while recording audit event "${event}"`, err);
  }
}

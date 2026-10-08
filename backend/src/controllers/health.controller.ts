import { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { supabaseAdmin } from "../config/supabase.js";
import { redisClient } from "../config/redis.js";

export async function checkHealth(_req: Request, res: Response) {
  let dbStatus = "connected";
  try {
    const { error } = await supabaseAdmin.from("categories").select("id").limit(1);
    if (error) dbStatus = `degraded: ${error.message}`;
  } catch (err: unknown) {
    dbStatus = `unreachable: ${(err as Error).message}`;
  }

  let redisStatus = "not_configured";
  if (redisClient) {
    try {
      await redisClient.ping();
      redisStatus = "connected";
    } catch (err: unknown) {
      redisStatus = `degraded: ${(err as Error).message}`;
    }
  }

  return sendSuccess(res, {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
}

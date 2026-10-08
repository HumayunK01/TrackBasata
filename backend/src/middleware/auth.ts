import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { sendError } from "../utils/response.js";

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token || token.length === 0 || token.length > 4096) {
    return sendError(res, "Missing or invalid authorization token", 401, "UNAUTHORIZED");
  }

  try {
    // 1. Verify cryptographic token signature and freshness with Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !authData.user) {
      return sendError(res, "Invalid or expired token", 401, "UNAUTHORIZED");
    }

    const userId = authData.user.id;

    // 2. Fetch user profile, role, and active status from profiles table
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, role, is_disabled")
      .eq("id", userId)
      .single();

    // 3. Immediately reject disabled / suspended accounts
    if (profile?.is_disabled) {
      return sendError(
        res,
        "This account has been deactivated. Please contact an administrator.",
        403,
        "ACCOUNT_DISABLED"
      );
    }

    if (profileErr) {
      // Default to least-privilege standard user if profile lookup fails
      req.user = {
        id: userId,
        email: authData.user.email,
        role: "user",
      };
    } else {
      req.user = {
        id: userId,
        email: authData.user.email,
        role: profile.role === "admin" ? "admin" : "user",
        firstName: profile.first_name,
        lastName: profile.last_name,
      };
    }

    req.token = token;
    return next();
  } catch (error) {
    return sendError(res, "Internal authentication error", 500, "AUTH_ERROR");
  }
}

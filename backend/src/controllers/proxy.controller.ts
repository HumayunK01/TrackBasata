import { Request, Response } from "express";
import dns from "node:dns/promises";
import { redisClient } from "../config/redis.js";
import { sendError } from "../utils/response.js";
import { supabaseAdmin } from "../config/supabase.js";

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^224\./,
  /^240\./,
  /^255\./,
];

function isPrivateIp(address: string): boolean {
  const a = address.toLowerCase();
  if (
    a === "::1" ||
    a === "::" ||
    a.startsWith("fe80:") ||
    a.startsWith("fc") ||
    a.startsWith("fd") ||
    a.startsWith("2001:db8:")
  ) {
    return true;
  }
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && PRIVATE_V4.some((re) => re.test(mapped[1]))) return true;
  return PRIVATE_V4.some((re) => re.test(a));
}

async function isBlockedHost(host: string): Promise<boolean> {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  ) {
    return true;
  }
  if (isPrivateIp(h)) return true;
  try {
    const addresses = await dns.lookup(h, { all: true });
    if (!addresses || addresses.length === 0) return true;
    return addresses.some((entry) => isPrivateIp(entry.address));
  } catch {
    return true; // unresolvable host
  }
}

async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.authorization;
  const bearer = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const token = bearer || (req.query.t as string);

  if (!token || token.length > 4096) return false;

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

export async function proxyLogo(req: Request, res: Response) {
  if (!(await verifyAuth(req))) {
    return sendError(res, "Unauthorized image request", 401, "UNAUTHORIZED");
  }

  const raw = req.query.url;
  if (typeof raw !== "string" || raw.length > 2048) {
    return sendError(res, "Invalid URL parameter", 400, "VALIDATION_ERROR");
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(raw);
  } catch {
    return sendError(res, "Malformed URL", 400, "VALIDATION_ERROR");
  }

  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    return sendError(res, "Only HTTP(S) protocols allowed", 400, "VALIDATION_ERROR");
  }

  const cacheKey = `proxy:logo:${encodeURIComponent(targetUrl.href)}`;
  if (redisClient) {
    try {
      const cached = await redisClient.get<{ contentType: string; base64: string }>(cacheKey);
      if (cached && cached.base64) {
        res.setHeader("Content-Type", cached.contentType || "image/png");
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.setHeader("X-Cache", "HIT");
        return res.status(200).send(Buffer.from(cached.base64, "base64"));
      }
    } catch {
      // Non-fatal cache miss
    }
  }

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  try {
    if (await isBlockedHost(targetUrl.hostname)) {
      return sendError(res, "Host access prohibited", 403, "SSRF_PROHIBITED");
    }

    const upstream = await fetch(targetUrl.href, {
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return sendError(res, "Upstream resource is not an image", 400, "INVALID_MEDIA_TYPE");
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
      return sendError(res, "Image exceeds maximum allowed size", 413, "PAYLOAD_TOO_LARGE");
    }

    if (redisClient) {
      redisClient
        .set(
          cacheKey,
          { contentType, base64: buffer.toString("base64") },
          { ex: 60 * 60 * 24 * 7 }
        )
        .catch(() => {});
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).send(buffer);
  } catch (err) {
    return sendError(res, "Failed to retrieve remote logo", 502, "BAD_GATEWAY");
  }
}

export async function proxyFavicon(req: Request, res: Response) {
  if (!(await verifyAuth(req))) {
    return sendError(res, "Unauthorized favicon request", 401, "UNAUTHORIZED");
  }

  const domain = req.query.domain;
  if (typeof domain !== "string" || !/^[a-z0-9.-]+$/i.test(domain) || domain.length > 253) {
    return sendError(res, "Invalid domain parameter", 400, "VALIDATION_ERROR");
  }

  const cacheKey = `proxy:favicon:${domain.toLowerCase()}`;
  if (redisClient) {
    try {
      const cached = await redisClient.get<{ contentType: string; base64: string }>(cacheKey);
      if (cached && cached.base64) {
        res.setHeader("Content-Type", cached.contentType || "image/x-icon");
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.setHeader("X-Cache", "HIT");
        return res.status(200).send(Buffer.from(cached.base64, "base64"));
      }
    } catch {
      // Non-fatal
    }
  }

  try {
    const upstream = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    const r = await fetch(upstream, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(r.status).end();

    const buffer = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get("content-type") || "image/x-icon";

    if (redisClient) {
      redisClient
        .set(
          cacheKey,
          { contentType, base64: buffer.toString("base64") },
          { ex: 60 * 60 * 24 * 7 }
        )
        .catch(() => {});
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).send(buffer);
  } catch {
    return sendError(res, "Failed to fetch favicon", 502, "BAD_GATEWAY");
  }
}

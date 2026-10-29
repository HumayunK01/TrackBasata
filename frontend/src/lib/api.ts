import { supabase } from "@/integrations/supabase/client";
import { getCurrentAccessToken } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";
const GET_TIMEOUT_MS = 4_000;
const MUTATION_TIMEOUT_MS = 8_000;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function getAuthToken(): Promise<string | null> {
  const cached = getCurrentAccessToken();
  if (cached) return cached;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAuthToken();

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const method = (options.method || "GET").toUpperCase();
  const timeoutMs = method === "GET" ? GET_TIMEOUT_MS : MUTATION_TIMEOUT_MS;
  const controller = !options.signal ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal ?? controller?.signal,
    });
  } finally {
    if (timer !== null) clearTimeout(timer);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.error?.message || response.statusText || "Request failed";
    const code = json?.error?.code || "API_ERROR";
    const details = json?.error?.details;
    throw new ApiError(message, response.status, code, details);
  }

  return json.data as T;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

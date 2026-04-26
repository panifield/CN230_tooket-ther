import { authStore } from "../state/auth";
import { events } from "../state/events";

// Backend mounts routes at the root (/auth, /booking, ...). In dev, Vite
// proxies those prefixes to http://localhost:8000 (see vite.config.ts).
// Set VITE_API_BASE in production to point at the live API host (no trailing slash).
const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string) {
    super(`${status} — ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  // If API_BASE is set (e.g. in production), use it as the base.
  // Otherwise, use relative paths for Vite proxy to work in development.
  if (API_BASE) {
    const url = new URL(path.startsWith("/") ? path.slice(1) : path, API_BASE.endsWith("/") ? API_BASE : API_BASE + "/");
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  // Fallback for development proxy
  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.pathname + url.search;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, query } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = authStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network error";
    events.emit("log", { level: "error", message: `[${method} ${path}] ${detail}` });
    throw new ApiError(0, detail);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const detail = extractDetail(data) ?? response.statusText;
    if (response.status === 401) {
      authStore.clear();
      events.emit("auth:logout", undefined);
    }
    events.emit("log", {
      level: "error",
      message: `[${method} ${path}] ${response.status} ${detail}`,
    });
    throw new ApiError(response.status, detail);
  }

  events.emit("log", {
    level: "info",
    message: `[${method} ${path}] ${response.status}`,
  });
  return data as T;
}

function extractDetail(data: unknown): string | null {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0];
      if (first && typeof first === "object" && "msg" in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return null;
}

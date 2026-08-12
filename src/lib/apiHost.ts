/**
 * Resolve Python API / WS hosts so they match the page origin.
 * Visiting http://127.0.0.1:3010 while API points at localhost (or vice versa)
 * can break cookies/CORS/mic assumptions — keep hostnames aligned.
 *
 * Local dev always targets the literal IPv4 loopback (127.0.0.1), never the
 * "localhost" hostname: Windows resolves "localhost" to both ::1 and
 * 127.0.0.1, but `uvicorn --host 0.0.0.0` only binds IPv4 — so a browser
 * fetch to "http://localhost:8000" can race the dead IPv6 route and fail
 * outright with "TypeError: Failed to fetch", even though the API is up and
 * reachable on IPv4.
 */
export function resolveApiBase(): string {
  const fallback = "http://127.0.0.1:8000/api/v1";
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (typeof window === "undefined") {
    return fromEnv || fallback;
  }
  const pageHost = window.location.hostname;
  if (pageHost === "localhost" || pageHost === "127.0.0.1") {
    return "http://127.0.0.1:8000/api/v1";
  }
  return fromEnv || fallback;
}

export function resolveWsBase(): string {
  const fallback = "ws://127.0.0.1:8000/ws/events";
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (typeof window === "undefined") {
    return fromEnv || fallback;
  }
  const pageHost = window.location.hostname;
  if (pageHost === "localhost" || pageHost === "127.0.0.1") {
    return "ws://127.0.0.1:8000/ws/events";
  }
  return fromEnv || fallback;
}

/**
 * Ollama connection settings for Next.js API routes.
 * Prefer a remote Hetzner host so the 8 GB PC does not run the model.
 *
 * Env (any of these work):
 *   OLLAMA_HOST=http://YOUR_HETZNER_IP:11434
 *   OLLAMA_BASE_URL=http://YOUR_HETZNER_IP:11434
 *   OLLAMA_MODEL=llama3.2:1b
 */

function stripSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Base URL of the Ollama HTTP API (no trailing slash). */
export function getOllamaHost(): string {
  const raw =
    process.env.OLLAMA_HOST?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    "http://127.0.0.1:11434";
  return stripSlash(raw);
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL?.trim() || "llama3.2:1b";
}

export function isRemoteOllamaHost(host = getOllamaHost()): boolean {
  try {
    const u = new URL(host);
    const h = u.hostname.toLowerCase();
    return !(h === "127.0.0.1" || h === "localhost" || h === "::1");
  } catch {
    return false;
  }
}

/** Quick reachability check — used by /api/ollama/health */
export async function pingOllama(
  host = getOllamaHost(),
  timeoutMs = 4000
): Promise<{ ok: boolean; status?: number; error?: string; version?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${stripSlash(host)}/api/version`, {
      method: "GET",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `http_${res.status}` };
    }
    const data = (await res.json().catch(() => ({}))) as { version?: string };
    return { ok: true, status: res.status, version: data.version };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

import { NextResponse } from "next/server";
import {
  getOllamaHost,
  getOllamaModel,
  isRemoteOllamaHost,
  pingOllama,
} from "@/lib/ollamaConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ollama/health
 * Confirms Next.js can reach the configured Ollama (local or Hetzner).
 */
export async function GET() {
  const host = getOllamaHost();
  const model = getOllamaModel();
  const remote = isRemoteOllamaHost(host);
  const ping = await pingOllama(host);

  let models: string[] = [];
  if (ping.ok) {
    try {
      const res = await fetch(`${host}/api/tags`, { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{ name?: string }>;
        };
        models = (data.models || [])
          .map((m) => String(m.name || "").trim())
          .filter(Boolean);
      }
    } catch {
      /* ignore tag list failures */
    }
  }

  const modelPresent = models.some(
    (name) => name === model || name.startsWith(`${model}:`) || name.startsWith(model)
  );

  return NextResponse.json(
    {
      ok: ping.ok,
      remote,
      host,
      model,
      modelPresent: ping.ok ? modelPresent : false,
      ollamaVersion: ping.version || null,
      models: models.slice(0, 20),
      error: ping.error || null,
      tip: !ping.ok
        ? remote
          ? "Hetzner Ollama unreachable. Check IP, firewall (port 11434), and that Ollama is running with OLLAMA_HOST=0.0.0.0"
          : "Local Ollama unreachable. Start it, or set OLLAMA_HOST to your Hetzner URL in apps/web/.env.local"
        : !modelPresent
          ? `Ollama is up, but model "${model}" is missing. On the server run: ollama pull ${model}`
          : remote
            ? "Remote Ollama OK — PC can stay light (no local model)."
            : "Local Ollama OK. For 8GB PCs, move to Hetzner and set OLLAMA_HOST.",
    },
    { status: ping.ok ? 200 : 503 }
  );
}

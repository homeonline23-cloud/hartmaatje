import { NextResponse } from "next/server";

/**
 * HTTP surface for the OpenAI Realtime WebSocket proxy.
 *
 * The duplex socket itself is handled by `server.mjs` (custom Next server),
 * because App Router route handlers cannot perform an HTTP → WebSocket upgrade.
 *
 * Browser connects to:  ws(s)://{host}/api/realtime
 * Server proxies to:    wss://api.openai.com/v1/realtime?model=…
 * with Authorization: Bearer $OPENAI_API_KEY (server-only).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasKey = Boolean((process.env.OPENAI_API_KEY || "").trim());
  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
  const realtimePort = process.env.REALTIME_PROXY_PORT || "3011";

  return NextResponse.json({
    ok: true,
    service: "openai-realtime-proxy",
    wsPath: "/api/realtime",
    wsPort: Number(realtimePort),
    wsUrl: `ws://localhost:${realtimePort}/api/realtime`,
    model,
    configured: hasKey,
    note: hasKey
      ? `Connect via WebSocket to ws://localhost:${realtimePort}/api/realtime (dedicated proxy port).`
      : "Set OPENAI_API_KEY, then restart with node server.mjs.",
  });
}

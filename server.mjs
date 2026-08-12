/**
 * Custom Next.js server + dedicated OpenAI Realtime WebSocket proxy.
 *
 * - http://localhost:3010  → Next.js (pages + HMR upgrades only)
 * - ws://localhost:3011/api/realtime → OpenAI Realtime proxy
 *
 * Separating ports avoids Next/Turbopack upgrade conflicts that were
 * killing the browser socket (1006) before OpenAI connected.
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

function loadEnvFile(fileName, { overwriteEmpty = false } = {}) {
  const full = resolve(process.cwd(), fileName);
  if (!existsSync(full)) return;
  for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const existing = process.env[key];
    if (existing === undefined) {
      process.env[key] = val;
    } else if (overwriteEmpty && !String(existing).trim() && val) {
      process.env[key] = val;
    }
  }
}
loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile("../../.env", { overwriteEmpty: true });
loadEnvFile("../../.env.local", { overwriteEmpty: true });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3010);
const realtimePort = Number(process.env.REALTIME_PROXY_PORT || 3011);

const REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const OPENAI_REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(
  REALTIME_MODEL
)}`;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function loadOpenAiKey() {
  return (process.env.OPENAI_API_KEY || "").trim() || null;
}

/** Close codes 1005/1006 cannot be sent — map them to 1000. */
function safeClose(ws, code, reason) {
  if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
    return;
  }
  const c =
    !code || code === 1005 || code === 1006 || code < 1000 || code > 4999
      ? 1000
      : code;
  try {
    ws.close(c, reason ? String(reason).slice(0, 120) : undefined);
  } catch {
    try {
      ws.terminate();
    } catch {
      /* ignore */
    }
  }
}

function bridgeClientToOpenAi(clientWs, upstreamWs) {
  const pending = [];
  let upstreamReady = false;

  const flushPending = () => {
    if (!upstreamReady || upstreamWs.readyState !== WebSocket.OPEN) return;
    while (pending.length) {
      const item = pending.shift();
      if (!item) break;
      try {
        upstreamWs.send(item.data, { binary: item.isBinary });
      } catch (err) {
        console.warn("[realtime-proxy] flush failed", err);
        break;
      }
    }
  };

  clientWs.on("message", (data, isBinary) => {
    if (upstreamReady && upstreamWs.readyState === WebSocket.OPEN) {
      try {
        upstreamWs.send(data, { binary: Boolean(isBinary) });
      } catch (err) {
        console.warn("[realtime-proxy] client→openai failed", err);
      }
    } else {
      pending.push({ data, isBinary: Boolean(isBinary) });
    }
  });

  upstreamWs.on("message", (data, isBinary) => {
    if (clientWs.readyState !== WebSocket.OPEN) return;
    try {
      clientWs.send(data, { binary: Boolean(isBinary) });
    } catch (err) {
      console.warn("[realtime-proxy] openai→client failed", err);
    }
  });

  upstreamWs.on("open", () => {
    upstreamReady = true;
    console.log("[realtime-proxy] upstream OpenAI Realtime open");
    flushPending();
  });

  clientWs.on("close", (code, reason) => {
    console.log(
      "[realtime-proxy] client closed",
      code,
      reason?.toString?.() || ""
    );
    safeClose(upstreamWs, code, reason?.toString?.());
  });

  upstreamWs.on("close", (code, reason) => {
    console.warn(
      "[realtime-proxy] upstream closed",
      code,
      reason?.toString?.() || ""
    );
    safeClose(clientWs, code, reason?.toString?.());
  });

  clientWs.on("error", (err) => {
    console.warn("[realtime-proxy] client error", err?.message || err);
  });

  upstreamWs.on("error", (err) => {
    console.warn("[realtime-proxy] upstream error", err?.message || err);
    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: {
              type: "proxy_error",
              message: err?.message || "upstream_failed",
            },
          })
        );
      } catch {
        /* ignore */
      }
    }
    safeClose(clientWs, 1011, "upstream_failed");
  });

  upstreamWs.on("unexpected-response", (_req, res) => {
    let body = "";
    res.on("data", (c) => {
      body += c;
    });
    res.on("end", () => {
      console.warn(
        `[realtime-proxy] OpenAI rejected: ${res.statusCode}`,
        body.slice(0, 400)
      );
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(
            JSON.stringify({
              type: "error",
              error: {
                type: "openai_reject",
                message: `OpenAI ${res.statusCode}: ${body.slice(0, 160)}`,
              },
            })
          );
        } catch {
          /* ignore */
        }
      }
      safeClose(clientWs, 1011, `openai_${res.statusCode}`);
    });
  });
}

function startRealtimeProxy() {
  const apiKey = loadOpenAiKey();
  const realtimeServer = createServer((req, res) => {
    if (req.url?.startsWith("/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          configured: Boolean(apiKey),
          model: REALTIME_MODEL,
          wsPath: "/api/realtime",
        })
      );
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("HartMaatje Realtime proxy — connect via WebSocket /api/realtime\n");
  });

  const wss = new WebSocketServer({ server: realtimeServer, path: "/api/realtime" });

  wss.on("connection", (clientWs, req) => {
    const key = loadOpenAiKey();
    if (!key) {
      try {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: { message: "Missing OPENAI_API_KEY on server" },
          })
        );
      } catch {
        /* ignore */
      }
      safeClose(clientWs, 1011, "missing_key");
      return;
    }

    const url = new URL(req.url || "", "http://localhost");
    const safetyId =
      url.searchParams.get("safety") || `hartmaatje-${Date.now()}`;

    const upstream = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${key}`,
        "OpenAI-Safety-Identifier": String(safetyId).slice(0, 64),
      },
    });

    console.log(`[realtime-proxy] client → ${OPENAI_REALTIME_URL}`);
    bridgeClientToOpenAi(clientWs, upstream);
  });

  realtimeServer.listen(realtimePort, hostname, () => {
    console.log(
      `> Realtime proxy ws://${hostname}:${realtimePort}/api/realtime`
    );
  });
}

app.prepare().then(() => {
  loadEnvFile("../../.env", { overwriteEmpty: true });
  loadEnvFile("../../.env.local", { overwriteEmpty: true });
  loadEnvFile(".env.local", { overwriteEmpty: true });

  const handleUpgrade = app.getUpgradeHandler();

  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  // Next/Turbopack HMR only — Realtime lives on :3011
  server.on("upgrade", (req, socket, head) => {
    void handleUpgrade(req, socket, head);
  });

  server.listen(port, hostname, () => {
    console.log(`> HartMaatje ready on http://${hostname}:${port}`);
    startRealtimeProxy();
  });
});

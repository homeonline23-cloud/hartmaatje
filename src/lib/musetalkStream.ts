/**
 * Self-hosted MuseTalk / stream face client.
 * Connects to GPU server WebSocket, sends PCM16, receives JPEG frames.
 */

export type MuseTalkStreamHandle = {
  stop: () => void;
};

export function startMuseTalkStream(opts: {
  wsUrl: string;
  companionId: string;
  onFrame: (jpeg: Blob) => void;
  onStatus?: (msg: string) => void;
}): MuseTalkStreamHandle {
  const url = `${opts.wsUrl.replace(/\/$/, "")}/ws/stream?companion=${encodeURIComponent(opts.companionId)}`;
  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  let stopped = false;

  ws.onopen = () => opts.onStatus?.("stream_open");
  ws.onerror = () => opts.onStatus?.("stream_error");
  ws.onclose = () => opts.onStatus?.("stream_closed");
  ws.onmessage = (ev) => {
    if (stopped) return;
    if (typeof ev.data === "string") return;
    const blob = new Blob([ev.data], { type: "image/jpeg" });
    opts.onFrame(blob);
  };

  return {
    stop: () => {
      stopped = true;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Send one PCM16 chunk (ArrayBuffer) to an open MuseTalk WS (caller holds socket). */
export function museTalkWsUrl(baseHttp: string, companionId: string): string {
  const u = new URL(baseHttp);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws/stream";
  u.search = `companion=${encodeURIComponent(companionId)}`;
  return u.toString();
}

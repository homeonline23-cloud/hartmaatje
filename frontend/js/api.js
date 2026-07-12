/**
 * HartMaatje frontend — API client for Fenna backend.
 * Works on PC, tablet, and mobile browser.
 */

const API_BASE = window.HARTMAATJE_API ?? "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail ?? data.error ?? `Fout ${res.status}`);
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  startSession: (residentId = "guest", lang = "nl") =>
    request("/session/start", {
      method: "POST",
      body: JSON.stringify({ resident_id: residentId, lang }),
    }),
  endSession: (sessionId) =>
    request("/session/end", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    }),
  sendMessage: (sessionId, message) =>
    request("/chat/message", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, message }),
    }),
  voiceTurn: (sessionId, audioBase64, mimeType) =>
    request("/chat/voice-turn", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        audio_base64: audioBase64,
        mime_type: mimeType,
      }),
    }),
  transcribe: (sessionId, audioBase64, mimeType) =>
    request("/speech/transcribe", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        audio_base64: audioBase64,
        mime_type: mimeType,
      }),
    }),
  speak: (sessionId, text) =>
    request("/speech/speak", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text }),
    }),
};

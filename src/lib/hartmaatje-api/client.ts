const API_BASE =
  process.env.NEXT_PUBLIC_HARTMAATJE_API_URL ?? "http://localhost:8000";

const REQUEST_TIMEOUT_MS = 30_000;
const VOICE_TURN_TIMEOUT_MS = 35_000;

export type AppLang = "nl" | "en" | "de" | "fr" | "es";

export {
  COMPANION_OPENING,
  FENNA_OPENING,
  getCompanionOpening,
} from "@/lib/companion/openings";

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      detail?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.detail ?? data.error ?? `Error ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Fenna duurde te lang. Probeer het nog eens.");
    }
    if (err instanceof TypeError) {
      throw new Error("Kan Fenna nu niet bereiken. Probeer het nog eens.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type FennaMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const hartmaatjeApi = {
  health: () =>
    request<{ status: string; fenna_ready: boolean }>("/health"),

  startSession: (residentId = "guest", lang: AppLang = "nl") =>
    request<{
      session_id: string;
      opening_message: string;
    }>("/session/start", {
      method: "POST",
      body: JSON.stringify({ resident_id: residentId, lang }),
    }),

  endSession: (sessionId: string) =>
    request("/session/end", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    }),

  voiceTurn: (
    sessionId: string,
    audioBase64: string,
    mimeType: string,
    lang: AppLang,
    turnPhase: "phrase" | "complete" = "complete",
  ) =>
    request<{
      user_text: string;
      reply: string;
      quick_ack: string;
      audio_base64: string;
      mime_type: string;
      quick_ack_audio_base64?: string;
      quick_ack_mime_type?: string;
      timings_ms: Record<string, number>;
      turn_phase?: "phrase" | "complete";
    }>("/chat/voice-turn", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        audio_base64: audioBase64,
        mime_type: mimeType,
        lang,
        turn_phase: turnPhase,
      }),
    }, VOICE_TURN_TIMEOUT_MS),

  speak: (sessionId: string, text: string, lang: AppLang) =>
    request<{ audio_base64: string; mime_type: string }>("/speech/speak", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text, lang }),
    }),
};

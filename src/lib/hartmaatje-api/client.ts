const API_BASE =
  process.env.NEXT_PUBLIC_HARTMAATJE_API_URL ?? "http://localhost:8000";

const REQUEST_TIMEOUT_MS = 30_000;
const VOICE_TURN_TIMEOUT_MS = 35_000;
const BACKEND_SESSION_KEY = "hartmaatje_backend_session";

export type AppLang = "nl" | "en" | "de" | "fr" | "es";

export function toBackendLang(lang: AppLang): "nl" | "en" {
  return lang === "en" ? "en" : "nl";
}

export function getStoredBackendSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(BACKEND_SESSION_KEY);
  if (!id || id.startsWith("guest-")) return null;
  return id;
}

export function storeBackendSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  if (!sessionId.startsWith("guest-")) {
    localStorage.setItem(BACKEND_SESSION_KEY, sessionId);
  }
}

export function isBackendSessionId(sessionId: string | null | undefined): sessionId is string {
  return Boolean(sessionId && !sessionId.startsWith("guest-"));
}

export {
  COMPANION_OPENING,
  FENNA_OPENING,
  getCompanionOpening,
} from "@/lib/companion/openings";

import { CompanionApiError } from "@/lib/http/companionApiError";
import {
  buildRateLimitMeta,
  friendlyGeminiQuotaMessage,
  isGeminiQuotaError,
} from "@/lib/geminiErrors";

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
      const raw = String(data.detail ?? data.error ?? `Error ${res.status}`);
      const quota = res.status === 429 || isGeminiQuotaError(raw);
      if (quota) {
        const meta = buildRateLimitMeta("nl", true);
        throw new CompanionApiError(
          friendlyGeminiQuotaMessage("Fenna", "nl", meta.resetHint),
          { status: res.status, quotaExceeded: true, ...meta },
        );
      }
      throw new Error(raw);
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

  startSession: (
    residentId = "guest",
    lang: AppLang = "nl",
    characterId: "fenna" | "maarten" | "peter" | "colette" = "fenna",
  ) =>
    request<{
      session_id: string;
      opening_message: string;
    }>("/session/start", {
      method: "POST",
      body: JSON.stringify({
        resident_id: residentId,
        lang: toBackendLang(lang),
        character_id: characterId,
      }),
    }),

  sendMessage: (sessionId: string, message: string, lang: AppLang) =>
    request<{
      session_id: string;
      reply: string;
      memory_updated: boolean;
      prompt_version: string;
    }>("/chat/message", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        message,
        lang: toBackendLang(lang),
      }),
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
        lang: toBackendLang(lang),
        turn_phase: turnPhase,
      }),
    }, VOICE_TURN_TIMEOUT_MS),

  speak: (sessionId: string, text: string, lang: AppLang) =>
    request<{ audio_base64: string; mime_type: string }>("/speech/speak", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        text,
        lang: toBackendLang(lang),
      }),
    }),
};

/** Voice-changer — custom gekloonde stemmen (RVC) per personage. Admin-only. */
export type VoicePersonaId = "fenna" | "maarten" | "peter" | "colette";

export type VoiceModelStatus = {
  persona_id: VoicePersonaId;
  has_model: boolean;
  has_index: boolean;
  original_filename: string | null;
  index_filename: string | null;
  uploaded_at: string | null;
};

async function voiceModelRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      detail?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(String(data.detail ?? data.error ?? `Fout ${res.status}`));
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Dit duurde te lang. Probeer het nog eens.");
    }
    if (err instanceof TypeError) {
      throw new Error("Kan de HartMaatje-server nu niet bereiken.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const voiceModelsApi = {
  list: () => voiceModelRequest<{ models: VoiceModelStatus[] }>("/voice-models"),

  upload: (
    personaId: VoicePersonaId,
    adminKey: string,
    modelFile: File,
    indexFile?: File | null,
  ) => {
    const form = new FormData();
    form.append("model_file", modelFile);
    if (indexFile) form.append("index_file", indexFile);
    return voiceModelRequest<VoiceModelStatus>(`/voice-models/${personaId}`, {
      method: "POST",
      headers: { "X-Admin-Key": adminKey },
      body: form,
    });
  },

  remove: (personaId: VoicePersonaId, adminKey: string) =>
    voiceModelRequest<VoiceModelStatus>(`/voice-models/${personaId}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    }),
};

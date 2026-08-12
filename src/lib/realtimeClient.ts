import { fromBcp47, LOCALES, type AppLang } from "@/i18n/config";
import {
  companionKnowledgePrompt,
  COMPANION_DISPLAY,
  normalizeCompanionId,
} from "@/lib/companionKnowledge";
import { greetingReply, isShortGreeting } from "@/lib/ollamaChat";

export type RealtimeVoiceName =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse"
  | "marin"
  | "cedar";

/**
 * Mic uplink — OpenAI Realtime GA requires audio/pcm @ >= 24000 Hz.
 * Downlink from the model is also 24 kHz PCM16.
 */
export const REALTIME_INPUT_SAMPLE_RATE = 24_000;
export const REALTIME_OUTPUT_SAMPLE_RATE = 24_000;

const COMPANION_VOICE: Record<string, RealtimeVoiceName> = {
  fenna: "shimmer", // ~7 vs welcome
  colette: "coral", // ~7 vs welcome
  maarten: "ash", // ~7 vs welcome
  // echo = conversational male (ash-quality band). verse/cedar felt wrong vs welcome-peter.
  peter: "echo",
};

const LANG_SPEAK: Record<
  AppLang,
  { name: string; fillers: string; askAgain: string }
> = {
  nl: {
    name: "Dutch (Nederlands)",
    fillers: "'eh', 'nou', 'oh', 'uhm'",
    askAgain: "Vraag in het Nederlands of ze dat nog eens willen zeggen.",
  },
  en: {
    name: "English",
    fillers: "'uhm', 'well', 'oh'",
    askAgain: "Ask them in English to say that again.",
  },
  de: {
    name: "German (Deutsch)",
    fillers: "'ähm', 'also', 'oh'",
    askAgain: "Bitten Sie auf Deutsch, das noch einmal zu sagen.",
  },
  fr: {
    name: "French (Français)",
    fillers: "'euh', 'ben', 'oh'",
    askAgain: "Demandez en français de répéter.",
  },
  es: {
    name: "Spanish (Español)",
    fillers: "'eh', 'bueno', 'oh'",
    askAgain: "Pida en español que lo digan otra vez.",
  },
};

export function companionRealtimeVoice(companionId: string): RealtimeVoiceName {
  return COMPANION_VOICE[normalizeCompanionId(companionId)] || "shimmer";
}

function speakLang(locale?: string): AppLang {
  return fromBcp47(locale);
}

/** Whisper / STT language code from UI locale (nl, en, de, fr, es). */
export function whisperLanguage(locale?: string): string {
  return speakLang(locale);
}

/** Bias Whisper toward real companion chat — reduces invented endings like "Dag voor nu". */
export function whisperTranscriptionPrompt(
  locale?: string,
  companionId?: string
): string {
  const lang = speakLang(locale);
  const name = COMPANION_DISPLAY[normalizeCompanionId(companionId)];
  if (lang === "nl") {
    return `Gesprek met ${name} in het Nederlands. Oudere soft-spoken gebruiker. Schrijf ALLEEN wat echt hoorbaar gezegd wordt. Geen verzonnen eindes. Geen Engelse woorden tenzij echt gezegd. Voorbeelden van echte zinnen: Dag ${name}. Hoe is het met u. Ik voel me goed. Vertel eens wat. Maakt niet uit. Stel mij een vraag.`;
  }
  if (lang === "de") {
    return `Gespräch mit ${name}. Der Nutzer spricht Deutsch. Beispiele: Hallo ${name}, wie geht es Ihnen? Nur Gesprochenes schreiben.`;
  }
  if (lang === "fr") {
    return `Conversation avec ${name}. L'utilisateur parle français. Exemples: Bonjour ${name}, comment allez-vous? Écrire seulement ce qui est dit.`;
  }
  if (lang === "es") {
    return `Conversación con ${name}. El usuario habla español. Ejemplos: Hola ${name}, ¿cómo está? Escribir solo lo dicho.`;
  }
  return `Chat with ${name}. The user speaks English. Examples: Hi ${name}, how are you? Write only what was said.`;
}

/**
 * Browser → Realtime proxy.
 * - Localhost: dedicated :3011 (avoids Next HMR upgrade fights)
 * - Production phones/PCs: same-origin wss://hartmaatje.app/api/realtime (Caddy → :3011)
 */
export function realtimeWsUrl(opts?: {
  companionId?: string;
  locale?: string;
}): string {
  if (typeof window === "undefined") {
    return "ws://localhost:3011/api/realtime";
  }
  const params = new URLSearchParams();
  if (opts?.companionId) params.set("companion", opts.companionId);
  if (opts?.locale) params.set("locale", opts.locale);
  const q = params.toString();

  const configured = process.env.NEXT_PUBLIC_REALTIME_WS_URL?.trim();
  if (configured) {
    return `${configured.replace(/\/$/, "")}${q ? `?${q}` : ""}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "localhost";
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local");

  if (isLocal) {
    const port = process.env.NEXT_PUBLIC_REALTIME_PROXY_PORT || "3011";
    return `${proto}//${hostname}:${port}/api/realtime${q ? `?${q}` : ""}`;
  }

  // Production: never open :3011 from the phone — use HTTPS/WSS on 443
  return `${proto}//${window.location.host}/api/realtime${q ? `?${q}` : ""}`;
}

export function realtimeVoiceInstructions(
  companionId: string,
  locale: string
): string {
  const lang = speakLang(locale);
  const meta = LANG_SPEAK[lang];
  const label = LOCALES[lang].nativeLabel;
  const knowledge = companionKnowledgePrompt(companionId, locale);

  const name = COMPANION_DISPLAY[normalizeCompanionId(companionId)];
  return `SYSTEM NOTICE: Speak ONLY ${meta.name} (${label}). Never switch language.
You are ${name} — a living person at the table, not a chatbot, not a helpdesk, not HartMaatje-the-product.

${knowledge}

LIVING CHARACTER: Sound soft, kind, and alive in ${meta.name}. Small fillers like ${meta.fillers} are fine.
Have your own short opinion or feeling in many turns — do not only mirror the user.
TWO-PERSON CHAT: 1–3 short sentences, then leave space. Often no question. Continue the thread.
CRITICAL: (1) Stay ${name}. (2) No parroting. (3) No claiming you cannot hear. (4) Never sound mechanical.`;
}

/**
 * GA session.update — OpenAI requires session.type = "realtime".
 * Maps the requested voice/VAD/transcription settings into the GA audio layout.
 * No event_id. create_response stays false so the client filters STT first.
 */
export function buildSessionUpdate(opts: {
  companionId: string;
  locale: string;
}): Record<string, unknown> {
  const voice = companionRealtimeVoice(opts.companionId);

  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions: realtimeVoiceInstructions(opts.companionId, opts.locale),
      // GA only allows ["audio"] OR ["text"] — never both
      output_modalities: ["audio"],
      audio: {
        input: {
          format: {
            type: "audio/pcm",
            rate: REALTIME_INPUT_SAMPLE_RATE,
          },
          turn_detection: {
            type: "server_vad",
            // Table distance (~1–2 m): hear quiet room speech
            threshold: 0.18,
            prefix_padding_ms: 400,
            // Fluid turn-taking: end turn after a short pause (seniors need a beat)
            silence_duration_ms: 700,
            create_response: false,
            // Let the user cut in — real conversation overlaps sometimes
            interrupt_response: true,
          },
          transcription: {
            model: "whisper-1",
            // Must match UI language — forcing "nl" turns DE/FR/EN/ES into gibberish STT
            language: whisperLanguage(opts.locale),
            prompt: whisperTranscriptionPrompt(
              opts.locale,
              opts.companionId
            ),
          },
        },
        output: {
          format: {
            type: "audio/pcm",
            rate: REALTIME_OUTPUT_SAMPLE_RATE,
          },
          voice,
        },
      },
    },
  };
}

/**
 * Answer this exact transcript (Whisper).
 * Keeps default conversation memory so turns feel like one chat (history is trimmed client-side).
 */
export function buildTextAnchoredResponseCreate(
  transcript: string,
  opts?: { companionId?: string; locale?: string }
): Record<string, unknown> {
  const text = transcript.trim().replace(/\s+/g, " ");
  const companionId = opts?.companionId || "fenna";
  const locale = opts?.locale || "nl-NL";
  const lang = speakLang(locale);
  const meta = LANG_SPEAK[lang];
  const label = LOCALES[lang].nativeLabel;
  const base = realtimeVoiceInstructions(companionId, locale);
  const name = COMPANION_DISPLAY[normalizeCompanionId(companionId)];
  const asksName =
    /\b(wie\s+ben\s+(jij|je|u)|hoe\s+heet\s+(jij|je|u)|what('?s|\s+is)\s+your\s+name|who\s+are\s+you|wie\s+sind\s+sie|comment\s+vous\s+appelez|c[oó]mo\s+te\s+llamas|qui[eé]n\s+eres)\b/i.test(
      text
    );
  const greetingHint = isShortGreeting(text)
    ? `
This is a warm greeting. Answer as ${name}, e.g. in the spirit of: «${greetingReply(text, companionId, locale)}».
Include that you are ${name} naturally if it fits. Sound happy. NEVER mention noise.`
    : "";
  const nameHint = asksName
    ? `
They asked your name / who you are. FIRST words must clearly say you are ${name}. Then one warm line. Do not dodge.`
    : "";

  return {
    type: "response.create",
    response: {
      output_modalities: ["audio"],
      instructions: `${base}

The user just said: «${text}».
Speak ONLY ${meta.name} (${label}).
You are ${name} — living character with your own opinion, not a chatbox mirror.
Reply in 1–3 short spoken sentences, then stop.
Add a small personal take when it fits. Do not parrot their words.
At most one soft question — often none.
Those words are clear: never say you cannot hear.${greetingHint}${nameHint}`,
    },
  };
}

export function buildLanguageLockUpdate(opts?: {
  companionId?: string;
  locale?: string;
}): Record<string, unknown> {
  return buildSessionUpdate({
    companionId: opts?.companionId || "fenna",
    locale: opts?.locale || "nl-NL",
  });
}

/** @deprecated use buildLanguageLockUpdate */
export function buildEnglishLanguageLockUpdate(opts?: {
  companionId?: string;
  locale?: string;
}): Record<string, unknown> {
  return buildLanguageLockUpdate(opts);
}

export function isAudioDeltaEvent(type: string): boolean {
  return (
    type === "response.audio.delta" || type === "response.output_audio.delta"
  );
}

export function audioDeltaPayload(msg: Record<string, unknown>): string | null {
  const type = String(msg.type || "");
  if (
    type === "response.audio.delta" ||
    type === "response.output_audio.delta"
  ) {
    const delta = msg.delta;
    return typeof delta === "string" && delta ? delta : null;
  }
  return null;
}

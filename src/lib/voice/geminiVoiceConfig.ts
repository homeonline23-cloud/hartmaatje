import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { getProductionVoiceStyle } from "@/lib/companion/productionConfig";

/** Google Gemini TTS stem per HartMaatje-personage. */
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";

type GeminiVoiceProfile = {
  voiceName: string;
  /** Iets langzamer afspelen voor diepere, rustigere stem (1 = normaal). */
  playbackRate: number;
  personaNl: string;
  personaEn: string;
  personaFr?: string;
  personaDe?: string;
  personaEs?: string;
};

const PROFILES: Record<VoiceIdentityId, GeminiVoiceProfile> = {
  fenna: {
    voiceName: "Aoede",
    playbackRate: 0.92,
    personaNl:
      "Fenna — rustige Nederlandse vrouwenstem, 60-plus. Praat natuurlijk en gelijkwaardig, alsof u met een bekende aan tafel zit — niet zoet of bewonderend voorlezen. Rustig tempo, levendige intonatie, korte adempauzes.",
    personaEn:
      "Fenna — calm female voice. Natural, equal conversation — not sugary or gushing. Calm pace with gentle pauses.",
  },
  colette: {
    // Zelfde betrouwbare vrouwenstem als Fenna (Aoede); Erinome/Kore klonken te mannelijk.
    voiceName: "Aoede",
    playbackRate: 1,
    personaNl:
      "Warme, heldere Nederlandse vrouwenstem — volwassen vrouw, rustig en duidelijk.",
    personaEn: "Warm, clear adult female voice — calm and reassuring.",
  },
  maarten: {
    voiceName: "Charon",
    playbackRate: 0.9,
    personaNl:
      "Maarten — rustige Nederlandse mannenstem. Betrouwbaar en geduldig.",
    personaEn: "Maarten — calm male voice. Trustworthy and patient.",
  },
  peter: {
    // Algenib = gravelly male — dieper en zwaarder dan Fenrir/Charon (past bij Peter in de video).
    voiceName: "Algenib",
    playbackRate: 0.86,
    personaNl:
      "Peter — warme, diepe mannenstem van een volwassen man rond zestig. Lage bariton, rustig en gelijkwaardig — dezelfde zware, warme klank als in zijn welkomstvideo. Geen lichte of hoge stem. Praat langzaam en natuurlijk, met korte adempauzes.",
    personaEn:
      "Peter — warm, deep male voice of a mature man in his late fifties or early sixties. Low baritone, calm and equal — the same heavy, warm tone as in his welcome video. Not light or high-pitched. Speak slowly and naturally, with gentle pauses.",
    personaFr:
      "Peter — voix masculine chaleureuse et profonde. Baryton calme, posé et égal. Parlez lentement et naturellement, avec de courtes pauses.",
    personaDe:
      "Peter — warme, tiefe Männerstimme. Ruhiges Bass-Bariton, gleichmäßig und ausgeglichen. Langsam und natürlich sprechen, mit kurzen Pausen.",
    personaEs:
      "Peter — voz masculina cálida y profunda. Barítono tranquilo e igualado. Hablar despacio y con naturalidad, con pausas breves.",
  },
};

export function getGeminiPlaybackRate(identityId: VoiceIdentityId): number {
  return PROFILES[identityId]?.playbackRate ?? 0.92;
}

export function getGeminiVoicePrompt(
  identityId: VoiceIdentityId,
  lang: AppLang,
  text: string,
): { voiceName: string; prompt: string } {
  const profile = PROFILES[identityId] ?? PROFILES.fenna;
  const voiceStyle = getProductionVoiceStyle(identityId, lang);
  const persona =
    lang === "nl"
      ? `${profile.personaNl} Stijl: ${voiceStyle}.`
      : lang === "fr"
        ? `${profile.personaFr ?? profile.personaEn} Style: ${voiceStyle}.`
        : lang === "de"
          ? `${profile.personaDe ?? profile.personaEn} Stil: ${voiceStyle}.`
          : lang === "es"
            ? `${profile.personaEs ?? profile.personaEn} Estilo: ${voiceStyle}.`
            : `${profile.personaEn} Style: ${voiceStyle}.`;
  const lead =
    lang === "nl"
      ? `Lees hardop voor in één natuurlijke flow (${persona}):\n\n`
      : lang === "fr"
        ? `Lisez à voix haute dans un flux naturel (${persona}):\n\n`
        : lang === "de"
          ? `Lesen Sie laut in einem natürlichen Fluss vor (${persona}):\n\n`
          : lang === "es"
            ? `Lea en voz alta en un flujo natural (${persona}):\n\n`
            : `Read aloud in one natural flow (${persona}):\n\n`;
  return {
    voiceName: profile.voiceName,
    prompt: `${lead}${text}`,
  };
}

/** Fallback vrouwenstemmen als primair model faalt (Colette/Fenna). */
export function getFemaleTtsVoiceFallbacks(
  identityId: VoiceIdentityId,
): string[] {
  const primary = PROFILES[identityId]?.voiceName ?? "Aoede";
  if (identityId !== "fenna" && identityId !== "colette") return [primary];
  return [...new Set([primary, "Aoede", "Despina", "Leda", "Achernar"])];
}

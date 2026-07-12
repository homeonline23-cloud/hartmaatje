import type { AppLang } from "@/lib/languages";
import { getVoiceLocaleForLang } from "@/lib/languages";
import {
  previewHartMaatjeVoice,
  stopHartMaatjeSpeech,
  type VoiceIdentityId,
} from "@/lib/voice";

export type NatureScene =
  | {
      kind: "live";
      embedUrl: string;
      alt: string;
      credit?: string;
    }
  | {
      kind: "image";
      url: string;
      alt: string;
      credit?: string;
    };

/** Bewoner vraagt Fenna om natuur of landschap te laten zien. */
export function isNatureShowRequest(message: string): boolean {
  const m = message.toLowerCase().trim();

  const nl =
    /(landschap|natuur|bos|bergen|zee|weide|bloemen|waterval|veld|duinen|rivier|vogels|dieren)/.test(
      m,
    ) &&
    /(laat|toon|kun je|kan je|wil je|mag ik|zien|kijken|bekijken|laten zien)/.test(
      m,
    );

  const nlShort =
    /mooi(e)?\s+(landschap|natuur|foto|plaatje|beeld)/.test(m) ||
    /(landschap|natuur)\s+(laten|tonen)\b/.test(m) ||
    /live\s+natuur/.test(m);

  const en =
    /(landscape|nature|forest|mountain|scenery|flowers|meadow|waterfall|beach|wildlife|birds)/.test(
      m,
    ) &&
    /(show|see|look|display|picture|image|watch)/.test(m);

  const enShort =
    /beautiful\s+(landscape|nature|scenery)/.test(m) ||
    /live\s+nature/.test(m);

  return nl || nlShort || en || enShort;
}

/** Terug van natuurbeeld naar Fenna's portret. */
export function isReturnToCompanionRequest(
  message: string,
  companionName = "fenna",
): boolean {
  const m = message.toLowerCase().trim();
  const name = companionName.toLowerCase();

  if (new RegExp(`(terug|ga terug|weer naar|back to|return to).*${name}`).test(m)) {
    return true;
  }

  if (
    /(terug|weer).*(portret|gezicht|beeld|fenna|maatje)/.test(m) &&
    /(fenna|portret|gezicht|maatje)/.test(m)
  ) {
    return true;
  }

  return /(stop.*beeld|klaar met kijken|genoeg gezien|enough looking)/.test(m);
}

export function fennaNatureReply(lang: AppLang): string {
  return lang === "en"
    ? "Of course. I found a live view of nature for you on the internet — take your time looking. When you're ready, say back to Fenna."
    : "Natuurlijk. Ik laat u live natuur zien via het internet — kijk maar rustig. Zeg gerust terug naar Fenna als u wilt.";
}

export function fennaReturnReply(lang: AppLang): string {
  return lang === "en"
    ? "Here I am again. I'm still listening."
    : "Daar ben ik weer. Ik luister verder met u.";
}

export function fennaNatureErrorReply(lang: AppLang): string {
  return lang === "en"
    ? "I couldn't load live nature just now. Shall we keep talking?"
    : "Het lukte even niet om live natuur te laden. Zullen we verder praten?";
}

/** Fenna's echte stem (MP3-sample), niet de browser-manstem. */
export function speakFennaSample(
  lang: AppLang,
  playbackRate: number,
  identityId: VoiceIdentityId = "fenna",
): void {
  stopHartMaatjeSpeech();
  previewHartMaatjeVoice(
    identityId,
    playbackRate,
    getVoiceLocaleForLang(lang),
  );
}

export async function fetchNatureScene(
  lang: AppLang,
): Promise<NatureScene | null> {
  try {
    const res = await fetch(`/api/nature-image?lang=${lang}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NatureScene;
    if (data.kind === "live" && data.embedUrl) return data;
    if (data.kind === "image" && data.url) return data;
    return null;
  } catch {
    return null;
  }
}

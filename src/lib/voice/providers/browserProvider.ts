import { resolveActiveVariant } from "@/lib/voice/resolve";
import type { VoiceIdentityId } from "@/lib/voice/types";

/** Browser Web Speech API — dynamische tekst tot cloud-TTS per identiteit live is. */
export function speakWithBrowser(
  text: string,
  identityId: VoiceIdentityId,
  rate: number,
  locale?: string,
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const speak = () => {
    window.speechSynthesis.cancel();

    const variant = resolveActiveVariant(identityId, locale);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = variant?.locale ?? "nl-NL";
    utter.rate = rate;
    utter.pitch =
      identityId === "peter"
        ? 0.72
        : identityId === "maarten"
          ? 0.88
          : identityId === "colette"
            ? 1.18
            : identityId === "fenna"
              ? 1.08
              : 1.0;
    utter.volume = 1;

    const voice = pickBrowserVoice(identityId, variant?.browserVoiceHints);
    if ((identityId === "fenna" || identityId === "colette") && !voice) return;

    if (voice) utter.voice = voice;

    window.speechSynthesis.speak(utter);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    speak();
    return;
  }

  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.onvoiceschanged = null;
    speak();
  };
}

export function stopBrowserSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Browser-TTS met Promise — voor fallback wanneer Gemini TTS niet beschikbaar is. */
export function speakWithBrowserAndWait(
  text: string,
  identityId: VoiceIdentityId,
  rate: number,
  locale?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Browser spraak niet beschikbaar."));
      return;
    }

    const run = () => {
      window.speechSynthesis.cancel();

      const variant = resolveActiveVariant(identityId, locale);
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = variant?.locale ?? locale ?? "nl-NL";
      utter.rate = rate;
      utter.pitch =
        identityId === "peter"
          ? 0.72
          : identityId === "maarten"
            ? 0.88
            : identityId === "colette"
              ? 1.18
              : identityId === "fenna"
                ? 1.08
                : 1.0;
      utter.volume = 1;

      const voice = pickBrowserVoice(identityId, variant?.browserVoiceHints);
      if ((identityId === "fenna" || identityId === "colette") && !voice) {
        reject(
          new Error(
            "Geen vrouwenstem beschikbaar — probeer het zo nog eens.",
          ),
        );
        return;
      }

      if (voice) utter.voice = voice;

      utter.onend = () => resolve();
      utter.onerror = () => reject(new Error("Browser spraak mislukt."));
      window.speechSynthesis.speak(utter);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      run();
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      run();
    };
  });
}

function pickBrowserVoice(
  identityId: VoiceIdentityId,
  hints: readonly string[] | undefined,
): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  const variant = resolveActiveVariant(identityId);
  const locale = variant?.locale ?? "nl-NL";
  const langPrefix = locale.split("-")[0]?.toLowerCase() ?? "nl";

  const localeVoices = voices.filter((v) =>
    v.lang?.toLowerCase().startsWith(langPrefix),
  );
  const pool = localeVoices.length ? localeVoices : voices;

  const maleRe =
    /(male|man\b|mannen|frank|david|mark|ruben|xander|maarten|peter|algenib|charon|google uk english male|microsoft david)/i;
  const femaleRe =
    /(female|vrouw|woman|fenna|colette|lotte|laura|zira|hazel|susan|helena|claire|google.*vrouw|microsoft.*zira)/i;

  const wantFemale = identityId === "fenna" || identityId === "colette";
  const wantMale = identityId === "maarten" || identityId === "peter";

  const needle = hints ?? [];
  if (needle.length) {
    const pattern = new RegExp(needle.join("|"), "i");
    const matched = pool.filter(
      (v) => pattern.test(v.name) && !(wantFemale && maleRe.test(v.name)),
    );
    if (matched.length) return matched[0];
  }

  if (wantFemale) {
    const allFemales = voices.filter(
      (v) => femaleRe.test(v.name) && !maleRe.test(v.name),
    );
    const localeFemales = allFemales.filter((v) =>
      v.lang?.toLowerCase().startsWith(langPrefix),
    );
    if (localeFemales.length) return localeFemales[0];

    const nlFemales = allFemales.filter((v) =>
      v.lang?.toLowerCase().startsWith("nl"),
    );
    if (nlFemales.length) return nlFemales[0];

    const females = pool.filter((v) => femaleRe.test(v.name) && !maleRe.test(v.name));
    if (females.length) return females[0];
    if (allFemales.length) return allFemales[0];
    return undefined;
  }

  if (wantMale) {
    const males = pool.filter((v) => maleRe.test(v.name));
    if (males.length) return males[0];
  }

  return pool[0];
}

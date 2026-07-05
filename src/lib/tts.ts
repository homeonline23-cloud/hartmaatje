import type { VoicePresetId } from "@/lib/constants";

/** Kiest een browserstem die past bij het gekozen preset (NL, geslacht). */
function pickVoice(preset: VoicePresetId): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  const dutch = voices.filter((v) => v.lang?.toLowerCase().startsWith("nl"));
  const pool = dutch.length ? dutch : voices;

  const femaleHints = /(female|vrouw|lotte|laura|xander-?f|zira|google nederlands)/i;
  const maleHints = /(male|man|xander|ruben|frank)/i;
  const wantFemale = preset.includes("female");
  const wantSecond = preset.endsWith("_b");

  const matches = pool.filter((v) =>
    wantFemale ? femaleHints.test(v.name) : maleHints.test(v.name),
  );
  const ordered = matches.length ? matches : pool;
  return ordered[wantSecond && ordered.length > 1 ? 1 : 0];
}

/** Voorlezen NL; stopt eerder lopende spraak. */
export function speakDutch(
  raw: string,
  opts?: { preset?: VoicePresetId; rate?: number },
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const text = raw.trim().slice(0, 4500);
  if (!text) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "nl-NL";
  utter.rate = Math.max(0.6, Math.min(1.3, opts?.rate ?? 1.06));
  utter.pitch = 1.02;
  utter.volume = 1;
  const voice = pickVoice(opts?.preset ?? "nl_female_a");
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

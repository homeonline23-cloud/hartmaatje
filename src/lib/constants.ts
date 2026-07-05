/** Gedeelde teksten en instellingen (geport uit de originele app). */

export const CONSENT_DOCUMENT_VERSION = "1.0";

/** Korte vaste tekst bovenaan het gesprek. */
export const GESPREK_INTRO =
  "HartMaatje is er om rustig naar u te luisteren.";

export type VoicePresetId =
  | "nl_female_a"
  | "nl_female_b"
  | "nl_male_a"
  | "nl_male_b";

export const VOICE_PRESETS: {
  id: VoicePresetId;
  headline: string;
  sub: string;
  gender: "female" | "male";
}[] = [
  {
    id: "nl_female_a",
    headline: "Vrouwenstem 1",
    sub: "Standaard vrouwenstem uit uw browser (zo mogelijk Nederlands).",
    gender: "female",
  },
  {
    id: "nl_female_b",
    headline: "Vrouwenstem 2",
    sub: "Alternatief vrouwelijk (indien uw browser die aanbiedt).",
    gender: "female",
  },
  {
    id: "nl_male_a",
    headline: "Mannenstem 1",
    sub: "Standaard mannenstem uit uw browser (zo mogelijk NL).",
    gender: "male",
  },
  {
    id: "nl_male_b",
    headline: "Mannenstem 2",
    sub: "Alternatief mannelijk (browser-afhankelijk).",
    gender: "male",
  },
];

export function normalizePresetId(
  raw: string | null | undefined,
): VoicePresetId {
  if (
    raw === "nl_female_a" ||
    raw === "nl_female_b" ||
    raw === "nl_male_a" ||
    raw === "nl_male_b"
  ) {
    return raw;
  }
  return "nl_female_a";
}

export const TTS_RATE_STEPS = [0.92, 1.06, 1.14] as const;

/** Opties voor automatisch verwijderen van oude chatberichten (server-side sweep). */
export const MESSAGE_RETENTION_OPTIONS: readonly {
  label: string;
  days: number | null;
}[] = [
  { label: "Niet automatisch verwijderen", days: null },
  { label: "6 maanden (180 dagen)", days: 180 },
  { label: "1 jaar (365 dagen)", days: 365 },
  { label: "2 jaar (730 dagen)", days: 730 },
];

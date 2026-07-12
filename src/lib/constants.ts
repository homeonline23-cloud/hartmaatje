/** Gedeelde teksten en instellingen (geport uit de originele app). */

import {
  DEFAULT_VOICE_SPEED,
  normalizeVoiceIdentityId,
  VOICE_PROFILES,
  type VoiceIdentityId,
} from "@/lib/voice";

export const CONSENT_DOCUMENT_VERSION = "1.0";

/** Korte vaste tekst bovenaan het gesprek. */
export const GESPREK_INTRO =
  "HartMaatje is er om rustig naar u te luisteren.";

/** @deprecated Gebruik VoiceIdentityId uit `@/lib/voice`. */
export type VoicePresetId = VoiceIdentityId;

export const VOICE_PRESETS = VOICE_PROFILES.map((p) => ({
  id: p.id,
  headline: p.label,
  sub: p.description,
  gender: p.gender,
}));

export const normalizePresetId = normalizeVoiceIdentityId;

/** @deprecated Gebruik DEFAULT_VOICE_SPEED uit `@/lib/voice`. */
export const DEFAULT_TTS_PLAYBACK_RATE = DEFAULT_VOICE_SPEED;

/** @deprecated Gebruik VOICE_SPEED_OPTIONS uit `@/lib/voice`. */
export const TTS_RATE_STEPS = [0.75, 0.8, 0.92] as const;

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

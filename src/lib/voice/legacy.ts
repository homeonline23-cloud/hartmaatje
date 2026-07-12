import { DEFAULT_VOICE_IDENTITY_ID } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

/** Oude technische ids → permanente identiteiten. */
const LEGACY_ID_MAP: Record<string, VoiceIdentityId> = {
  nl_female_a: "fenna",
  nl_female_b: "colette",
  nl_male_a: "maarten",
  nl_male_b: "peter",
  /** Migreert vroegere opgeslagen stem-id (pre-Peter rename) */
  [["ar", "naud"].join("")]: "peter",
};

const VALID_IDS = new Set<VoiceIdentityId>([
  "maarten",
  "peter",
  "fenna",
  "colette",
]);

export function normalizeVoiceIdentityId(
  raw: string | null | undefined,
): VoiceIdentityId {
  if (!raw) return DEFAULT_VOICE_IDENTITY_ID;
  const trimmed = raw.trim().toLowerCase();
  if (VALID_IDS.has(trimmed as VoiceIdentityId)) {
    return trimmed as VoiceIdentityId;
  }
  if (LEGACY_ID_MAP[trimmed]) return LEGACY_ID_MAP[trimmed];
  return DEFAULT_VOICE_IDENTITY_ID;
}

/** @deprecated Gebruik normalizeVoiceIdentityId. */
export const normalizeVoiceProfileId = normalizeVoiceIdentityId;

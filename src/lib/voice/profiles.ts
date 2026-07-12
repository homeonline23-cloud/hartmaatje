import { normalizeVoiceIdentityId } from "@/lib/voice/legacy";
import {
  DEFAULT_VOICE_IDENTITY_ID,
  getActiveVoiceIdentities,
  getVoiceIdentity,
} from "@/lib/voice/registry";
import type { VoiceIdentityId, VoiceProfile } from "@/lib/voice/types";

/** @deprecated Gebruik DEFAULT_VOICE_IDENTITY_ID. */
export const DEFAULT_VOICE_PROFILE_ID = DEFAULT_VOICE_IDENTITY_ID;

/** UI-lijst voor instellingen — vriendelijke labels, geen bestandsnamen. */
export const VOICE_PROFILES: readonly VoiceProfile[] =
  getActiveVoiceIdentities().map((identity) => ({
    id: identity.id,
    label: identity.displayName,
    description: identity.uiDescription,
    gender: identity.gender,
  }));

export function normalizeVoiceProfileId(
  raw: string | null | undefined,
): VoiceIdentityId {
  return normalizeVoiceIdentityId(raw);
}

export function getVoiceProfile(id: VoiceIdentityId): VoiceProfile {
  const identity = getVoiceIdentity(id);
  return {
    id: identity.id,
    label: identity.displayName,
    description: identity.uiDescription,
    gender: identity.gender,
  };
}

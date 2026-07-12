import type { VoiceIdentityId } from "@/lib/voice/types";

/** HartMaatje character ↔ LiveAvatar mapping (expand per character). */
export type LiveAvatarCharacterId = VoiceIdentityId;

export type LiveAvatarCharacterEnv = {
  avatarId: string;
  contextId: string;
  voiceId?: string;
};

const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

export function isLiveAvatarSandbox(): boolean {
  return process.env.LIVEAVATAR_SANDBOX === "true";
}

/** Sandbox werkt alleen met de vaste test-avatar — eigen avatar = productie-sessie. */
export function shouldUseLiveAvatarSandbox(avatarId: string): boolean {
  return isLiveAvatarSandbox() && avatarId === SANDBOX_AVATAR_ID;
}

export function getLiveAvatarCharacterEnv(
  characterId: LiveAvatarCharacterId,
): LiveAvatarCharacterEnv | null {
  const prefix = `LIVEAVATAR_${characterId.toUpperCase()}`;
  const avatarId = process.env[`${prefix}_AVATAR_ID`]?.trim();
  const contextId = process.env[`${prefix}_CONTEXT_ID`]?.trim();
  const voiceId = process.env[`${prefix}_VOICE_ID`]?.trim();

  if (isLiveAvatarSandbox()) {
    return {
      avatarId: avatarId || SANDBOX_AVATAR_ID,
      contextId: contextId || process.env.LIVEAVATAR_SANDBOX_CONTEXT_ID?.trim() || "",
      voiceId: voiceId || undefined,
    };
  }

  if (!avatarId || !contextId) return null;
  return { avatarId, contextId, voiceId: voiceId || undefined };
}

export function isLiveAvatarConfigured(
  characterId: LiveAvatarCharacterId,
): boolean {
  if (!process.env.LIVEAVATAR_API_KEY?.trim()) return false;
  const env = getLiveAvatarCharacterEnv(characterId);
  if (!env) return false;
  if (isLiveAvatarSandbox()) return true;
  return Boolean(env.avatarId && env.contextId);
}

export function getPublicLiveAvatarFlags(): Record<LiveAvatarCharacterId, boolean> {
  return {
    maarten: isLiveAvatarConfigured("maarten"),
    peter: isLiveAvatarConfigured("peter"),
    fenna: isLiveAvatarConfigured("fenna"),
    colette: isLiveAvatarConfigured("colette"),
  };
}

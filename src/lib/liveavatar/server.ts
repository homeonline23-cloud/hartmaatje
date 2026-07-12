import {
  getLiveAvatarCharacterEnv,
  shouldUseLiveAvatarSandbox,
  type LiveAvatarCharacterId,
} from "@/lib/liveavatar/characters";

const LIVEAVATAR_API = "https://api.liveavatar.com/v1";

type SessionTokenResponse = {
  data?: {
    session_id?: string;
    session_token?: string;
  };
  message?: string;
};

export async function createLiveAvatarSessionToken(
  characterId: LiveAvatarCharacterId,
  language: "nl" | "en" = "nl",
): Promise<{ sessionId: string; sessionToken: string }> {
  const apiKey = process.env.LIVEAVATAR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("LiveAvatar is niet geconfigureerd (LIVEAVATAR_API_KEY ontbreekt).");
  }

  const character = getLiveAvatarCharacterEnv(characterId);
  if (!character?.avatarId) {
    throw new Error(`LiveAvatar is niet geconfigureerd voor ${characterId}.`);
  }

  if (!shouldUseLiveAvatarSandbox(character.avatarId) && !character.contextId) {
    throw new Error(
      `LiveAvatar context ontbreekt voor ${characterId}. Zet LIVEAVATAR_${characterId.toUpperCase()}_CONTEXT_ID.`,
    );
  }

  const useSandbox = shouldUseLiveAvatarSandbox(character.avatarId);

  const persona: Record<string, string> = { language };
  if (character.contextId) persona.context_id = character.contextId;
  if (character.voiceId) persona.voice_id = character.voiceId;

  const body: Record<string, unknown> = {
    mode: "FULL",
    avatar_id: character.avatarId,
    avatar_persona: persona,
    is_sandbox: useSandbox,
  };

  const res = await fetch(`${LIVEAVATAR_API}/sessions/token`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json()) as SessionTokenResponse;
  if (!res.ok || !json.data?.session_token) {
    throw new Error(json.message ?? "LiveAvatar sessie-token mislukt.");
  }

  return {
    sessionId: json.data.session_id ?? "",
    sessionToken: json.data.session_token,
  };
}

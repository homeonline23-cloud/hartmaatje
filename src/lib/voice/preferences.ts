import { normalizeVoiceIdentityId } from "@/lib/voice/legacy";
import { DEFAULT_VOICE_IDENTITY_ID } from "@/lib/voice/registry";
import {
  clampVoiceSpeed,
  DEFAULT_VOICE_SPEED,
} from "@/lib/voice/speed";
import type { VoiceIdentityId, VoiceUserSettings } from "@/lib/voice/types";

const STORAGE_KEY = "hartmaatje_voice_prefs";

type ProfileSlice = {
  tts_preset_id?: string | null;
  tts_playback_rate?: number | null;
} | null;

export function defaultVoiceSettings(): VoiceUserSettings {
  return {
    identityId: DEFAULT_VOICE_IDENTITY_ID,
    playbackRate: DEFAULT_VOICE_SPEED,
  };
}

function parseStoredIdentity(raw: unknown): VoiceIdentityId {
  if (typeof raw !== "string") return DEFAULT_VOICE_IDENTITY_ID;
  return normalizeVoiceIdentityId(raw);
}

export function loadLocalVoiceSettings(): VoiceUserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;

    const identityRaw =
      parsed.identityId ?? parsed.profileId ?? DEFAULT_VOICE_IDENTITY_ID;

    return {
      identityId: parseStoredIdentity(identityRaw),
      playbackRate: clampVoiceSpeed(parsed.playbackRate as number | null),
    };
  } catch {
    return null;
  }
}

export function saveLocalVoiceSettings(settings: VoiceUserSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        identityId: settings.identityId,
        playbackRate: clampVoiceSpeed(settings.playbackRate),
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Profiel (ingelogd) heeft voorrang; anders lokale voorkeur; anders standaard. */
export function resolveVoiceSettings(profile: ProfileSlice): VoiceUserSettings {
  const local = loadLocalVoiceSettings();
  const base = local ?? defaultVoiceSettings();

  if (!profile) return base;

  return {
    identityId: profile.tts_preset_id
      ? normalizeVoiceIdentityId(profile.tts_preset_id)
      : base.identityId,
    playbackRate: clampVoiceSpeed(
      profile.tts_playback_rate ?? base.playbackRate,
    ),
  };
}

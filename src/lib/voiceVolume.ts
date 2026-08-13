const STORAGE_KEY = "hartmaatje-voice-volume";
export const VOICE_VOLUME_EVENT = "hartmaatje-voice-volume";

const DEFAULT = 0.85;

function clamp(n: number): number {
  if (Number.isNaN(n)) return DEFAULT;
  return Math.min(1, Math.max(0, n));
}

/** 0–1 voice playback volume (companion TTS). */
export function getVoiceVolume(): number {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT;
    return clamp(Number(raw));
  } catch {
    return DEFAULT;
  }
}

export function setVoiceVolume(value: number): number {
  const next = clamp(value);
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(VOICE_VOLUME_EVENT, { detail: next })
    );
  }
  return next;
}

export function voiceVolumePercent(volume = getVoiceVolume()): number {
  return Math.round(volume * 100);
}

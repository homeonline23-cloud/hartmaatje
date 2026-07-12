import { resolveActiveVariant } from "@/lib/voice/resolve";
import type { VoiceIdentityId, VoiceLanguageVariant } from "@/lib/voice/types";

let currentAudio: HTMLAudioElement | null = null;

/** Speel het referentie-audiobestand van een stemidentiteit (instellingen / preview). */
export function playVoiceSample(
  variant: VoiceLanguageVariant,
  rate: number,
): boolean {
  if (typeof window === "undefined") return false;

  stopVoiceSample();

  const audio = new Audio(variant.sourceFile);
  audio.playbackRate = rate;
  currentAudio = audio;

  void audio.play().catch(() => {
    currentAudio = null;
  });

  return true;
}

export function previewVoiceIdentity(
  identityId: VoiceIdentityId,
  rate: number,
  locale?: string,
): boolean {
  const variant = resolveActiveVariant(identityId, locale);
  if (!variant) return false;
  return playVoiceSample(variant, rate);
}

export function stopVoiceSample(): void {
  if (!currentAudio) return;
  currentAudio.loop = false;
  currentAudio.onended = null;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio.src = "";
  currentAudio.load();
  currentAudio = null;
}

import { getVoiceIdentity } from "@/lib/voice/registry";
import { speakWithBrowser, stopBrowserSpeech } from "@/lib/voice/providers/browserProvider";
import {
  previewVoiceIdentity,
  stopVoiceSample,
} from "@/lib/voice/providers/sampleProvider";
import { speakCompanionLive, stopGeminiLiveSpeech } from "@/lib/voice/geminiLiveVoice";
import { resolveActiveVariant } from "@/lib/voice/resolve";
import { clampVoiceSpeed } from "@/lib/voice/speed";
import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId, VoiceUserSettings } from "@/lib/voice/types";

const MAX_SPEECH_CHARS = 4500;

let lastSpoken: { text: string; settings: VoiceUserSettings } | null = null;

function resolveLangFromSettings(settings: VoiceUserSettings): "nl" | "en" {
  const variant = resolveActiveVariant(settings.identityId);
  return variant?.locale?.toLowerCase().startsWith("en") ? "en" : "nl";
}

/** Spreek een live antwoord — neural Gemini-stem, één vloeiend audiobestand. */
export function speakHartMaatje(
  raw: string,
  settings: VoiceUserSettings,
  appLang?: AppLang,
): void {
  void speakHartMaatjeAndWait(raw, settings, appLang);
}

export async function speakHartMaatjeAndWait(
  raw: string,
  settings: VoiceUserSettings,
  appLang?: AppLang,
): Promise<void> {
  const text = raw.trim().slice(0, MAX_SPEECH_CHARS);
  if (!text) return;

  const identity = getVoiceIdentity(settings.identityId);
  const rate = clampVoiceSpeed(settings.playbackRate);
  const normalized: VoiceUserSettings = {
    identityId: identity.id,
    playbackRate: rate,
  };

  lastSpoken = { text, settings: normalized };
  stopVoiceSample();
  stopBrowserSpeech();

  const lang = appLang ?? resolveLangFromSettings(normalized);
  try {
    await speakCompanionLive(text, normalized.identityId, lang, rate);
  } catch {
    speakWithBrowser(text, normalized.identityId, rate, lang === "en" ? "en-US" : "nl-NL");
  }
}

/** Speel het echte referentie-audiobestand van een identiteit (instellingen). */
export function previewHartMaatjeVoice(
  identityId: VoiceIdentityId,
  playbackRate: number,
  locale?: string,
): boolean {
  stopGeminiLiveSpeech();
  stopBrowserSpeech();
  return previewVoiceIdentity(
    identityId,
    clampVoiceSpeed(playbackRate),
    locale,
  );
}

/** Herhaal het laatst uitgesproken HartMaatje-antwoord. */
export function repeatLastSpoken(settings?: VoiceUserSettings): boolean {
  if (!lastSpoken?.text) return false;
  speakHartMaatje(lastSpoken.text, settings ?? lastSpoken.settings);
  return true;
}

export function rememberLastAssistantReply(
  text: string,
  settings: VoiceUserSettings,
): void {
  const trimmed = text.trim().slice(0, MAX_SPEECH_CHARS);
  if (!trimmed) return;
  lastSpoken = {
    text: trimmed,
    settings: {
      identityId: settings.identityId,
      playbackRate: clampVoiceSpeed(settings.playbackRate),
    },
  };
}

export function stopHartMaatjeSpeech(): void {
  stopGeminiLiveSpeech();
  stopBrowserSpeech();
  stopVoiceSample();
}

export function getLastSpokenText(): string | null {
  return lastSpoken?.text ?? null;
}

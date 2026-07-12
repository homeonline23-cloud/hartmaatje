import type { AppLang } from "@/lib/languages";
import { getVoiceLocaleForLang } from "@/lib/languages";
import { speakWithBrowser, stopBrowserSpeech } from "@/lib/voice/providers/browserProvider";
import type { VoiceIdentityId } from "@/lib/voice/types";

export function stripTextForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/—/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

let liveAudio: HTMLAudioElement | null = null;
let liveSpeakGeneration = 0;

function pauseLiveAudio(): void {
  stopBrowserSpeech();
  if (liveAudio) {
    liveAudio.pause();
    liveAudio.currentTime = 0;
    liveAudio = null;
  }
}

export function stopGeminiLiveSpeech(): void {
  liveSpeakGeneration += 1;
  pauseLiveAudio();
}

function pcmBase64ToWav(base64: string, sampleRate = 24000): string {
  const binary = atob(base64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + byteLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, byteLength, true);

  const pcmBytes = new Uint8Array(buffer, 44);
  for (let i = 0; i < byteLength; i++) pcmBytes[i] = binary.charCodeAt(i);

  const out = new Uint8Array(buffer);
  let wavBinary = "";
  for (let i = 0; i < out.length; i++) wavBinary += String.fromCharCode(out[i]);
  return btoa(wavBinary);
}

function prepareAudioPlayback(
  base64: string,
  mimeType: string,
): { base64: string; mime: string } {
  if (mimeType.includes("pcm") || mimeType.includes("L16")) {
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    const rate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    return { base64: pcmBase64ToWav(base64, rate), mime: "audio/wav" };
  }
  return { base64, mime: mimeType || "audio/mp3" };
}

function playBase64Audio(
  base64: string,
  mimeType: string,
  playbackRate: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    try {
      const prepared = prepareAudioPlayback(base64, mimeType);
      liveAudio = new Audio(`data:${prepared.mime};base64,${prepared.base64}`);
      liveAudio.playbackRate = playbackRate;
      liveAudio.onended = () => resolve();
      liveAudio.onerror = () => resolve();
      void liveAudio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

async function fetchGeminiSpeech(
  text: string,
  identityId: VoiceIdentityId,
  lang: AppLang,
): Promise<{ audioBase64: string; mimeType: string } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/companion-speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, identityId, lang }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (res.ok && data.audioBase64) {
        return {
          audioBase64: data.audioBase64,
          mimeType: data.mimeType ?? "audio/mp3",
        };
      }
    } catch {
      /* retry */
    }
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return null;
}

/**
 * Eén vloeiende neural stem per antwoord — geen brokken (HartMaatje = korte antwoorden).
 */
export async function speakCompanionLive(
  text: string,
  identityId: VoiceIdentityId,
  lang: AppLang,
  playbackRate = 0.92,
): Promise<void> {
  const cleaned = stripTextForSpeech(text);
  if (!cleaned || typeof window === "undefined") return;

  pauseLiveAudio();
  const myGen = ++liveSpeakGeneration;

  const audio = await fetchGeminiSpeech(cleaned, identityId, lang);
  if (myGen !== liveSpeakGeneration) return;

  if (audio) {
    await playBase64Audio(audio.audioBase64, audio.mimeType, playbackRate);
    return;
  }

  speakWithBrowser(
    cleaned,
    identityId,
    playbackRate,
    getVoiceLocaleForLang(lang),
  );
}

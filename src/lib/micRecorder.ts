"use client";

import { getVoiceVolume } from "@/lib/voiceVolume";
import { trackHmMedia } from "@/lib/hmMedia";

/** Hold-to-talk / tap-to-talk MediaRecorder helper. */
export class MicRecorder {
  private media: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private mimeType = "audio/webm";

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (this.recording) return;
    this.chunks = [];
    this.media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const preferred = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    const mime =
      preferred.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    this.mimeType = mime || "audio/webm";

    this.recorder = new MediaRecorder(
      this.media,
      mime ? { mimeType: mime } : undefined
    );
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);
  }

  async stop(): Promise<{ blob: Blob; mimeType: string } | null> {
    const recorder = this.recorder;
    if (!recorder) return null;

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        if (!this.chunks.length) {
          resolve(null);
          return;
        }
        resolve(new Blob(this.chunks, { type: this.mimeType }));
      };
      if (recorder.state === "recording") recorder.stop();
      else resolve(null);
    });

    this.cleanup();
    if (!blob || blob.size < 200) return null;
    return { blob, mimeType: this.mimeType };
  }

  cancel(): void {
    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        this.recorder.stop();
      }
    } catch {
      /* ignore */
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.recorder = null;
    this.chunks = [];
    if (this.media) {
      for (const track of this.media.getTracks()) track.stop();
      this.media = null;
    }
  }
}

export function playBase64Audio(
  base64: string,
  mimeType: string
): { audio: HTMLAudioElement; stop: () => void; play: () => Promise<void> } {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType || "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = getVoiceVolume();
  const untrack = trackHmMedia(audio, "voice");
  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    URL.revokeObjectURL(url);
    untrack();
  };
  audio.onended = () => URL.revokeObjectURL(url);
  const play = async () => {
    audio.volume = getVoiceVolume();
    await audio.play();
  };
  return { audio, stop, play };
}

type CompanionVoiceId = "fenna" | "maarten" | "peter" | "colette";

function pickBrowserVoice(
  companionId: CompanionVoiceId,
  locale: string
): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  const langPrefix = (locale || "nl-NL").split("-")[0]?.toLowerCase() || "nl";
  const localeVoices = voices.filter((v) =>
    v.lang?.toLowerCase().startsWith(langPrefix)
  );
  // Never fall back to English voices for Dutch — sounds like gibberish.
  if (!localeVoices.length) return undefined;

  const maleRe =
    /(male|man\b|mannen|frank|david|mark|ruben|xander|maarten|peter)/i;
  const femaleRe =
    /(female|vrouw|woman|fenna|colette|lotte|laura|helena|claire|anna|elsa)/i;

  const wantFemale = companionId === "fenna" || companionId === "colette";
  const wantMale = companionId === "maarten" || companionId === "peter";

  if (wantFemale) {
    const females = localeVoices.filter(
      (v) => femaleRe.test(v.name) && !maleRe.test(v.name)
    );
    // Never use a male NL voice for Fenna/Colette (Windows often lists Frank first).
    if (females.length) return females[0];
    return undefined;
  }

  if (wantMale) {
    const males = localeVoices.filter(
      (v) => maleRe.test(v.name) && !femaleRe.test(v.name)
    );
    if (males.length) return males[0];
    // Prefer silence over a female voice for Maarten/Peter
    return undefined;
  }

  return undefined;
}

/** Browser TTS fallback — only same-language voices (no English-on-Dutch). */
export function speakBrowserFallback(
  text: string,
  locale: string,
  companionId: CompanionVoiceId = "fenna",
  onDone?: () => void
): () => void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return () => undefined;
  }

  let cancelled = false;
  const speak = () => {
    if (cancelled) return;
    window.speechSynthesis.cancel();
    const voice = pickBrowserVoice(companionId, locale);
    if (!voice) {
      onDone?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voice.lang || locale || "nl-NL";
    utter.voice = voice;
    utter.rate = 0.9;
    utter.volume = getVoiceVolume();
    utter.pitch =
      companionId === "peter"
        ? 0.72
        : companionId === "maarten"
          ? 0.88
          : companionId === "colette"
            ? 1.05
            : 1.05;
    utter.onend = () => {
      if (!cancelled) onDone?.();
    };
    utter.onerror = () => {
      if (!cancelled) onDone?.();
    };
    window.speechSynthesis.speak(utter);
  };

  if (window.speechSynthesis.getVoices().length) {
    speak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      speak();
    };
    window.setTimeout(() => {
      if (!cancelled && window.speechSynthesis.getVoices().length) speak();
      else if (!cancelled) onDone?.();
    }, 400);
  }

  return () => {
    cancelled = true;
    window.speechSynthesis.cancel();
  };
}

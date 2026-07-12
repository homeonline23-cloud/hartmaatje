import { voiceLog } from "@/lib/fenna-voice/voiceLogger";

let currentAudio: HTMLAudioElement | null = null;
let playGeneration = 0;
let audioUnlocked = false;
let playing = false;

/** Call on user click before playing — unlocks browser audio. */
export async function unlockAudioPlayback(): Promise<void> {
  if (audioUnlocked || typeof window === "undefined") return;
  try {
    const silent = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==",
    );
    silent.volume = 0.01;
    await silent.play();
    silent.pause();
    audioUnlocked = true;
  } catch {
    /* retry on play */
  }
}

/** Stop Fenna mid-sentence — only when the user starts speaking again. */
export function interruptFennaAudio(reason = "user interrupt"): void {
  if (!playing && !currentAudio) return;
  voiceLog("TTS interrupt", { reason });
  playGeneration += 1;
  if (currentAudio) {
    currentAudio.pause();
    if (currentAudio.src.startsWith("blob:")) {
      URL.revokeObjectURL(currentAudio.src);
    }
    currentAudio.currentTime = 0;
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  playing = false;
}

/** @deprecated Use interruptFennaAudio — kept for imports that mean user interrupt. */
export function stopFennaAudio(): void {
  interruptFennaAudio("stopFennaAudio");
}

export function isFennaAudioPlaying(): boolean {
  return playing;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function playFennaAudio(
  audioBase64: string,
  mimeType: string,
  playbackRate = 1,
  shouldContinue?: () => boolean,
): Promise<void> {
  if (shouldContinue && !shouldContinue()) return;
  if (!audioBase64?.trim()) return;

  await unlockAudioPlayback();

  const gen = ++playGeneration;
  const prepared = prepareAudio(audioBase64, mimeType);
  const bytes = base64ToBytes(prepared.data);
  const blob = new Blob([Uint8Array.from(bytes)], { type: prepared.mime });
  const url = URL.createObjectURL(blob);

  const audio = new Audio();
  audio.src = url;
  audio.preload = "auto";
  audio.volume = 1;
  audio.playbackRate = Math.min(1.15, Math.max(0.75, playbackRate));
  currentAudio = audio;
  playing = true;
  voiceLog("TTS start", { mime: prepared.mime, bytes: bytes.length });

  try {
    await new Promise<void>((resolve, reject) => {
      const done = () => {
        if (gen !== playGeneration) return;
        if (shouldContinue && !shouldContinue()) {
          playing = false;
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
          resolve();
          return;
        }
        voiceLog("TTS end (finished naturally)");
        playing = false;
        if (currentAudio === audio) currentAudio = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      const fail = (err?: unknown) => {
        if (gen !== playGeneration) return;
        voiceLog("TTS error", {
          error: err instanceof Error ? err.message : String(err),
        });
        playing = false;
        if (currentAudio === audio) currentAudio = null;
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error("Afspelen mislukt."));
      };

      const timer = window.setTimeout(() => {
        audio.pause();
        done();
      }, 90_000);

      let started = false;
      const startPlay = () => {
        if (started || gen !== playGeneration) return;
        if (shouldContinue && !shouldContinue()) {
          window.clearTimeout(timer);
          done();
          return;
        }
        started = true;
        void audio.play().then(() => {
          audioUnlocked = true;
        }).catch(fail);
      };

      audio.onended = () => {
        window.clearTimeout(timer);
        done();
      };
      audio.onerror = () => {
        window.clearTimeout(timer);
        fail(new Error("Afspelen mislukt."));
      };

      audio.addEventListener(
        "canplay",
        () => {
          startPlay();
        },
        { once: true },
      );
      audio.load();
      window.setTimeout(startPlay, 120);
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function prepareAudio(
  base64: string,
  mimeType: string,
): { data: string; mime: string } {
  const mime = mimeType || "audio/wav";
  if (mime.includes("pcm") || mime.includes("L16")) {
    const rateMatch = mime.match(/rate=(\d+)/i);
    const rate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    return { data: pcmToWavBase64(base64, rate), mime: "audio/wav" };
  }
  if (mime.includes("wav")) {
    return { data: base64, mime: "audio/wav" };
  }
  return { data: base64, mime: mime.includes("mpeg") || mime.includes("mp3") ? mime : "audio/wav" };
}

function pcmToWavBase64(pcmB64: string, sampleRate: number): string {
  const binary = atob(pcmB64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, byteLength, true);
  const pcm = new Uint8Array(buffer, 44);
  for (let i = 0; i < byteLength; i++) pcm[i] = binary.charCodeAt(i);
  const out = new Uint8Array(buffer);
  let wav = "";
  for (let i = 0; i < out.length; i++) wav += String.fromCharCode(out[i]);
  return btoa(wav);
}

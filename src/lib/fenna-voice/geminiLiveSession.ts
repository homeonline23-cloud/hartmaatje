import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai/web";
import type { AppLang } from "@/lib/hartmaatje-api/client";
import { FENNA_LIVE_MODELS } from "@/lib/fenna-voice/fennaLivePrompt";
import { speakFennaLine } from "@/lib/fenna-voice/speakFennaLine";

export type LiveCallbacks = {
  onStatus?: (status: string) => void;
  onUserText?: (text: string) => void;
  onAssistantText?: (text: string) => void;
  onError?: (message: string) => void;
};

const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;
const SETUP_TIMEOUT_MS = 20_000;

function parseWsError(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string; code?: number } };
    if (j.error?.message) return j.error.message;
  } catch {
    /* plain text */
  }
  return raw || "Live-verbinding mislukt";
}

function downsample(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const length = Math.round(buffer.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), buffer.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += buffer[j]!;
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function floatToPcm16(float32: Float32Array): Uint8Array {
  const out = new Uint8Array(float32.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

class LivePcmPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  async playBase64Pcm(base64: string, mimeType?: string): Promise<void> {
    const rateMatch = mimeType?.match(/rate=(\d+)/i);
    const rate = rateMatch ? parseInt(rateMatch[1]!, 10) : OUTPUT_RATE;

    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: rate });
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();

    const binary = atob(base64);
    const samples = binary.length / 2;
    const buffer = this.ctx.createBuffer(1, samples, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const lo = binary.charCodeAt(i * 2);
      const hi = binary.charCodeAt(i * 2 + 1);
      let sample = (hi << 8) | lo;
      if (sample >= 0x8000) sample -= 0x10000;
      channel[i] = sample / 32768;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);

    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now;
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
  }

  interrupt(): void {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* ignore */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
  }

  stop(): void {
    this.interrupt();
    void this.ctx?.close();
    this.ctx = null;
  }
}

async function fetchToken(
  lang: AppLang,
  model?: string,
): Promise<{ token: string; model: string }> {
  const q = new URLSearchParams({ lang });
  if (model) q.set("model", model);
  const res = await fetch(`/api/gemini-live/token?${q}`);
  const data = (await res.json()) as {
    token?: string;
    model?: string;
    error?: string;
  };
  if (!res.ok || !data.token || !data.model) {
    throw new Error(data.error ?? "Live-token mislukt");
  }
  return { token: data.token, model: data.model };
}

function extractAudioParts(msg: LiveServerMessage): { data: string; mime?: string }[] {
  const out: { data: string; mime?: string }[] = [];
  const raw = msg as LiveServerMessage & { data?: string };

  if (typeof raw.data === "string" && raw.data) {
    out.push({ data: raw.data });
  }

  const parts = msg.serverContent?.modelTurn?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data && inline.mimeType?.includes("audio")) {
      out.push({ data: inline.data, mime: inline.mimeType });
    }
  }
  return out;
}

export class GeminiLiveSession {
  private session: Session | null = null;
  private micStream: MediaStream | null = null;
  private captureCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private player = new LivePcmPlayer();
  private active = false;
  private ready = false;
  private lang: AppLang = "nl";
  private callbacks: LiveCallbacks;
  private assistantBuffer = "";
  private nativeAudioThisTurn = false;
  private setupResolve: (() => void) | null = null;
  private setupReject: ((err: Error) => void) | null = null;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: LiveCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async start(lang: AppLang): Promise<void> {
    if (this.active) return;
    this.lang = lang;
    this.callbacks.onStatus?.("connecting");

    let lastErr: Error | null = null;
    for (const tryModel of FENNA_LIVE_MODELS) {
      try {
        await this.connectWithModel(tryModel);
        this.callbacks.onStatus?.("listening");
        return;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.cleanupConnection();
      }
    }
    throw lastErr ?? new Error("Gemini Live niet beschikbaar");
  }

  private async connectWithModel(model: string): Promise<void> {
    const { token, model: tokenModel } = await fetchToken(this.lang, model);

    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    const setupDone = new Promise<void>((resolve, reject) => {
      this.setupResolve = resolve;
      this.setupReject = reject;
      this.setupTimer = setTimeout(() => {
        reject(new Error("Live-verbinding timeout"));
      }, SETUP_TIMEOUT_MS);
    });

    this.session = await ai.live.connect({
      model: tokenModel,
      callbacks: {
        onopen: () => this.callbacks.onStatus?.("connecting"),
        onmessage: (msg: LiveServerMessage) => {
          if (msg.setupComplete && this.setupResolve) {
            clearTimeout(this.setupTimer!);
            this.ready = true;
            this.setupResolve();
            this.setupResolve = null;
            this.setupReject = null;
          }
          void this.handleMessage(msg);
        },
        onerror: (e: ErrorEvent) => {
          const msg = parseWsError(e.message || "WebSocket fout");
          this.setupReject?.(new Error(msg));
          this.callbacks.onError?.(msg);
        },
        onclose: (e: CloseEvent) => {
          if (!this.ready && this.setupReject) {
            this.setupReject(new Error(`Live gesloten (${e.code})`));
          } else if (this.active) {
            this.callbacks.onStatus?.("closed");
          }
        },
      },
    });

    await setupDone;
    this.active = true;
    await this.startMic();
    this.kickstartConversation();
  }

  private kickstartConversation(): void {
    const prompt =
      this.lang === "en"
        ? "Greet the user briefly as Fenna. One or two warm sentences."
        : "Begroet de gebruiker kort als Fenna. Eén of twee warme zinnen.";
    this.session?.sendClientContent({
      turns: [{ role: "user", parts: [{ text: prompt }] }],
      turnComplete: true,
    });
  }

  private async finishAssistantTurn(): Promise<void> {
    const text = this.assistantBuffer.trim();
    this.assistantBuffer = "";

    if (!text) return;
    this.callbacks.onAssistantText?.(text);

    if (!this.nativeAudioThisTurn) {
      this.callbacks.onStatus?.("speaking");
      try {
        await speakFennaLine(text, this.lang);
      } catch {
        /* TTS fallback failed — text still on screen */
      }
    }
    this.nativeAudioThisTurn = false;
    this.callbacks.onStatus?.("listening");
  }

  private async handleMessage(msg: LiveServerMessage): Promise<void> {
    if (msg.serverContent?.interrupted) {
      this.player.interrupt();
      this.assistantBuffer = "";
      this.nativeAudioThisTurn = false;
      this.callbacks.onStatus?.("listening");
    }

    const sc = msg.serverContent as
      | (typeof msg.serverContent & {
          inputTranscription?: { text?: string };
          outputTranscription?: { text?: string };
        })
      | undefined;

    if (sc?.inputTranscription?.text?.trim()) {
      this.callbacks.onUserText?.(sc.inputTranscription.text.trim());
    }

    if (sc?.outputTranscription?.text?.trim()) {
      this.assistantBuffer += sc.outputTranscription.text;
    }

    for (const part of sc?.modelTurn?.parts ?? []) {
      if (part.text?.trim()) {
        this.assistantBuffer += part.text;
      }
    }

    for (const chunk of extractAudioParts(msg)) {
      this.nativeAudioThisTurn = true;
      this.callbacks.onStatus?.("speaking");
      void this.player.playBase64Pcm(chunk.data, chunk.mime);
    }

    if (sc?.turnComplete) {
      await this.finishAssistantTurn();
    }
  }

  private async startMic(): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.captureCtx = new AudioContext();
    if (this.captureCtx.state === "suspended") {
      await this.captureCtx.resume();
    }

    const source = this.captureCtx.createMediaStreamSource(this.micStream);
    this.processor = this.captureCtx.createScriptProcessor(4096, 1, 1);
    const inputRate = this.captureCtx.sampleRate;
    const mute = this.captureCtx.createGain();
    mute.gain.value = 0;

    this.processor.onaudioprocess = (event) => {
      if (!this.active || !this.ready || !this.session) return;
      const input = event.inputBuffer.getChannelData(0);
      const down = downsample(input, inputRate, INPUT_RATE);
      const pcm = floatToPcm16(down);
      this.session.sendRealtimeInput({
        audio: {
          data: bytesToBase64(pcm),
          mimeType: `audio/pcm;rate=${INPUT_RATE}`,
        },
      });
    };

    source.connect(this.processor);
    this.processor.connect(mute);
    mute.connect(this.captureCtx.destination);
  }

  private cleanupConnection(): void {
    this.active = false;
    this.ready = false;
    if (this.setupTimer) clearTimeout(this.setupTimer);
    this.processor?.disconnect();
    this.processor = null;
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    void this.captureCtx?.close();
    this.captureCtx = null;
    this.session?.close();
    this.session = null;
    this.setupResolve = null;
    this.setupReject = null;
  }

  stop(): void {
    this.active = false;
    this.ready = false;
    this.player.stop();
    this.cleanupConnection();
    this.assistantBuffer = "";
    this.callbacks.onStatus?.("idle");
  }
}

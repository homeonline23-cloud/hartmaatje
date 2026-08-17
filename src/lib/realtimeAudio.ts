/**
 * Web Audio → OpenAI Realtime PCM uplink/downlink.
 *
 * Uplink: 24 kHz, 16-bit, mono PCM.
 * Prefer a 24 kHz AudioContext so frames need no resample.
 * Fallback: OfflineAudioContext native resampler (not custom linear).
 * Downlink playback: 24 kHz PCM16 from the model.
 */

import {
  REALTIME_INPUT_SAMPLE_RATE,
  REALTIME_OUTPUT_SAMPLE_RATE,
} from "@/lib/realtimeClient";

/** @deprecated use REALTIME_INPUT_SAMPLE_RATE */
export const REALTIME_SAMPLE_RATE = REALTIME_INPUT_SAMPLE_RATE;

/**
 * Browser-native resample via OfflineAudioContext at the target rate.
 */
async function nativeResampleToRate(
  input: Float32Array,
  inRate: number,
  outRate: number
): Promise<Float32Array> {
  if (input.length === 0) return input;
  if (inRate === outRate) return input;

  const durationSec = input.length / inRate;
  const outFrames = Math.max(1, Math.ceil(durationSec * outRate));
  const offline = new OfflineAudioContext(1, outFrames, outRate);

  const buffer = offline.createBuffer(1, input.length, inRate);
  // TS's lib.dom types pin copyToChannel to Float32Array<ArrayBuffer>; our
  // input can also come typed as the more general ArrayBufferLike variant
  // (e.g. from typed-array views), which is safe at runtime.
  buffer.copyToChannel(input as Float32Array<ArrayBuffer>, 0);

  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

/** Float32 [-1,1] → Int16 PCM (little-endian), aligned ArrayBuffer. */
export function floatTo16BitPCM(inputData: Float32Array): ArrayBuffer {
  const outputData = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    const s = inputData[i]!;
    outputData[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32768)));
  }
  const buf = new ArrayBuffer(outputData.byteLength);
  new Int16Array(buf).set(outputData);
  return buf;
}

/**
 * Senior-friendly mic prep for REAL use: tablet/laptop on a table,
 * person a couple of feet away — not speaking into the mic.
 * Boost quiet room speech hard; soft-limit peaks so loud talkers still OK.
 */
export function prepareMicSamplesForUplink(samples: Float32Array): Float32Array {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!;
    const a = Math.abs(v);
    sum += v * v;
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  // Only skip true empty frames (fan noise floor is higher than this)
  if (rms < 0.00025) return samples;

  // Aim for a solid speech level so VAD/Whisper hear table-distance talk
  const targetRms = 0.13;
  let gain = 1;
  if (rms < targetRms) {
    gain = Math.min(14, targetRms / rms); // distant / soft talkers
  } else if (rms > 0.2) {
    gain = Math.max(0.4, 0.15 / rms); // close/loud — tame without crushing
  }

  if (peak * gain > 0.95) {
    gain = Math.min(gain, 0.95 / Math.max(peak, 1e-6));
  }
  if (Math.abs(gain - 1) < 0.04) return samples;

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]! * gain;
    out[i] = Math.max(-0.98, Math.min(0.98, x));
  }
  return out;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const end = Math.min(i + chunk, bytes.length);
    binary += String.fromCharCode(...bytes.subarray(i, end));
  }
  return btoa(binary);
}

export function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const evenLen = binary.length - (binary.length % 2);
  if (evenLen <= 0) return new Int16Array(0);
  const aligned = new ArrayBuffer(evenLen);
  const bytes = new Uint8Array(aligned);
  for (let i = 0; i < evenLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(aligned);
}

/** Pack mono PCM16 into a WAV Blob (for Wav2Lip upload). */
export function pcm16ToWavBlob(
  samples: Int16Array,
  sampleRate = REALTIME_OUTPUT_SAMPLE_RATE
): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
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
  view.setUint32(40, dataSize, true);
  new Int16Array(buffer, 44).set(samples);
  return new Blob([buffer], { type: "audio/wav" });
}

export type PcmCaptureHandle = {
  stop: () => void;
  context: AudioContext;
};


/**
 * Mic → 24 kHz Int16 mono PCM for `input_audio_buffer.append`.
 * Prefers AudioContext({ sampleRate: 24000 }) so frames need no resample.
 * Falls back to OfflineAudioContext when the browser keeps another rate.
 */
export async function startPcmCapture(
  stream: MediaStream,
  onPcm: (
    pcm16: ArrayBuffer,
    rms: number,
    meta: { silent: boolean }
  ) => void
): Promise<PcmCaptureHandle> {
  for (const t of stream.getVideoTracks()) {
    t.stop();
    stream.removeTrack(t);
  }

  // Prefer 24 kHz context so ScriptProcessor already emits the right rate
  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: REALTIME_INPUT_SAMPLE_RATE });
  } catch {
    context = new AudioContext();
  }
  if (context.state === "suspended") {
    await context.resume();
  }

  const track = stream.getAudioTracks()[0];
  if (track && track.readyState === "live") {
    track.enabled = true;
  }

  const source = context.createMediaStreamSource(stream);
  // Fixed pre-gain: laptop/tablet on table, user ~1–2 m away (product reality)
  const preGain = context.createGain();
  preGain.gain.value = 5.0;
  const processor = context.createScriptProcessor(2048, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;

  source.connect(preGain);
  preGain.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);

  let logFrames = 0;
  let stopped = false;
  let resampleChain: Promise<void> = Promise.resolve();
  const needsResample = context.sampleRate !== REALTIME_INPUT_SAMPLE_RATE;
  const trackLabel = track?.label || "mic";

  console.log("[hm-pcm] capture started", {
    contextRate: context.sampleRate,
    targetRate: REALTIME_INPUT_SAMPLE_RATE,
    needsResample,
    track: trackLabel,
    tableDistancePregain: preGain.gain.value,
  });

  processor.onaudioprocess = (ev) => {
    if (stopped || context.state !== "running") return;

    const channel = ev.inputBuffer.getChannelData(0);

    // Fast path: context already at 24 kHz — no resample
    if (!needsResample) {
      logFrames = emitFrame(
        channel,
        context.sampleRate,
        trackLabel,
        logFrames,
        onPcm
      );
      return;
    }

    // Slow path: native OfflineAudioContext resample, ordered
    const inputData = new Float32Array(channel);
    const inRate = context.sampleRate;
    resampleChain = resampleChain
      .then(async () => {
        if (stopped) return;
        const at24k = await nativeResampleToRate(
          inputData,
          inRate,
          REALTIME_INPUT_SAMPLE_RATE
        );
        if (stopped) return;
        logFrames = emitFrame(
          at24k,
          inRate,
          trackLabel,
          logFrames,
          onPcm
        );
      })
      .catch((err) => {
        console.warn("[hm-pcm] native resample failed", err);
      });
  };

  return {
    context,
    stop: () => {
      stopped = true;
      try {
        processor.disconnect();
        preGain.disconnect();
        source.disconnect();
        mute.disconnect();
      } catch {
        /* ignore */
      }
      for (const t of stream.getTracks()) t.stop();
      void context.close();
    },
  };
}

function emitFrame(
  samples: Float32Array,
  inRate: number,
  trackLabel: string,
  logFrames: number,
  onPcm: (
    pcm16: ArrayBuffer,
    rms: number,
    meta: { silent: boolean }
  ) => void
): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!;
    sum += v * v;
  }
  const floatRms = Math.sqrt(sum / Math.max(1, samples.length));
  const displayRms = Math.min(100, floatRms * 220);
  const silent = floatRms < 0.0015;
  const pcm16 = floatTo16BitPCM(prepareMicSamplesForUplink(samples));

  const next = logFrames + 1;
  if (next <= 3 || next % 100 === 0) {
    console.log("[hm-pcm]", {
      nativeRate: inRate,
      outRate: REALTIME_INPUT_SAMPLE_RATE,
      samples: samples.length,
      bytes: pcm16.byteLength,
      floatRms: Math.round(floatRms * 1000) / 1000,
      silent,
      resampler:
        inRate === REALTIME_INPUT_SAMPLE_RATE
          ? "direct-24k"
          : "OfflineAudioContext",
      track: trackLabel,
    });
  }

  onPcm(pcm16, displayRms, { silent });
  return next;
}

/**
 * Gapless playback of Realtime PCM16 @ 24 kHz mono.
 * Hardware mute resumes only when this queue is completely empty (onIdle).
 */
export class PcmPlaybackQueue {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private playing = false;
  private sources: AudioBufferSourceNode[] = [];
  private onIdle: (() => void) | null = null;
  private onPlaying: (() => void) | null = null;
  /** Live speech energy 0..1 for continuous lip animation (streaming). */
  private onAmplitude: ((level: number) => void) | null = null;
  private ampSmooth = 0;
  private readonly pcmRate = REALTIME_OUTPUT_SAMPLE_RATE;
  private readonly jitterSec = 0.05;
  /** Collect AI speech PCM for lipsync (cleared each new utterance). */
  private recordChunks: Int16Array[] = [];
  private recording = false;

  constructor(_sampleRate = REALTIME_OUTPUT_SAMPLE_RATE) {
    void _sampleRate;
  }

  /** Start a fresh recording window (call when AI begins speaking). */
  beginUtteranceRecord() {
    this.recordChunks = [];
    this.recording = true;
  }

  /**
   * Peek recorded PCM without clearing (for early lipsync while still speaking).
   */
  peekUtterancePcm(maxSeconds = 8): Int16Array {
    if (!this.recordChunks.length) return new Int16Array(0);
    let total = 0;
    for (const c of this.recordChunks) total += c.length;
    const maxSamples = Math.floor(this.pcmRate * maxSeconds);
    const out = new Int16Array(Math.min(total, maxSamples));
    let offset = 0;
    for (const c of this.recordChunks) {
      if (offset >= out.length) break;
      const n = Math.min(c.length, out.length - offset);
      out.set(c.subarray(0, n), offset);
      offset += n;
    }
    return out;
  }

  /** Seconds currently buffered for lipsync. */
  get recordedSeconds(): number {
    let total = 0;
    for (const c of this.recordChunks) total += c.length;
    return total / this.pcmRate;
  }

  /**
   * Take recorded PCM for the current/last utterance and clear the buffer.
   * Caps length to maxSeconds to keep Wav2Lip CPU time sane.
   */
  takeUtterancePcm(maxSeconds = 8): Int16Array {
    this.recording = false;
    if (!this.recordChunks.length) return new Int16Array(0);
    let total = 0;
    for (const c of this.recordChunks) total += c.length;
    const maxSamples = Math.floor(this.pcmRate * maxSeconds);
    const out = new Int16Array(Math.min(total, maxSamples));
    let offset = 0;
    for (const c of this.recordChunks) {
      if (offset >= out.length) break;
      const n = Math.min(c.length, out.length - offset);
      out.set(c.subarray(0, n), offset);
      offset += n;
    }
    this.recordChunks = [];
    return out;
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext({ sampleRate: this.pcmRate });
      this.nextTime = 0;
      if (this.ctx.sampleRate !== this.pcmRate) {
        console.warn(
          "[hm-pcm-out] AudioContext sampleRate mismatch",
          this.ctx.sampleRate,
          "expected",
          this.pcmRate
        );
      }
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  setOnIdle(cb: (() => void) | null) {
    this.onIdle = cb;
  }

  setOnPlaying(cb: (() => void) | null) {
    this.onPlaying = cb;
  }

  /** Continuous amplitude while AI audio streams (for live lip motion). */
  setOnAmplitude(cb: ((level: number) => void) | null) {
    this.onAmplitude = cb;
  }

  get isPlaying() {
    return this.playing;
  }

  get queueEmpty() {
    return this.sources.length === 0 && !this.playing;
  }

  async enqueueBase64Pcm16(b64: string): Promise<void> {
    if (!b64) return;
    const ctx = await this.ensureContext();
    const samples = base64ToInt16(b64);
    if (!samples.length) return;

    if (this.recording) {
      // Cap in-flight record ~12s so memory stays bounded
      let have = 0;
      for (const c of this.recordChunks) have += c.length;
      if (have < this.pcmRate * 12) {
        this.recordChunks.push(samples.slice());
      }
    }

    const float = new Float32Array(samples.length);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const f = s < 0 ? s / 0x8000 : s / 0x7fff;
      float[i] = f;
      sum += f * f;
    }
    const rms = Math.sqrt(sum / Math.max(1, float.length));
    // Map to 0..1 for mouth open; smooth so lips don't jitter
    const raw = Math.min(1, rms * 9);
    this.ampSmooth = this.ampSmooth * 0.55 + raw * 0.45;
    this.onAmplitude?.(this.ampSmooth);

    const buffer = ctx.createBuffer(1, float.length, this.pcmRate);
    buffer.copyToChannel(float, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + this.jitterSec, this.nextTime);
    this.nextTime = startAt + buffer.duration;
    const wasIdle = !this.playing;
    this.playing = true;
    this.sources.push(source);
    if (wasIdle) {
      this.beginUtteranceRecord();
      // Re-append this first chunk (begin cleared buffer)
      this.recordChunks.push(samples.slice());
      this.onPlaying?.();
    }

    source.onended = () => {
      this.sources = this.sources.filter((s) => s !== source);
      if (this.sources.length === 0) {
        this.playing = false;
        this.nextTime = ctx.currentTime;
        this.ampSmooth = 0;
        this.onAmplitude?.(0);
        this.onIdle?.();
      }
    };

    try {
      source.start(startAt);
    } catch {
      this.sources = this.sources.filter((s) => s !== source);
      if (this.sources.length === 0) {
        this.playing = false;
        this.ampSmooth = 0;
        this.onAmplitude?.(0);
        this.onIdle?.();
      }
    }
  }

  stop() {
    for (const s of this.sources) {
      try {
        s.stop(0);
        s.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.sources = [];
    this.playing = false;
    if (this.ctx && this.ctx.state !== "closed") {
      this.nextTime = this.ctx.currentTime;
    } else {
      this.nextTime = 0;
    }
  }

  async dispose() {
    this.stop();
    if (this.ctx && this.ctx.state !== "closed") {
      await this.ctx.close().catch(() => undefined);
    }
    this.ctx = null;
  }
}

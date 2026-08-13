"use client";

type ContinuousListenerOptions = {
  onUtterance: (blob: Blob, mimeType: string) => Promise<void>;
  onUserStartsSpeaking?: () => void;
  onListeningChange?: (live: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
  onMicLevel?: (level: number) => void;
};

const TURN_END_SILENCE_MS = 1400;
const TURN_END_SILENCE_LONG_MS = 2200;
const TURN_LONG_SPEECH_MS = 900;

function silenceNeededBeforeTurnEnd(speechMs: number): number {
  if (speechMs >= TURN_LONG_SPEECH_MS) return TURN_END_SILENCE_LONG_MS;
  return TURN_END_SILENCE_MS;
}

function pickMimeType(): string {
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return preferred.find((m) => MediaRecorder.isTypeSupported(m)) || "audio/webm";
}

/**
 * Always-on microphone until stop().
 * Analyser runs continuously for VAD; MediaRecorder starts per utterance
 * so each blob is a complete WebM/Opus file (with header). Timesliced
 * capture while ignoring pre-speech chunks drops the header and STT fails.
 * Resident must press Sluit gesprek to turn mic off.
 */
export class ContinuousListener {
  private onUtterance: (blob: Blob, mimeType: string) => Promise<void>;
  private onUserStartsSpeaking?: () => void;
  private onListeningChange?: (live: boolean) => void;
  private onSpeakingChange?: (speaking: boolean) => void;
  private onMicLevel?: (level: number) => void;

  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private mimeType = "audio/webm";

  private active = false;
  private paused = false;
  private busy = false;
  private userSpeaking = false;
  private speechStartedAt = 0;
  private silenceStartedAt = 0;
  private quietTicks = 0;
  private loudTicks = 0;
  private vadTimer: ReturnType<typeof setInterval> | null = null;
  private ignoreUntil = 0;
  private baselineRms = 0.4;
  private calibrationTicks = 0;
  private segmentPeakVol = 0;

  private readonly tickMs = 80;
  private readonly minSpeechMs = 400;
  private readonly quietTicksBeforeSilence = 3;
  private readonly loudTicksToStart = 2;
  private readonly maxSegmentMs = 15_000;
  private readonly minBytes = 1800;

  constructor(opts: ContinuousListenerOptions) {
    this.onUtterance = opts.onUtterance;
    this.onUserStartsSpeaking = opts.onUserStartsSpeaking;
    this.onListeningChange = opts.onListeningChange;
    this.onSpeakingChange = opts.onSpeakingChange;
    this.onMicLevel = opts.onMicLevel;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  async start(existingStream?: MediaStream): Promise<void> {
    if (this.active) return;

    try {
      // Product reality: laptop/tablet on a table, senior speaking from a
      // short distance — NEVER require headphones. Default device mic only.
      // AGC lifts quiet speech; echoCancellation lets the YouTube speakers
      // stay on without the mic eating its own output. noiseSuppression OFF
      // (it eats consonants and soft senior voices).
      this.stream =
        existingStream ??
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: { ideal: 1 },
            sampleRate: { ideal: 48000 },
          },
          video: false,
        }));

      for (const track of this.stream.getAudioTracks()) {
        track.enabled = true;
      }

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new Ctx();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      this.mimeType = pickMimeType();
      this.active = true;
      this.paused = false;
      this.busy = false;
      this.userSpeaking = false;
      this.calibrationTicks = 0;
      this.baselineRms = 0.4;
      this.ignoreUntil = Date.now() + 400;
      this.onListeningChange?.(true);

      this.vadTimer = setInterval(() => this.tick(), this.tickMs);
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  stop(): void {
    this.active = false;
    this.paused = false;
    this.busy = false;
    this.userSpeaking = false;
    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
    this.abortRecorder();
    this.chunks = [];
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.onListeningChange?.(false);
    this.onSpeakingChange?.(false);
  }

  /** Companion talking — mute input so speakers aren't re-heard as a second voice. */
  pauseForPlayback(ms = 0): void {
    this.paused = true;
    if (this.userSpeaking) {
      this.userSpeaking = false;
      this.onSpeakingChange?.(false);
    }
    this.abortRecorder();
    this.chunks = [];
    for (const track of this.stream?.getAudioTracks() ?? []) {
      track.enabled = false;
    }
    if (ms > 0) this.ignoreUntil = Date.now() + ms;
  }

  /** Back to listening — unmute after echo dies down. */
  resumeAfterPlayback(echoGuardMs = 1800): void {
    if (!this.active) return;
    if (this.audioContext?.state === "suspended") {
      void this.audioContext.resume();
    }
    for (const track of this.stream?.getAudioTracks() ?? []) {
      track.enabled = true;
    }
    this.paused = false;
    this.busy = false;
    this.ignoreUntil = Date.now() + echoGuardMs;
    this.userSpeaking = false;
    this.quietTicks = 0;
    this.loudTicks = 0;
    this.silenceStartedAt = 0;
    this.segmentPeakVol = 0;
    this.chunks = [];
    // Keep baseline — do NOT full recalibrate (causes 1s “deaf” window)
    this.calibrationTicks = Math.min(this.calibrationTicks, 4);
    this.onListeningChange?.(true);
  }

  private rms(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length) * 100;
  }

  private tick(): void {
    if (!this.active) return;

    const vol = this.rms();
    this.onMicLevel?.(vol);

    if (this.busy || this.paused) return;
    const now = Date.now();
    if (now < this.ignoreUntil) return;

    if (this.calibrationTicks < 10) {
      this.baselineRms =
        (this.baselineRms * this.calibrationTicks + vol) /
        (this.calibrationTicks + 1);
      this.calibrationTicks += 1;
      return;
    }

    // Need a rise above room noise — loosened so a soft-spoken senior a bit
    // further from the mic still triggers the turn, not just a loud/close voice.
    const startTh = Math.max(0.55, this.baselineRms * 1.35 + 0.25);
    const continueTh = Math.max(
      0.25,
      this.baselineRms * 1.05 + 0.15,
      this.segmentPeakVol * 0.15,
      startTh * 0.3
    );

    if (!this.userSpeaking) {
      if (vol >= startTh) {
        this.loudTicks += 1;
        if (this.loudTicks >= this.loudTicksToStart) {
          this.beginUtterance();
        }
      } else {
        this.loudTicks = 0;
      }
      return;
    }

    // Hard cap — ambient noise must not keep "Ik hoor u" forever
    const spokenMs = now - this.speechStartedAt;
    if (spokenMs >= this.maxSegmentMs) {
      console.log("[hm-vad] end-of-speech (max segment)", {
        spokenMs,
        peak: this.segmentPeakVol,
      });
      void this.endUtterance();
      return;
    }

    if (vol >= continueTh) {
      this.segmentPeakVol = Math.max(this.segmentPeakVol, vol);
      this.quietTicks = 0;
      this.silenceStartedAt = 0;
      return;
    }

    this.quietTicks += 1;
    if (this.quietTicks < this.quietTicksBeforeSilence) return;
    if (!this.silenceStartedAt) this.silenceStartedAt = now;

    const silenceMs = now - this.silenceStartedAt;

    if (spokenMs < this.minSpeechMs) {
      if (silenceMs >= silenceNeededBeforeTurnEnd(spokenMs)) {
        // Short noise — discard, stay listening
        console.log("[hm-vad] end-of-speech (discard short)", {
          spokenMs,
          silenceMs,
          peak: this.segmentPeakVol,
          baseline: this.baselineRms,
        });
        this.userSpeaking = false;
        this.abortRecorder();
        this.chunks = [];
        this.quietTicks = 0;
        this.loudTicks = 0;
        this.silenceStartedAt = 0;
        this.segmentPeakVol = 0;
        this.onSpeakingChange?.(false);
      }
      return;
    }

    if (silenceMs >= silenceNeededBeforeTurnEnd(spokenMs)) {
      console.log("[hm-vad] end-of-speech (finalize turn)", {
        spokenMs,
        silenceMs,
        peak: this.segmentPeakVol,
        baseline: this.baselineRms,
        startTh,
        continueTh,
      });
      void this.endUtterance();
    }
  }

  private beginUtterance(): void {
    if (!this.active || this.userSpeaking || this.busy || this.paused) return;
    if (!this.stream) return;

    this.userSpeaking = true;
    this.speechStartedAt = Date.now();
    this.quietTicks = 0;
    this.loudTicks = 0;
    this.silenceStartedAt = 0;
    this.segmentPeakVol = 0;
    this.chunks = [];
    this.onUserStartsSpeaking?.();
    this.onSpeakingChange?.(true);
    console.log("[hm-vad] speech start", {
      baseline: this.baselineRms,
      mime: this.mimeType,
    });

    try {
      this.abortRecorder();
      this.mimeType = pickMimeType();
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: this.mimeType,
        });
      } catch {
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mimeType = this.mediaRecorder.mimeType || "audio/webm";
      }
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      // No timeslice: one complete container with header when we stop()
      this.mediaRecorder.start();
    } catch {
      this.userSpeaking = false;
      this.onSpeakingChange?.(false);
    }
  }

  private async endUtterance(): Promise<void> {
    if (!this.userSpeaking || this.busy) return;
    this.busy = true;
    this.userSpeaking = false;
    this.silenceStartedAt = 0;
    const peak = this.segmentPeakVol;
    this.segmentPeakVol = 0;
    this.onSpeakingChange?.(false);

    // Weak peak = room noise / PC fan — do not waste a voice-turn
    // (loosened to still accept a genuinely soft/distant voice)
    const minPeak = Math.max(0.7, this.baselineRms * 1.45);
    if (peak < minPeak) {
      console.log("[hm-vad] discard weak peak", { peak, minPeak, baseline: this.baselineRms });
      this.busy = false;
      this.abortRecorder();
      this.chunks = [];
      return;
    }

    const blob = await this.stopRecorderToBlob();

    if (!blob || blob.size < this.minBytes) {
      console.log("[hm-vad] discard tiny blob", {
        size: blob?.size ?? 0,
        minBytes: this.minBytes,
      });
      this.busy = false;
      this.chunks = [];
      return;
    }

    console.log("[hm-vad] sending utterance to STT", {
      bytes: blob.size,
      mime: this.mimeType,
      peak,
    });
    try {
      await this.onUtterance(blob, this.mimeType);
    } finally {
      this.busy = false;
      this.quietTicks = 0;
      this.loudTicks = 0;
      this.chunks = [];
    }
  }

  private abortRecorder(): void {
    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;
    if (!recorder) return;
    try {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* ignore */
    }
  }

  private stopRecorderToBlob(): Promise<Blob | null> {
    const recorder = this.mediaRecorder;
    this.mediaRecorder = null;
    if (!recorder || recorder.state === "inactive") {
      if (!this.chunks.length) return Promise.resolve(null);
      return Promise.resolve(new Blob(this.chunks, { type: this.mimeType }));
    }
    return new Promise((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      recorder.onstop = () => {
        resolve(
          this.chunks.length
            ? new Blob(this.chunks, { type: this.mimeType })
            : null
        );
      };
      try {
        recorder.stop();
      } catch {
        resolve(
          this.chunks.length
            ? new Blob(this.chunks, { type: this.mimeType })
            : null
        );
      }
    });
  }
}

export function isCloseChatPhrase(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const phrases = [
    "sluit gesprek",
    "stop gesprek",
    "einde gesprek",
    "close chat",
    "end chat",
    "stop chatting",
    "gesprach beenden",
    "chat beenden",
    "fermer la conversation",
    "cerrar chat",
    "cerrar conversacion",
  ];
  return phrases.some((p) => normalized.includes(p));
}

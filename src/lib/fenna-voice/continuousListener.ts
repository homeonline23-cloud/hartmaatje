/**
 * Microphone stays ON after one tap to start the session.
 * Turn-end: silence after you stop (~1.3 s, longer if still mid-thought) → send to STT. Max 28 s per turn.
 */

import {
  TURN_LOUD_TICKS_TO_START,
  TURN_MAX_SEGMENT_MS,
  TURN_MIN_AUDIO_BYTES,
  TURN_MIN_SPEECH_MS,
  TURN_QUIET_TICKS_BEFORE_SILENCE,
  TURN_SEGMENT_PEAK_RATIO,
  silenceNeededBeforeTurnEnd,
} from "@/lib/fenna-voice/turnTiming";
import {
  readAnalyserVolume,
  requestMicrophoneStream,
} from "@/lib/fenna-voice/micAccess";
import type { AppLang } from "@/lib/languages";
import { voiceLog } from "@/lib/fenna-voice/voiceLogger";

type ListenerOptions = {
  lang?: AppLang;
  onUtterance: (blob: Blob) => Promise<void>;
  /** User started talking — use to interrupt Fenna TTS only. */
  onUserStartsSpeaking?: () => void;
  /** Mic live but user silent — companion may gently initiate. */
  onListenSilence?: () => void;
  /** Ms of listening silence before onListenSilence (default 55 s). */
  listenSilenceMs?: number;
  onListeningChange?: (live: boolean) => void;
  onRecordingChange?: (recording: boolean) => void;
  /** Live mic level 0–100 for UI feedback. */
  onMicLevel?: (level: number) => void;
  /** No audio detected after listening started — likely Windows/driver issue. */
  onMicNoSignal?: () => void;
};

export class ContinuousListener {
  private onUtterance: (blob: Blob) => Promise<void>;
  private onUserStartsSpeaking?: () => void;
  private onListenSilence?: () => void;
  private listenSilenceMs: number;
  private onListeningChange?: (live: boolean) => void;
  private onRecordingChange?: (recording: boolean) => void;
  private onMicLevel?: (level: number) => void;
  private onMicNoSignal?: () => void;
  private lang: AppLang;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private active = false;
  private paused = false;
  private userSpeaking = false;
  private speechStartedAt = 0;
  private silenceStartedAt = 0;
  private vadTimer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  private minSpeechMs = TURN_MIN_SPEECH_MS;
  /** Volume to start detecting speech. */
  private volumeThresholdStart = 1.1;
  /** Lower bar while already speaking — tolerates pauses between words. */
  private volumeThresholdContinue = 0.5;
  private tickMs = 80;
  private baselineRms = 0;
  private calibrationTicks = 0;
  private calibrationTarget = 8;
  private listenTicks = 0;
  private peakLevelSinceResume = 0;
  private noSignalFired = false;
  private listeningSince = 0;
  private listenSilenceFired = false;
  private quietTicksWhileSpeaking = 0;
  private loudTicksToStart = 0;
  private segmentPeakVol = 0;

  constructor(opts: ListenerOptions) {
    this.lang = opts.lang ?? "nl";
    this.onUtterance = opts.onUtterance;
    this.onUserStartsSpeaking = opts.onUserStartsSpeaking;
    this.onListenSilence = opts.onListenSilence;
    this.listenSilenceMs = opts.listenSilenceMs ?? 55_000;
    this.onListeningChange = opts.onListeningChange;
    this.onRecordingChange = opts.onRecordingChange;
    this.onMicLevel = opts.onMicLevel;
    this.onMicNoSignal = opts.onMicNoSignal;
  }

  async start(): Promise<void> {
    if (this.active) return;
    voiceLog("microphone start — continuous listen mode");

    this.stream = await requestMicrophoneStream(this.lang);

    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) throw new Error("Audio niet ondersteund.");

    this.audioContext = new Ctx();
    if (this.audioContext.state === "suspended") await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.active = true;
    this.paused = false;
    this.listeningSince = Date.now();
    this.listenSilenceFired = false;
    this.emitListening(true);
    this.vadTimer = setInterval(() => this.vadTick(), this.tickMs);
  }

  pause(): void {
    this.paused = true;
    this.cancelSegment();
    this.emitListening(false);
    voiceLog("microphone paused (Fenna speaking or thinking)");
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.userSpeaking = false;
    this.silenceStartedAt = 0;
    this.quietTicksWhileSpeaking = 0;
    this.loudTicksToStart = 0;
    this.segmentPeakVol = 0;
    this.listenTicks = 0;
    this.peakLevelSinceResume = 0;
    this.noSignalFired = false;
    this.listeningSince = Date.now();
    this.listenSilenceFired = false;
    if (this.audioContext?.state === "suspended") void this.audioContext.resume();
    this.emitListening(true);
    voiceLog("microphone resumed — listening again");
  }

  stop(): void {
    if (!this.active) return;
    voiceLog("microphone stop — session ended");
    this.active = false;
    this.paused = true;
    if (this.vadTimer) clearInterval(this.vadTimer);
    this.vadTimer = null;
    this.cancelSegment();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.audioContext?.close();
    this.audioContext = null;
    this.emitListening(false);
    this.emitRecording(false);
  }

  get isCapturing(): boolean {
    return this.userSpeaking || this.mediaRecorder?.state === "recording";
  }

  private emitListening(on: boolean): void {
    this.onListeningChange?.(on && !this.paused);
  }

  private emitRecording(on: boolean): void {
    this.onRecordingChange?.(on);
  }

  private volumeRms(): number {
    if (!this.analyser) return 0;
    return readAnalyserVolume(this.analyser);
  }

  private vadTick(): void {
    if (!this.active || this.paused || this.busy) return;

    const now = Date.now();
    const vol = this.volumeRms();
    this.onMicLevel?.(vol);

    if (!this.paused && this.calibrationTicks >= this.calibrationTarget) {
      this.listenTicks++;
      if (vol > this.peakLevelSinceResume) this.peakLevelSinceResume = vol;
      // ~4 s of listening with near-zero input → warn user (Windows mic issue).
      if (
        !this.noSignalFired &&
        this.listenTicks > 50 &&
        this.peakLevelSinceResume < 0.35
      ) {
        this.noSignalFired = true;
        voiceLog("no microphone signal detected", {
          peak: this.peakLevelSinceResume,
        });
        this.onMicNoSignal?.();
      }
    }

    if (this.calibrationTicks < this.calibrationTarget) {
      this.baselineRms =
        (this.baselineRms * this.calibrationTicks + vol) / (this.calibrationTicks + 1);
      this.calibrationTicks++;
      return;
    }

    const enterThreshold = Math.max(
      this.volumeThresholdStart,
      this.baselineRms * 2.4,
    );
    const speechFloor = Math.max(
      this.volumeThresholdContinue,
      this.baselineRms * 1.5,
    );
    const activeThreshold = this.userSpeaking
      ? Math.max(
          speechFloor,
          this.segmentPeakVol * TURN_SEGMENT_PEAK_RATIO,
          enterThreshold * 0.45,
        )
      : enterThreshold;
    const loud = vol >= activeThreshold;

    if (this.userSpeaking && loud) {
      this.segmentPeakVol = Math.max(this.segmentPeakVol, vol);
    }

    if (loud) {
      if (!this.userSpeaking) {
        this.loudTicksToStart += 1;
        if (this.loudTicksToStart < TURN_LOUD_TICKS_TO_START) return;

        voiceLog("user speech detected — recording segment");
        this.listenSilenceFired = false;
        this.listeningSince = now;
        this.onUserStartsSpeaking?.();
        this.userSpeaking = true;
        this.speechStartedAt = now;
        this.quietTicksWhileSpeaking = 0;
        this.segmentPeakVol = vol;
        this.emitRecording(true);
        this.startSegment();
      }
      this.silenceStartedAt = 0;
      this.quietTicksWhileSpeaking = 0;
      return;
    }

    this.loudTicksToStart = 0;

    if (!this.userSpeaking) {
      if (
        this.onListenSilence &&
        !this.listenSilenceFired &&
        this.listeningSince > 0 &&
        now - this.listeningSince >= this.listenSilenceMs
      ) {
        this.listenSilenceFired = true;
        voiceLog("listen silence — companion initiative cue");
        this.onListenSilence();
      }
      return;
    }

    const spokeMs = now - this.speechStartedAt;
    if (spokeMs >= TURN_MAX_SEGMENT_MS) {
      voiceLog("max segment duration — sending turn", { speechMs: spokeMs });
      this.userSpeaking = false;
      this.silenceStartedAt = 0;
      this.quietTicksWhileSpeaking = 0;
      this.segmentPeakVol = 0;
      this.emitRecording(false);
      void this.finishSegment();
      return;
    }

    if (!this.silenceStartedAt) {
      this.quietTicksWhileSpeaking += 1;
      if (this.quietTicksWhileSpeaking < TURN_QUIET_TICKS_BEFORE_SILENCE) {
        return;
      }
      this.silenceStartedAt = now;
      return;
    }

    const silenceDur = now - this.silenceStartedAt;
    const maxSegmentReached = false;

    if (spokeMs < this.minSpeechMs) {
      if (silenceDur >= silenceNeededBeforeTurnEnd(spokeMs)) {
        voiceLog("short noise discarded");
        this.userSpeaking = false;
        this.silenceStartedAt = 0;
        this.quietTicksWhileSpeaking = 0;
        this.emitRecording(false);
        this.cancelSegment();
      }
      return;
    }

    if (silenceDur >= silenceNeededBeforeTurnEnd(spokeMs)) {
      voiceLog("turn end detected — sending to STT", {
        silenceMs: silenceDur,
        speechMs: spokeMs,
        neededMs: silenceNeededBeforeTurnEnd(spokeMs),
        peakVol: Math.round(this.segmentPeakVol),
      });
      this.userSpeaking = false;
      this.silenceStartedAt = 0;
      this.quietTicksWhileSpeaking = 0;
      this.segmentPeakVol = 0;
      this.emitRecording(false);
      void this.finishSegment();
    }
  }

  private startSegment(): void {
    if (!this.stream || this.mediaRecorder?.state === "recording") return;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined,
    });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(250);
    voiceLog("MediaRecorder.start()");
  }

  private cancelSegment(): void {
    if (this.mediaRecorder?.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.emitRecording(false);
  }

  private async finishSegment(): Promise<void> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") return;

    const recorder = this.mediaRecorder;
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      try {
        if (recorder.state === "recording") recorder.requestData();
      } catch {
        /* ignore */
      }
      recorder.stop();
    });

    voiceLog("MediaRecorder.stop()", { bytes: blob.size });

    this.mediaRecorder = null;
    this.chunks = [];
    if (!this.active) return;

    if (!blob.size || blob.size < TURN_MIN_AUDIO_BYTES) {
      voiceLog("recording too small — not sent to STT", { bytes: blob.size });
      return;
    }

    this.busy = true;
    try {
      await this.onUtterance(blob);
    } finally {
      this.busy = false;
    }
  }
}

/**
 * Voice capture, continuous hands-free listening, and Fenna playback.
 * Mic stays open during the session; pauses while Fenna thinks or speaks.
 */

let currentAudio = null;

export function isContinuousListeningSupported() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia &&
    window.MediaRecorder &&
    (window.AudioContext || window.webkitAudioContext),
  );
}

export function stopFennaAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playFennaAudio(audioBase64, mimeType) {
  stopFennaAudio();
  const prepared = prepareAudio(audioBase64, mimeType);
  const audio = new Audio(`data:${prepared.mime};base64,${prepared.data}`);
  audio.playbackRate = 0.92;
  currentAudio = audio;

  await new Promise((resolve, reject) => {
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      reject(new Error("Afspelen mislukt."));
    };
    audio.play().catch(reject);
  });
}

/**
 * Hands-free listener: detects speech + silence, sends audio blobs.
 * Call pause() while Fenna speaks so she is not interrupted and mic ignores room audio.
 */
export class ContinuousListener {
  constructor({ onUtterance, onListeningChange }) {
    this.onUtterance = onUtterance;
    this.onListeningChange = onListeningChange;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.active = false;
    this.paused = false;
    this.userSpeaking = false;
    this.speechStartedAt = 0;
    this.silenceStartedAt = 0;
    this.vadTimer = null;
    this.processing = false;

    // ~2 seconden stilte = uw beurt is klaar
    this.silenceMs = 1200;
    this.minSpeechMs = 400;
    this.volumeThreshold = 3.2;
    this.tickMs = 120;
  }

  async start() {
    if (this.active) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.active = true;
    this.paused = false;
    this._emitListening(true);
    this.vadTimer = window.setInterval(() => this._vadTick(), this.tickMs);
  }

  pause() {
    this.paused = true;
    this._cancelSegment();
    this._emitListening(false);
  }

  resume() {
    if (!this.active) return;
    this.paused = false;
    this.userSpeaking = false;
    this.silenceStartedAt = 0;
    this._emitListening(true);
  }

  stop() {
    this.active = false;
    this.paused = true;
    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
    this._cancelSegment();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this._emitListening(false);
  }

  _emitListening(on) {
    this.onListeningChange?.(on && !this.paused);
  }

  _volumeRms() {
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

  _vadTick() {
    if (!this.active || this.paused || this.processing) return;

    const now = Date.now();
    const vol = this._volumeRms();
    const loud = vol >= this.volumeThreshold;

    if (loud) {
      if (!this.userSpeaking) {
        this.userSpeaking = true;
        this.speechStartedAt = now;
        this._startSegment();
      }
      this.silenceStartedAt = 0;
      return;
    }

    if (!this.userSpeaking) return;

    if (!this.silenceStartedAt) {
      this.silenceStartedAt = now;
      return;
    }

    if (now - this.silenceStartedAt < this.silenceMs) return;

    const spokeMs = now - this.speechStartedAt;
    this.userSpeaking = false;
    this.silenceStartedAt = 0;

    if (spokeMs >= this.minSpeechMs) {
      void this._finishSegment();
    } else {
      this._cancelSegment();
    }
  }

  _startSegment() {
    if (!this.stream || this.mediaRecorder?.state === "recording") return;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  _cancelSegment() {
    if (this.mediaRecorder?.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }

  async _finishSegment() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") return;

    const recorder = this.mediaRecorder;
    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(
          new Blob(this.chunks, {
            type: recorder.mimeType || "audio/webm",
          }),
        );
      };
      recorder.stop();
    });

    this.mediaRecorder = null;
    this.chunks = [];

    if (!blob.size || !this.active) return;

    this.processing = true;
    this.pause();

    try {
      await this.onUtterance(blob);
    } finally {
      this.processing = false;
      // onUtterance hervat de microfoon na Fenna's antwoord
    }
  }
}

export async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function prepareAudio(base64, mimeType) {
  if (mimeType.includes("pcm") || mimeType.includes("L16")) {
    const rateMatch = mimeType.match(/rate=(\d+)/i);
    const rate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    return { data: pcmToWavBase64(base64, rate), mime: "audio/wav" };
  }
  return { data: base64, mime: mimeType || "audio/mp3" };
}

function pcmToWavBase64(pcmB64, sampleRate) {
  const binary = atob(pcmB64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);
  const write = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
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

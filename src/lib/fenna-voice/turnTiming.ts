/** Client-side timing for voice-turn latency debugging. */

/** Pause after user stops talking, then send audio to STT. */
export const TURN_END_SILENCE_MS = 1300;

/** Extra wait when someone has been talking for a while — room to finish a thought. */
export const TURN_END_SILENCE_LONG_MS = 2200;

/** Speech longer than this uses TURN_END_SILENCE_LONG_MS before turn ends. */
export const TURN_LONG_SPEECH_MS = 1800;

/** Minimum speech length before we accept a turn (filters clicks/noise). */
export const TURN_MIN_SPEECH_MS = 500;

/** Quiet ticks (~80 ms each) before silence countdown starts — ignores brief pauses between words. */
export const TURN_QUIET_TICKS_BEFORE_SILENCE = 5;

/** Consecutive loud ticks before we start recording — ignores background clicks/noise. */
export const TURN_LOUD_TICKS_TO_START = 4;

/** Force-send if someone talks longer than this (prevents infinite recording). */
export const TURN_MAX_SEGMENT_MS = 28_000;

/** Volume below this fraction of the segment peak counts as silence. */
export const TURN_SEGMENT_PEAK_RATIO = 0.24;

/** Ignore recordings smaller than this — usually a failed mic capture. */
export const TURN_MIN_AUDIO_BYTES = 900;

/** How long to wait in silence before sending audio — longer utterances get more time. */
export function silenceNeededBeforeTurnEnd(speechMs: number): number {
  if (speechMs >= TURN_LONG_SPEECH_MS) return TURN_END_SILENCE_LONG_MS;
  return TURN_END_SILENCE_MS;
}

export type TurnTimings = {
  vadEndAt?: number;
  apiStartAt?: number;
  apiEndAt?: number;
  playbackStartAt?: number;
  backend?: Record<string, number>;
};

export function logTurnTimings(label: string, t: TurnTimings): void {
  const lines: string[] = [`[Fenna timing] ${label}`];
  if (t.vadEndAt && t.apiStartAt) {
    lines.push(`  utterance → API send: ${Math.round(t.apiStartAt - t.vadEndAt)}ms`);
  }
  if (t.apiStartAt && t.apiEndAt) {
    lines.push(`  API round-trip: ${Math.round(t.apiEndAt - t.apiStartAt)}ms`);
  }
  if (t.vadEndAt && t.playbackStartAt) {
    lines.push(
      `  user-stop → playback start: ${Math.round(t.playbackStartAt - t.vadEndAt)}ms`,
    );
  }
  if (t.backend && Object.keys(t.backend).length > 0) {
    lines.push(`  backend stages: ${JSON.stringify(t.backend)}`);
  }
  console.info(lines.join("\n"));
}

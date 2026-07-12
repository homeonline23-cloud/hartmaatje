import { interruptFennaAudio } from "@/lib/fenna-voice/playback";
import { stopBrowserSpeech } from "@/lib/voice/providers/browserProvider";

let sessionGeneration = 0;
let abortController: AbortController | null = null;

/** Start or replace the active companion voice session. */
export function beginCompanionVoiceSession(): number {
  endCompanionVoiceSession();
  sessionGeneration += 1;
  abortController = new AbortController();
  return sessionGeneration;
}

/** Stop mic, TTS, in-flight fetches — call on end, unmount, or home navigation. */
export function endCompanionVoiceSession(): void {
  sessionGeneration += 1;
  abortController?.abort();
  abortController = null;
  interruptFennaAudio("session end");
  stopBrowserSpeech();
}

export function getCompanionVoiceSessionGeneration(): number {
  return sessionGeneration;
}

export function isCompanionVoiceSessionActive(generation: number): boolean {
  return generation === sessionGeneration && abortController !== null;
}

export function getCompanionVoiceAbortSignal(): AbortSignal | undefined {
  return abortController?.signal;
}

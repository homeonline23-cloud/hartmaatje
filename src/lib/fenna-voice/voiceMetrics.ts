/** In-browser voice turn metrics for pilot debugging and readiness checks. */

export type VoiceTurnRecord = {
  id: string;
  startedAt: number;
  sttCompletedAt?: number;
  backendCompletedAt?: number;
  ttsFirstAudioAt?: number;
  ttsCompletedAt?: number;
  vadEndToBackendMs?: number;
  vadEndToFirstAudioMs?: number;
  backendStages?: Record<string, number>;
  failed: boolean;
  recovered: boolean;
  interrupted: boolean;
  error?: string;
};

type VoiceCounters = {
  turns_started: number;
  turns_completed: number;
  turns_failed: number;
  turns_recovered: number;
  interruptions: number;
};

const MAX_HISTORY = 20;

let counters: VoiceCounters = {
  turns_started: 0,
  turns_completed: 0,
  turns_failed: 0,
  turns_recovered: 0,
  interruptions: 0,
};

let currentTurn: VoiceTurnRecord | null = null;
const history: VoiceTurnRecord[] = [];

export function getCurrentVoiceTurnId(): string | null {
  return currentTurn?.id ?? null;
}

function pushHistory(record: VoiceTurnRecord): void {
  history.unshift(record);
  if (history.length > MAX_HISTORY) history.pop();
}

export function beginVoiceTurn(): string {
  const id = `vt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  counters.turns_started += 1;
  currentTurn = {
    id,
    startedAt: Date.now(),
    failed: false,
    recovered: false,
    interrupted: false,
  };
  return id;
}

export function markSttCompleted(turnId: string, userText: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  currentTurn.sttCompletedAt = Date.now();
  if (!userText.trim()) {
    currentTurn.error = "empty_stt";
  }
}

export function markBackendCompleted(
  turnId: string,
  backendStages?: Record<string, number>,
): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  currentTurn.backendCompletedAt = Date.now();
  currentTurn.backendStages = backendStages;
  currentTurn.vadEndToBackendMs = currentTurn.backendCompletedAt - currentTurn.startedAt;
}

export function markTtsFirstAudio(turnId: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  if (!currentTurn.ttsFirstAudioAt) {
    currentTurn.ttsFirstAudioAt = Date.now();
    currentTurn.vadEndToFirstAudioMs =
      currentTurn.ttsFirstAudioAt - currentTurn.startedAt;
  }
}

export function markTtsCompleted(turnId: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  currentTurn.ttsCompletedAt = Date.now();
}

export function completeVoiceTurn(turnId: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  counters.turns_completed += 1;
  pushHistory({ ...currentTurn });
  currentTurn = null;
}

export function failVoiceTurn(turnId: string, error: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  currentTurn.failed = true;
  currentTurn.error = error;
  counters.turns_failed += 1;
  pushHistory({ ...currentTurn });
  currentTurn = null;
}

export function recoverVoiceTurn(turnId: string): void {
  if (!currentTurn || currentTurn.id !== turnId) return;
  currentTurn.recovered = true;
  counters.turns_recovered += 1;
  pushHistory({ ...currentTurn });
  currentTurn = null;
}

export function recordVoiceInterrupt(): void {
  counters.interruptions += 1;
  if (currentTurn) currentTurn.interrupted = true;
}

export function snapshotVoiceMetrics(): {
  counters: VoiceCounters;
  current: VoiceTurnRecord | null;
  recent: VoiceTurnRecord[];
} {
  return {
    counters: { ...counters },
    current: currentTurn ? { ...currentTurn } : null,
    recent: [...history],
  };
}

export function resetVoiceMetrics(): void {
  counters = {
    turns_started: 0,
    turns_completed: 0,
    turns_failed: 0,
    turns_recovered: 0,
    interruptions: 0,
  };
  currentTurn = null;
  history.length = 0;
}

/** Dev helper — expose in browser console as `window.__hartmaatjeVoiceMetrics()`. */
export function exposeVoiceMetricsGlobally(): void {
  if (typeof window === "undefined") return;
  (window as Window & { __hartmaatjeVoiceMetrics?: () => ReturnType<typeof snapshotVoiceMetrics> }).__hartmaatjeVoiceMetrics =
    snapshotVoiceMetrics;
}

import type { VoiceSpeedOption } from "@/lib/voice/types";

/** Standaard ~80% — onderzoek: beter verstaanbaar voor ouderen. */
export const DEFAULT_VOICE_SPEED = 0.8;

export const MIN_VOICE_SPEED = 0.75;
export const MAX_VOICE_SPEED = 0.92;

export const VOICE_SPEED_OPTIONS: readonly VoiceSpeedOption[] = [
  { rate: 0.75, label: "Extra rustig" },
  { rate: 0.8, label: "Standaard" },
  { rate: 0.92, label: "Iets sneller" },
] as const;

export function clampVoiceSpeed(rate: number | null | undefined): number {
  const n = typeof rate === "number" && Number.isFinite(rate) ? rate : DEFAULT_VOICE_SPEED;
  return Math.min(MAX_VOICE_SPEED, Math.max(MIN_VOICE_SPEED, n));
}

export function voiceSpeedLabel(rate: number): string {
  const match = VOICE_SPEED_OPTIONS.find(
    (o) => Math.abs(o.rate - rate) < 0.02,
  );
  return match?.label ?? "Standaard";
}

export function nearestVoiceSpeedStep(rate: number): number {
  return VOICE_SPEED_OPTIONS.reduce(
    (best, o) =>
      Math.abs(o.rate - rate) < Math.abs(best - rate) ? o.rate : best,
    VOICE_SPEED_OPTIONS[1].rate,
  );
}

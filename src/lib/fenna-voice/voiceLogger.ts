/** Console logs for Fenna voice pipeline debugging (browser devtools). */

export function voiceLog(stage: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[Fenna voice] ${stage}`, detail);
  } else {
    console.info(`[Fenna voice] ${stage}`);
  }
}

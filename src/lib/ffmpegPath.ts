import path from "node:path";

/**
 * Portable FFmpeg under apps/web/binaries — never use system PATH "ffmpeg".
 * Relative form for configs; absolute form for child_process.spawn/execFile.
 */
export const FFMPEG_RELATIVE = "./binaries/ffmpeg.exe";
export const FFPLAY_RELATIVE = "./binaries/ffplay.exe";

export function getFfmpegPath(cwd: string = process.cwd()): string {
  return path.resolve(cwd, "binaries", "ffmpeg.exe");
}

export function getFfplayPath(cwd: string = process.cwd()): string {
  return path.resolve(cwd, "binaries", "ffplay.exe");
}

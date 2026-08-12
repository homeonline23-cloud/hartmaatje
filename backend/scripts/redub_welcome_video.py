#!/usr/bin/env python3
"""Regenerate a persona-matched, lip-synced dub of a welcome video.

WHY THIS EXISTS
---------------
Each persona's `public/avatars/<id>/welcome.mp4` has its own baked-in audio
track AND lip-synced mouth movement, produced by whatever AI video tool made
the clip originally (metadata shows `encoder=Google`). The LIVE conversation
voice is a different engine (Gemini TTS, e.g. "Algenib" for Peter — see
src/lib/voice/geminiVoiceConfig.ts). Even though that voice was deliberately
picked to sound as close as possible to the welcome video, it is not the same
voice model, so people notice the difference — exactly the "Peter sounds
different when telling stories" report this script is meant to help fix.

This script:
  1. Generates fresh narration using the *exact* persona voice used in live
     conversation (same Gemini prebuilt voice, same style prompt as the
     backend/frontend use).
  2. With --lipsync: runs that narration through an offline lip-sync model
     (Wav2Lip, ONNX/CPU build) over the existing welcome video, so the mouth
     is regenerated to match the NEW words — a real fix, not just an audio
     swap. This was tested end-to-end on Peter's welcome.mp4: the mouth
     visibly follows the new audio's timing instead of the original words.
  3. Without --lipsync (--apply-to-video alone): does a plain ffmpeg audio
     swap, which is fast but leaves the ORIGINAL lip movement in place —
     useful only to judge the voice in isolation, not as a final asset,
     because the mouth will look out of sync with the new words.

SETUP for --lipsync (one-time, run this first)
------------------------------------------------
    bash backend/scripts/setup_lipsync_tool.sh

This clones instant-high/wav2lip-onnx-256 into backend/.lipsync-tool/,
downloads its ~102 MB ONNX checkpoint, applies two small Python-3.12/numpy
compatibility patches, and creates an isolated venv at
backend/.lipsync-tool-venv/. It's a one-off, offline, CPU-only job — a
10-second clip takes roughly 1-2 minutes on a normal CPU, no GPU or ongoing
hosting cost required.

USAGE
-----
    export GEMINI_API_KEY=...   # required — same key the app uses

    # Full pipeline: matching voice + matching lips, in one command:
    python backend/scripts/redub_welcome_video.py \\
        --persona peter \\
        --text "Ik ben Peter, wat fijn dat u er bent. Ik luister aandachtig naar u en u mag gewoon praten op uw eigen manier." \\
        --out /tmp/peter_dub \\
        --apply-to-video ../public/avatars/peter/welcome.mp4 \\
        --video-out /tmp/peter_welcome_redubbed.mp4 \\
        --lipsync

    # Quick voice-only check (no lip-sync, listen to /tmp/peter_dub.wav):
    python backend/scripts/redub_welcome_video.py \\
        --persona peter --text "..." --out /tmp/peter_dub --slow-down
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.services.chat.tts import synthesize_fenna_speech  # noqa: E402

LIPSYNC_TOOL_DIR = BACKEND_ROOT / ".lipsync-tool"
LIPSYNC_VENV_PYTHON = BACKEND_ROOT / ".lipsync-tool-venv" / "bin" / "python"
LIPSYNC_CHECKPOINT = LIPSYNC_TOOL_DIR / "checkpoints" / "wav2lip_256_fp16.onnx"

# Mirrors src/lib/voice/geminiVoiceConfig.ts PROFILES[*].playbackRate — the
# slower/deeper cadence applied at playback time for the live voice.
PLAYBACK_RATE = {
    "fenna": 0.92,
    "colette": 1.0,
    "maarten": 0.9,
    "peter": 0.86,
}


async def _generate(text: str, lang: str, persona: str) -> tuple[bytes, str]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise SystemExit(
            "GEMINI_API_KEY is not set. Export the same key the app uses before running this script."
        )
    result = await synthesize_fenna_speech(text, lang, persona_id=persona)
    if not result:
        raise SystemExit("TTS synthesis failed or returned no audio — check the API key/quota.")
    b64, mime = result
    return base64.b64decode(b64), mime


def _mime_to_suffix(mime: str) -> str:
    if "wav" in mime:
        return ".wav"
    if "mp3" in mime or "mpeg" in mime:
        return ".mp3"
    return ".bin"


def _run_lipsync(face_video: str, audio_path: Path, video_out: str) -> None:
    if not LIPSYNC_VENV_PYTHON.exists() or not LIPSYNC_CHECKPOINT.exists():
        raise SystemExit(
            "Lip-sync tool is not set up yet. Run this first:\n"
            "  bash backend/scripts/setup_lipsync_tool.sh"
        )
    inference_script = LIPSYNC_TOOL_DIR / "inference_onnxModel.py"
    Path(video_out).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            str(LIPSYNC_VENV_PYTHON),
            "-W",
            "ignore",
            str(inference_script),
            "--checkpoint_path",
            str(LIPSYNC_CHECKPOINT),
            "--face",
            str(Path(face_video).resolve()),
            "--audio",
            str(audio_path.resolve()),
            "--outfile",
            str(Path(video_out).resolve()),
            "--nosmooth",
            "--pads",
            "0",
            "10",
            "0",
            "0",
        ],
        check=True,
        cwd=str(LIPSYNC_TOOL_DIR),
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--persona", required=True, choices=["fenna", "maarten", "peter", "colette"])
    parser.add_argument("--text", required=True, help="Exact welcome script — same words as the video.")
    parser.add_argument("--lang", default="nl", choices=["nl", "en"])
    parser.add_argument("--out", required=True, help="Output path (without extension) for the reference audio.")
    parser.add_argument(
        "--slow-down",
        action="store_true",
        help="Apply the same playbackRate slowdown used live (via ffmpeg atempo) for a closer comparison.",
    )
    parser.add_argument(
        "--apply-to-video",
        help="Existing welcome.mp4 to redub, for an A/B preview or final asset (with --lipsync).",
    )
    parser.add_argument("--video-out", help="Output path for the redubbed video.")
    parser.add_argument(
        "--lipsync",
        action="store_true",
        help=(
            "Regenerate mouth movement to match the new audio (via Wav2Lip — run "
            "setup_lipsync_tool.sh first). Without this flag, --apply-to-video only "
            "swaps the audio track and leaves the OLD lip movement in place."
        ),
    )
    args = parser.parse_args()

    raw, mime = asyncio.run(_generate(args.text, args.lang, args.persona))
    out_base = Path(args.out)
    raw_path = out_base.with_suffix(_mime_to_suffix(mime))
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(raw)
    print(f"Wrote reference narration ({mime}) to {raw_path}")

    final_audio_path = raw_path
    if args.slow_down:
        rate = PLAYBACK_RATE.get(args.persona, 1.0)
        slowed_path = raw_path.with_name(f"{raw_path.stem}_rate{rate}{raw_path.suffix}")
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(raw_path), "-filter:a", f"atempo={rate}", str(slowed_path)],
            check=True,
        )
        final_audio_path = slowed_path
        print(f"Applied atempo={rate} (same slowdown as the live playbackRate) -> {slowed_path}")

    if args.apply_to_video:
        if not args.video_out:
            raise SystemExit("--video-out is required together with --apply-to-video")

        if args.lipsync:
            print("Running offline lip-sync (this can take a minute or two on CPU)...")
            _run_lipsync(args.apply_to_video, final_audio_path, args.video_out)
            print(f"Wrote lip-synced redub to {args.video_out}")
        else:
            print(
                "\n*** WARNING: lips will NOT match the new audio ***\n"
                "This does a plain audio swap — the welcome video's mouth movement stays\n"
                "lip-synced to the ORIGINAL words. Use this only to judge the voice itself.\n"
                "Pass --lipsync (after running setup_lipsync_tool.sh) for a real fix.\n"
            )
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    args.apply_to_video,
                    "-i",
                    str(final_audio_path),
                    "-map",
                    "0:v:0",
                    "-map",
                    "1:a:0",
                    "-c:v",
                    "copy",
                    "-shortest",
                    args.video_out,
                ],
                check=True,
            )
            print(f"Wrote audio-swapped preview to {args.video_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Generate a persona-voice-matched narration for a welcome-video "dub", and
optionally preview it swapped into the existing welcome clip.

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

This script generates fresh narration using the *exact* persona voice used in
live conversation (same Gemini prebuilt voice, same style prompt as the
backend/frontend use), so you can:

  1. Listen to the output reference audio and compare it to the welcome video.
  2. Optionally bake it into a preview MP4 with --apply-to-video, to judge how
     the voice itself sounds before deciding on a final fix.

IMPORTANT -- lip sync is NOT solved by this script
---------------------------------------------------
The welcome videos are lip-synced to their ORIGINAL audio (verified frame by
frame — the mouth clearly articulates the original words). Swapping only the
audio track (what --apply-to-video does) makes the character's mouth visibly
out of sync with the new words. That is fine for judging the voice in
isolation, but do NOT ship the --apply-to-video output as the final asset.

For a real fix, pick one of:
  (a) Regenerate the welcome video from scratch through whatever tool made the
      original, this time feeding it THIS narration as the input audio (most
      AI avatar/video tools accept "drive this face with this audio track"),
      so voice and lips match by construction.
  (b) Run an offline lip-sync pass (e.g. Wav2Lip/MuseTalk) over the existing
      video using this narration as the driving audio. This is a one-off
      batch job (a few minutes on a rented GPU, or slower on CPU) — not a
      live/continuous cost. Ask for help wiring this up if you want it.

USAGE
-----
    export GEMINI_API_KEY=...   # required — same key the app uses

    # 1. Generate the reference narration (Peter's known welcome script):
    python backend/scripts/redub_welcome_video.py \\
        --persona peter \\
        --text "Ik ben Peter, wat fijn dat u er bent. Ik luister aandachtig naar u en u mag gewoon praten op uw eigen manier." \\
        --out /tmp/peter_dub --slow-down

    # 2. (optional) Preview it swapped into the existing video (lips WILL be
    #    out of sync — see warning above):
    python backend/scripts/redub_welcome_video.py \\
        --persona peter --text "..." --out /tmp/peter_dub --slow-down \\
        --apply-to-video ../public/avatars/peter/welcome.mp4 \\
        --video-out /tmp/peter_welcome_dub_preview.mp4
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
        help="Existing welcome.mp4 to swap this audio into, for an A/B preview (lips will desync — see docstring).",
    )
    parser.add_argument("--video-out", help="Output path for the audio-swapped preview video.")
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
        print(
            "\n*** WARNING: lips will NOT match the new audio ***\n"
            "The welcome video's mouth movement was lip-synced to its ORIGINAL audio.\n"
            "This preview only swaps the audio track, so use it to judge the VOICE\n"
            "itself — do not ship it as the final asset. See the script's docstring\n"
            "for how to regenerate the video with matching lip movement.\n"
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

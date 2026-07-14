#!/usr/bin/env python3
"""Benchmark Fenna voice-turn pipeline stages (requires GEMINI_API_KEY)."""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.services.chat.fenna_chat import generate_fenna_reply
from app.services.chat.quick_ack import select_quick_ack
from app.services.chat.session_manager import session_manager
from app.services.chat.tts import synthesize_fenna_speech


async def bench_text_turn(lang: str = "en") -> dict[str, float]:
    session = session_manager.start("bench-user", lang=lang)
    session.add_turn(
        "assistant",
        "I'm glad you're here. I'm Fenna. What would you like to talk about today?",
    )
    user_text = "Hello Fenna, I feel a bit lonely today."

    t0 = time.perf_counter()
    ack = select_quick_ack(user_text, lang, 0)  # type: ignore[arg-type]

    t = time.perf_counter()
    reply = await generate_fenna_reply(user_text, session.recent_turns(), "", lang=lang)  # type: ignore[arg-type]
    llm_ms = (time.perf_counter() - t) * 1000

    t = time.perf_counter()
    ack_audio, reply_audio = await asyncio.gather(
        synthesize_fenna_speech(ack, lang),  # type: ignore[arg-type]
        synthesize_fenna_speech(reply or "I hear you.", lang),  # type: ignore[arg-type]
    )
    tts_ms = (time.perf_counter() - t) * 1000

    total_ms = (time.perf_counter() - t0) * 1000
    session_manager.end(session.session_id)

    return {
        "llm_ms": round(llm_ms, 1),
        "parallel_tts_ms": round(tts_ms, 1),
        "text_pipeline_ms": round(total_ms, 1),
        "ack_chars": len(ack),
        "reply_chars": len(reply or ""),
    }


async def main() -> None:
    print("Fenna voice pipeline benchmark")
    print("=" * 40)
    try:
        result = await bench_text_turn("en")
        for k, v in result.items():
            print(f"  {k}: {v}")
        print()
        print("Note: full user-stop-to-speech latency also includes:")
        print("  ~800ms VAD silence + STT (~0.5-2s) + network + playback buffer")
        est = 800 + result["text_pipeline_ms"]
        print(f"  Estimated stop→Fenna-voice-start (excl. STT): ~{est:.0f}ms + STT")
    except Exception as exc:
        print(f"Benchmark failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

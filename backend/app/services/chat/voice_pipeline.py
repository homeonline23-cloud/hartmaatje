"""
Optimized voice-turn orchestration with parallel stages and timing logs.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Literal, Optional

from app.schemas import SafetyFlag
from app.services.chat.chat_service import get_chat_orchestrator
from app.services.chat.lang import resolve_session_lang
from app.services.chat.session_manager import Session
from app.services.chat.speech import transcribe_audio
from app.services.chat.speech_sanitize import sanitize_fenna_reply, sanitize_user_transcript
from app.services.observability.timing import TurnTimer
from app.services.chat.tts import synthesize_fenna_speech, text_for_speech

logger = logging.getLogger(__name__)
AppLang = Literal["nl", "en"]


def _thread_context(session: Session, lang: AppLang) -> str:
    """Short thread hint so Fenna continues the same discussion."""
    parts: list[str] = []
    if session.active_topic:
        label = "Current topic" if lang == "en" else "Huidig onderwerp"
        parts.append(f"{label}: {session.active_topic}")
    if session.conversation_summary:
        label = "Recent flow" if lang == "en" else "Recent verloop"
        parts.append(f"{label}: {session.conversation_summary}")
    return "\n".join(parts)


@dataclass
class VoiceTurnResult:
    user_text: str
    reply: str
    quick_ack: str
    audio_base64: str
    mime_type: str
    quick_ack_audio_base64: Optional[str] = None
    quick_ack_mime_type: Optional[str] = None
    safety: list[SafetyFlag] | None = None
    memory_updated: bool = False
    timings: dict[str, float] | None = None


async def process_voice_turn(
    session: Session,
    audio_base64: str,
    mime_type: str,
    lang_override: str | None = None,
    turn_phase: Literal["phrase", "complete"] = "complete",
) -> VoiceTurnResult:
    timer = TurnTimer(turn_id=str(uuid.uuid4())[:8])
    lang = resolve_session_lang(session, lang_override)

    has_audio = bool(audio_base64 and audio_base64.strip())
    user_text = ""
    if has_audio:
        user_text = await transcribe_audio(audio_base64, mime_type, lang)
        timer.mark("stt")
        if not user_text and turn_phase == "phrase":
            raise ValueError("Spraak kon niet worden verstaan.")
    elif turn_phase != "complete" or not session.open_user_speech:
        if turn_phase == "complete" and not has_audio:
            timer.mark("stt")
            return VoiceTurnResult(
                user_text="",
                reply="",
                quick_ack="",
                audio_base64="",
                mime_type="audio/mp3",
                safety=[],
                memory_updated=False,
                timings=timer.to_client(),
            )
        raise ValueError("Spraak kon niet worden verstaan.")
    else:
        timer.mark("stt")

    known_name = session.display_name
    if user_text:
        user_text = sanitize_user_transcript(user_text, known_name)

    memory_updated = False
    if user_text:
        timer.mark("memory_extract")

    overlap_mode = turn_phase == "phrase"
    if overlap_mode and user_text:
        session.open_user_speech = " ".join(
            p for p in [session.open_user_speech.strip(), user_text.strip()] if p
        ).strip()
        effective_user = session.open_user_speech
    elif turn_phase == "complete":
        parts = [session.open_user_speech.strip(), user_text.strip()]
        effective_user = " ".join(p for p in parts if p).strip()
        session.open_user_speech = ""
    else:
        effective_user = user_text

    if not effective_user:
        raise ValueError("Spraak kon niet worden verstaan.")

    # After mid-speech join-ins, only commit the user's full line — no extra reply.
    if turn_phase == "complete" and not has_audio and effective_user:
        if session.turns and session.turns[-1].role == "assistant":
            session.add_turn("user", effective_user)
            session.update_summary(effective_user, "")
            timer.log_summary({"lang": lang, "finalize_only": True})
            return VoiceTurnResult(
                user_text=effective_user,
                reply="",
                quick_ack="",
                audio_base64="",
                mime_type="audio/mp3",
                safety=[],
                memory_updated=memory_updated,
                timings=timer.to_client(),
            )

    turn_result = await get_chat_orchestrator().process_text_turn(
        session,
        effective_user,
        lang_override=lang,
        voice_mode=True,
        overlap_mode=overlap_mode,
        conversation_thread=_thread_context(session, lang),
    )
    timer.mark("llm")
    safety = turn_result.safety
    memory_updated = turn_result.memory_updated or memory_updated
    reply = turn_result.reply or (
        "I'm still here — go on."
        if lang == "en"
        else "Ik ben er nog — ga gerust verder."
    )
    reply = sanitize_fenna_reply(reply, known_name, lang)

    if turn_result.used_safety_reply:
        session.add_turn("user", effective_user)
        session.add_turn("assistant", reply)
        session.update_summary(effective_user, reply)
        session.open_user_speech = ""

        audio = await synthesize_fenna_speech(text_for_speech(reply, 4), lang)
        timer.mark("reply_tts")
        if not audio:
            raise ValueError("Spraak kon niet worden gemaakt.")

        timer.log_summary({"lang": lang, "safety": True, "persona": session.character_id})

        return VoiceTurnResult(
            user_text=user_text or effective_user,
            reply=reply,
            quick_ack="",
            audio_base64=audio[0],
            mime_type=audio[1],
            safety=safety,
            memory_updated=memory_updated,
            timings=timer.to_client(),
        )

    if overlap_mode:
        session.add_turn("assistant", reply)
    else:
        session.add_turn("user", effective_user)
        session.add_turn("assistant", reply)
    session.update_summary(effective_user, reply)

    reply_b64, reply_mime = "", "audio/mp3"
    ack_b64, ack_mime = None, None

    timer.log_summary(
        {
            "user_chars": len(user_text),
            "reply_chars": len(reply),
            "lang": lang,
            "client_tts": True,
            "persona": session.character_id,
        }
    )

    return VoiceTurnResult(
        user_text=user_text or effective_user,
        reply=reply,
        quick_ack="",
        audio_base64=reply_b64,
        mime_type=reply_mime,
        quick_ack_audio_base64=ack_b64,
        quick_ack_mime_type=ack_mime,
        safety=safety,
        memory_updated=memory_updated,
        timings=timer.to_client(),
    )

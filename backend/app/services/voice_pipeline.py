"""
Optimized voice-turn orchestration with parallel stages and timing logs.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from typing import Literal, Optional

from app.memory.store import get_memory_store
from app.models.schemas import SafetyFlag
from app.safety.alerts import send_staff_alert
from app.safety.detector import analyze_message
from app.services.fenna_chat import generate_fenna_reply
from app.services.lang import resolve_session_lang
from app.services.session_manager import Session
from app.services.speech import transcribe_audio
from app.services.speech_sanitize import sanitize_fenna_reply, sanitize_user_transcript
from app.services.timing import TurnTimer
from app.services.tts import synthesize_fenna_speech, text_for_speech

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
    memory_store = get_memory_store()

    memory_task = asyncio.create_task(
        asyncio.to_thread(memory_store.load, session.resident_id)
    )

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

    memory = await memory_task
    timer.mark("memory_load")

    known_name = memory.display_name or session.display_name
    if user_text:
        user_text = sanitize_user_transcript(user_text, known_name)

    memory_updated = False
    if user_text:
        # Defer memory merge so the user gets a reply sooner.
        asyncio.create_task(
            asyncio.to_thread(
                memory_store.extract_and_merge, session.resident_id, user_text
            )
        )
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

    safety = analyze_message(effective_user)
    history = session.recent_turns(limit=8)
    session_summary = session.conversation_summary or ""
    if session.active_topic:
        topic_label = "Active topic" if lang == "en" else "Actief onderwerp"
        session_summary = f"{session_summary}\n{topic_label}: {session.active_topic}".strip()
    memory_block = memory.to_prompt_block(lang=lang, session_summary=session_summary)

    quick_ack = ""

    reply: str
    if safety.emergency_reply:
        reply = (
            "I'm going to get help for you right away, so someone can check on you. "
            "Please stay calm if you can."
            if lang == "en"
            else safety.emergency_reply
        )
        await send_staff_alert(
            alert_type="emergency",
            resident_id=session.resident_id,
            session_id=session.session_id,
            excerpt=effective_user,
        )
    elif safety.distress_reply:
        reply = (
            "I'm really glad you told me that. You matter, and I want someone to support you. "
            "Please stay with me for a moment."
            if lang == "en"
            else safety.distress_reply
        )
        await send_staff_alert(
            alert_type="distress",
            resident_id=session.resident_id,
            session_id=session.session_id,
            excerpt=effective_user,
        )
    elif safety.medical_reply:
        reply = (
            "I want you to get the best care. "
            "Please ask a nurse, doctor, or caregiver about that."
            if lang == "en"
            else safety.medical_reply
        )
    else:
        llm_task = asyncio.create_task(
            generate_fenna_reply(
                effective_user,
                history,
                memory_block,
                lang=lang,
                voice_mode=True,
                conversation_thread=_thread_context(session, lang),
                overlap_mode=overlap_mode,
                known_name=known_name,
            )
        )

        reply = await llm_task
        timer.mark("llm")
        reply = reply or (
            "I'm still here — go on."
            if lang == "en"
            else "Ik ben er nog — ga gerust verder."
        )
        reply = sanitize_fenna_reply(reply, known_name, lang)

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
            }
        )

        return VoiceTurnResult(
            user_text=user_text or effective_user,
            reply=reply,
            quick_ack=quick_ack,
            audio_base64=reply_b64,
            mime_type=reply_mime,
            quick_ack_audio_base64=ack_b64,
            quick_ack_mime_type=ack_mime,
            safety=safety.flags,
            memory_updated=memory_updated,
            timings=timer.to_client(),
        )

    session.add_turn("user", effective_user)
    session.add_turn("assistant", reply)
    session.update_summary(effective_user, reply)
    session.open_user_speech = ""

    audio = await synthesize_fenna_speech(text_for_speech(reply, 4), lang)
    timer.mark("reply_tts")
    if not audio:
        raise ValueError("Spraak kon niet worden gemaakt.")

    timer.log_summary({"lang": lang, "safety": True})

    return VoiceTurnResult(
        user_text=user_text or effective_user,
        reply=reply,
        quick_ack="",
        audio_base64=audio[0],
        mime_type=audio[1],
        safety=safety.flags,
        memory_updated=memory_updated,
        timings=timer.to_client(),
    )

"""Shared chat turn logic for Fenna."""

from __future__ import annotations

from app.memory.store import get_memory_store
from app.models.schemas import SafetyFlag
from app.safety.alerts import send_staff_alert
from app.safety.detector import analyze_message
from app.services.fenna_chat import generate_fenna_reply
from app.services.lang import resolve_session_lang
from app.services.session_manager import Session
from app.services.speech_sanitize import sanitize_user_transcript

SAFETY_EN = {
    "emergency": (
        "I'm going to get help for you right away, so someone can check on you. "
        "Please stay calm if you can."
    ),
    "distress": (
        "I'm really glad you told me that. You matter, and I want someone to support you. "
        "Please stay with me for a moment."
    ),
    "medical": (
        "I want you to get the best care. "
        "Please ask a nurse, doctor, or caregiver about that."
    ),
    "default": "I'm still here — mention whatever's on your mind.",
}


async def process_user_message(
    session: Session,
    user_text: str,
    lang_override: str | None = None,
) -> tuple[str, list[SafetyFlag], bool]:
    lang = resolve_session_lang(session, lang_override)
    memory_store = get_memory_store()
    memory = memory_store.load(session.resident_id)
    known_name = memory.display_name or session.display_name
    user_text = sanitize_user_transcript(user_text, known_name)
    safety = analyze_message(user_text)
    memory_updated = memory_store.extract_and_merge(session.resident_id, user_text)
    memory = memory_store.load(session.resident_id)
    history = session.recent_turns(limit=16)
    session_summary = session.conversation_summary or ""
    if session.active_topic:
        topic_label = "Active topic" if lang == "en" else "Actief onderwerp"
        session_summary = f"{session_summary}\n{topic_label}: {session.active_topic}".strip()
    memory_block = memory.to_prompt_block(
        lang=lang,
        session_summary=session_summary,
    )

    if safety.emergency_reply:
        reply = SAFETY_EN["emergency"] if lang == "en" else safety.emergency_reply
        await send_staff_alert(
            alert_type="emergency",
            resident_id=session.resident_id,
            session_id=session.session_id,
            excerpt=user_text,
        )
    elif safety.distress_reply:
        reply = SAFETY_EN["distress"] if lang == "en" else safety.distress_reply
        await send_staff_alert(
            alert_type="distress",
            resident_id=session.resident_id,
            session_id=session.session_id,
            excerpt=user_text,
        )
    elif safety.medical_reply:
        reply = SAFETY_EN["medical"] if lang == "en" else safety.medical_reply
    else:
        reply = await generate_fenna_reply(
            user_text,
            history,
            memory_block,
            lang=lang,
            conversation_thread=session_summary,
            known_name=known_name,
        )
        reply = reply or (
            SAFETY_EN["default"]
            if lang == "en"
            else "Ik ben er — noem maar waar u aan denkt."
        )

    session.add_turn("user", user_text)
    session.add_turn("assistant", reply)
    session.update_summary(user_text, reply)

    return reply, safety.flags, memory_updated

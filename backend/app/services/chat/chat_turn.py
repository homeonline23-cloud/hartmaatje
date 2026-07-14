"""Shared chat turn logic — delegates to ChatOrchestrator."""

from __future__ import annotations

from app.schemas import SafetyFlag
from app.services.chat.chat_service import get_chat_orchestrator
from app.services.chat.session_manager import Session


async def process_user_message(
    session: Session,
    user_text: str,
    lang_override: str | None = None,
) -> tuple[str, list[SafetyFlag], bool]:
    orchestrator = get_chat_orchestrator()
    result = await orchestrator.process_text_turn(
        session,
        user_text.strip(),
        lang_override,
    )

    session.add_turn("user", user_text.strip())
    session.add_turn("assistant", result.reply)
    session.update_summary(user_text.strip(), result.reply)

    return result.reply, result.safety, result.memory_updated

"""Backward-compatible Fenna chat entry points — use modular services underneath."""

from __future__ import annotations

from typing import List, Literal, Optional

from app.services.llm.llm_service import generate_companion_reply
from app.services.personas.persona_loader import get_persona
from app.services.prompts.prompt_builder import build_system_prompt
from app.services.chat.session_manager import ChatTurn

AppLang = Literal["nl", "en"]


async def generate_fenna_reply(
    user_message: str,
    history: List[ChatTurn],
    memory_block: str,
    lang: AppLang = "nl",
    voice_mode: bool = False,
    conversation_thread: str = "",
    overlap_mode: bool = False,
    known_name: Optional[str] = None,
    character_id: str | None = "fenna",
) -> Optional[str]:
    persona = get_persona(character_id)
    system_prompt = build_system_prompt(
        persona,
        lang=lang,
        memory_block=memory_block,
        conversation_thread=conversation_thread,
        voice_mode=voice_mode,
        overlap_mode=overlap_mode,
    )
    return await generate_companion_reply(
        system_prompt=system_prompt,
        persona=persona,
        user_message=user_message,
        history=history,
        lang=lang,
        voice_mode=voice_mode,
        overlap_mode=overlap_mode,
        known_name=known_name,
    )

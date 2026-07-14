"""Dialogue manager — decides routing before response planning."""

from __future__ import annotations

import re
from typing import Literal

from app.domain.models.dialogue import ClassifiedIntent, DialogueDecision, IntentId, ToneMode
from app.domain.models.nlu import NluResult
from app.services.memory.memory_service import MemoryContext
from app.services.safety.safety_guard import GuardResult

AppLang = Literal["nl", "en"]


def decide_dialogue(
    *,
    intent: ClassifiedIntent,
    nlu: NluResult,
    memory_ctx: MemoryContext,
    guard: GuardResult,
    lang: AppLang = "nl",
    voice_mode: bool = False,
    user_text: str = "",
) -> DialogueDecision:
    """
    Decide what should happen next:
    - use memory or not
    - safety mode
    - tool needed
    - follow-up allowed
    - reply style: short/warm, practical, or supportive
    """
    _ = lang
    intent_id = intent.id
    has_memory = bool(memory_ctx.prompt_block.strip())

    if intent_id == "safety_sensitive" or guard.block_llm:
        return DialogueDecision(
            use_memory=False,
            safety_mode=True,
            tone_mode="warm_soft",
            follow_up_allowed=False,
            max_questions=0,
            short_warm_reply=True,
        )

    if intent_id == "memory_related":
        return DialogueDecision(
            use_memory=has_memory,
            tone_mode="warm_normal",
            follow_up_allowed=False,
            max_questions=0,
        )

    if intent_id == "emotional_support":
        return DialogueDecision(
            use_memory=has_memory,
            tone_mode="supportive",
            follow_up_allowed=False,
            max_questions=0,
            short_warm_reply=True,
        )

    if intent_id == "practical_question":
        return DialogueDecision(
            use_memory=False,
            tone_mode="clear_explain",
            follow_up_allowed=False,
            max_questions=0,
        )

    if intent_id == "research_candidate":
        return DialogueDecision(
            use_memory=False,
            tool_action="research",
            tone_mode="clear_explain",
            follow_up_allowed=False,
            max_questions=0,
        )

    is_greeting = _is_short_greeting(user_text)
    return DialogueDecision(
        use_memory=has_memory and not is_greeting,
        tone_mode="warm_soft" if is_greeting or voice_mode else _tone_from_nlu(nlu),
        follow_up_allowed=not is_greeting
        and nlu.detected_tone.primary not in ("sadness", "confusion", "stress"),
        max_questions=0 if is_greeting else 1,
        short_warm_reply=is_greeting
        or voice_mode
        or nlu.detected_tone.primary in ("sadness", "stress"),
    )


def _tone_from_nlu(nlu: NluResult) -> ToneMode:
    if nlu.detected_tone.primary in ("sadness", "stress"):
        return "supportive"
    if nlu.detected_tone.primary == "confusion":
        return "clear_explain"
    return "warm_normal"


def _is_short_greeting(text: str) -> bool:
    lower = text.lower().strip()
    words = re.findall(r"\w+", lower)
    if len(words) > 6:
        return False
    greetings = ("hallo", "hoi", "dag", "hello", "hi", "goedemorgen", "goedenavond", "hey")
    return any(g in lower for g in greetings)

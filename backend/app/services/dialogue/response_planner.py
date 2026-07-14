"""Response planning — builds structured ResponsePlan before LLM call."""

from __future__ import annotations

from typing import Literal

from app.core.constants import MAX_MEMORY_INJECT_LINES
from app.domain.models.dialogue import ClassifiedIntent, DialogueDecision, ResponsePlan, ToneMode
from app.services.memory.memory_service import MemoryContext

AppLang = Literal["nl", "en"]


def build_response_plan(
    *,
    intent: ClassifiedIntent,
    decision: DialogueDecision,
    memory_ctx: MemoryContext,
    lang: AppLang = "nl",
) -> ResponsePlan:
    """Create ResponsePlan from intent, dialogue decision, and memory context."""
    memory_block = ""
    selected_count = 0

    if decision.use_memory and memory_ctx.prompt_block.strip():
        lines = [ln.strip() for ln in memory_ctx.prompt_block.splitlines() if ln.strip()]
        selected = lines[: min(decision.memory_line_limit, MAX_MEMORY_INJECT_LINES)]
        selected_count = len(selected)
        memory_block = "\n".join(selected)

    return ResponsePlan(
        intent=intent.id,
        use_memory=decision.use_memory and bool(memory_block),
        selected_memory_count=selected_count,
        memory_block=memory_block,
        tool_action=decision.tool_action,
        tone_mode=decision.tone_mode,
        follow_up_allowed=decision.follow_up_allowed,
        max_questions=decision.max_questions,
        safety_mode=decision.safety_mode,
        short_warm_reply=decision.short_warm_reply,
        quality_hints=_quality_hints(lang, decision),
    )


def _quality_hints(lang: AppLang, decision: DialogueDecision) -> list[str]:
    en = lang == "en"
    hints = [
        "Answer the user's message first." if en else "Beantwoord eerst wat de gebruiker zegt.",
        "Stay on topic — no interview style." if en else "Blijf bij het onderwerp — geen interview.",
    ]
    tone_hints: dict[ToneMode, tuple[str, str]] = {
        "warm_soft": ("Keep it short, warm, and direct.", "Houd het kort, warm en direct."),
        "supportive": (
            "Be gentle and supportive. Acknowledge feelings first.",
            "Wees zacht en ondersteunend. Erken gevoelens eerst.",
        ),
        "clear_explain": ("Explain clearly and calmly.", "Leg helder en kalm uit."),
        "warm_normal": ("Warm and direct.", "Warm en direct."),
    }
    th = tone_hints.get(decision.tone_mode)
    if th:
        hints.append(th[0] if en else th[1])

    if not decision.follow_up_allowed:
        hints.append(
            "Do not ask a follow-up question." if en else "Stel geen vervolgvraag."
        )
    elif en:
        hints.append("At most one question, only if needed.")
    else:
        hints.append("Maximaal één vraag, alleen als nodig.")
    return hints

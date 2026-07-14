"""Structured logging for conversational orchestration."""

from __future__ import annotations

import logging
from typing import Literal, Optional

from app.domain.models.dialogue import ResponsePlan
from app.domain.models.memory import MemoryTurnMetrics
from app.services.observability.metrics import record_turn

logger = logging.getLogger("hartmaatje.turn")

AppLang = Literal["nl", "en"]


def log_turn(
    *,
    session_id: str,
    resident_id: str,
    persona_id: str,
    plan: ResponsePlan,
    lang: AppLang,
    detected_tone: str,
    selected_topics: list[str],
    memory_updated: bool,
    safety_triggered: bool,
    response_length: int,
    reply_retried: bool = False,
    quality_violations: Optional[list[str]] = None,
    memory_metrics: Optional[MemoryTurnMetrics] = None,
) -> dict:
    """Emit structured log for one completed turn."""
    payload = {
        "event": "hartmaatje_turn",
        "session_id": session_id,
        "resident_id": resident_id,
        "persona": persona_id,
        "lang": lang,
        "intent": plan.intent,
        "topics": selected_topics,
        "tone": detected_tone,
        "tone_mode": plan.tone_mode,
        "memory_used": plan.use_memory and bool(plan.memory_block.strip()),
        "selected_memory_count": plan.selected_memory_count,
        "memory_updated": memory_updated,
        "tool_action": plan.tool_action,
        "tool_used": plan.tool_used,
        "safety_triggered": safety_triggered,
        "safety_mode": plan.safety_mode,
        "follow_up_allowed": plan.follow_up_allowed,
        "max_questions": plan.max_questions,
        "response_length": response_length,
        "reply_retried": reply_retried,
        "quality_violations": quality_violations or [],
    }
    if memory_metrics:
        payload.update(
            {
                "memory_candidates_in": memory_metrics.candidates_in,
                "memory_saved_count": memory_metrics.saved_count,
                "memory_retrieved_count": memory_metrics.retrieved_count,
                "memory_identity_blocked": memory_metrics.identity_blocked,
                "calendar_used": memory_metrics.calendar_used,
                "care_notes_used": memory_metrics.care_notes_used,
                "memory_ranked_lines": [
                    {"text": line.text, "score": line.score, "reasons": line.reasons}
                    for line in memory_metrics.ranked_lines
                ],
            }
        )
    logger.info("HARTMAATJE_TURN %s", payload)
    record_turn(payload)
    return payload

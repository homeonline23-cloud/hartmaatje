"""Intent classification service — 6 conversational intents."""

from __future__ import annotations

import re
from typing import Literal

from app.services.dialogue.lexicons import INTENT_LEXICON
from app.domain.models.dialogue import ClassifiedIntent, IntentId
from app.domain.models.nlu import NluResult
from app.services.safety.safety_guard import GuardResult

AppLang = Literal["nl", "en"]

_PRIORITY: list[IntentId] = [
    "safety_sensitive",
    "memory_related",
    "emotional_support",
    "practical_question",
    "research_candidate",
    "normal_conversation",
]


def classify_intent(
    text: str,
    nlu: NluResult,
    guard: GuardResult,
    lang: AppLang = "nl",
) -> ClassifiedIntent:
    """Classify user message into one of six intent labels."""
    if guard.block_llm or guard.has_emergency or guard.has_distress:
        return ClassifiedIntent(
            id="safety_sensitive",
            confidence=0.95,
            reason="Safety guard triggered",
        )

    critical_signals = {"emergency_hint", "distress_hint"}
    if any(
        s.type in critical_signals and s.confidence >= 0.5 for s in nlu.safety_signals
    ):
        return ClassifiedIntent(
            id="safety_sensitive",
            confidence=0.85,
            reason="NLU critical safety signal",
        )

    lower = text.lower().strip()
    scores: dict[IntentId, float] = {}

    for intent_id, keywords_by_lang in INTENT_LEXICON.items():
        if intent_id == "safety_sensitive":
            continue
        keywords = keywords_by_lang.get(lang, []) + keywords_by_lang.get("en", [])
        hits = sum(1 for kw in keywords if kw in lower)
        if hits:
            scores[intent_id] = min(0.95, 0.4 + hits * 0.2)

    if nlu.candidate_memories:
        scores["memory_related"] = max(scores.get("memory_related", 0), 0.75)

    if nlu.detected_tone.primary in ("sadness", "stress"):
        scores["emotional_support"] = max(
            scores.get("emotional_support", 0), 0.7 + nlu.detected_tone.confidence * 0.2
        )

    if any(t.id == "loneliness" for t in nlu.detected_topics):
        scores["emotional_support"] = max(scores.get("emotional_support", 0), 0.75)

    if "?" in text and scores.get("practical_question", 0) < 0.5:
        if re.search(r"\b(wat|wie|waar|wanneer|hoe|what|who|where|when|how)\b", lower):
            scores["practical_question"] = max(scores.get("practical_question", 0), 0.55)

    if not scores:
        return ClassifiedIntent(
            id="normal_conversation",
            confidence=0.6,
            reason="Default conversational turn",
        )

    best_id = max(_PRIORITY, key=lambda i: (scores.get(i, 0), -_PRIORITY.index(i)))
    best_score = scores[best_id]
    if best_score < 0.4:
        return ClassifiedIntent(
            id="normal_conversation", confidence=0.55, reason="Low confidence fallback"
        )

    return ClassifiedIntent(
        id=best_id, confidence=round(best_score, 2), reason=f"Match for {best_id}"
    )

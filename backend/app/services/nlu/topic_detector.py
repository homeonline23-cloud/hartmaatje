"""Lightweight topic detection from keyword scoring."""

from __future__ import annotations

from typing import Literal

from app.domain.models.nlu import DetectedTopic, TopicId
from app.services.nlu.lexicons import TOPIC_LABELS, TOPIC_LEXICON

AppLang = Literal["nl", "en"]

_MIN_CONFIDENCE = 0.35
_MAX_TOPICS = 3


def detect_topics(text: str, lang: AppLang = "nl") -> list[DetectedTopic]:
    """Score topics by keyword overlap."""
    if not text.strip():
        return []

    lower = text.lower()
    scored: list[DetectedTopic] = []

    for topic_id, keywords_by_lang in TOPIC_LEXICON.items():
        keywords = keywords_by_lang.get(lang, []) + keywords_by_lang.get("en", [])
        hits = sum(1 for kw in keywords if kw in lower)
        if hits == 0:
            continue
        confidence = min(0.95, 0.35 + hits * 0.2)
        if confidence < _MIN_CONFIDENCE:
            continue
        label = TOPIC_LABELS[topic_id].get(lang, topic_id)
        scored.append(
            DetectedTopic(id=topic_id, label=label, confidence=round(confidence, 2))
        )

    scored.sort(key=lambda t: t.confidence, reverse=True)
    return scored[:_MAX_TOPICS]

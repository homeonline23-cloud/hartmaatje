"""NLU service — processes user text before response generation."""

from __future__ import annotations

from typing import Literal

from app.domain.models.nlu import NluResult, NluSafetySignal
from app.services.nlu.entity_extractor import extract_entities
from app.services.nlu.lexicons import SAFETY_HINT_LEXICON
from app.services.nlu.memory_candidates import extract_memory_candidates
from app.services.nlu.tone_detector import detect_tone
from app.services.nlu.topic_detector import detect_topics

AppLang = Literal["nl", "en"]

_MIN_SAFETY_CONFIDENCE = 0.4


def _detect_safety_signals(text: str, lang: AppLang) -> list[NluSafetySignal]:
    if not text.strip():
        return []

    lower = text.lower()
    signals: list[NluSafetySignal] = []

    for signal_type, keywords_by_lang in SAFETY_HINT_LEXICON.items():
        keywords = keywords_by_lang.get(lang, []) + keywords_by_lang.get("en", [])
        hits = [kw for kw in keywords if kw in lower]
        if not hits:
            continue
        confidence = min(0.9, 0.4 + len(hits) * 0.15)
        if confidence < _MIN_SAFETY_CONFIDENCE:
            continue
        signals.append(
            NluSafetySignal(
                type=signal_type,  # type: ignore[arg-type]
                message=f"Keyword hint: {hits[0]}",
                confidence=round(confidence, 2),
            )
        )

    return signals


def analyze_text(text: str, lang: AppLang = "nl") -> NluResult:
    """
    Run lightweight NLU on incoming user text.

    Returns structured fields for memory, prompt tone, and optional safety hints.
    Does not replace safety_guard — hints only.
    """
    entities = extract_entities(text)
    topics = detect_topics(text, lang)
    tone = detect_tone(text, lang)
    candidates = extract_memory_candidates(text, entities, lang)
    safety_signals = _detect_safety_signals(text, lang)

    return NluResult(
        entities=entities,
        candidate_memories=candidates,
        detected_topics=topics,
        detected_tone=tone,
        safety_signals=safety_signals,
        intent=None,
    )

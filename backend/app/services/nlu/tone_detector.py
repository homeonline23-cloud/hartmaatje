"""Simple emotional tone detection — guides reply style, not diagnosis."""

from __future__ import annotations

from typing import Literal

from app.domain.models.nlu import DetectedTone, ToneId
from app.services.nlu.lexicons import TONE_LEXICON

AppLang = Literal["nl", "en"]


def detect_tone(text: str, lang: AppLang = "nl") -> DetectedTone:
    """Score emotional tone from keyword hints."""
    if not text.strip():
        return DetectedTone(primary="neutral", confidence=0.5)

    lower = text.lower()
    scores: dict[ToneId, float] = {}

    for tone_id, keywords_by_lang in TONE_LEXICON.items():
        keywords = keywords_by_lang.get(lang, []) + keywords_by_lang.get("en", [])
        hits = sum(1 for kw in keywords if kw in lower)
        if hits:
            scores[tone_id] = min(0.95, 0.4 + hits * 0.15)

    if not scores:
        return DetectedTone(primary="neutral", confidence=0.55)

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    primary, primary_score = ranked[0]
    secondary = ranked[1][0] if len(ranked) > 1 and ranked[1][1] >= 0.45 else None

    return DetectedTone(
        primary=primary,
        confidence=round(primary_score, 2),
        secondary=secondary,
    )

"""Memory ranking — score and order relevant memories for the current turn."""

from __future__ import annotations

import re
from typing import Literal

from app.domain.models.nlu import MemoryCandidate, NluResult, TopicId

AppLang = Literal["nl", "en"]

_FIELD_PRIORITY: dict[str, int] = {
    "display_name": 10,
    "family": 9,
    "emotional_topics": 8,
    "pets": 7,
    "hometown": 6,
    "hobbies": 5,
    "favorite_music": 5,
    "preferences": 4,
    "profession": 4,
    "upcoming_visits": 4,
    "notes": 1,
}

_TOPIC_KEYWORDS: dict[TopicId, tuple[str, ...]] = {
    "family": ("familie", "family", "zoon", "dochter", "klein", "man", "vrouw", "bezoek"),
    "loneliness": ("eenzaam", "alleen", "lonely", "alone", "vermis"),
    "gardening": ("tuin", "plant", "bloem", "garden", "flower"),
    "music": ("muziek", "music", "lied", "zing", "piano"),
    "health_concerns": ("pijn", "dokter", "medicijn", "pain", "doctor", "health"),
    "faith": ("god", "kerk", "gebed", "church", "faith", "bible"),
    "daily_life": ("koffie", "weer", "ontbijt", "coffee", "weather", "walk"),
}

_STOPWORDS = {
    "the", "and", "you", "your", "that", "this", "with", "have", "from",
    "een", "het", "van", "dat", "die", "niet", "voor", "maar", "ook", "nog",
    "wel", "ben", "bent", "heeft", "naam", "name",
}


def rank_candidates(candidates: list[MemoryCandidate]) -> list[MemoryCandidate]:
    """Sort memory candidates by confidence and field importance."""
    return sorted(
        candidates,
        key=lambda c: (_FIELD_PRIORITY.get(c.field, 0), c.confidence),
        reverse=True,
    )


def rank_memory_lines(
    lines: list[str],
    user_message: str,
    nlu: NluResult | None = None,
    *,
    limit: int = 6,
) -> list[str]:
    """Score and return the most relevant memory lines for this turn."""
    if not lines:
        return []

    tokens = _relevance_tokens(user_message, nlu)
    scored: list[tuple[float, str]] = []
    for line in lines:
        score = _line_score(line, tokens, nlu)
        if score > 0:
            scored.append((score, line))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [line for _, line in scored[:limit]]


def _relevance_tokens(user_message: str, nlu: NluResult | None) -> set[str]:
    tokens = _tokens(user_message)
    if not nlu:
        return tokens
    for entity in nlu.entities:
        tokens.update(_tokens(entity.text))
        if entity.normalized:
            tokens.add(entity.normalized)
    for topic_id in (t.id for t in nlu.detected_topics):
        tokens.update(_TOPIC_KEYWORDS.get(topic_id, ()))
    return tokens


def _line_score(
    line: str,
    tokens: set[str],
    nlu: NluResult | None,
) -> float:
    line_tokens = _tokens(line)
    if not line_tokens:
        return 0.0

    score = 0.0
    overlap = tokens & line_tokens
    if overlap:
        score += len(overlap) * 1.0

    if nlu:
        line_lower = line.lower()
        for topic in nlu.detected_topics:
            keywords = _TOPIC_KEYWORDS.get(topic.id, ())
            if any(kw in line_lower for kw in keywords):
                score += topic.confidence * 1.5
        if nlu.detected_tone.primary in ("sadness", "stress"):
            if any(m in line_lower for m in ("miss", "vermis", "emot", "worried", "bang")):
                score += 0.8
        for entity in nlu.entities:
            if entity.text.lower() in line_lower:
                score += entity.confidence
    return score


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-zà-ü]{3,}", text.lower()) if t not in _STOPWORDS}

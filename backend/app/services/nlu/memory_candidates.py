"""Extract memory-worthy candidates from user text and NLU entities."""

from __future__ import annotations

import re
from typing import Literal

from app.domain.models.nlu import ExtractedEntity, MemoryCandidate, MemoryField

AppLang = Literal["nl", "en"]

_MIN_CONFIDENCE = 0.45

_NAME_PATTERNS: list[tuple[str, MemoryField]] = [
    (r"mijn naam is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"ik heet\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"noem (?:mij|me)\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"my name is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"call me\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
]

_FIELD_PATTERNS: list[tuple[str, MemoryField, str, str]] = [
    (r"kleinzoon\s+(\w+)", "family", "family", "kleinzoon {0}"),
    (r"kleindochter\s+(\w+)", "family", "family", "kleindochter {0}"),
    (r"zoon\s+(\w+)", "family", "family", "zoon {0}"),
    (r"dochter\s+(\w+)", "family", "family", "dochter {0}"),
    (r"man\s+(\w+)", "family", "family", "man {0}"),
    (r"vrouw\s+(\w+)", "family", "family", "vrouw {0}"),
    (r"grandson\s+(\w+)", "family", "family", "grandson {0}"),
    (r"granddaughter\s+(\w+)", "family", "family", "granddaughter {0}"),
    (r"my son\s+(\w+)", "family", "family", "son {0}"),
    (r"my daughter\s+(\w+)", "family", "family", "daughter {0}"),
    (r"husband\s+(\w+)", "family", "family", "husband {0}"),
    (r"wife\s+(\w+)", "family", "family", "wife {0}"),
    (r"hond\s+(\w+)", "pets", "pets", "hond {0}"),
    (r"kat\s+(\w+)", "pets", "pets", "kat {0}"),
    (r"dog\s+(?:named\s+)?(\w+)", "pets", "pets", "dog {0}"),
    (r"cat\s+(?:named\s+)?(\w+)", "pets", "pets", "cat {0}"),
    (r"kom\s+uit\s+(.+?)(?:\.|,|$)", "hometown", "place", "{0}"),
    (r"woon\s+in\s+(.+?)(?:\.|,|$)", "hometown", "place", "{0}"),
    (r"(?:from|born in|live in|lived in)\s+(.+?)(?:\.|,|$)", "hometown", "place", "{0}"),
    (r"hobby\s+(?:is\s+)?(.+?)(?:\.|,|$)", "hobbies", "hobby", "{0}"),
    (r"i (?:like|love|enjoy)\s+(.+?)(?:\.|,|$)", "hobbies", "hobby", "{0}"),
    (r"ik hou van\s+(.+?)(?:\.|,|$)", "hobbies", "hobby", "{0}"),
    (r"muziek\s+(.+?)(?:\.|,|$)", "favorite_music", "music", "{0}"),
    (r"music\s+(.+?)(?:\.|,|$)", "favorite_music", "music", "{0}"),
    (r"(?:was|ben)\s+(\w+)\s+geweest", "profession", "work", "{0}"),
    (r"i (?:was|used to be) (?:a|an)\s+(.+?)(?:\.|,|$)", "profession", "work", "{0}"),
    (r"i (?:prefer|like)\s+(.+?)(?:\.|,|$)", "preferences", "preference", "{0}"),
    (r"ik vind\s+(.+?)\s+(?:fijn|leuk)", "preferences", "preference", "{0}"),
    (r"(?:miss|vermis)\s+(.+?)(?:\.|,|$)", "emotional_topics", "emotion", "misses {0}"),
    (r"(?:worried about|bang voor)\s+(.+?)(?:\.|,|$)", "emotional_topics", "emotion", "worried: {0}"),
    (r"(?:happy about|blij met)\s+(.+?)(?:\.|,|$)", "emotional_topics", "emotion", "happy: {0}"),
    (r"(?:visit|bezoek)\s+(?:from\s+)?(.+?)(?:\.|,|$)", "upcoming_visits", "visit", "{0}"),
]

_TRIVIAL = re.compile(
    r"^(yes|no|ok|okay|hello|hi|hallo|hoi|ja|nee|thanks|thank you|dank je|bedankt)\.?$",
    re.I,
)

_SKIP_NAMES = {"fenna", "anna", "guest", "maarten", "peter", "colette"}


def extract_memory_candidates(
    text: str,
    entities: list[ExtractedEntity],
    lang: AppLang = "nl",
) -> list[MemoryCandidate]:
    """Build structured memory candidates; filter low-value items."""
    if not text.strip() or _TRIVIAL.match(text.strip()):
        return []

    lower = text.lower()
    candidates: list[MemoryCandidate] = []
    seen: set[tuple[str, str]] = set()

    def _add(
        field: MemoryField,
        value: str,
        category: str,
        confidence: float,
        source: str = "",
    ) -> None:
        cleaned = value.strip()[:100]
        if not cleaned or len(cleaned) < 2:
            return
        key = (field, cleaned.lower())
        if key in seen:
            return
        if confidence < _MIN_CONFIDENCE:
            return
        seen.add(key)
        candidates.append(
            MemoryCandidate(
                field=field,
                value=cleaned,
                category=category,
                confidence=round(confidence, 2),
                source_text=(source or text)[:160],
            )
        )

    for pattern, field in _NAME_PATTERNS:
        match = re.search(pattern, lower)
        if not match:
            continue
        name = match.group(1).strip(" .,!?'\"")[:40].capitalize()
        if name.lower() not in _SKIP_NAMES:
            _add(field, name, "identity", 0.9, match.group(0))
        break

    for pattern, field, category, template in _FIELD_PATTERNS:
        match = re.search(pattern, lower)
        if not match:
            continue
        value = _format_candidate_value(template, match.groups(), field)
        _add(field, value, category, 0.8, match.group(0))

    for entity in entities:
        if entity.type == "person" and entity.confidence >= 0.8:
            _add("family", entity.text, "family", entity.confidence, entity.text)
        elif entity.type == "pet" and entity.text:
            label = "hond" if "hond" in text.lower() or lang == "nl" else "dog"
            _add("pets", f"{label} {entity.text}", "pets", entity.confidence, entity.text)
        elif entity.type == "place":
            _add("hometown", entity.text, "place", entity.confidence, entity.text)
        elif entity.type == "hobby":
            _add("hobbies", entity.text, "hobby", entity.confidence, entity.text)

    # Meaningful statement — only if nothing else matched and sentence is substantive.
    if not candidates and len(text.split()) >= 8:
        if _looks_meaningful(text):
            _add("notes", text.strip()[:160], "note", 0.5, text)

    return candidates


def _format_candidate_value(
    template: str, groups: tuple[str, ...], field: MemoryField
) -> str:
    value = template.format(*groups).strip()[:100]
    if field in {"family", "pets"} and " " in value:
        relation, name = value.split(" ", 1)
        return f"{relation} {name.strip().capitalize()}"
    if field == "display_name":
        return value.capitalize()
    return value


def _looks_meaningful(text: str) -> bool:
    lower = text.lower()
    markers = (
        "familie",
        "family",
        "kind",
        "vroeger",
        "herinner",
        "miss",
        "vermis",
        "hobby",
        "tuin",
        "muziek",
    )
    return any(marker in lower for marker in markers)

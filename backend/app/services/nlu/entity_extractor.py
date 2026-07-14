"""Lightweight entity extraction — regex and keyword patterns (NL + EN)."""

from __future__ import annotations

import re

from app.domain.models.nlu import EntityType, ExtractedEntity

_FAMILY_PATTERNS: list[tuple[str, EntityType, str]] = [
    (r"\bkleinzoon\s+(\w+)", "person", "kleinzoon"),
    (r"\bkleindochter\s+(\w+)", "person", "kleindochter"),
    (r"\bzoon\s+(\w+)", "person", "zoon"),
    (r"\bdochter\s+(\w+)", "person", "dochter"),
    (r"\bgrandson\s+(\w+)", "person", "grandson"),
    (r"\bgranddaughter\s+(\w+)", "person", "granddaughter"),
    (r"\bmy son\s+(\w+)", "person", "son"),
    (r"\bmy daughter\s+(\w+)", "person", "daughter"),
]

_PET_PATTERNS: list[tuple[str, EntityType]] = [
    (r"\bhond\s+(\w+)", "pet"),
    (r"\bkat\s+(\w+)", "pet"),
    (r"\bdog\s+(?:named\s+)?(\w+)", "pet"),
    (r"\bcat\s+(?:named\s+)?(\w+)", "pet"),
]

_PLACE_PATTERNS: list[str] = [
    r"\bkom\s+uit\s+(.+?)(?:\.|,|$)",
    r"\bwoon\s+in\s+(.+?)(?:\.|,|$)",
    r"\b(?:from|born in|live in|lived in)\s+(.+?)(?:\.|,|$)",
]

_HOBBY_PATTERNS: list[str] = [
    r"\bhobby\s+(?:is\s+)?(.+?)(?:\.|,|$)",
    r"\bik hou van\s+(.+?)(?:\.|,|$)",
    r"\bi (?:like|love|enjoy)\s+(.+?)(?:\.|,|$)",
]

_SKIP_NAMES = {
    "fenna",
    "maarten",
    "peter",
    "colette",
    "anna",
    "guest",
    "ja",
    "nee",
    "the",
    "and",
}


def extract_entities(text: str) -> list[ExtractedEntity]:
    """Extract named entities from user text."""
    if not text.strip():
        return []

    lower = text.lower()
    found: list[ExtractedEntity] = []
    seen: set[str] = set()

    def _add(entity_type: EntityType, raw: str, confidence: float = 0.75) -> None:
        value = raw.strip(" .,!?'\"")[:80]
        if not value or len(value) < 2:
            return
        key = f"{entity_type}:{value.lower()}"
        if key in seen:
            return
        seen.add(key)
        found.append(
            ExtractedEntity(
                type=entity_type,
                text=value,
                normalized=value.lower(),
                confidence=confidence,
            )
        )

    for pattern, entity_type, prefix in _FAMILY_PATTERNS:
        match = re.search(pattern, lower)
        if match:
            name = match.group(1).strip()
            if name.lower() not in _SKIP_NAMES:
                _add("person", f"{prefix} {name}".strip(), 0.85)
                _add("family_relation", prefix, 0.7)

    for pattern, entity_type in _PET_PATTERNS:
        match = re.search(pattern, lower)
        if match:
            _add(entity_type, match.group(1), 0.8)

    for pattern in _PLACE_PATTERNS:
        match = re.search(pattern, lower)
        if match:
            _add("place", match.group(1), 0.75)

    for pattern in _HOBBY_PATTERNS:
        match = re.search(pattern, lower)
        if match:
            _add("hobby", match.group(1), 0.7)

    return found

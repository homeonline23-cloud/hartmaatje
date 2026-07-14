"""
Long-term + session memory store.

Layers:
- Profile memory (JSON per resident): family, pets, hobbies, preferences, life events
- Session summary (in Session.conversation_summary): rolling active topics
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from app.core.config import get_settings
from app.domain.models.nlu import MemoryCandidate
from app.schemas import ResidentMemory

AppLang = Literal["nl", "en"]

# Explicit user name only — never guess from other patterns.
_NAME_PATTERNS: list[tuple[str, str]] = [
    (r"mijn naam is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"ik heet\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"noem (?:mij|me)\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"my name is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
    (r"call me\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})", "display_name"),
]

# (regex, field, template) — bilingual patterns
_PATTERNS: list[tuple[str, str, str]] = [
    # Family — NL
    (r"kleinzoon\s+(\w+)", "family", "kleinzoon {0}"),
    (r"kleindochter\s+(\w+)", "family", "kleindochter {0}"),
    (r"zoon\s+(\w+)", "family", "zoon {0}"),
    (r"dochter\s+(\w+)", "family", "dochter {0}"),
    (r"man\s+(\w+)", "family", "man {0}"),
    (r"vrouw\s+(\w+)", "family", "vrouw {0}"),
    # Family — EN
    (r"grandson\s+(\w+)", "family", "grandson {0}"),
    (r"granddaughter\s+(\w+)", "family", "granddaughter {0}"),
    (r"my son\s+(\w+)", "family", "son {0}"),
    (r"my daughter\s+(\w+)", "family", "daughter {0}"),
    (r"husband\s+(\w+)", "family", "husband {0}"),
    (r"wife\s+(\w+)", "family", "wife {0}"),
    # Pets
    (r"hond\s+(\w+)", "pets", "hond {0}"),
    (r"kat\s+(\w+)", "pets", "kat {0}"),
    (r"dog\s+(?:named\s+)?(\w+)", "pets", "dog {0}"),
    (r"cat\s+(?:named\s+)?(\w+)", "pets", "cat {0}"),
    # Place
    (r"kom\s+uit\s+(.+?)(?:\.|,|$)", "hometown", "{0}"),
    (r"woon\s+in\s+(.+?)(?:\.|,|$)", "hometown", "{0}"),
    (r"(?:from|born in|live in|lived in)\s+(.+?)(?:\.|,|$)", "hometown", "{0}"),
    # Hobbies & routines
    (r"hobby\s+(?:is\s+)?(.+?)(?:\.|,|$)", "hobbies", "{0}"),
    (r"i (?:like|love|enjoy)\s+(.+?)(?:\.|,|$)", "hobbies", "{0}"),
    (r"ik hou van\s+(.+?)(?:\.|,|$)", "hobbies", "{0}"),
    (r"muziek\s+(.+?)(?:\.|,|$)", "favorite_music", "{0}"),
    (r"music\s+(.+?)(?:\.|,|$)", "favorite_music", "{0}"),
    # Profession
    (r"(?:was|ben)\s+(\w+)\s+geweest", "profession", "{0}"),
    (r"i (?:was|used to be) (?:a|an)\s+(.+?)(?:\.|,|$)", "profession", "{0}"),
    # Preferences
    (r"i (?:prefer|like)\s+(.+?)(?:\.|,|$)", "preferences", "{0}"),
    (r"ik vind\s+(.+?)\s+(?:fijn|leuk)", "preferences", "{0}"),
    # Emotional / meaningful topics
    (r"(?:miss|vermis)\s+(.+?)(?:\.|,|$)", "emotional_topics", "misses {0}"),
    (r"(?:worried about|bang voor)\s+(.+?)(?:\.|,|$)", "emotional_topics", "worried: {0}"),
    (r"(?:happy about|blij met)\s+(.+?)(?:\.|,|$)", "emotional_topics", "happy: {0}"),
    # Visits
    (r"(?:visit|bezoek)\s+(?:from\s+)?(.+?)(?:\.|,|$)", "upcoming_visits", "{0}"),
]

_TRIVIAL = re.compile(
    r"^(yes|no|ok|okay|hello|hi|hallo|hoi|ja|nee|thanks|thank you|dank je|bedankt)\.?$",
    re.I,
)


class MemoryStore:
    def __init__(self, base_path: str) -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, ResidentMemory] = {}

    def _path(self, resident_id: str) -> Path:
        safe = re.sub(r"[^\w\-]", "_", resident_id)
        return self.base_path / f"{safe}.json"

    def load(self, resident_id: str) -> ResidentMemory:
        if resident_id in self._cache:
            return self._cache[resident_id]
        path = self._path(resident_id)
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            mem = ResidentMemory(**data)
        else:
            mem = ResidentMemory(resident_id=resident_id)
        self._cache[resident_id] = mem
        return mem

    def save(self, memory: ResidentMemory) -> None:
        memory.updated_at = datetime.now(timezone.utc)
        self._cache[memory.resident_id] = memory
        path = self._path(memory.resident_id)
        path.write_text(
            memory.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def merge_candidates(
        self,
        resident_id: str,
        candidates: list[MemoryCandidate],
        *,
        min_confidence: float = 0.45,
    ) -> bool:
        """Merge structured NLU memory candidates into resident profile."""
        if not candidates:
            return False

        memory = self.load(resident_id)
        updated = False

        for candidate in candidates:
            if candidate.confidence < min_confidence:
                continue
            value = candidate.value.strip()[:100]
            if not value:
                continue
            field = candidate.field

            if field == "display_name":
                name = value[:40].capitalize()
                if name.lower() in {"fenna", "anna", "guest"}:
                    continue
                if memory.display_name != name:
                    memory.display_name = name
                    updated = True
            elif field == "hometown":
                if memory.hometown != value:
                    memory.hometown = value
                    updated = True
            elif field == "profession":
                if memory.profession != value:
                    memory.profession = value
                    updated = True
            elif field in {
                "family",
                "pets",
                "hobbies",
                "favorite_music",
                "preferences",
                "emotional_topics",
                "upcoming_visits",
                "notes",
            }:
                bucket: list[str] = getattr(memory, field)
                if value not in bucket:
                    bucket.append(value)
                    if field == "notes":
                        memory.notes = memory.notes[-20:]
                    updated = True

        if updated:
            self.save(memory)
        return updated

    def extract_and_merge(self, resident_id: str, user_message: str) -> bool:
        """Legacy regex extraction — prefer NLU merge_candidates when available."""
        if _TRIVIAL.match(user_message.strip()):
            return False

        from app.services.nlu.service import analyze_text

        nlu = analyze_text(user_message, "nl")
        if nlu.candidate_memories:
            return self.merge_candidates(resident_id, nlu.candidate_memories)

        memory = self.load(resident_id)
        updated = False
        lower = user_message.lower()

        for pattern, field in _NAME_PATTERNS:
            match = re.search(pattern, lower)
            if not match:
                continue
            value = match.group(1).strip(" .,!?'\"")[:40].capitalize()
            if not value or value.lower() in {"fenna", "anna", "guest"}:
                continue
            if memory.display_name != value:
                memory.display_name = value
                updated = True
            break

        for pattern, field, template in _PATTERNS:
            match = re.search(pattern, lower)
            if not match:
                continue
            value = template.format(*match.groups()).strip()[:100]
            if not value:
                continue

            if field == "hometown":
                if memory.hometown != value:
                    memory.hometown = value
                    updated = True
            elif field == "profession":
                if memory.profession != value:
                    memory.profession = value
                    updated = True
            elif field == "family":
                if value not in memory.family:
                    memory.family.append(value)
                    updated = True
            elif field == "pets":
                if value not in memory.pets:
                    memory.pets.append(value)
                    updated = True
            elif field == "hobbies":
                if value not in memory.hobbies:
                    memory.hobbies.append(value)
                    updated = True
            elif field == "favorite_music":
                if value not in memory.favorite_music:
                    memory.favorite_music.append(value)
                    updated = True
            elif field == "preferences":
                if value not in memory.preferences:
                    memory.preferences.append(value)
                    updated = True
            elif field == "emotional_topics":
                if value not in memory.emotional_topics:
                    memory.emotional_topics.append(value)
                    updated = True
            elif field == "upcoming_visits":
                if value not in memory.upcoming_visits:
                    memory.upcoming_visits.append(value)
                    updated = True

        # Store meaningful non-trivial statements as notes (deduped).
        if len(user_message.split()) >= 6 and not updated:
            note = user_message.strip()[:160]
            if note and note not in memory.notes:
                memory.notes.append(note)
                memory.notes = memory.notes[-20:]
                updated = True

        if updated:
            self.save(memory)
        return updated


def get_memory_store() -> MemoryStore:
    settings = get_settings()
    return MemoryStore(settings.memory_data_path)

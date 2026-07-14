"""Care notes tool — staff notes via shared memory enrichment."""

from __future__ import annotations

from typing import Literal

from app.repositories.memory_repository import get_memory_store
from app.schemas import ResidentMemory
from app.services.memory.enrichment import fetch_care_notes_context, wants_care_notes

AppLang = Literal["nl", "en"]


def fetch_care_notes_context_for_resident(
    resident_id: str,
    query: str,
    lang: AppLang = "nl",
    *,
    memory: ResidentMemory | None = None,
) -> str:
    mem = memory or get_memory_store().load(resident_id)
    return fetch_care_notes_context(mem, query, lang)


__all__ = ["wants_care_notes", "fetch_care_notes_context_for_resident"]

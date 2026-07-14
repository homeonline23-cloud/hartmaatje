"""Calendar tool — upcoming visits via shared memory enrichment."""

from __future__ import annotations

from typing import Literal

from app.repositories.memory_repository import get_memory_store
from app.schemas import ResidentMemory
from app.services.memory.enrichment import fetch_calendar_context, wants_calendar

AppLang = Literal["nl", "en"]


def fetch_calendar_context_for_resident(
    resident_id: str,
    query: str,
    lang: AppLang = "nl",
    *,
    memory: ResidentMemory | None = None,
) -> str:
    mem = memory or get_memory_store().load(resident_id)
    return fetch_calendar_context(mem, query, lang)


__all__ = ["wants_calendar", "fetch_calendar_context_for_resident"]

"""Calendar tool — upcoming visits and schedule context from resident memory."""

from __future__ import annotations

import re
from typing import Literal

from app.repositories.memory_repository import get_memory_store

AppLang = Literal["nl", "en"]

_CALENDAR = re.compile(
    r"\b("
    r"agenda|afspraak|afspraken|bezoek|bezoeken|kalender|planning|"
    r"wanneer komt|wanneer is|komt er|staat er|op mijn agenda|"
    r"appointment|calendar|schedule|visit|visits|when is|when does"
    r")\b",
    re.I,
)


def wants_calendar(query: str) -> bool:
    return bool(_CALENDAR.search(query))


def fetch_calendar_context(resident_id: str, query: str, lang: AppLang = "nl") -> str:
    memory = get_memory_store().load(resident_id)
    visits = [v.strip() for v in memory.upcoming_visits if v.strip()]
    if not visits:
        empty = (
            "No upcoming visits stored for this resident."
            if lang == "en"
            else "Geen opgeslagen bezoeken of afspraken voor deze bewoner."
        )
        return empty

    header = "Upcoming visits:" if lang == "en" else "Komende bezoeken/afspraken:"
    lines = [header, *[f"- {visit}" for visit in visits[:6]]]
    if memory.notes:
        note_hits = [n for n in memory.notes if _CALENDAR.search(n)]
        if note_hits:
            label = "Related notes:" if lang == "en" else "Gerelateerde notities:"
            lines.append(label)
            lines.extend(f"- {note[:120]}" for note in note_hits[:3])
    return "\n".join(lines)

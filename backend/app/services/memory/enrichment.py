"""Tool enrichment — calendar and care notes from shared resident context."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Literal

from app.core.config import BACKEND_ROOT
from app.core.constants import (
    MAX_CALENDAR_VISITS,
    MAX_CARE_MEMORY_NOTES,
    MAX_CARE_STAFF_NOTES,
)
from app.schemas import ResidentMemory

AppLang = Literal["nl", "en"]

_CALENDAR = re.compile(
    r"\b("
    r"agenda|afspraak|afspraken|bezoek|bezoeken|kalender|planning|"
    r"wanneer komt|wanneer is|komt er|staat er|op mijn agenda|"
    r"appointment|calendar|schedule|visit|visits|when is|when does"
    r")\b",
    re.I,
)

_CARE_NOTES = re.compile(
    r"\b("
    r"zorgnotitie|zorgnotities|zorgplan|medicatie|medicijn|medicijnen|"
    r"dossier|verpleeg|verzorg|zorgteam|zorgverlener|"
    r"care note|care notes|care plan|medication|nurse|care team"
    r")\b",
    re.I,
)

_CARE_DATA_DIR = BACKEND_ROOT / "data" / "care_notes"


def wants_calendar(query: str) -> bool:
    return bool(_CALENDAR.search(query))


def wants_care_notes(query: str) -> bool:
    return bool(_CARE_NOTES.search(query))


def _load_staff_notes(resident_id: str) -> list[str]:
    path = _CARE_DATA_DIR / f"{resident_id}.json"
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    notes = data.get("notes", [])
    return [str(n).strip() for n in notes if str(n).strip()]


def fetch_calendar_context(memory: ResidentMemory, query: str, lang: AppLang = "nl") -> str:
    visits = [v.strip() for v in memory.upcoming_visits if v.strip()]
    if not visits:
        return (
            "No upcoming visits stored for this resident."
            if lang == "en"
            else "Geen opgeslagen bezoeken of afspraken voor deze bewoner."
        )

    header = "Upcoming visits:" if lang == "en" else "Komende bezoeken/afspraken:"
    lines = [header, *[f"- {visit}" for visit in visits[:MAX_CALENDAR_VISITS]]]
    if memory.notes:
        note_hits = [n for n in memory.notes if _CALENDAR.search(n)]
        if note_hits:
            label = "Related notes:" if lang == "en" else "Gerelateerde notities:"
            lines.append(label)
            lines.extend(f"- {note[:120]}" for note in note_hits[:3])
    return "\n".join(lines)


def fetch_care_notes_context(memory: ResidentMemory, query: str, lang: AppLang = "nl") -> str:
    _ = query
    staff_notes = _load_staff_notes(memory.resident_id)
    memory_notes = [n for n in memory.notes if _CARE_NOTES.search(n) or len(n) > 20]

    if not staff_notes and not memory_notes:
        return (
            "No care notes available for this resident."
            if lang == "en"
            else "Geen zorgnotities beschikbaar voor deze bewoner."
        )

    lines: list[str] = []
    if staff_notes:
        header = "Staff care notes:" if lang == "en" else "Zorgnotities van het team:"
        lines.append(header)
        lines.extend(f"- {note[:200]}" for note in staff_notes[:MAX_CARE_STAFF_NOTES])
    if memory_notes:
        header = "Relevant resident notes:" if lang == "en" else "Relevante notities van de bewoner:"
        lines.append(header)
        lines.extend(f"- {note[:200]}" for note in memory_notes[:MAX_CARE_MEMORY_NOTES])
    return "\n".join(lines)

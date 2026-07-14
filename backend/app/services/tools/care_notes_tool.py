"""Care notes tool — staff notes and care-relevant resident context."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Literal

from app.core.config import BACKEND_ROOT
from app.repositories.memory_repository import get_memory_store

AppLang = Literal["nl", "en"]

_CARE_NOTES = re.compile(
    r"\b("
    r"zorgnotitie|zorgnotities|zorgplan|medicatie|medicijn|medicijnen|"
    r"dossier|verpleeg|verzorg|zorgteam|zorgverlener|"
    r"care note|care notes|care plan|medication|nurse|care team"
    r")\b",
    re.I,
)

_CARE_DATA_DIR = BACKEND_ROOT / "data" / "care_notes"


def wants_care_notes(query: str) -> bool:
    return bool(_CARE_NOTES.search(query))


def _load_staff_notes(resident_id: str) -> list[str]:
    path = _CARE_DATA_DIR / f"{resident_id}.json"
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    notes = data.get("notes", [])
    return [str(n).strip() for n in notes if str(n).strip()]


def fetch_care_notes_context(resident_id: str, query: str, lang: AppLang = "nl") -> str:
    _ = query
    memory = get_memory_store().load(resident_id)
    staff_notes = _load_staff_notes(resident_id)
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
        lines.extend(f"- {note[:200]}" for note in staff_notes[:5])
    if memory_notes:
        header = "Relevant resident notes:" if lang == "en" else "Relevante notities van de bewoner:"
        lines.append(header)
        lines.extend(f"- {note[:200]}" for note in memory_notes[:4])
    return "\n".join(lines)

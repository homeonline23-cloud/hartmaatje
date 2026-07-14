"""Load runtime persona config for Fenna, Maarten, Peter, and Colette."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.domain.models.persona import PersonaCatalog, PersonaConfig, PersonaId

# TODO: migrate to per-persona JSON files under data/personas/ (see docs/BACKEND-STRUCTURE.md)
DEFAULT_PERSONA_ID: PersonaId = "fenna"
VALID_PERSONA_IDS: tuple[PersonaId, ...] = ("fenna", "maarten", "peter", "colette")


def _map_character(raw: dict[str, Any]) -> PersonaConfig:
    return PersonaConfig(
        id=raw["id"],
        name=raw["name"],
        intro_line=raw["intro_line"],
        system_prompt=raw.get("identity_prompt", raw.get("system_prompt", "")).strip(),
        voice_style=raw.get("voice_style", ""),
        response_style_rules=list(raw.get("response_style_rules") or []),
        memory_rules=list(raw.get("memory_rules") or []),
        safety_rules=list(raw.get("safety_rules") or []),
        forbidden_behaviors=list(raw.get("forbidden_behaviors") or []),
    )


@lru_cache
def _load_catalog_from_path(path: str) -> PersonaCatalog:
    config_path = Path(path)
    if not config_path.is_file():
        raise FileNotFoundError(f"Persona config not found: {config_path}")
    data = json.loads(config_path.read_text(encoding="utf-8"))
    characters = [_map_character(item) for item in data.get("characters", [])]
    return PersonaCatalog(
        version=str(data.get("version", "0")),
        app=str(data.get("app", "Hartmaatje")),
        language=str(data.get("language", "nl-NL")),
        characters=characters,
    )


def get_persona_catalog() -> PersonaCatalog:
    settings = get_settings()
    return _load_catalog_from_path(str(settings.resolved_persona_config_path))


def normalize_persona_id(value: str | None) -> PersonaId:
    if not value:
        return DEFAULT_PERSONA_ID
    lowered = value.strip().lower()
    if lowered in VALID_PERSONA_IDS:
        return lowered  # type: ignore[return-value]
    return DEFAULT_PERSONA_ID


def get_persona(persona_id: str | None = None) -> PersonaConfig:
    catalog = get_persona_catalog()
    target = normalize_persona_id(persona_id)
    for persona in catalog.characters:
        if persona.id == target:
            return persona
    raise KeyError(f"Persona not found: {target}")


def get_intro_line(persona_id: str | None = None) -> str:
    return get_persona(persona_id).intro_line


def clear_persona_cache() -> None:
    """For tests after swapping config path."""
    _load_catalog_from_path.cache_clear()

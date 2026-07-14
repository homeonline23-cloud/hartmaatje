"""Load runtime persona config for Fenna, Maarten, Peter, and Colette."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import BACKEND_ROOT, get_settings
from app.domain.models.persona import PersonaCatalog, PersonaConfig, PersonaId

DEFAULT_PERSONA_ID: PersonaId = "fenna"
VALID_PERSONA_IDS: tuple[PersonaId, ...] = ("fenna", "maarten", "peter", "colette")
DEFAULT_PERSONAS_DIR = BACKEND_ROOT / "data" / "personas"


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


def _load_catalog_from_monolith(path: Path) -> PersonaCatalog:
    data = json.loads(path.read_text(encoding="utf-8"))
    characters = [_map_character(item) for item in data.get("characters", [])]
    return PersonaCatalog(
        version=str(data.get("version", "0")),
        app=str(data.get("app", "Hartmaatje")),
        language=str(data.get("language", "nl-NL")),
        characters=characters,
    )


def _load_catalog_from_dir(personas_dir: Path) -> PersonaCatalog:
    catalog_path = personas_dir / "catalog.json"
    if not catalog_path.is_file():
        raise FileNotFoundError(f"Persona catalog not found: {catalog_path}")

    catalog_data = json.loads(catalog_path.read_text(encoding="utf-8"))
    characters: list[PersonaConfig] = []
    for persona_id in catalog_data.get("personas", []):
        persona_path = personas_dir / f"{persona_id}.json"
        if not persona_path.is_file():
            raise FileNotFoundError(f"Persona file not found: {persona_path}")
        raw = json.loads(persona_path.read_text(encoding="utf-8"))
        characters.append(_map_character(raw))

    return PersonaCatalog(
        version=str(catalog_data.get("version", "0")),
        app=str(catalog_data.get("app", "Hartmaatje")),
        language=str(catalog_data.get("language", "nl-NL")),
        characters=characters,
    )


@lru_cache
def _load_catalog(cache_key: str) -> PersonaCatalog:
    path = Path(cache_key)
    if path.is_dir():
        return _load_catalog_from_dir(path)
    return _load_catalog_from_monolith(path)


def _resolved_personas_path() -> Path:
    settings = get_settings()
    if settings.persona_config_path.strip():
        return Path(settings.persona_config_path)
    if settings.personas_dir.strip():
        return Path(settings.personas_dir)
    if DEFAULT_PERSONAS_DIR.is_dir() and (DEFAULT_PERSONAS_DIR / "catalog.json").is_file():
        return DEFAULT_PERSONAS_DIR
    return (
        BACKEND_ROOT.parent
        / "src"
        / "lib"
        / "companion"
        / "productionCharacters.json"
    )


def get_persona_catalog() -> PersonaCatalog:
    return _load_catalog(str(_resolved_personas_path().resolve()))


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
    _load_catalog.cache_clear()

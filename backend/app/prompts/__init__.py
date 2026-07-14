"""Load persona configuration — YAML reference; runtime JSON in data/personas/."""

from typing import Any

import yaml
from pathlib import Path

from app.core.lang import AppLang, normalize_lang
from app.services.personas.persona_loader import get_intro_line, get_persona, normalize_persona_id
from app.services.prompts.prompt_builder import build_system_prompt

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "services" / "prompts"

PERSONA_FILES: dict[AppLang, str] = {
    "nl": "fenna_persona_v3.yaml",
    "en": "fenna_persona_en_v3.yaml",
}


def _load_yaml(name: str) -> dict[str, Any]:
    with (PROMPTS_DIR / name).open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_fenna_persona(lang: AppLang = "nl") -> dict[str, Any]:
    """Legacy YAML loader — prefer get_persona() from data/personas/."""
    return _load_yaml(PERSONA_FILES[lang])


def get_fenna_system_prompt(lang: AppLang = "nl") -> str:
    return build_system_prompt(get_persona("fenna"), lang=lang)


def get_fenna_opening_message(lang: AppLang = "nl", character_id: str | None = None) -> str:
    return get_intro_line(character_id or "fenna")


__all__ = [
    "AppLang",
    "normalize_lang",
    "normalize_persona_id",
    "get_persona",
    "get_intro_line",
    "build_system_prompt",
    "load_fenna_persona",
    "get_fenna_system_prompt",
    "get_fenna_opening_message",
]

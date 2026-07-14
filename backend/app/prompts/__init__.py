"""Load persona configuration — YAML kept for reference; runtime JSON is source of truth."""

from typing import Any, Literal

import yaml
from pathlib import Path

from app.services.personas.persona_loader import get_intro_line, get_persona, normalize_persona_id
from app.services.prompts.prompt_builder import build_system_prompt

PROMPTS_DIR = Path(__file__).parent
AppLang = Literal["nl", "en"]

PERSONA_FILES: dict[AppLang, str] = {
    "nl": "fenna_persona_v3.yaml",
    "en": "fenna_persona_en_v3.yaml",
}


def normalize_lang(lang: str | None) -> AppLang:
    return "en" if lang and lang.lower().startswith("en") else "nl"


def _load_yaml(name: str) -> dict[str, Any]:
    with (PROMPTS_DIR / name).open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_fenna_persona(lang: AppLang = "nl") -> dict[str, Any]:
    """Legacy YAML loader — prefer get_persona() from productionCharacters.json."""
    return _load_yaml(PERSONA_FILES[lang])


def get_fenna_system_prompt(lang: AppLang = "nl") -> str:
    return build_system_prompt(get_persona("fenna"), lang=lang)


def get_fenna_opening_message(lang: AppLang = "nl", character_id: str | None = None) -> str:
    return get_intro_line(character_id or "fenna")

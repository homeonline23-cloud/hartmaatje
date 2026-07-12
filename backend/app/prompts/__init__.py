"""Load Fenna persona configuration."""

from pathlib import Path
from typing import Any, Literal

import yaml

PROMPTS_DIR = Path(__file__).parent
AppLang = Literal["nl", "en"]

# v3 = natural conversation (geen interview-modus)
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
    return _load_yaml(PERSONA_FILES[lang])


def get_fenna_system_prompt(lang: AppLang = "nl") -> str:
    return load_fenna_persona(lang)["system_prompt"].strip()


def get_fenna_opening_message(lang: AppLang = "nl") -> str:
    return load_fenna_persona(lang)["opening_message"].strip()

"""Language helpers shared across API and services."""

from __future__ import annotations

from typing import Literal

AppLang = Literal["nl", "en"]


def normalize_lang(lang: str | None) -> AppLang:
    return "en" if lang and lang.lower().startswith("en") else "nl"

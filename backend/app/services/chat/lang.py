"""Resolve session language from request override or session default."""

from __future__ import annotations

from typing import Literal, Optional

from app.prompts import normalize_lang
from app.services.chat.session_manager import Session

AppLang = Literal["nl", "en"]


def resolve_session_lang(session: Session, override: Optional[str] = None) -> AppLang:
    lang = normalize_lang(override or session.lang)
    session.lang = lang
    return lang

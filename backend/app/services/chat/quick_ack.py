"""Short discourse bridges — not interview questions."""

from __future__ import annotations

import re
from typing import Literal

AppLang = Literal["nl", "en"]

# Very short — fast TTS, keeps conversation flowing
_ACKS_EN: dict[str, list[str]] = {
    "greeting": ["Hello.", "Hi there."],
    "sad": ["I hear you.", "That matters."],
    "happy": ["How nice.", "That sounds lovely."],
    "memory": ["Yes, I remember.", "Thank you for sharing that."],
    "default": ["Yes.", "I see.", "Right."],
}

_ACKS_NL: dict[str, list[str]] = {
    "greeting": ["Hallo.", "Dag."],
    "sad": ["Ik hoor u.", "Dat is belangrijk."],
    "happy": ["Wat fijn.", "Dat klinkt mooi."],
    "memory": ["Ja, dat onthoud ik.", "Dank u dat u het deelt."],
    "default": ["Ja.", "Ik snap het.", "Zo."],
}

_SAD = re.compile(
    r"\b(sad|lonely|miss|worried|afraid|scared|pain|hurt|alone|verdrietig|eenzaam|"
    r"mis|bang|zorgen|pijn|alleen)\b",
    re.I,
)
_HAPPY = re.compile(
    r"\b(happy|glad|wonderful|lovely|great|nice|beautiful|blij|fijn|mooi|prachtig|"
    r"heerlijk|goed)\b",
    re.I,
)
_GREETING = re.compile(
    r"^(hello|hi|hey|good morning|good evening|hallo|hoi|goedemorgen|goedenavond)\b",
    re.I,
)
_MEMORY = re.compile(
    r"\b(remember|recall|told you|last time|grandson|granddaughter|family|pet|"
    r"onthoud|herinner|verteld|kleinzoon|kleindochter|familie|hond|kat)\b",
    re.I,
)


def _pick(pool: list[str], turn_index: int) -> str:
    return pool[turn_index % len(pool)]


def select_quick_ack(user_text: str, lang: AppLang, turn_count: int) -> str:
    """Tiny bridge phrase — never sounds like a new interview question."""
    text = user_text.strip()
    acks = _ACKS_EN if lang == "en" else _ACKS_NL

    if _GREETING.search(text):
        return _pick(acks["greeting"], turn_count)
    if _SAD.search(text):
        return _pick(acks["sad"], turn_count)
    if _HAPPY.search(text):
        return _pick(acks["happy"], turn_count)
    if _MEMORY.search(text):
        return _pick(acks["memory"], turn_count)
    return _pick(acks["default"], turn_count)

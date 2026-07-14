"""
Clean STT output and replies — blocks invented names and echo of Fenna's voice.
"""

from __future__ import annotations

import re
from typing import Literal, Optional

AppLang = Literal["nl", "en"]

# Often misheard when the mic picks up Fenna's own voice from the speaker.
_ECHO_NAMES = frozenset(
    {
        "anna",
        "ana",
        "fenna",
        "fen",
        "fina",
        "sanna",
        "sana",
        "venna",
        "henna",
        "fena",
        "phone",
        "fono",
    }
)

_GREETING_ONLY = re.compile(
    r"^(hallo|hoi|dag|goedendag|goedenavond|goedemorgen|hello|hi|hey)[\s,!.?]*$",
    re.I,
)

_INTRO_NAME = re.compile(
    r"(?:"
    r"mijn naam is|ik heet|noem mij|noem me|"
    r"my name is|call me"
    r")\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})",
    re.I,
)

_GREETING_PLUS_WORD = re.compile(
    r"^(hallo|hoi|dag|goedendag|goedenavond|goedemorgen|hello|hi|hey)"
    r"[\s,]+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{0,30})\.?$",
    re.I,
)

_REPLY_NAME_GREETING = re.compile(
    r"^(?:hallo|hoi|dag|goedendag|goedenavond|goedemorgen|hello|hi|hey)"
    r"[\s,]+([A-ZÀ-Ÿ][\w\-']{1,30})[\s,!.?—-]+",
    re.I,
)


def extract_confirmed_name(text: str) -> Optional[str]:
    """Only trust an explicit self-introduction."""
    match = _INTRO_NAME.search(text.strip())
    if not match:
        return None
    name = match.group(1).strip(" .,!?'\"")
    if not name or name.lower() in _ECHO_NAMES:
        return None
    return name[:40].capitalize()


def sanitize_user_transcript(text: str, known_name: Optional[str] = None) -> str:
    """
    Remove STT hallucinations — especially 'Hallo Anna' when the user only said hello,
    or when the mic echoed Fenna's voice.
    """
    cleaned = " ".join(text.replace("\n", " ").split()).strip()
    if not cleaned:
        return ""

    intro = extract_confirmed_name(cleaned)
    if intro:
        return cleaned

    if _GREETING_ONLY.match(cleaned):
        return cleaned.split()[0].capitalize() if cleaned else cleaned

    greet = _GREETING_PLUS_WORD.match(cleaned)
    if greet:
        trailing = greet.group(2).strip(" .,!?'\"")
        if trailing.lower() in _ECHO_NAMES:
            return greet.group(1).capitalize()
        if known_name and trailing.lower() == known_name.lower():
            return cleaned
        if len(trailing) <= 12 and not known_name:
            return greet.group(1).capitalize()

    return cleaned


def sanitize_fenna_reply(
    reply: str,
    known_name: Optional[str] = None,
    lang: AppLang = "nl",
) -> str:
    """Never address the user by a name they did not confirm."""
    text = " ".join(reply.split()).strip()
    if not text:
        return text

    if known_name:
        return text

    stripped = _REPLY_NAME_GREETING.sub("", text, count=1).strip()
    if stripped and stripped != text:
        stripped = stripped[0].upper() + stripped[1:] if stripped else stripped
        return stripped

    return text

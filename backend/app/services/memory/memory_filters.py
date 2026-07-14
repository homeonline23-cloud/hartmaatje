"""Memory filters — identity and low-value guards."""

from __future__ import annotations

import re

_IDENTITY_QUESTION = re.compile(
    r"(wie\s+ben(?:t)?\s+(jij|u)|hoe\s+heet\s+(jij|u)|what(?:'s| is)\s+your\s+name|who\s+are\s+you)",
    re.IGNORECASE,
)


def is_identity_question(user_message: str) -> bool:
    """True when user asks about companion identity — skip user memory injection."""
    return bool(_IDENTITY_QUESTION.search(user_message))

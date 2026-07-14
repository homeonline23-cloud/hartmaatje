"""In-memory session manager — MVP. Replace with Redis/Postgres for production."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional


@dataclass
class ChatTurn:
    role: str  # "user" | "assistant"
    content: str
    at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class Session:
    session_id: str
    resident_id: str
    display_name: Optional[str]
    lang: str
    character_id: str = "fenna"
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    turns: List[ChatTurn] = field(default_factory=list)
    conversation_summary: str = ""

    active_topic: str = ""
    open_user_speech: str = ""

    @property
    def is_active(self) -> bool:
        return self.ended_at is None

    def add_turn(self, role: str, content: str) -> None:
        self.turns.append(ChatTurn(role=role, content=content))

    def recent_turns(self, limit: int = 16) -> List[ChatTurn]:
        return self.turns[-limit:]

    def update_summary(self, user_text: str, assistant_text: str) -> None:
        """Rolling short summary + active topic thread."""
        snippet = user_text.strip()[:120]
        if not snippet:
            return
        parts = [p.strip() for p in self.conversation_summary.split(" | ") if p.strip()]
        parts.append(snippet)
        self.conversation_summary = " | ".join(parts[-6:])
        self.active_topic = snippet[:80]


class SessionManager:
    """Sessions stay open until manually ended — no auto-close timer."""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    def start(
        self,
        resident_id: str,
        display_name: Optional[str] = None,
        lang: str = "nl",
        character_id: str = "fenna",
    ) -> Session:
        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            resident_id=resident_id,
            display_name=display_name,
            lang="en" if lang.lower().startswith("en") else "nl",
            character_id=character_id if character_id in {"fenna", "maarten", "peter", "colette"} else "fenna",
            started_at=datetime.now(timezone.utc),
        )
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> Optional[Session]:
        session = self._sessions.get(session_id)
        if session and session.is_active:
            return session
        return None

    def get_any(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def end(self, session_id: str) -> Optional[Session]:
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.ended_at = datetime.now(timezone.utc)
        return session


# Singleton for MVP
session_manager = SessionManager()

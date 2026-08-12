from __future__ import annotations

import asyncio
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.events import EventEnvelope, make_event
from app.fsm import SessionFSM, TransitionResult


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class SessionRecord:
    session_id: str
    session_token: str
    user_id: str
    external_user_id: str
    display_name: str
    device_type: str
    locale: str
    companion_id: str | None
    fsm: SessionFSM
    current_turn_id: str | None = None
    started_at: datetime = field(default_factory=_now)
    last_activity_at: datetime = field(default_factory=_now)
    ended_at: datetime | None = None
    close_reason: str | None = None
    seq: int = 0
    event_log: list[EventEnvelope] = field(default_factory=list)
    transitions: list[dict[str, Any]] = field(default_factory=list)
    subscribers: list[asyncio.Queue[EventEnvelope]] = field(default_factory=list)

    @property
    def current_state(self) -> str:
        return self.fsm.state

    def next_seq(self) -> int:
        self.seq += 1
        return self.seq

    def touch(self) -> None:
        self.last_activity_at = _now()


class SessionManager:
    """In-memory session store for local fase-1 (Postgres/Redis later)."""

    def __init__(self, initial_state: str = "READY") -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._initial_state = initial_state

    def create(
        self,
        *,
        external_user_id: str,
        display_name: str,
        device_type: str = "tablet-web",
        locale: str = "nl-NL",
        companion_id: str | None = None,
    ) -> SessionRecord:
        session_id = str(uuid4())
        record = SessionRecord(
            session_id=session_id,
            session_token=secrets.token_urlsafe(24),
            user_id=str(uuid4()),
            external_user_id=external_user_id,
            display_name=display_name,
            device_type=device_type,
            locale=locale,
            companion_id=companion_id,
            fsm=SessionFSM(self._initial_state),
        )
        self._sessions[session_id] = record
        return record

    def get(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def close(self, session_id: str, reason: str = "client_close") -> SessionRecord | None:
        record = self._sessions.get(session_id)
        if not record:
            return None
        record.ended_at = _now()
        record.close_reason = reason
        record.touch()
        return record

    async def publish(self, session_id: str, event: EventEnvelope) -> None:
        record = self._sessions.get(session_id)
        if not record:
            return
        record.event_log.append(event)
        record.touch()
        dead: list[asyncio.Queue[EventEnvelope]] = []
        for q in record.subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            record.subscribers.remove(q)

    def subscribe(self, session_id: str) -> asyncio.Queue[EventEnvelope] | None:
        record = self._sessions.get(session_id)
        if not record:
            return None
        q: asyncio.Queue[EventEnvelope] = asyncio.Queue(maxsize=200)
        record.subscribers.append(q)
        return q

    def unsubscribe(self, session_id: str, q: asyncio.Queue[EventEnvelope]) -> None:
        record = self._sessions.get(session_id)
        if not record:
            return
        if q in record.subscribers:
            record.subscribers.remove(q)

    async def apply_trigger(
        self,
        session_id: str,
        trigger: str,
        *,
        reason: str,
        source: str,
        turn_id: str | None = None,
        extra_payload: dict[str, Any] | None = None,
    ) -> TransitionResult | None:
        record = self._sessions.get(session_id)
        if not record:
            return None
        result = record.fsm.transition(trigger, reason)
        if result.ok:
            record.transitions.append(
                {
                    "from_state": result.from_state,
                    "to_state": result.to_state,
                    "reason": result.reason,
                    "source": source,
                    "turn_id": turn_id or record.current_turn_id,
                    "at": _now().isoformat(),
                }
            )
            payload = {
                "from_state": result.from_state,
                "to_state": result.to_state,
                "reason": result.reason,
                **(extra_payload or {}),
            }
            event = make_event(
                type="state.update",
                session_id=session_id,
                seq=record.next_seq(),
                source=source,
                turn_id=turn_id or record.current_turn_id,
                payload=payload,
            )
            await self.publish(session_id, event)
        return result

    def to_public(self, record: SessionRecord) -> dict[str, Any]:
        return {
            "session_id": record.session_id,
            "session_token": record.session_token,
            "user_id": record.user_id,
            "external_user_id": record.external_user_id,
            "display_name": record.display_name,
            "device_type": record.device_type,
            "locale": record.locale,
            "companion_id": record.companion_id,
            "current_state": record.current_state,
            "current_turn_id": record.current_turn_id,
            "started_at": record.started_at.isoformat(),
            "last_activity_at": record.last_activity_at.isoformat(),
            "ended_at": record.ended_at.isoformat() if record.ended_at else None,
            "close_reason": record.close_reason,
        }

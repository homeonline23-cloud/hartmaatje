from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class EventEnvelope(BaseModel):
    type: str
    session_id: str
    turn_id: str | None = None
    seq: int
    ts: str = Field(default_factory=utc_now_iso)
    source: str
    payload: dict[str, Any] = Field(default_factory=dict)


def make_event(
    *,
    type: str,
    session_id: str,
    seq: int,
    source: str,
    payload: dict[str, Any] | None = None,
    turn_id: str | None = None,
) -> EventEnvelope:
    return EventEnvelope(
        type=type,
        session_id=session_id,
        turn_id=turn_id,
        seq=seq,
        source=source,
        payload=payload or {},
    )


def new_turn_id() -> str:
    return f"turn_{uuid4().hex[:8]}"

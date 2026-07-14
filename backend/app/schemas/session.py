"""Session API schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SessionStartRequest(BaseModel):
    resident_id: str = Field(default="guest", description="Stable ID for memory across days")
    display_name: Optional[str] = None
    lang: Literal["nl", "en"] = "nl"
    character_id: Optional[Literal["fenna", "maarten", "peter", "colette"]] = "fenna"


class SessionStartResponse(BaseModel):
    session_id: str
    resident_id: str
    character_id: str
    opening_message: str
    started_at: datetime


class SessionEndRequest(BaseModel):
    session_id: str


class SessionEndResponse(BaseModel):
    session_id: str
    ended_at: datetime
    message: str = "Sessie beëindigd. Tot ziens."

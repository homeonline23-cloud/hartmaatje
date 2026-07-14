"""Chat and voice API schemas."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.safety import SafetyFlag


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    lang: Optional[Literal["nl", "en"]] = None


class ChatMessageResponse(BaseModel):
    session_id: str
    reply: str
    safety: list[SafetyFlag] = []
    memory_updated: bool = False
    prompt_version: str = "persona-v2.1"


class TranscribeRequest(BaseModel):
    session_id: str
    audio_base64: str
    mime_type: str = "audio/webm"
    lang: Optional[Literal["nl", "en"]] = None


class TranscribeResponse(BaseModel):
    text: str


class SpeakRequest(BaseModel):
    session_id: str
    text: str = Field(min_length=1, max_length=900)
    lang: Optional[Literal["nl", "en"]] = None


class SpeakResponse(BaseModel):
    audio_base64: str
    mime_type: str


class VoiceTurnRequest(BaseModel):
    session_id: str
    audio_base64: str
    mime_type: str = "audio/webm"
    lang: Optional[Literal["nl", "en"]] = None
    turn_phase: Literal["phrase", "complete"] = "complete"


class VoiceTurnResponse(BaseModel):
    session_id: str
    user_text: str
    reply: str
    quick_ack: str = ""
    audio_base64: str
    mime_type: str
    quick_ack_audio_base64: Optional[str] = None
    quick_ack_mime_type: Optional[str] = None
    safety: list[SafetyFlag] = []
    memory_updated: bool = False
    timings_ms: dict[str, float] = Field(default_factory=dict)

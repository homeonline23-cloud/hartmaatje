"""Pydantic request/response models."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AlertType(str, Enum):
    emergency = "emergency"
    distress = "distress"
    medical_boundary = "medical_boundary"


class SessionStartRequest(BaseModel):
    resident_id: str = Field(default="guest", description="Stable ID for memory across days")
    display_name: Optional[str] = None
    lang: Literal["nl", "en"] = "nl"


class SessionStartResponse(BaseModel):
    session_id: str
    resident_id: str
    opening_message: str
    started_at: datetime


class SessionEndRequest(BaseModel):
    session_id: str


class SessionEndResponse(BaseModel):
    session_id: str
    ended_at: datetime
    message: str = "Sessie beëindigd. Tot ziens."


class ChatMessageRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    lang: Optional[Literal["nl", "en"]] = None


class SafetyFlag(BaseModel):
    type: AlertType
    triggered: bool = False
    message: Optional[str] = None


class ChatMessageResponse(BaseModel):
    session_id: str
    reply: str
    safety: list[SafetyFlag] = []
    memory_updated: bool = False
    prompt_version: str = "fenna-v1"


class EmergencyAlertRequest(BaseModel):
    session_id: str
    resident_id: str
    excerpt: str
    alert_type: Literal["emergency", "distress"] = "emergency"


class EmergencyAlertResponse(BaseModel):
    logged: bool
    webhook_sent: bool
    alert_id: str


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


class HealthResponse(BaseModel):
    status: str
    app: str
    fenna_ready: bool


class ResidentMemory(BaseModel):
    resident_id: str
    display_name: Optional[str] = None
    family: list[str] = Field(default_factory=list)
    pets: list[str] = Field(default_factory=list)
    hometown: Optional[str] = None
    hobbies: list[str] = Field(default_factory=list)
    favorite_music: list[str] = Field(default_factory=list)
    profession: Optional[str] = None
    preferences: list[str] = Field(default_factory=list)
    emotional_topics: list[str] = Field(default_factory=list)
    upcoming_visits: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    updated_at: Optional[datetime] = None

    def to_prompt_block(
        self,
        lang: Literal["nl", "en"] = "nl",
        session_summary: str = "",
    ) -> str:
        en = lang == "en"
        parts: list[str] = []
        if self.display_name:
            parts.append(f"Name: {self.display_name}" if en else f"Naam: {self.display_name}")
        if self.hometown:
            parts.append(
                f"Hometown: {self.hometown}" if en else f"Woonplaats/herkomst: {self.hometown}"
            )
        if self.family:
            parts.append(
                f"Family: {', '.join(self.family[-8:])}"
                if en
                else f"Familie: {', '.join(self.family[-8:])}"
            )
        if self.pets:
            parts.append(
                f"Pets: {', '.join(self.pets)}" if en else f"Huisdieren: {', '.join(self.pets)}"
            )
        if self.hobbies:
            parts.append(
                f"Hobbies: {', '.join(self.hobbies[-6:])}"
                if en
                else f"Hobby's: {', '.join(self.hobbies[-6:])}"
            )
        if self.favorite_music:
            parts.append(
                f"Music: {', '.join(self.favorite_music[-4:])}"
                if en
                else f"Muziek: {', '.join(self.favorite_music[-4:])}"
            )
        if self.profession:
            parts.append(
                f"Former work: {self.profession}" if en else f"Beroep (vroeger): {self.profession}"
            )
        if self.preferences:
            parts.append(
                f"Preferences: {', '.join(self.preferences[-6:])}"
                if en
                else f"Voorkeuren: {', '.join(self.preferences[-6:])}"
            )
        if self.emotional_topics:
            parts.append(
                f"Important feelings/topics: {', '.join(self.emotional_topics[-5:])}"
                if en
                else f"Belangrijke gevoelens/onderwerpen: {', '.join(self.emotional_topics[-5:])}"
            )
        if self.upcoming_visits:
            parts.append(
                f"Visits: {', '.join(self.upcoming_visits[-4:])}"
                if en
                else f"Bezoek: {', '.join(self.upcoming_visits[-4:])}"
            )
        if self.notes:
            parts.append(
                f"Recent notes: {'; '.join(self.notes[-4:])}"
                if en
                else f"Recente notities: {'; '.join(self.notes[-4:])}"
            )
        if session_summary:
            parts.append(
                f"This session so far: {session_summary}"
                if en
                else f"Dit gesprek tot nu toe: {session_summary}"
            )
        if not parts:
            return (
                "No stored memories yet."
                if en
                else "Nog geen opgeslagen herinneringen."
            )
        return "\n".join(parts)

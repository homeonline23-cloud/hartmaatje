"""Structured NLU result models for HartMaatje Phase 2."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

EntityType = Literal[
    "person",
    "place",
    "pet",
    "hobby",
    "family_relation",
    "preference",
    "other",
]

MemoryField = Literal[
    "display_name",
    "family",
    "pets",
    "hometown",
    "hobbies",
    "favorite_music",
    "profession",
    "preferences",
    "emotional_topics",
    "upcoming_visits",
    "notes",
]

TopicId = Literal[
    "family",
    "loneliness",
    "gardening",
    "music",
    "health_concerns",
    "faith",
    "daily_life",
]

ToneId = Literal["sadness", "confusion", "joy", "calm", "neutral", "stress"]

SafetySignalType = Literal[
    "distress_hint",
    "health_hint",
    "loneliness_hint",
    "emergency_hint",
]


class ExtractedEntity(BaseModel):
    type: EntityType
    text: str
    normalized: str = ""
    confidence: float = 0.5


class MemoryCandidate(BaseModel):
    field: MemoryField
    value: str
    category: str = ""
    confidence: float = 0.5
    source_text: str = ""


class DetectedTopic(BaseModel):
    id: TopicId
    label: str
    confidence: float


class DetectedTone(BaseModel):
    primary: ToneId = "neutral"
    confidence: float = 0.5
    secondary: Optional[ToneId] = None


class NluSafetySignal(BaseModel):
    type: SafetySignalType
    message: str
    confidence: float = 0.5


class NluResult(BaseModel):
    entities: list[ExtractedEntity] = Field(default_factory=list)
    candidate_memories: list[MemoryCandidate] = Field(default_factory=list)
    detected_topics: list[DetectedTopic] = Field(default_factory=list)
    detected_tone: DetectedTone = Field(default_factory=DetectedTone)
    safety_signals: list[NluSafetySignal] = Field(default_factory=list)
    intent: Optional[str] = None

"""DTOs for the voice-changer feature — custom cloned voices per persona."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class VoiceModelStatus(BaseModel):
    persona_id: str
    has_model: bool
    has_index: bool = False
    original_filename: Optional[str] = None
    index_filename: Optional[str] = None
    uploaded_at: Optional[str] = None


class VoiceModelListResponse(BaseModel):
    models: list[VoiceModelStatus]

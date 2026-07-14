"""Pydantic models for HartMaatje runtime personas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

PersonaId = Literal["fenna", "maarten", "peter", "colette"]


class PersonaConfig(BaseModel):
    """Runtime persona — loaded from productionCharacters.json."""

    id: PersonaId
    name: str
    intro_line: str
    system_prompt: str = Field(description="Mapped from identity_prompt in JSON.")
    voice_style: str = ""
    response_style_rules: list[str] = Field(default_factory=list)
    memory_rules: list[str] = Field(default_factory=list)
    safety_rules: list[str] = Field(default_factory=list)
    forbidden_behaviors: list[str] = Field(default_factory=list)


class PersonaCatalog(BaseModel):
    version: str
    app: str
    language: str
    characters: list[PersonaConfig]

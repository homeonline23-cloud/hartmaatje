"""Persona API schemas."""

from pydantic import BaseModel


class PersonaSummary(BaseModel):
    id: str
    name: str
    intro_line: str


class PersonaListResponse(BaseModel):
    personas: list[PersonaSummary]


class PersonaDetailResponse(BaseModel):
    id: str
    name: str
    intro_line: str
    voice_style: str = ""
    response_style_rules: list[str] = []

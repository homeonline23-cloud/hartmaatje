"""Persona listing and detail endpoints."""

from fastapi import APIRouter, HTTPException

from app.schemas.persona import PersonaDetailResponse, PersonaListResponse, PersonaSummary
from app.services.personas.persona_loader import get_persona, get_persona_catalog, normalize_persona_id

router = APIRouter(prefix="/personas", tags=["personas"])


@router.get("", response_model=PersonaListResponse)
async def list_personas() -> PersonaListResponse:
    catalog = get_persona_catalog()
    return PersonaListResponse(
        personas=[
            PersonaSummary(id=p.id, name=p.name, intro_line=p.intro_line)
            for p in catalog.characters
        ]
    )


@router.get("/{persona_id}", response_model=PersonaDetailResponse)
async def get_persona_detail(persona_id: str) -> PersonaDetailResponse:
    try:
        persona = get_persona(normalize_persona_id(persona_id))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Persona niet gevonden.") from exc
    return PersonaDetailResponse(
        id=persona.id,
        name=persona.name,
        intro_line=persona.intro_line,
        voice_style=persona.voice_style,
        response_style_rules=persona.response_style_rules,
    )

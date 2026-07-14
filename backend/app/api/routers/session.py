from fastapi import APIRouter, HTTPException

from app.schemas import (
    SessionEndRequest,
    SessionEndResponse,
    SessionStartRequest,
    SessionStartResponse,
)
from app.core.lang import normalize_lang
from app.services.personas.persona_loader import get_intro_line, normalize_persona_id
from app.services.chat.session_manager import session_manager

router = APIRouter(prefix="/session", tags=["session"])


@router.post("/start", response_model=SessionStartResponse)
async def start_session(body: SessionStartRequest) -> SessionStartResponse:
    """Start a companion session. Stays open until /session/end — no auto-close."""
    lang = normalize_lang(body.lang)
    character_id = normalize_persona_id(body.character_id)
    session = session_manager.start(
        resident_id=body.resident_id,
        display_name=body.display_name,
        lang=lang,
        character_id=character_id,
    )
    opening = get_intro_line(character_id)
    session.add_turn("assistant", opening)
    return SessionStartResponse(
        session_id=session.session_id,
        resident_id=session.resident_id,
        character_id=session.character_id,
        opening_message=opening,
        started_at=session.started_at,
    )


@router.post("/end", response_model=SessionEndResponse)
async def end_session(body: SessionEndRequest) -> SessionEndResponse:
    session = session_manager.end(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden.")
    return SessionEndResponse(
        session_id=session.session_id,
        ended_at=session.ended_at,  # type: ignore[arg-type]
    )

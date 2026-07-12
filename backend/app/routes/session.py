from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    SessionEndRequest,
    SessionEndResponse,
    SessionStartRequest,
    SessionStartResponse,
)
from app.prompts import get_fenna_opening_message, normalize_lang
from app.services.session_manager import session_manager

router = APIRouter(prefix="/session", tags=["session"])


@router.post("/start", response_model=SessionStartResponse)
async def start_session(body: SessionStartRequest) -> SessionStartResponse:
    """Start a Fenna session. Stays open until /session/end — no auto-close."""
    lang = normalize_lang(body.lang)
    session = session_manager.start(
        resident_id=body.resident_id,
        display_name=body.display_name,
        lang=lang,
    )
    opening = get_fenna_opening_message(lang)
    session.add_turn("assistant", opening)
    return SessionStartResponse(
        session_id=session.session_id,
        resident_id=session.resident_id,
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

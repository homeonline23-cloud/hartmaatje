"""Voice-changer admin endpoints — upload/manage custom cloned voices (RVC).

Gated behind `ADMIN_API_KEY` (see `.env.example`): the endpoints return 503
until an admin key is configured, then require a matching `X-Admin-Key`
header. Used by the `/voice-changer` page in the frontend.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, Header, HTTPException, UploadFile

from app.core.config import get_settings
from app.schemas.voice import VoiceModelListResponse, VoiceModelStatus
from app.services.personas.persona_loader import VALID_PERSONA_IDS
from app.services.voice import voice_model_registry as registry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice-models", tags=["voice-models"])

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # generous cap for .pth/.index files


def _require_admin(x_admin_key: Optional[str]) -> None:
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(
            status_code=503,
            detail="Voice-model beheer is niet geconfigureerd (ADMIN_API_KEY ontbreekt op de server).",
        )
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Ongeldige beheerderssleutel.")


def _require_valid_persona(persona_id: str) -> str:
    pid = persona_id.strip().lower()
    if pid not in VALID_PERSONA_IDS:
        raise HTTPException(status_code=404, detail="Onbekend personage.")
    return pid


@router.get("", response_model=VoiceModelListResponse)
async def list_voice_models() -> VoiceModelListResponse:
    return VoiceModelListResponse(models=registry.list_status())


@router.post("/{persona_id}", response_model=VoiceModelStatus)
async def upload_voice_model(
    persona_id: str,
    model_file: UploadFile = File(..., description="RVC generator weights (.pth)"),
    index_file: Optional[UploadFile] = File(
        None, description="Optional RVC feature index (.index)"
    ),
    x_admin_key: Optional[str] = Header(None),
) -> VoiceModelStatus:
    _require_admin(x_admin_key)
    pid = _require_valid_persona(persona_id)

    if not model_file.filename or not model_file.filename.lower().endswith(".pth"):
        raise HTTPException(status_code=400, detail="Modelbestand moet een .pth bestand zijn.")

    model_bytes = await model_file.read()
    if not model_bytes:
        raise HTTPException(status_code=400, detail="Modelbestand is leeg.")
    if len(model_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Modelbestand is te groot.")

    index_bytes: Optional[bytes] = None
    index_filename: Optional[str] = None
    if index_file is not None and index_file.filename:
        if not index_file.filename.lower().endswith(".index"):
            raise HTTPException(status_code=400, detail="Indexbestand moet een .index bestand zijn.")
        index_bytes = await index_file.read()
        index_filename = index_file.filename
        if len(index_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Indexbestand is te groot.")

    return registry.save_model(
        pid,
        model_bytes=model_bytes,
        model_filename=model_file.filename,
        index_bytes=index_bytes,
        index_filename=index_filename,
    )


@router.delete("/{persona_id}", response_model=VoiceModelStatus)
async def delete_voice_model(
    persona_id: str, x_admin_key: Optional[str] = Header(None)
) -> VoiceModelStatus:
    _require_admin(x_admin_key)
    pid = _require_valid_persona(persona_id)
    registry.delete_model(pid)
    return registry.get_status(pid)

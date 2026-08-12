"""Registry of uploaded custom RVC voice models — one optional model per persona.

Disk layout (under `Settings.resolved_voice_models_dir`):

    {persona_id}/model.pth     — RVC generator weights (required)
    {persona_id}/model.index   — RVC feature index (optional, improves quality)
    {persona_id}/meta.json     — original filenames + upload timestamp

This module only manages storage/metadata. Actual voice conversion lives in
`app.services.voice.rvc_engine`.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.schemas.voice import VoiceModelStatus
from app.services.personas.persona_loader import VALID_PERSONA_IDS

logger = logging.getLogger(__name__)

MODEL_FILENAME = "model.pth"
INDEX_FILENAME = "model.index"
META_FILENAME = "meta.json"


def _persona_dir(persona_id: str) -> Path:
    return get_settings().resolved_voice_models_dir / persona_id


def _meta_path(persona_id: str) -> Path:
    return _persona_dir(persona_id) / META_FILENAME


def _read_meta(persona_id: str) -> dict:
    path = _meta_path(persona_id)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def has_model(persona_id: str) -> bool:
    return (_persona_dir(persona_id) / MODEL_FILENAME).exists()


def get_model_path(persona_id: str) -> Optional[Path]:
    path = _persona_dir(persona_id) / MODEL_FILENAME
    return path if path.exists() else None


def get_index_path(persona_id: str) -> Optional[Path]:
    path = _persona_dir(persona_id) / INDEX_FILENAME
    return path if path.exists() else None


def get_status(persona_id: str) -> VoiceModelStatus:
    meta = _read_meta(persona_id)
    return VoiceModelStatus(
        persona_id=persona_id,
        has_model=has_model(persona_id),
        has_index=get_index_path(persona_id) is not None,
        original_filename=meta.get("original_filename"),
        index_filename=meta.get("index_filename"),
        uploaded_at=meta.get("uploaded_at"),
    )


def list_status() -> list[VoiceModelStatus]:
    return [get_status(pid) for pid in VALID_PERSONA_IDS]


def save_model(
    persona_id: str,
    model_bytes: bytes,
    model_filename: str,
    index_bytes: Optional[bytes] = None,
    index_filename: Optional[str] = None,
) -> VoiceModelStatus:
    persona_dir = _persona_dir(persona_id)
    persona_dir.mkdir(parents=True, exist_ok=True)

    (persona_dir / MODEL_FILENAME).write_bytes(model_bytes)
    if index_bytes is not None:
        (persona_dir / INDEX_FILENAME).write_bytes(index_bytes)

    meta = _read_meta(persona_id)
    meta["original_filename"] = model_filename
    if index_bytes is not None:
        meta["index_filename"] = index_filename
    meta["uploaded_at"] = datetime.now(timezone.utc).isoformat()
    _meta_path(persona_id).write_text(json.dumps(meta), encoding="utf-8")

    logger.info(
        "Saved custom voice model for persona=%s file=%s (%d bytes)",
        persona_id,
        model_filename,
        len(model_bytes),
    )
    return get_status(persona_id)


def delete_model(persona_id: str) -> bool:
    persona_dir = _persona_dir(persona_id)
    removed = False
    for name in (MODEL_FILENAME, INDEX_FILENAME, META_FILENAME):
        path = persona_dir / name
        if path.exists():
            path.unlink()
            removed = True
    logger.info("Deleted custom voice model for persona=%s", persona_id)
    return removed

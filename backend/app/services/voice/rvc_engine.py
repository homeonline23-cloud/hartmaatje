"""Optional RVC (Retrieval-based Voice Conversion) engine.

Turns the base Gemini TTS audio for a persona into that persona's custom
cloned voice, when a `.pth` model has been uploaded via `POST /voice-models/{id}`
(see `voice_model_registry`).

This is a *soft* dependency: `rvc-python` + `torch` are listed separately in
`backend/requirements-voice.txt` (not the core `requirements.txt`) because
they are large and only needed once real cloned-voice models exist (e.g.
trained with Applio). If they aren't installed, or inference fails for any
reason, `convert_voice()` returns `None` and callers fall back to the
original synthesized audio — the app keeps working either way.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
import threading
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.services.voice import voice_model_registry as registry

logger = logging.getLogger(__name__)

_engine_lock = threading.Lock()
_engine = None
_loaded_persona_id: Optional[str] = None
_conversion_disabled = False


def _get_engine():
    """Lazily construct the RVCInference engine. Raises if deps are missing."""
    global _engine
    if _engine is not None:
        return _engine

    from rvc_python.infer import RVCInference  # type: ignore

    settings = get_settings()
    _engine = RVCInference(device=settings.rvc_device)
    return _engine


def _convert_sync(wav_bytes: bytes, persona_id: str) -> Optional[bytes]:
    global _loaded_persona_id, _conversion_disabled

    if _conversion_disabled:
        return None

    model_path = registry.get_model_path(persona_id)
    if model_path is None:
        return None

    with _engine_lock:
        try:
            engine = _get_engine()
        except Exception as exc:
            logger.warning(
                "RVC voice conversion unavailable — install "
                "backend/requirements-voice.txt to enable custom cloned voices "
                "(%s)",
                exc,
            )
            _conversion_disabled = True
            return None

        index_path = registry.get_index_path(persona_id)
        try:
            if _loaded_persona_id != persona_id:
                engine.load_model(
                    str(model_path),
                    index_path=str(index_path) if index_path else "",
                )
                _loaded_persona_id = persona_id
        except Exception as exc:
            logger.error("Failed to load RVC model for persona=%s: %s", persona_id, exc)
            _loaded_persona_id = None
            return None

        try:
            with tempfile.TemporaryDirectory() as tmp:
                in_path = Path(tmp) / "in.wav"
                out_path = Path(tmp) / "out.wav"
                in_path.write_bytes(wav_bytes)
                engine.infer_file(str(in_path), str(out_path))
                if not out_path.exists():
                    logger.error("RVC inference produced no output for persona=%s", persona_id)
                    return None
                return out_path.read_bytes()
        except Exception as exc:
            logger.error("RVC inference failed for persona=%s: %s", persona_id, exc)
            return None


async def convert_voice(wav_bytes: bytes, persona_id: str) -> Optional[bytes]:
    """Convert `wav_bytes` (16-bit PCM WAV) to `persona_id`'s cloned voice.

    Returns the converted WAV bytes, or `None` if no custom model exists for
    this persona, or conversion isn't available/failed (caller should keep
    using the original audio in that case).
    """
    if not registry.has_model(persona_id):
        return None
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _convert_sync, wav_bytes, persona_id)

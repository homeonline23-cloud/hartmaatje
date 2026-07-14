"""
Speech-to-text — respects session language (nl / en).
"""

from __future__ import annotations

import logging
from typing import Literal, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
AppLang = Literal["nl", "en"]


async def transcribe_audio(
    audio_base64: str,
    mime_type: str,
    lang: AppLang = "nl",
) -> Optional[str]:
    settings = get_settings()
    if not settings.gemini_api_key:
        logger.warning("No GEMINI_API_KEY — STT unavailable")
        return None

    if lang == "en":
        hint = (
            "Transcribe ONLY the spoken words you literally hear in this audio. "
            "Do NOT add names, words, or sentences that were not spoken. "
            "If you only hear a short greeting, return just that greeting. "
            "If unclear, return the closest short phrase — never invent a person's name."
        )
    else:
        hint = (
            "Transcribeer ALLEEN de woorden die u letterlijk in deze audio hoort. "
            "Voeg GEEN namen, woorden of zinnen toe die niet gezegd werden. "
            "Als u alleen een korte begroeting hoort, geef alleen die begroeting terug. "
            "Bij onduidelijkheid: het kortste passende fragment — nooit een naam verzinnen."
        )

    url = (
        f"{GEMINI_BASE}/{settings.gemini_model}:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": hint},
                    {"inlineData": {"mimeType": mime_type, "data": audio_base64}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 200},
    }

    try:
        async with httpx.AsyncClient(timeout=18.0) as client:
            res = await client.post(url, json=body)
            if not res.is_success:
                return None
            data = res.json()
            return (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            ) or None
    except Exception as exc:
        logger.error("Transcribe failed: %s", exc)
        return None

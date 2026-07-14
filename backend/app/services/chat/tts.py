"""
Text-to-speech — Fenna's single consistent voice (nl / en).
Parallel chunk synthesis; retries failed chunks; stable audio concat.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
from typing import Literal, Optional

import httpx

from app.core.config import get_settings
from app.prompts import normalize_lang

logger = logging.getLogger(__name__)
AppLang = Literal["nl", "en"]

TTS_CHUNK_CHARS = 220
TTS_MAX_RETRIES = 1


def text_for_speech(text: str, max_sentences: int = 3) -> str:
    """Limit TTS length for faster voice playback; full text still shown on screen."""
    cleaned = " ".join(text.replace("**", "").split())
    if not cleaned:
        return ""
    parts = re.split(r"(?<=[.!?…])\s+", cleaned)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) <= max_sentences:
        return cleaned
    return " ".join(parts[:max_sentences])


def _clean_for_speech(text: str) -> str:
    return " ".join(text.replace("**", "").split())


def _split_tts_chunks(text: str, max_chars: int = TTS_CHUNK_CHARS) -> list[str]:
    cleaned = _clean_for_speech(text)
    if not cleaned:
        return []
    if len(cleaned) <= max_chars:
        return [cleaned]

    sentences = re.split(r"(?<=[.!?…])\s+", cleaned)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if not re.search(r"[.!?…]$", sentence):
            sentence += "."
        if len(sentence) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(sentence), max_chars):
                part = sentence[i : i + max_chars].strip()
                if part:
                    chunks.append(part)
            continue
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = sentence

    if current:
        chunks.append(current.strip())
    return chunks or [cleaned[:max_chars]]


def _tts_prompt(text: str, lang: AppLang) -> str:
    if lang == "en":
        return (
            "Fenna — warm, clear English female voice for older adults. "
            "Speak naturally. Complete every sentence fully with clear ending.\n\n"
            f"{text}"
        )
    return (
        "Fenna — warme, duidelijke Nederlandse vrouwenstem voor ouderen. "
        "Praat natuurlijk. Maak elke zin volledig af met een duidelijk einde.\n\n"
        f"{text}"
    )


async def _synthesize_chunk_once(text: str, lang: AppLang) -> Optional[tuple[bytes, str]]:
    settings = get_settings()
    if not settings.gemini_api_key or not text.strip():
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_tts_model}:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": _tts_prompt(text, lang)}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": settings.fenna_voice_name}
                }
            },
        },
    }

    async with httpx.AsyncClient(timeout=35.0) as client:
        res = await client.post(url, json=body)
        if not res.is_success:
            logger.error("TTS error %s", res.text[:200])
            return None
        data = res.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        for part in parts:
            inline = part.get("inlineData")
            if inline and inline.get("data"):
                raw = base64.b64decode(inline["data"])
                mime = inline.get("mimeType", "audio/mp3")
                return raw, mime
    return None


async def _synthesize_chunk(text: str, lang: AppLang) -> Optional[tuple[bytes, str]]:
    for attempt in range(TTS_MAX_RETRIES + 1):
        try:
            result = await _synthesize_chunk_once(text, lang)
            if result:
                return result
        except Exception as exc:
            logger.warning("TTS chunk attempt %s failed: %s", attempt + 1, exc)
        if attempt < TTS_MAX_RETRIES:
            await asyncio.sleep(0.15 * (attempt + 1))
    return None


def _pcm_to_wav(pcm: bytes, sample_rate: int = 24000) -> bytes:
    byte_length = len(pcm)
    buffer = bytearray(44 + byte_length)
    buffer[0:4] = b"RIFF"
    buffer[4:8] = (36 + byte_length).to_bytes(4, "little")
    buffer[8:12] = b"WAVE"
    buffer[12:16] = b"fmt "
    buffer[16:20] = (16).to_bytes(4, "little")
    buffer[20:22] = (1).to_bytes(2, "little")
    buffer[22:24] = (1).to_bytes(2, "little")
    buffer[24:28] = sample_rate.to_bytes(4, "little")
    buffer[28:32] = (sample_rate * 2).to_bytes(4, "little")
    buffer[32:34] = (2).to_bytes(2, "little")
    buffer[34:36] = (16).to_bytes(2, "little")
    buffer[36:40] = b"data"
    buffer[40:44] = byte_length.to_bytes(4, "little")
    buffer[44:] = pcm
    return bytes(buffer)


def _raw_parts_to_b64(parts: list[tuple[bytes, str]]) -> tuple[str, str]:
    if not parts:
        raise ValueError("No audio parts")

    if len(parts) == 1:
        raw, mime = parts[0]
        if "pcm" in mime or "L16" in mime:
            rate_match = re.search(r"rate=(\d+)", mime)
            rate = int(rate_match.group(1)) if rate_match else 24000
            wav = _pcm_to_wav(raw, rate)
            return base64.b64encode(wav).decode("ascii"), "audio/wav"
        return base64.b64encode(raw).decode("ascii"), mime

    pcm_chunks: list[bytes] = []
    sample_rate = 24000
    for raw, mime in parts:
        if "pcm" in mime or "L16" in mime:
            rate_match = re.search(r"rate=(\d+)", mime)
            if rate_match:
                sample_rate = int(rate_match.group(1))
            pcm_chunks.append(raw)
        else:
            logger.warning("Mixed non-PCM chunk in concat — using PCM parts only")
            continue

    if not pcm_chunks:
        raw, mime = parts[0]
        return base64.b64encode(raw).decode("ascii"), mime

    combined = b"".join(pcm_chunks)
    wav = _pcm_to_wav(combined, sample_rate)
    return base64.b64encode(wav).decode("ascii"), "audio/wav"


def concat_audio_blobs(blobs: list[tuple[str, str]]) -> tuple[str, str]:
    """Concatenate base64 audio blobs (ack + reply) into one WAV."""
    raw_parts: list[tuple[bytes, str]] = []
    for b64, mime in blobs:
        if not b64:
            continue
        raw_parts.append((base64.b64decode(b64), mime))
    return _raw_parts_to_b64(raw_parts)


async def synthesize_fenna_speech(
    text: str,
    lang: AppLang = "nl",
) -> Optional[tuple[str, str]]:
    """Returns (audio_base64, mime_type) or None."""
    lang = normalize_lang(lang)
    chunks = _split_tts_chunks(text)
    if not chunks:
        return None

    results = await asyncio.gather(
        *[_synthesize_chunk(chunk, lang) for chunk in chunks],
        return_exceptions=True,
    )

    parts: list[tuple[bytes, str]] = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error("TTS chunk %s exception: %s", i, result)
            retry = await _synthesize_chunk(chunks[i], lang)
            if retry:
                parts.append(retry)
            continue
        if result:
            parts.append(result)
        else:
            retry = await _synthesize_chunk(chunks[i], lang)
            if retry:
                parts.append(retry)
            else:
                logger.error("TTS chunk %s permanently failed: %r", i, chunks[i][:60])

    if not parts:
        return None

    if len(parts) < len(chunks):
        logger.warning(
            "TTS incomplete: %s/%s chunks synthesized", len(parts), len(chunks)
        )

    try:
        return _raw_parts_to_b64(parts)
    except Exception as exc:
        logger.error("Audio concat failed: %s", exc)
        return None

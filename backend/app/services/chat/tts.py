"""
Text-to-speech — one consistent Gemini voice per persona (nl / en).
Parallel chunk synthesis; retries failed chunks; stable audio concat.

Voice names and persona style text mirror src/lib/voice/geminiVoiceConfig.ts so a
character sounds the same whether the client or this backend synthesizes the audio.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import re
from typing import Literal, Optional

import httpx

from app.core.config import get_settings
from app.core.lang import normalize_lang
from app.services.voice import rvc_engine

logger = logging.getLogger(__name__)
AppLang = Literal["nl", "en"]

TTS_CHUNK_CHARS = 220
TTS_MAX_RETRIES = 1

# Persona voice/style description used in the TTS prompt — copied word-for-word from
# PROFILES[*].personaNl / personaEn in src/lib/voice/geminiVoiceConfig.ts. Keep these
# in sync manually: any drift here means the backend (safety replies, /speech/speak,
# and welcome-video redubs) and the client (/api/companion-speak, normal live turns)
# would ask Gemini TTS for subtly different deliveries even though the voice NAME is
# the same — which is exactly the kind of "close but not quite" mismatch this whole
# persona-voice fix is meant to eliminate.
_PERSONA_STYLE: dict[str, dict[AppLang, str]] = {
    "fenna": {
        "nl": (
            "Fenna — rustige Nederlandse vrouwenstem, 60-plus. Praat natuurlijk en "
            "gelijkwaardig, alsof u met een bekende aan tafel zit — niet zoet of "
            "bewonderend voorlezen. Rustig tempo, levendige intonatie, korte adempauzes."
        ),
        "en": (
            "Fenna — calm female voice. Natural, equal conversation — not sugary or "
            "gushing. Calm pace with gentle pauses."
        ),
    },
    "colette": {
        "nl": "Warme, heldere Nederlandse vrouwenstem — volwassen vrouw, rustig en duidelijk.",
        "en": "Warm, clear adult female voice — calm and reassuring.",
    },
    "maarten": {
        "nl": "Maarten — rustige Nederlandse mannenstem. Betrouwbaar en geduldig.",
        "en": "Maarten — calm male voice. Trustworthy and patient.",
    },
    "peter": {
        "nl": (
            "Peter — warme, diepe mannenstem van een volwassen man rond zestig. "
            "Lage bariton, rustig en gelijkwaardig — dezelfde zware, warme klank als "
            "in zijn welkomstvideo. Geen lichte of hoge stem. Praat langzaam en "
            "natuurlijk, met korte adempauzes."
        ),
        "en": (
            "Peter — warm, deep male voice of a mature man in his late fifties or "
            "early sixties. Low baritone, calm and equal — the same heavy, warm tone "
            "as in his welcome video. Not light or high-pitched. Speak slowly and "
            "naturally, with gentle pauses."
        ),
    },
}


class TtsQuotaError(Exception):
    """Gemini TTS daily/minute quota exceeded."""


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


def _persona_voice_style(persona_id: str) -> str:
    """Extra style line from the persona catalog (e.g. Peter's `voice_style` field) —
    mirrors getProductionVoiceStyle() feeding into getGeminiVoicePrompt() on the client.
    """
    try:
        from app.services.personas.persona_loader import get_persona

        return get_persona(persona_id).voice_style or ""
    except Exception:  # pragma: no cover - persona catalog should always load
        return ""


def _tts_prompt(text: str, lang: AppLang, persona_id: str = "fenna") -> str:
    character = _PERSONA_STYLE.get(persona_id, _PERSONA_STYLE["fenna"])[lang]
    voice_style = _persona_voice_style(persona_id)

    if lang == "en":
        persona = f"{character} Style: {voice_style}." if voice_style else character
        return (
            f"Read aloud in one natural flow ({persona}). Speak naturally and "
            f"complete every sentence fully with a clear ending.\n\n{text}"
        )

    persona = f"{character} Stijl: {voice_style}." if voice_style else character
    return (
        f"Lees hardop voor in één natuurlijke flow ({persona}). Praat natuurlijk en "
        f"maak elke zin volledig af met een duidelijk einde.\n\n{text}"
    )


async def _synthesize_chunk_once(
    text: str, lang: AppLang, persona_id: str = "fenna"
) -> Optional[tuple[bytes, str]]:
    settings = get_settings()
    if not settings.gemini_api_key or not text.strip():
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_tts_model}:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [
            {"role": "user", "parts": [{"text": _tts_prompt(text, lang, persona_id)}]}
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": settings.voice_name_for(persona_id)
                    }
                }
            },
        },
    }

    async with httpx.AsyncClient(timeout=35.0) as client:
        res = await client.post(url, json=body)
        if res.status_code == 429 or "quota" in res.text.lower():
            raise TtsQuotaError("Gemini TTS quota exceeded")
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


async def _synthesize_chunk(
    text: str, lang: AppLang, persona_id: str = "fenna"
) -> Optional[tuple[bytes, str]]:
    for attempt in range(TTS_MAX_RETRIES + 1):
        try:
            result = await _synthesize_chunk_once(text, lang, persona_id)
            if result:
                return result
        except TtsQuotaError:
            raise
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


async def _apply_custom_voice(audio_b64: str, mime: str, persona_id: str) -> Optional[tuple[str, str]]:
    """Best-effort RVC conversion of the base TTS audio into `persona_id`'s
    cloned voice, if one has been uploaded (see `/voice-models`). Only WAV
    audio is supported for conversion; returns None to keep the original
    audio when conversion isn't applicable, unavailable, or fails."""
    if mime != "audio/wav":
        return None
    try:
        wav_bytes = base64.b64decode(audio_b64)
        converted = await rvc_engine.convert_voice(wav_bytes, persona_id)
    except Exception as exc:
        logger.warning("Custom voice conversion skipped for %s: %s", persona_id, exc)
        return None
    if not converted:
        return None
    return base64.b64encode(converted).decode("ascii"), "audio/wav"


async def synthesize_fenna_speech(
    text: str,
    lang: AppLang = "nl",
    persona_id: str = "fenna",
) -> Optional[tuple[str, str]]:
    """Returns (audio_base64, mime_type) or None.

    ``persona_id`` selects the Gemini prebuilt voice (fenna/colette -> Aoede,
    maarten -> Charon, peter -> Algenib) so server-synthesized replies (e.g. the
    safety/emergency path) use the same voice as that character's live client-side
    speech instead of always defaulting to Fenna's voice.

    If `persona_id` also has a custom cloned voice uploaded via `/voice-models`
    (see `app.services.voice.rvc_engine`), the Gemini-synthesized audio above is
    additionally converted to that cloned voice before returning — e.g. to make
    a character sound exactly like a specific recorded voice (such as the actual
    narrator in their welcome video) instead of the closest built-in Gemini voice.
    """
    lang = normalize_lang(lang)
    chunks = _split_tts_chunks(text)
    if not chunks:
        return None

    results = await asyncio.gather(
        *[_synthesize_chunk(chunk, lang, persona_id) for chunk in chunks],
        return_exceptions=True,
    )

    parts: list[tuple[bytes, str]] = []
    for i, result in enumerate(results):
        if isinstance(result, TtsQuotaError):
            raise result
        if isinstance(result, Exception):
            logger.error("TTS chunk %s exception: %s", i, result)
            retry = await _synthesize_chunk(chunks[i], lang, persona_id)
            if retry:
                parts.append(retry)
            continue
        if result:
            parts.append(result)
        else:
            retry = await _synthesize_chunk(chunks[i], lang, persona_id)
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
        audio_b64, mime = _raw_parts_to_b64(parts)
    except Exception as exc:
        logger.error("Audio concat failed: %s", exc)
        return None

    if persona_id:
        converted = await _apply_custom_voice(audio_b64, mime, persona_id)
        if converted:
            return converted

    return audio_b64, mime

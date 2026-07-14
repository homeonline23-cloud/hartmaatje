"""LLM service — Gemini calls only. No tool or web-search logic here."""

from __future__ import annotations

import logging
import re
from typing import List, Literal, Optional

import httpx

from app.core.config import get_settings
from app.domain.models.dialogue import ResponsePlan
from app.domain.models.persona import PersonaConfig
from app.services.chat.session_manager import ChatTurn
from app.services.chat.speech_sanitize import sanitize_fenna_reply

logger = logging.getLogger(__name__)

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
AppLang = Literal["nl", "en"]


async def generate_companion_reply(
    *,
    system_prompt: str,
    persona: PersonaConfig,
    user_message: str,
    history: List[ChatTurn],
    lang: AppLang = "nl",
    voice_mode: bool = False,
    overlap_mode: bool = False,
    known_name: Optional[str] = None,
    plan: Optional[ResponsePlan] = None,
    tool_context: str = "",
) -> Optional[str]:
    settings = get_settings()
    if not settings.gemini_api_key:
        return _fallback_reply(len(history), lang, persona, plan)

    extra_context = ""
    if tool_context.strip():
        label = "TOOL CONTEXT" if lang == "en" else "TOOL CONTEXT"
        extra_context = f"\n\n[{label}]\n{tool_context.strip()}"

    contents = []
    for turn in history:
        contents.append(
            {
                "role": "model" if turn.role == "assistant" else "user",
                "parts": [{"text": turn.content}],
            }
        )
    user_part = _wrap_user_for_discourse(user_message, history, lang) + extra_context
    contents.append({"role": "user", "parts": [{"text": user_part}]})

    url = (
        f"{GEMINI_BASE}/{settings.gemini_model}:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    max_tokens = 120 if overlap_mode else (140 if voice_mode else 1024)
    if plan and plan.short_warm_reply:
        max_tokens = min(max_tokens, 100 if voice_mode else 180)

    body: dict = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.82,
            "maxOutputTokens": max_tokens,
        },
    }

    text = await _call_gemini(url, body)
    if text:
        return sanitize_fenna_reply(_clean_reply(text, lang, persona), known_name, lang)

    return _fallback_reply(len(history), lang, persona, plan)


def _wrap_user_for_discourse(
    user_message: str,
    history: List[ChatTurn],
    lang: AppLang,
) -> str:
    if not history:
        return user_message
    if lang == "en":
        return (
            f"[Same ongoing conversation — discuss naturally, do not reset or interview. "
            f"User just said:] {user_message}"
        )
    return (
        f"[Zelfde doorlopend gesprek — praat mee, geen reset of interview. "
        f"Gebruiker zei net:] {user_message}"
    )


async def _call_gemini(url: str, body: dict) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=28.0) as client:
            res = await client.post(url, json=body)
            if not res.is_success:
                logger.error("Gemini error %s: %s", res.status_code, res.text[:400])
                return None
            data = res.json()
            candidate = data.get("candidates", [{}])[0]
            parts = candidate.get("content", {}).get("parts", [])
            texts = [p.get("text", "") for p in parts if p.get("text")]
            joined = " ".join(t.strip() for t in texts if t.strip())
            return joined or None
    except Exception as exc:
        logger.error("Gemini request failed: %s", exc)
        return None


def _clean_reply(text: str, lang: AppLang, persona: PersonaConfig) -> str:
    cleaned = text.replace("**", "").replace("*", "")
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    cleaned = cleaned.replace("\n", " ").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)

    for intro in _intro_prefixes(lang, persona):
        if cleaned.lower().startswith(intro.lower()):
            cleaned = cleaned[len(intro) :].strip(" ,.—")
            break

    return _ensure_complete_sentences(cleaned, lang, persona)


def _intro_prefixes(lang: AppLang, persona: PersonaConfig) -> list[str]:
    if lang == "en":
        return [
            f"Hello, I'm {persona.name}.",
            f"Hi, I'm {persona.name}.",
            f"I'm {persona.name}.",
        ]
    return [
        f"Hallo, ik ben {persona.name}.",
        f"Hoi, ik ben {persona.name}.",
        f"Ik ben {persona.name}.",
    ]


def _ensure_complete_sentences(text: str, lang: AppLang, persona: PersonaConfig) -> str:
    text = text.strip()
    if not text:
        return _fallback_reply(1, lang, persona)
    if re.search(r"[.!?…][\"')\]]*\s*$", text):
        return text
    parts = re.split(r"(?<=[.!?…])\s+", text)
    if len(parts) > 1:
        complete = " ".join(parts[:-1]).strip()
        if complete and re.search(r"[.!?…]\s*$", complete):
            return complete
    text = text.rstrip(",;:")
    if len(text.split()) >= 2:
        return f"{text}."
    return text


def _fallback_reply(
    history_len: int,
    lang: AppLang,
    persona: PersonaConfig,
    plan: Optional[ResponsePlan] = None,
) -> str:
    if lang == "en":
        if plan and plan.tool_action == "research":
            return (
                "I can't look that up for you yet — but I'm here if you want to talk about it."
            )
        if history_len > 0:
            return "I didn't quite catch that — but go on, I'm following our chat."
        return f"Hello. I'm {persona.name}. We can talk about anything — just mention what's on your mind."
    if plan and plan.tool_action == "research":
        return (
            "Dat kan ik nog niet voor u opzoeken — maar ik ben er wel als u erover wilt praten."
        )
    if history_len > 0:
        return "Ik verstond het niet helemaal — maar ga gerust verder, ik volg ons gesprek."
    return (
        f"Hallo. Ik ben {persona.name}. "
        "We kunnen over alles praten — vertel maar waar u aan denkt."
    )

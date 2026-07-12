"""Gemini LLM integration for Fenna — capable assistant with web search."""

from __future__ import annotations

import logging
import re
from typing import List, Literal, Optional

import httpx

from app.config import get_settings
from app.prompts import get_fenna_system_prompt
from app.services.session_manager import ChatTurn
from app.services.speech_sanitize import sanitize_fenna_reply
from app.services.web_search import fetch_web_context, wants_web_help

logger = logging.getLogger(__name__)

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
AppLang = Literal["nl", "en"]

LANG_FORCE_EN = (
    "\n\nLANGUAGE: Reply in English only."
)
LANG_FORCE_NL = (
    "\n\nLANGUAGE: Antwoord alleen in het Nederlands."
)

CAPABILITY_RULE_EN = """
# RUNTIME — DISCUSSION MODE
- Continue the SAME conversation thread. Reference what was just said or earlier in the chat.
- The user may state something without asking — discuss it, do not demand a question.
- At least 70% of your turns end WITHOUT a question.
- Never reset the chat or act like each message is a new session.
- No markdown. Complete every sentence.
- NEVER use the user's name unless it is listed under [MEMORY].
- Never invent names. Never say "Hello [name]" without a confirmed name.
"""

CAPABILITY_RULE_NL = """
# RUNTIME — DISCUSSIEMODUS
- Ga door op DEZELFDE gespreksdraad. Verwijs naar wat net gezegd werd of eerder in het gesprek.
- De gebruiker hoeft geen vraag te stellen — bespreek wat zij noemen.
- Minstens 70% van uw beurten eindigt ZONDER vraag.
- Reset het gesprek nooit; gedraag u niet alsof elk bericht een nieuwe sessie is.
- Geen markdown. Maak elke zin af.
- Gebruik NOOIT de naam van de gebruiker tenzij die expliciet onder [GEHEUGEN] staat.
- Verzin geen namen. Zeg nooit "Hallo [naam]" zonder bevestigde naam.
"""

NAME_RULE_EN = (
    "\n\nNAME: Use the user's name ONLY if it appears under [MEMORY]. "
    "Never invent or guess a name. Never echo a name from a bad transcription."
)
NAME_RULE_NL = (
    "\n\nNAAM: Gebruik de naam van de gebruiker ALLEEN als die onder [GEHEUGEN] staat. "
    "Verzin of raad nooit een naam. Herhaal geen naam uit een foute transcriptie."
)

OVERLAP_RULE_EN = (
    "\n\nMID-SPEECH JOIN-IN: The user paused briefly but is still talking. "
    "React in 1–2 short sentences — agree, add a thought, or gently join the discussion. "
    "Do NOT close the topic or interview them. They are already speaking."
)
OVERLAP_RULE_NL = (
    "\n\nONDERBREKING MEE-PRATEN: De gebruiker pauzeerde even maar praat waarschijnlijk verder. "
    "Reageer in 1–2 korte zinnen — bevestig, voeg iets toe, of praat zacht mee. "
    "Sluit het onderwerp niet af en interview niet. Zij zijn al aan het praten."
)
VOICE_SPEED_EN = (
    "\n\nVOICE: 1–2 short sentences only. Be direct and warm. "
    "Continue the discussion — not a quiz answer."
)
VOICE_SPEED_NL = (
    "\n\nSTEM: Slechts 1–2 korte zinnen. Wees direct en warm. "
    "Ga door met het gesprek — geen quizantwoord."
)


async def generate_fenna_reply(
    user_message: str,
    history: List[ChatTurn],
    memory_block: str,
    lang: AppLang = "nl",
    voice_mode: bool = False,
    conversation_thread: str = "",
    overlap_mode: bool = False,
    known_name: Optional[str] = None,
) -> Optional[str]:
    settings = get_settings()
    if not settings.gemini_api_key:
        return _fallback_reply(user_message, len(history), lang)

    system = get_fenna_system_prompt(lang)
    system += LANG_FORCE_EN if lang == "en" else LANG_FORCE_NL
    system += CAPABILITY_RULE_EN if lang == "en" else CAPABILITY_RULE_NL
    system += NAME_RULE_EN if lang == "en" else NAME_RULE_NL
    if voice_mode:
        if overlap_mode:
            system += OVERLAP_RULE_EN if lang == "en" else OVERLAP_RULE_NL
        else:
            system += VOICE_SPEED_EN if lang == "en" else VOICE_SPEED_NL
    if memory_block:
        label = "MEMORY" if lang == "en" else "GEHEUGEN"
        system += f"\n\n[{label}]\n{memory_block}"
    if conversation_thread:
        label = "CONVERSATION THREAD" if lang == "en" else "GESPREKSDRAAD"
        system += f"\n\n[{label}]\n{conversation_thread}"

    # Voice turns must stay fast — web search adds many seconds.
    use_search = not voice_mode and wants_web_help(user_message)
    extra_context = ""
    if use_search:
        ddg = await fetch_web_context(user_message)
        if ddg:
            label = "EXTRA WEB HINTS" if lang == "en" else "EXTRA WEB TIPS"
            extra_context = f"\n\n[{label}]\n{ddg}"

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
    body: dict = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.82,
            "maxOutputTokens": 120 if overlap_mode else (140 if voice_mode else 1024),
        },
    }
    if use_search:
        body["tools"] = [{"google_search": {}}]

    text = await _call_gemini(url, body)
    if text:
        return sanitize_fenna_reply(_clean_reply(text, lang), known_name, lang)

    if use_search and "tools" in body:
        body_no_tools = {k: v for k, v in body.items() if k != "tools"}
        text = await _call_gemini(url, body_no_tools)
        if text:
            return sanitize_fenna_reply(_clean_reply(text, lang), known_name, lang)

    return _fallback_reply(user_message, len(history), lang)


def _wrap_user_for_discourse(
    user_message: str,
    history: List[ChatTurn],
    lang: AppLang,
) -> str:
    """Remind the model this is ongoing discussion, not an isolated Q&A turn."""
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


def _clean_reply(text: str, lang: AppLang) -> str:
    cleaned = text.replace("**", "").replace("*", "")
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    cleaned = cleaned.replace("\n", " ").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)

    for intro in _intro_prefixes(lang):
        if cleaned.lower().startswith(intro.lower()):
            cleaned = cleaned[len(intro) :].strip(" ,.—")
            break

    return _ensure_complete_sentences(cleaned, lang)


def _intro_prefixes(lang: AppLang) -> list[str]:
    if lang == "en":
        return [
            "Hello, I'm Fenna.",
            "Hi, I'm Fenna.",
            "I'm Fenna.",
            "I'm glad you're here. I'm Fenna.",
        ]
    return [
        "Hallo, ik ben Fenna.",
        "Hoi, ik ben Fenna.",
        "Ik ben Fenna.",
        "Fijn dat u er bent. Ik ben Fenna.",
    ]


def _ensure_complete_sentences(text: str, lang: AppLang) -> str:
    text = text.strip()
    if not text:
        return _fallback_reply("", 1, lang)

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


def _fallback_reply(user_message: str, history_len: int, lang: AppLang) -> str:
    if lang == "en":
        if wants_web_help(user_message):
            return (
                "I couldn't reach the web just now. "
                "Please ask again in a moment, or rephrase your question."
            )
        if history_len > 0:
            return "I didn't quite catch that — but go on, I'm following our chat."
        return "Hello. I'm Fenna. We can talk about anything — just mention what's on your mind."
    if wants_web_help(user_message):
        return (
            "Ik kon het web nu even niet bereiken. "
            "Vraag het zo nog eens, of formuleer uw vraag anders."
        )
    if history_len > 0:
        return "Ik verstond het niet helemaal — maar ga gerust verder, ik volg ons gesprek."
    return "Hallo. Ik ben Fenna. We kunnen over alles praten — vertel maar waar u aan denkt."

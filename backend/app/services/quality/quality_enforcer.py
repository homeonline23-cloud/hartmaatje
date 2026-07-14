"""Quality enforcement — validate LLM output before returning to user."""

from __future__ import annotations

import re
from typing import Literal

from app.domain.models.dialogue import ResponsePlan, ToneMode
from app.domain.models.nlu import NluResult
from app.domain.models.persona import PersonaConfig
from app.services.safety.safety_guard import GuardResult, check_reply

AppLang = Literal["nl", "en"]

_MAX_WORDS_SHORT = 45
_MAX_WORDS_NORMAL = 120


def append_quality_block(prompt: str, plan: ResponsePlan, lang: AppLang) -> str:
    """Add conversation-quality rules to the system prompt."""
    if not plan.quality_hints:
        return prompt

    en = lang == "en"
    title = "CONVERSATION QUALITY" if en else "GESPREKSKWALITEIT"
    lines = "\n".join(f"- {hint}" for hint in plan.quality_hints)
    tone_label = "TONE MODE" if en else "TOON"
    extra = f"\n\n{title}\n{lines}\n\n{tone_label}: {plan.tone_mode.upper()}"
    return prompt + extra


def validate_reply(
    reply: str,
    plan: ResponsePlan,
    persona: PersonaConfig,
    nlu: NluResult,
    lang: AppLang,
) -> tuple[str, list[str], GuardResult]:
    """
    Post-LLM validation. Returns (adjusted_reply, violations, safety_guard_result).
    """
    violations: list[str] = []
    text = reply.strip()
    if not text:
        return reply, violations, GuardResult()

    safety = check_reply(text, persona)
    violations.extend(safety.reply_violations)

    word_count = len(text.split())
    max_words = _MAX_WORDS_SHORT if plan.short_warm_reply else _MAX_WORDS_NORMAL
    if word_count > max_words:
        violations.append("too_long")
        text = _truncate_to_sentences(text, max_words)

    question_count = text.count("?")
    if question_count > plan.max_questions:
        violations.append("too_many_questions")
        if plan.max_questions == 0:
            text = _strip_trailing_questions(text)
        elif question_count > 1:
            text = _keep_first_question_only(text)

    if _looks_like_interview(reply, plan):
        violations.append("irrelevant_follow_up")

    if _off_topic_drift(text, nlu):
        violations.append("off_topic_drift")

    if _weak_warmth(text, plan.tone_mode):
        violations.append("weak_warmth")

    return text, _unique(violations), safety


def build_quality_retry_hint(violations: list[str], lang: AppLang) -> str:
    """Retry hint for the LLM when quality checks fail."""
    en = lang == "en"
    parts: list[str] = []

    mapping = {
        "too_long": (
            "RETRY: Shorter reply — warm and direct.",
            "RETRY: Korter antwoord — warm en direct.",
        ),
        "too_many_questions": (
            "RETRY: No questions — answer only.",
            "RETRY: Geen vragen — alleen antwoorden.",
        ),
        "irrelevant_follow_up": (
            "RETRY: No interview. Answer the user first.",
            "RETRY: Geen interview. Antwoord de gebruiker eerst.",
        ),
        "identity_drift": (
            "RETRY: Stay in character as the companion persona.",
            "RETRY: Blijf in karakter als de companion.",
        ),
        "medical_diagnosis": (
            "RETRY: No medical advice or diagnosis.",
            "RETRY: Geen medisch advies of diagnose.",
        ),
        "medication_advice": (
            "RETRY: No medication advice.",
            "RETRY: Geen medicatie-advies.",
        ),
        "dependency_language": (
            "RETRY: No dependency or possessive language.",
            "RETRY: Geen afhankelijkheids- of bezittelijke taal.",
        ),
        "off_topic_drift": (
            "RETRY: Stay on the user's topic.",
            "RETRY: Blijf bij het onderwerp van de gebruiker.",
        ),
        "weak_warmth": (
            "RETRY: Warmer, more human tone.",
            "RETRY: Warmere, menselijkere toon.",
        ),
    }

    for key, (en_msg, nl_msg) in mapping.items():
        if key in violations:
            parts.append(en_msg if en else nl_msg)

    if not parts:
        parts.append(
            "RETRY: Follow conversation quality rules."
            if en
            else "RETRY: Volg de gesprekskwaliteitsregels."
        )
    return "\n\n" + " ".join(parts)


def _truncate_to_sentences(text: str, max_words: int) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept: list[str] = []
    count = 0
    for sentence in sentences:
        words = len(sentence.split())
        if count + words > max_words and kept:
            break
        kept.append(sentence)
        count += words
    return " ".join(kept).strip() or text


def _strip_trailing_questions(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept = [s for s in sentences if "?" not in s]
    return " ".join(kept).strip() if kept else re.sub(r"\?+", ".", text).strip()


def _keep_first_question_only(text: str) -> str:
    parts = re.split(r"(?<=\?)\s+", text, maxsplit=1)
    if len(parts) == 2:
        return f"{parts[0]} {_strip_trailing_questions(parts[1])}".strip()
    return text


def _looks_like_interview(reply: str, plan: ResponsePlan) -> bool:
    if plan.follow_up_allowed:
        return False
    lower = reply.lower()
    probes = (
        "vertel eens",
        "wat vindt u",
        "hoe voelt u",
        "tell me about",
        "how do you feel",
        "what do you think",
    )
    return any(p in lower for p in probes) and "?" in reply


def _off_topic_drift(reply: str, nlu: NluResult) -> bool:
    if not nlu.detected_topics:
        return False
    lower = reply.lower()
    topic_keywords = {
        "family": ("familie", "family", "kind", "dochter", "zoon"),
        "loneliness": ("eenzaam", "lonely", "alleen"),
        "gardening": ("tuin", "garden", "bloem"),
        "music": ("muziek", "music", "lied"),
        "health_concerns": ("gezond", "health", "dokter", "doctor"),
        "faith": ("geloof", "faith", "kerk", "church"),
        "daily_life": ("koffie", "coffee", "weer", "weather"),
    }
    for topic in nlu.detected_topics[:2]:
        keywords = topic_keywords.get(topic.id, ())
        if keywords and not any(kw in lower for kw in keywords):
            if len(reply.split()) > 25:
                return True
    return False


def _weak_warmth(reply: str, tone_mode: ToneMode) -> bool:
    if tone_mode not in ("warm_soft", "supportive"):
        return False
    cold_starts = (
        "according to",
        "technically",
        "as an ai",
        "als een ai",
        "volgens de regels",
    )
    lower = reply.lower()
    return any(lower.startswith(s) for s in cold_starts)


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out

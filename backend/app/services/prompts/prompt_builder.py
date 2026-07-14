"""Compose system prompts from persona config — no giant prompts in routes."""

from __future__ import annotations

from typing import Literal, Optional

from app.domain.models.dialogue import ResponsePlan
from app.domain.models.nlu import NluResult
from app.domain.models.persona import PersonaConfig
from app.services.quality.quality_enforcer import append_quality_block

AppLang = Literal["nl", "en"]


def _bullet_block(title: str, items: list[str]) -> str:
    if not items:
        return ""
    lines = "\n".join(f"- {item}" for item in items)
    return f"\n\n{title}\n{lines}"


def _tone_guidance(nlu: NluResult, lang: AppLang) -> str:
    tone = nlu.detected_tone.primary
    en = lang == "en"
    guides: dict[str, tuple[str, str]] = {
        "sadness": (
            "TONE: User sounds sad. Reply softer, warmer, and a bit shorter. Acknowledge feeling first.",
            "TOON: De gebruiker klinkt verdrietig. Antwoord zachter, warmer en iets korter. Erken het gevoel eerst.",
        ),
        "confusion": (
            "TONE: User sounds confused. Use clear, calm, simple sentences. One idea at a time.",
            "TOON: De gebruiker klinkt verward. Gebruik heldere, kalme, eenvoudige zinnen. Eén idee tegelijk.",
        ),
        "joy": (
            "TONE: User sounds cheerful. Match lightly — warm and upbeat, not over the top.",
            "TOON: De gebruiker klinkt vrolijk. Sluit licht aan — warm en opgewekt, niet overdreven.",
        ),
        "stress": (
            "TONE: User sounds stressed or worried. Stay calm, reassuring, and grounded.",
            "TOON: De gebruiker klinkt gestrest of bezorgd. Blijf kalm, geruststellend en geaard.",
        ),
        "calm": (
            "TONE: User sounds calm. Keep a peaceful, unhurried pace.",
            "TOON: De gebruiker klinkt rustig. Houd een vredig, ongedwongen tempo aan.",
        ),
    }
    if tone in guides:
        return "\n\n" + (guides[tone][0] if en else guides[tone][1])
    return ""


def _topic_guidance(nlu: NluResult, lang: AppLang) -> str:
    if not nlu.detected_topics:
        return ""
    en = lang == "en"
    labels = ", ".join(t.label for t in nlu.detected_topics[:2])
    if en:
        return f"\n\nTOPICS: User is talking about: {labels}. Stay relevant to these themes."
    return f"\n\nONDERWERPEN: De gebruiker heeft het over: {labels}. Blijf relevant bij deze thema's."


def build_system_prompt(
    persona: PersonaConfig,
    lang: AppLang = "nl",
    memory_block: str = "",
    conversation_thread: str = "",
    *,
    voice_mode: bool = False,
    overlap_mode: bool = False,
    nlu: Optional[NluResult] = None,
    plan: Optional[ResponsePlan] = None,
) -> str:
    """Build the full system instruction for the LLM."""
    if plan is not None:
        memory_block = plan.memory_block if plan.use_memory else ""

    en = lang == "en"
    parts: list[str] = [persona.system_prompt.strip()]

    parts.append(
        "\n\nLANGUAGE: Reply in English only."
        if en
        else "\n\nLANGUAGE: Antwoord alleen in het Nederlands."
    )

    parts.append(
        _bullet_block(
            "RESPONSE STYLE" if en else "ANTWOORDSTIJL",
            persona.response_style_rules,
        )
    )
    parts.append(
        _bullet_block(
            "MEMORY RULES" if en else "GEHEUGENREGELS",
            persona.memory_rules,
        )
    )
    parts.append(
        _bullet_block(
            "SAFETY RULES" if en else "VEILIGHEIDSREGELS",
            persona.safety_rules,
        )
    )
    parts.append(
        _bullet_block(
            "FORBIDDEN" if en else "VERBODEN",
            persona.forbidden_behaviors,
        )
    )

    name_rule_en = (
        f"\n\nNAME: You are {persona.name}. Use the user's name ONLY if it appears under [MEMORY]. "
        "Never invent or guess a name."
    )
    name_rule_nl = (
        f"\n\nNAAM: U bent {persona.name}. Gebruik de naam van de gebruiker ALLEEN als die onder [GEHEUGEN] staat. "
        "Verzin of raad nooit een naam."
    )
    parts.append(name_rule_en if en else name_rule_nl)

    if nlu is not None and plan is None:
        parts.append(_tone_guidance(nlu, lang))
        parts.append(_topic_guidance(nlu, lang))

    if voice_mode:
        if overlap_mode:
            parts.append(
                "\n\nMID-SPEECH: User paused briefly. React in 1–2 short sentences."
                if en
                else "\n\nONDERBREKING: De gebruiker pauzeerde even. Reageer in 1–2 korte zinnen."
            )
        else:
            parts.append(
                "\n\nVOICE: 1–2 short sentences only. Warm and direct."
                if en
                else "\n\nSTEM: Slechts 1–2 korte zinnen. Warm en direct."
            )

    if memory_block.strip():
        label = "MEMORY" if en else "GEHEUGEN"
        parts.append(f"\n\n[{label}]\n{memory_block.strip()}")

    if conversation_thread.strip():
        label = "CONVERSATION THREAD" if en else "GESPREKSDRAAD"
        parts.append(f"\n\n[{label}]\n{conversation_thread.strip()}")

    prompt = "".join(parts).strip()
    if plan is not None:
        prompt = append_quality_block(prompt, plan, lang)
    return prompt

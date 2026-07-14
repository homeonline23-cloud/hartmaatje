"""Tests for tone/topic guidance and response plan in prompt builder."""

from app.domain.models.dialogue import ResponsePlan
from app.domain.models.nlu import DetectedTopic, DetectedTone, NluResult
from app.domain.models.persona import PersonaConfig
from app.services.prompts.prompt_builder import build_system_prompt


def _persona() -> PersonaConfig:
    return PersonaConfig(
        id="fenna",
        name="Fenna",
        intro_line="Hallo",
        system_prompt="Je bent Fenna.",
    )


def test_prompt_includes_sadness_tone_guidance() -> None:
    nlu = NluResult(detected_tone=DetectedTone(primary="sadness", confidence=0.8))
    prompt = build_system_prompt(_persona(), "nl", nlu=nlu)
    assert "verdrietig" in prompt.lower() or "zachter" in prompt.lower()


def test_prompt_includes_topic_guidance() -> None:
    nlu = NluResult(
        detected_topics=[
            DetectedTopic(id="gardening", label="tuinieren", confidence=0.7)
        ]
    )
    prompt = build_system_prompt(_persona(), "nl", nlu=nlu)
    assert "tuinieren" in prompt.lower()


def test_prompt_includes_quality_block_from_plan() -> None:
    plan = ResponsePlan(
        intent="emotional_support",
        follow_up_allowed=False,
        tone_mode="warm_soft",
        quality_hints=["Geen interview."],
    )
    prompt = build_system_prompt(_persona(), "nl", plan=plan)
    assert "GESPREKSKWALITEIT" in prompt
    assert "Geen interview" in prompt
    assert "WARM_SOFT" in prompt

"""Tests for conversation-quality enforcement."""

from app.domain.models.dialogue import ResponsePlan
from app.domain.models.nlu import NluResult
from app.domain.models.persona import PersonaConfig
from app.services.quality.quality_enforcer import validate_reply


def _persona() -> PersonaConfig:
    return PersonaConfig(
        id="fenna", name="Fenna", intro_line="Hallo", system_prompt="Je bent Fenna."
    )


def test_strips_questions_when_follow_up_not_allowed() -> None:
    plan = ResponsePlan(follow_up_allowed=False, max_questions=0)
    reply = "Dat klinkt fijn. Hoe voelt u zich daarbij?"
    _, violations, _ = validate_reply(reply, plan, _persona(), NluResult(), "nl")
    assert "too_many_questions" in violations


def test_allows_one_question_when_follow_up_allowed() -> None:
    plan = ResponsePlan(follow_up_allowed=True, max_questions=1)
    reply = "Dat herken ik. Vertelt u daar eens over?"
    _, violations, _ = validate_reply(reply, plan, _persona(), NluResult(), "nl")
    assert "too_many_questions" not in violations


def test_detects_interview_style() -> None:
    plan = ResponsePlan(follow_up_allowed=False, max_questions=0)
    reply = "Vertel eens, hoe voelt u zich daarbij?"
    _, violations, _ = validate_reply(reply, plan, _persona(), NluResult(), "nl")
    assert "irrelevant_follow_up" in violations

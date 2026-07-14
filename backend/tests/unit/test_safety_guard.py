"""Tests for safety guard."""

from app.services.personas.persona_loader import get_persona
from app.services.safety.safety_guard import analyze_user_message, check_reply


def test_emergency_triggers_block() -> None:
    result = analyze_user_message("Ik val en kan niet opstaan, bel 112!")
    assert result.emergency_reply
    assert result.block_llm


def test_dependency_in_reply_flagged() -> None:
    persona = get_persona("fenna")
    result = check_reply("Ik ben er altijd voor u, u kunt niet zonder mij.", persona)
    assert "dependency_language" in result.reply_violations


def test_identity_drift_flagged() -> None:
    persona = get_persona("fenna")
    result = check_reply("Hallo, ik ben Maarten.", persona)
    assert "identity_drift" in result.reply_violations

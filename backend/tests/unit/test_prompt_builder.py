"""Tests for prompt builder."""

from app.services.personas.persona_loader import get_persona
from app.services.prompts.prompt_builder import build_system_prompt


def test_fenna_prompt_contains_name() -> None:
    persona = get_persona("fenna")
    prompt = build_system_prompt(persona, "nl")
    assert "Fenna" in prompt


def test_english_prompt_language_rule() -> None:
    persona = get_persona("fenna")
    prompt = build_system_prompt(persona, "en")
    assert "English" in prompt

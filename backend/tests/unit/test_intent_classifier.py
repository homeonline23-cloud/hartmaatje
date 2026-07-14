"""Tests for intent classification — 6 labels."""

from app.domain.models.nlu import DetectedTone, NluResult
from app.services.dialogue.intent_service import classify_intent
from app.services.nlu.service import analyze_text
from app.services.safety.safety_guard import GuardResult, analyze_user_message


def test_greeting_maps_to_normal_conversation() -> None:
    nlu = analyze_text("Hallo, goedemorgen!", "nl")
    guard = analyze_user_message("Hallo, goedemorgen!")
    intent = classify_intent("Hallo, goedemorgen!", nlu, guard, "nl")
    assert intent.id == "normal_conversation"


def test_memory_related_intent() -> None:
    text = "Mijn kleindochter Marie komt morgen op bezoek."
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    assert intent.id == "memory_related"


def test_emotional_support_intent() -> None:
    text = "Ik voel me zo eenzaam vandaag, niemand komt op bezoek."
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    assert intent.id == "emotional_support"


def test_research_candidate_intent() -> None:
    text = "Kun je voor me opzoeken wat het weer morgen wordt?"
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    assert intent.id == "research_candidate"


def test_normal_conversation_fallback() -> None:
    text = "Dat klinkt allemaal best gezellig."
    nlu = NluResult(detected_tone=DetectedTone(primary="neutral"))
    guard = GuardResult()
    intent = classify_intent(text, nlu, guard, "nl")
    assert intent.id == "normal_conversation"

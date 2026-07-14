"""Tests for NLU service (Phase 2)."""

from app.services.nlu.service import analyze_text


def test_extracts_family_entity_and_memory_candidate() -> None:
    result = analyze_text("Mijn kleindochter Marie komt morgen op bezoek.", "nl")
    assert any(e.type == "person" for e in result.entities)
    assert any(c.field == "family" and "Marie" in c.value for c in result.candidate_memories)
    assert any(t.id == "family" for t in result.detected_topics)


def test_detects_loneliness_topic_and_sadness_tone() -> None:
    result = analyze_text("Ik voel me zo eenzaam vandaag, het is verdrietig.", "nl")
    topic_ids = {t.id for t in result.detected_topics}
    assert "loneliness" in topic_ids
    assert result.detected_tone.primary in ("sadness", "stress", "neutral")


def test_detects_joy_tone() -> None:
    result = analyze_text("Wat was het heerlijk, ik ben zo blij vandaag!", "nl")
    assert result.detected_tone.primary == "joy"


def test_detects_confusion_tone() -> None:
    result = analyze_text("Ik snap het niet meer, ik ben een beetje verward.", "nl")
    assert result.detected_tone.primary == "confusion"


def test_skips_trivial_message_candidates() -> None:
    result = analyze_text("ja", "nl")
    assert result.candidate_memories == []
    assert result.detected_topics == []


def test_gardening_topic_detection() -> None:
    result = analyze_text("Ik was vandaag in de tuin met mijn bloemen.", "nl")
    assert any(t.id == "gardening" for t in result.detected_topics)


def test_safety_signals_are_hints_only() -> None:
    result = analyze_text("Ik voel pijn op de borst.", "nl")
    assert any(s.type in ("health_hint", "emergency_hint") for s in result.safety_signals)


def test_intent_placeholder_is_none() -> None:
    result = analyze_text("Hallo, hoe gaat het?", "nl")
    assert result.intent is None


def test_english_family_extraction() -> None:
    result = analyze_text("My daughter Anna visits on Sunday.", "en")
    assert any(c.field == "family" for c in result.candidate_memories)
    assert any(t.id == "family" for t in result.detected_topics)

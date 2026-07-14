"""Tests for memory ranker."""

from app.domain.models.nlu import DetectedTopic, ExtractedEntity, MemoryCandidate, NluResult
from app.services.memory.memory_ranker import rank_candidates, rank_memory_lines


def test_rank_candidates_by_confidence_and_field() -> None:
    candidates = [
        MemoryCandidate(field="notes", value="random note", confidence=0.9),
        MemoryCandidate(field="family", value="kleindochter Marie", confidence=0.7),
    ]
    ranked = rank_candidates(candidates)
    assert ranked[0].field == "family"


def test_rank_memory_lines_prefers_matching_tokens() -> None:
    lines = ["Hobby: breien", "Huisdier: hond Max", "Plaats: Utrecht"]
    nlu = NluResult(
        entities=[ExtractedEntity(type="pet", text="Max", normalized="max", confidence=0.8)],
        detected_topics=[DetectedTopic(id="family", label="familie", confidence=0.8)],
    )
    ranked = rank_memory_lines(lines, "Mijn hond Max was blij", nlu)
    assert any("Max" in line for line in ranked)

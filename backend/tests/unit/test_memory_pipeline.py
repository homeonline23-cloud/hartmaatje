"""Tests for canonical memory pipeline."""

from app.domain.models.nlu import MemoryCandidate
from app.domain.models.persona import PersonaConfig
from app.schemas import ResidentMemory
from app.services.memory.pipeline import MemoryPipeline


class _FakeStore:
    def __init__(self, memory: ResidentMemory) -> None:
        self._memory = memory
        self.merged: list[MemoryCandidate] = []

    def load(self, resident_id: str) -> ResidentMemory:
        return self._memory

    def merge_candidates(self, resident_id: str, candidates: list, **kwargs) -> bool:
        self.merged = list(candidates)
        return bool(candidates)

    def extract_and_merge(self, resident_id: str, user_message: str) -> bool:
        return False


def _persona() -> PersonaConfig:
    return PersonaConfig(
        id="fenna",
        name="Fenna",
        intro_line="Hallo",
        system_prompt="Je bent Fenna.",
    )


def test_pipeline_blocks_identity_question() -> None:
    memory = ResidentMemory(resident_id="guest", display_name="Jan", pets=["hond Max"])
    pipeline = MemoryPipeline(store=_FakeStore(memory))  # type: ignore[arg-type]
    result = pipeline.process_turn(
        resident_id="guest",
        user_message="Wie bent u?",
        persona=_persona(),
        lang="nl",
        candidates=[],
    )
    assert result.prompt_block == ""
    assert result.metrics.identity_blocked is True
    assert result.known_name == "Jan"


def test_pipeline_saves_and_ranks_relevant_memory() -> None:
    memory = ResidentMemory(resident_id="guest", pets=["hond Max"])
    store = _FakeStore(memory)
    pipeline = MemoryPipeline(store=store)  # type: ignore[arg-type]
    candidates = [
        MemoryCandidate(field="pets", value="hond Max", category="pets", confidence=0.9)
    ]
    result = pipeline.process_turn(
        resident_id="guest",
        user_message="Mijn hond Max was vandaag blij.",
        persona=_persona(),
        lang="nl",
        candidates=candidates,
    )
    assert result.memory_updated is True
    assert result.metrics.saved_count == 1
    assert "Max" in result.prompt_block or "hond" in result.prompt_block.lower()


def test_pipeline_enrich_calendar() -> None:
    memory = ResidentMemory(
        resident_id="guest",
        calendar=["morgen bezoek van dochter Marie om 14:00"],
    )
    pipeline = MemoryPipeline(store=_FakeStore(memory))  # type: ignore[arg-type]
    context, used = pipeline.enrich_tool(
        "calendar",
        memory,
        "Wanneer komt mijn dochter?",
        "nl",
    )
    assert used is True
    assert "Marie" in context or "bezoek" in context.lower()

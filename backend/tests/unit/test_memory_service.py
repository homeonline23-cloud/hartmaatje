"""Tests for memory service."""

from app.domain.models.nlu import MemoryCandidate
from app.domain.models.persona import PersonaConfig
from app.schemas import ResidentMemory
from app.services.memory.memory_service import JsonMemoryService


class _FakeStore:
    def __init__(self, memory: ResidentMemory) -> None:
        self._memory = memory
        self.saved = False

    def load(self, resident_id: str) -> ResidentMemory:
        return self._memory

    def extract_and_merge(self, resident_id: str, user_message: str) -> bool:
        self.saved = True
        return False

    def merge_candidates(self, resident_id: str, candidates: list, **kwargs) -> bool:
        self.saved = True
        return bool(candidates)


def _persona() -> PersonaConfig:
    return PersonaConfig(
        id="fenna",
        name="Fenna",
        intro_line="Hallo",
        system_prompt="Je bent Fenna.",
    )


def test_identity_question_returns_empty_memory_block() -> None:
    memory = ResidentMemory(
        resident_id="guest",
        display_name="Jan",
        family=["dochter Marie"],
    )
    service = JsonMemoryService(store=_FakeStore(memory))  # type: ignore[arg-type]
    ctx = service.build_context("guest", "Wie bent u?", _persona(), "nl")
    assert ctx.prompt_block == ""
    assert ctx.known_name == "Jan"


def test_relevant_memory_is_included() -> None:
    memory = ResidentMemory(resident_id="guest", pets=["hond Max"])
    service = JsonMemoryService(store=_FakeStore(memory))  # type: ignore[arg-type]
    ctx = service.build_context(
        "guest", "Mijn hond Max was vandaag blij.", _persona(), "nl"
    )
    assert "Max" in ctx.prompt_block or "hond" in ctx.prompt_block.lower()


def test_irrelevant_memory_is_filtered_out() -> None:
    memory = ResidentMemory(resident_id="guest", hobbies=["breien"])
    service = JsonMemoryService(store=_FakeStore(memory))  # type: ignore[arg-type]
    ctx = service.build_context("guest", "Het regent vandaag.", _persona(), "nl")
    assert ctx.prompt_block == ""


def test_nlu_topic_boosts_relevant_memory() -> None:
    from app.services.nlu.service import analyze_text

    memory = ResidentMemory(
        resident_id="guest",
        family=["kleindochter Marie"],
        hobbies=["breien"],
    )
    service = JsonMemoryService(store=_FakeStore(memory))  # type: ignore[arg-type]
    nlu = analyze_text("Mijn kleindochter komt morgen.", "nl")
    ctx = service.build_context(
        "guest", "Mijn kleindochter komt morgen.", _persona(), "nl", nlu=nlu
    )
    assert "Marie" in ctx.prompt_block or "kleindochter" in ctx.prompt_block.lower()
    assert "breien" not in ctx.prompt_block.lower()


class _SavingStore(_FakeStore):
    def __init__(self, memory: ResidentMemory) -> None:
        super().__init__(memory)
        self.candidates: list = []

    def merge_candidates(self, resident_id: str, candidates: list, **kwargs) -> bool:
        self.candidates = list(candidates)
        return bool(candidates)


def test_save_candidates_delegates_to_store() -> None:
    memory = ResidentMemory(resident_id="guest")
    store = _SavingStore(memory)
    service = JsonMemoryService(store=store)  # type: ignore[arg-type]
    candidates = [
        MemoryCandidate(field="family", value="kleinzoon Tom", category="family", confidence=0.8)
    ]
    assert service.save_candidates("guest", candidates) is True
    assert len(store.candidates) == 1

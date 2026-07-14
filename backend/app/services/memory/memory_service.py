"""Memory service foundation — relevance filter and identity-first rules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from app.domain.models.nlu import MemoryCandidate, NluResult
from app.domain.models.persona import PersonaConfig
from app.repositories.memory_repository import MemoryStore, get_memory_store
from app.schemas import ResidentMemory
from app.services.memory.memory_filters import is_identity_question
from app.services.memory.memory_ranker import rank_candidates, rank_memory_lines

AppLang = Literal["nl", "en"]


@dataclass
class MemoryContext:
    """Structured memory context for prompt building."""

    prompt_block: str
    updated: bool
    known_name: str | None


class MemoryService(Protocol):
    def load(self, resident_id: str) -> ResidentMemory: ...
    def extract_and_save(self, resident_id: str, user_message: str) -> bool: ...
    def save_candidates(self, resident_id: str, candidates: list[MemoryCandidate]) -> bool: ...
    def build_context(
        self,
        resident_id: str,
        user_message: str,
        persona: PersonaConfig,
        lang: AppLang,
        session_summary: str = "",
        fallback_name: str | None = None,
        nlu: NluResult | None = None,
    ) -> MemoryContext: ...


class JsonMemoryService:
    """Simple memory service backed by the JSON repository."""

    def __init__(self, store: MemoryStore | None = None) -> None:
        self._store = store or get_memory_store()

    def load(self, resident_id: str) -> ResidentMemory:
        return self._store.load(resident_id)

    def extract_and_save(self, resident_id: str, user_message: str) -> bool:
        return self._store.extract_and_merge(resident_id, user_message)

    def save_candidates(self, resident_id: str, candidates: list[MemoryCandidate]) -> bool:
        useful = [c for c in candidates if c.confidence >= 0.45 and c.value.strip()]
        if not useful:
            return False
        ranked = rank_candidates(useful)
        return self._store.merge_candidates(resident_id, ranked)

    def build_context(
        self,
        resident_id: str,
        user_message: str,
        persona: PersonaConfig,
        lang: AppLang,
        session_summary: str = "",
        fallback_name: str | None = None,
        nlu: NluResult | None = None,
    ) -> MemoryContext:
        memory = self.load(resident_id)
        known_name = memory.display_name or fallback_name

        if is_identity_question(user_message):
            return MemoryContext(prompt_block="", updated=False, known_name=known_name)

        relevant_summary = _filter_session_summary(session_summary, user_message, lang, nlu=nlu)
        full_block = memory.to_prompt_block(lang=lang, session_summary=relevant_summary)
        prompt_block = _filter_relevant_block(full_block, user_message, lang, nlu=nlu)

        return MemoryContext(
            prompt_block=prompt_block,
            updated=False,
            known_name=known_name,
        )


def _filter_session_summary(
    summary: str,
    user_message: str,
    lang: AppLang,
    *,
    nlu: NluResult | None = None,
) -> str:
    if not summary.strip():
        return ""
    lines = [line.strip() for line in summary.splitlines() if line.strip()]
    ranked = rank_memory_lines(lines, user_message, nlu, limit=2)
    if not ranked:
        return ""
    label = "Active topic" if lang == "en" else "Actief onderwerp"
    return "\n".join(
        f"{label}: {line}" if not line.lower().startswith(label.lower()) else line
        for line in ranked
    )


def _filter_relevant_block(
    block: str,
    user_message: str,
    lang: AppLang,
    *,
    nlu: NluResult | None = None,
) -> str:
    empty = "No stored memories yet." if lang == "en" else "Nog geen opgeslagen herinneringen."
    if not block.strip() or block.strip() == empty:
        return ""

    lines = [line.strip() for line in block.splitlines() if line.strip()]
    ranked = rank_memory_lines(lines, user_message, nlu, limit=6)
    return "\n".join(ranked)


_default_service: JsonMemoryService | None = None


def get_memory_service() -> JsonMemoryService:
    global _default_service
    if _default_service is None:
        _default_service = JsonMemoryService()
    return _default_service

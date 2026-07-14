"""Memory service — delegates to canonical MemoryPipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

from app.domain.models.memory import MemoryTurnMetrics
from app.domain.models.nlu import MemoryCandidate, NluResult
from app.domain.models.persona import PersonaConfig
from app.repositories.memory_repository import MemoryStore, get_memory_store
from app.schemas import ResidentMemory
from app.services.memory.pipeline import MemoryPipeline, get_memory_pipeline

AppLang = Literal["nl", "en"]


@dataclass
class MemoryContext:
    """Structured memory context for prompt building."""

    prompt_block: str
    updated: bool
    known_name: str | None
    metrics: MemoryTurnMetrics = field(default_factory=MemoryTurnMetrics)


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
    """Memory service backed by MemoryPipeline + JSON/SQLite/Postgres store."""

    def __init__(
        self,
        store: MemoryStore | None = None,
        pipeline: MemoryPipeline | None = None,
    ) -> None:
        self._pipeline = pipeline or MemoryPipeline(store=store or get_memory_store())

    def load(self, resident_id: str) -> ResidentMemory:
        return self._pipeline.load(resident_id)

    def extract_and_save(self, resident_id: str, user_message: str) -> bool:
        return self._pipeline.extract_and_merge(resident_id, user_message)

    def save_candidates(self, resident_id: str, candidates: list[MemoryCandidate]) -> bool:
        updated, _ = self._pipeline.save_candidates(resident_id, candidates)
        return updated

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
        result = self._pipeline.process_turn(
            resident_id=resident_id,
            user_message=user_message,
            persona=persona,
            lang=lang,
            nlu=nlu,
            session_summary=session_summary,
            fallback_name=fallback_name,
            candidates=[],
        )
        return MemoryContext(
            prompt_block=result.prompt_block,
            updated=result.memory_updated,
            known_name=result.known_name,
            metrics=result.metrics,
        )


def get_memory_service() -> JsonMemoryService:
    return JsonMemoryService(pipeline=get_memory_pipeline())

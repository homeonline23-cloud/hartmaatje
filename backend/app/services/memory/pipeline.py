"""Canonical memory pipeline — save, retrieve, and tool enrichment."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

from app.core.constants import (
    MAX_MEMORY_INJECT_LINES,
    MAX_MEMORY_RANK_LINES,
    MIN_CANDIDATE_CONFIDENCE,
)
from app.domain.models.dialogue import ToolAction
from app.domain.models.memory import MemoryTurnMetrics
from app.domain.models.nlu import MemoryCandidate, NluResult
from app.domain.models.persona import PersonaConfig
from app.repositories.memory_repository import MemoryStore, get_memory_store
from app.schemas import ResidentMemory
from app.services.memory.enrichment import (
    fetch_calendar_context,
    fetch_care_notes_context,
    wants_calendar,
    wants_care_notes,
)
from app.services.memory.memory_filters import is_identity_question
from app.services.memory.memory_ranker import rank_candidates, rank_memory_lines_detailed

AppLang = Literal["nl", "en"]


@dataclass
class MemoryPipelineResult:
    prompt_block: str
    known_name: str | None
    memory_updated: bool
    metrics: MemoryTurnMetrics
    resident_memory: ResidentMemory


class MemoryPipeline:
    """Single entry point for memory save, retrieval, and tool enrichment context."""

    def __init__(self, store: MemoryStore | None = None) -> None:
        self._store = store or get_memory_store()

    def load(self, resident_id: str) -> ResidentMemory:
        return self._store.load(resident_id)

    def save_candidates(
        self,
        resident_id: str,
        candidates: list[MemoryCandidate],
    ) -> tuple[bool, int]:
        useful = [
            c for c in candidates
            if c.confidence >= MIN_CANDIDATE_CONFIDENCE and c.value.strip()
        ]
        if not useful:
            return False, 0
        ranked = rank_candidates(useful)
        updated = self._store.merge_candidates(resident_id, ranked)
        return updated, len(ranked)

    def process_turn(
        self,
        *,
        resident_id: str,
        user_message: str,
        persona: PersonaConfig,
        lang: AppLang,
        nlu: NluResult | None = None,
        session_summary: str = "",
        fallback_name: str | None = None,
        candidates: list[MemoryCandidate] | None = None,
        tool_action: Optional[ToolAction] = None,
        tool_query: str = "",
    ) -> MemoryPipelineResult:
        _ = persona
        metrics = MemoryTurnMetrics(candidates_in=len(candidates or []))
        memory_updated, saved = self.save_candidates(resident_id, candidates or [])
        metrics.saved_count = saved

        memory = self.load(resident_id)
        known_name = memory.display_name or fallback_name

        if is_identity_question(user_message):
            metrics.identity_blocked = True
            return MemoryPipelineResult(
                prompt_block="",
                known_name=known_name,
                memory_updated=memory_updated,
                metrics=metrics,
                resident_memory=memory,
            )

        relevant_summary = _filter_session_summary(session_summary, user_message, lang, nlu=nlu)
        full_block = memory.to_prompt_block(lang=lang, session_summary=relevant_summary)
        ranked = _rank_block_lines(full_block, user_message, lang, nlu=nlu)
        metrics.ranked_lines = ranked[:MAX_MEMORY_INJECT_LINES]
        metrics.retrieved_count = len(metrics.ranked_lines)
        prompt_block = "\n".join(line.text for line in metrics.ranked_lines)

        if tool_action == "calendar" and wants_calendar(tool_query or user_message):
            metrics.calendar_used = True
        if tool_action == "care_notes" and wants_care_notes(tool_query or user_message):
            metrics.care_notes_used = True

        return MemoryPipelineResult(
            prompt_block=prompt_block,
            known_name=known_name,
            memory_updated=memory_updated,
            metrics=metrics,
            resident_memory=memory,
        )

    def enrich_tool(
        self,
        tool_action: ToolAction,
        memory: ResidentMemory,
        query: str,
        lang: AppLang = "nl",
    ) -> tuple[str, bool]:
        if tool_action == "calendar":
            if not wants_calendar(query):
                return "", False
            return fetch_calendar_context(memory, query, lang), True
        if tool_action == "care_notes":
            if not wants_care_notes(query):
                return "", False
            return fetch_care_notes_context(memory, query, lang), True
        return "", False

    def extract_and_merge(self, resident_id: str, user_message: str) -> bool:
        return self._store.extract_and_merge(resident_id, user_message)


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
    ranked = rank_memory_lines_detailed(lines, user_message, nlu, limit=2)
    if not ranked:
        return ""
    label = "Active topic" if lang == "en" else "Actief onderwerp"
    return "\n".join(
        f"{label}: {line.text}" if not line.text.lower().startswith(label.lower()) else line.text
        for line in ranked
    )


def _rank_block_lines(
    block: str,
    user_message: str,
    lang: AppLang,
    *,
    nlu: NluResult | None = None,
):
    empty = "No stored memories yet." if lang == "en" else "Nog geen opgeslagen herinneringen."
    if not block.strip() or block.strip() == empty:
        return []
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    return rank_memory_lines_detailed(lines, user_message, nlu, limit=MAX_MEMORY_RANK_LINES)


_default_pipeline: MemoryPipeline | None = None


def get_memory_pipeline() -> MemoryPipeline:
    global _default_pipeline
    if _default_pipeline is None:
        _default_pipeline = MemoryPipeline()
    return _default_pipeline

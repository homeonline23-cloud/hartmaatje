"""Memory repository protocol — swap JSON, SQLite, or Postgres backends."""

from __future__ import annotations

from typing import Protocol

from app.domain.models.nlu import MemoryCandidate
from app.schemas import ResidentMemory


class MemoryRepository(Protocol):
    def load(self, resident_id: str) -> ResidentMemory: ...
    def save(self, memory: ResidentMemory) -> None: ...
    def merge_candidates(
        self,
        resident_id: str,
        candidates: list[MemoryCandidate],
        *,
        min_confidence: float = 0.45,
    ) -> bool: ...
    def extract_and_merge(self, resident_id: str, user_message: str) -> bool: ...

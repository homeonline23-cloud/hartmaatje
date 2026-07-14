"""Memory domain models — ranked lines and turn metrics."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RankedMemoryLine:
    text: str
    score: float
    reasons: list[str] = field(default_factory=list)


@dataclass
class MemoryTurnMetrics:
    candidates_in: int = 0
    saved_count: int = 0
    retrieved_count: int = 0
    identity_blocked: bool = False
    calendar_used: bool = False
    care_notes_used: bool = False
    ranked_lines: list[RankedMemoryLine] = field(default_factory=list)

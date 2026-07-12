"""Structured timing for voice-turn pipeline debugging."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("fenna.timing")


@dataclass
class TurnTimer:
    """High-resolution stage timer for one user voice turn."""

    turn_id: str = ""
    marks: dict[str, float] = field(default_factory=dict)
    _t0: float = field(default_factory=time.perf_counter)
    _last: float = field(default_factory=time.perf_counter)

    def mark(self, stage: str) -> float:
        now = time.perf_counter()
        elapsed_ms = (now - self._last) * 1000
        total_ms = (now - self._t0) * 1000
        self.marks[stage] = round(elapsed_ms, 1)
        self.marks[f"{stage}_total_ms"] = round(total_ms, 1)
        self._last = now
        return elapsed_ms

    def log_summary(self, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "turn_id": self.turn_id,
            "stages_ms": {k: v for k, v in self.marks.items() if not k.endswith("_total_ms")},
            "stage_totals_ms": {k: v for k, v in self.marks.items() if k.endswith("_total_ms")},
        }
        if extra:
            payload.update(extra)
        logger.info("FENNA_VOICE_TURN %s", payload)
        return payload

    def to_client(self) -> dict[str, float]:
        """Flat timings safe to return to the frontend."""
        return {k: v for k, v in self.marks.items() if not k.endswith("_total_ms")}

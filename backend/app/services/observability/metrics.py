"""In-process turn metrics — replace with Prometheus/Datadog later."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock

_lock = Lock()
_counters: dict[str, float] = defaultdict(float)


def record_turn_metric(name: str, value: float = 1.0) -> None:
    with _lock:
        _counters[name] += value


def record_turn(payload: dict) -> None:
    """Record standard metrics from a turn log payload."""
    record_turn_metric("turns_total")
    if payload.get("memory_used"):
        record_turn_metric("memory_used_total")
    if payload.get("tool_used"):
        record_turn_metric("tool_used_total")
    if payload.get("safety_triggered"):
        record_turn_metric("safety_triggered_total")
    if payload.get("reply_retried"):
        record_turn_metric("reply_retried_total")
    record_turn_metric("response_length_sum", float(payload.get("response_length", 0)))


def snapshot() -> dict[str, float]:
    with _lock:
        return dict(_counters)


def reset() -> None:
    with _lock:
        _counters.clear()

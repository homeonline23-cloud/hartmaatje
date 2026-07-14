"""In-process turn metrics with Prometheus text export."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock

_lock = Lock()
_counters: dict[str, float] = defaultdict(float)

_METRIC_HELP = {
    "turns_total": "Total chat turns processed",
    "memory_used_total": "Turns where resident memory was injected",
    "tool_used_total": "Turns where an external tool was used",
    "safety_triggered_total": "Turns where safety handling was triggered",
    "reply_retried_total": "Turns where the LLM reply was retried",
    "response_length_sum": "Cumulative assistant response length in characters",
    "voice_turn_failed_total": "Voice turns that failed without recovery",
    "voice_turn_recovered_total": "Voice turns that failed but returned to listening",
    "voice_interrupt_total": "User interruptions during TTS playback",
}


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


def record_voice_client_metrics(payload: dict) -> None:
    """Optional client-reported voice metrics (future POST /admin/voice-metrics)."""
    if payload.get("failed"):
        record_turn_metric("voice_turn_failed_total")
    if payload.get("recovered"):
        record_turn_metric("voice_turn_recovered_total")
    if payload.get("interrupted"):
        record_turn_metric("voice_interrupt_total")


def snapshot() -> dict[str, float]:
    with _lock:
        return dict(_counters)


def reset() -> None:
    with _lock:
        _counters.clear()


def to_prometheus_text() -> str:
    """Render counters in Prometheus exposition format."""
    lines: list[str] = []
    with _lock:
        names = sorted(_counters.keys())
        for name in names:
            help_text = _METRIC_HELP.get(name, name.replace("_", " "))
            lines.append(f"# HELP {name} {help_text}")
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name} {_counters[name]}")
    return "\n".join(lines) + ("\n" if lines else "")

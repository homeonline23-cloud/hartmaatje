from __future__ import annotations

from dataclasses import dataclass


STATES = frozenset(
    {
        "IDLE",
        "READY",
        "LISTENING",
        "TRANSCRIBING",
        "THINKING",
        "SPEAKING",
        "SPEAKING_INTERRUPTED",
        "ERROR_RECOVERABLE",
        "RECONNECTING",
    }
)

# (from_state, trigger) -> to_state
TRANSITIONS: dict[tuple[str, str], str] = {
    ("IDLE", "session_ready"): "READY",
    ("READY", "speech_start"): "LISTENING",
    ("LISTENING", "speech_end"): "TRANSCRIBING",
    ("LISTENING", "abort"): "READY",
    ("TRANSCRIBING", "stt_final"): "THINKING",
    ("TRANSCRIBING", "abort"): "READY",
    ("THINKING", "reply_ready"): "SPEAKING",
    ("SPEAKING", "reply_done"): "READY",
    ("SPEAKING", "interrupt"): "SPEAKING_INTERRUPTED",
    ("SPEAKING_INTERRUPTED", "interrupt_handled"): "LISTENING",
}


@dataclass
class TransitionResult:
    from_state: str
    to_state: str
    reason: str
    ok: bool


class SessionFSM:
    def __init__(self, initial: str = "READY") -> None:
        if initial not in STATES:
            raise ValueError(f"Unknown state: {initial}")
        self.state = initial

    def transition(self, trigger: str, reason: str | None = None) -> TransitionResult:
        key = (self.state, trigger)
        if key not in TRANSITIONS:
            # Recoverable path for temporary problems / reconnect
            if trigger == "error":
                from_state = self.state
                self.state = "ERROR_RECOVERABLE"
                return TransitionResult(from_state, self.state, reason or "error", True)
            if trigger == "transport_lost":
                from_state = self.state
                self.state = "RECONNECTING"
                return TransitionResult(
                    from_state, self.state, reason or "transport_lost", True
                )
            if trigger == "recovered" and self.state in {
                "ERROR_RECOVERABLE",
                "RECONNECTING",
            }:
                from_state = self.state
                self.state = "READY"
                return TransitionResult(from_state, self.state, reason or "recovered", True)
            return TransitionResult(
                self.state, self.state, reason or f"ignored:{trigger}", False
            )

        from_state = self.state
        self.state = TRANSITIONS[key]
        return TransitionResult(from_state, self.state, reason or trigger, True)

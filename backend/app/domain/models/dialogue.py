"""Dialogue models — intent, decision, and response plan."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

IntentId = Literal[
    "normal_conversation",
    "memory_related",
    "emotional_support",
    "practical_question",
    "safety_sensitive",
    "research_candidate",
]

ToneMode = Literal["warm_soft", "clear_explain", "warm_normal", "supportive"]
ToolAction = Literal["research", "calendar", "care_notes"]


class ClassifiedIntent(BaseModel):
    id: IntentId
    confidence: float = 0.5
    reason: str = ""


class DialogueDecision(BaseModel):
    """Routing decision — what should happen before the LLM call."""

    use_memory: bool = True
    safety_mode: bool = False
    tool_action: Optional[ToolAction] = None
    tone_mode: ToneMode = "warm_normal"
    follow_up_allowed: bool = True
    max_questions: int = 1
    short_warm_reply: bool = False
    avoid_interview: bool = True
    memory_line_limit: int = 3


class ResponsePlan(BaseModel):
    """Structured plan passed to prompt builder and LLM."""

    intent: IntentId = "normal_conversation"
    use_memory: bool = True
    selected_memory_count: int = 0
    memory_block: str = ""
    tool_action: Optional[ToolAction] = None
    tool_context: str = ""
    tool_used: bool = False
    tone_mode: ToneMode = "warm_normal"
    follow_up_allowed: bool = True
    max_questions: int = 1
    safety_mode: bool = False
    short_warm_reply: bool = False
    quality_hints: list[str] = Field(default_factory=list)

    # Backward-compatible aliases
    @property
    def tone(self) -> ToneMode:
        return self.tone_mode

    @property
    def memory_limit(self) -> int:
        return self.selected_memory_count or 3

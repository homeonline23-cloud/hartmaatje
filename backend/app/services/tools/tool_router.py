"""Tool router — maps tool_action to enrichment handlers."""

from __future__ import annotations

from typing import Literal

from app.domain.models.dialogue import ToolAction
from app.schemas import ResidentMemory
from app.services.memory.enrichment import wants_calendar, wants_care_notes
from app.services.memory.pipeline import get_memory_pipeline
from app.services.tools import research_tool

AppLang = Literal["nl", "en"]


async def route_tool(
    action: ToolAction,
    query: str,
    lang: AppLang = "nl",
    *,
    resident_id: str = "guest",
    memory: ResidentMemory | None = None,
) -> tuple[str, bool]:
    """
    Route a tool action to its handler.

    Returns (context_text, was_used).
    """
    pipeline = get_memory_pipeline()
    mem = memory or pipeline.load(resident_id)

    if action == "research":
        if not research_tool.wants_research(query):
            return "", False
        context = await research_tool.fetch_research_context(query, lang)
        return context, bool(context)

    if action in ("calendar", "care_notes"):
        if action == "calendar" and not wants_calendar(query):
            return "", False
        if action == "care_notes" and not wants_care_notes(query):
            return "", False
        context, used = pipeline.enrich_tool(action, mem, query, lang)
        return context, used

    return "", False

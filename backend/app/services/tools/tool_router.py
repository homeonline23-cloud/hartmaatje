"""Tool router — maps tool_action to concrete tool implementations."""

from __future__ import annotations

from typing import Literal

from app.domain.models.dialogue import ToolAction
from app.services.tools import calendar_tool, care_notes_tool, research_tool

AppLang = Literal["nl", "en"]


async def route_tool(
    action: ToolAction,
    query: str,
    lang: AppLang = "nl",
    *,
    resident_id: str = "guest",
) -> tuple[str, bool]:
    """
    Route a tool action to its handler.

    Returns (context_text, was_used).
    """
    if action == "research":
        if not research_tool.wants_research(query):
            return "", False
        context = await research_tool.fetch_research_context(query, lang)
        return context, bool(context)

    if action == "calendar":
        if not calendar_tool.wants_calendar(query):
            return "", False
        context = calendar_tool.fetch_calendar_context(resident_id, query, lang)
        return context, bool(context)

    if action == "care_notes":
        if not care_notes_tool.wants_care_notes(query):
            return "", False
        context = care_notes_tool.fetch_care_notes_context(resident_id, query, lang)
        return context, bool(context)

    return "", False

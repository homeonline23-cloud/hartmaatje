"""Tool router — maps tool_action to concrete tool implementations."""

from __future__ import annotations

from typing import Literal

from app.domain.models.dialogue import ToolAction
from app.services.tools import web_search_tool

AppLang = Literal["nl", "en"]


async def route_tool(
    action: ToolAction,
    query: str,
    lang: AppLang = "nl",
) -> tuple[str, bool]:
    """
    Route a tool action to its handler.

    Returns (context_text, was_used).
    """
    if action == "research":
        if not web_search_tool.wants_web_search(query):
            return "", False
        context = await web_search_tool.fetch_web_context(query)
        return context, bool(context)

    # TODO: calendar tool
    # TODO: care_notes tool
    return "", False

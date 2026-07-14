"""Tool registry — legacy helper for tool invocation."""

from typing import Literal

from app.services.tools.tool_service import apply_tools

AppLang = Literal["nl", "en"]


async def maybe_invoke_tool(plan, query: str, lang: AppLang = "nl") -> str:
    """Legacy API — returns tool context string only."""
    updated = await apply_tools(plan, query, lang)
    return updated.tool_context


__all__ = ["apply_tools", "maybe_invoke_tool"]

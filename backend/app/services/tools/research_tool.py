"""Research tool — web lookup facade for the tools layer."""

from __future__ import annotations

from typing import Literal

from app.services.tools import web_search_tool

AppLang = Literal["nl", "en"]


def wants_research(query: str) -> bool:
    return web_search_tool.wants_web_search(query)


async def fetch_research_context(query: str, lang: AppLang = "nl") -> str:
    _ = lang
    return await web_search_tool.fetch_web_context(query)

"""Web search facade."""

from app.services.tools.web_search_tool import fetch_web_context, wants_web_search

__all__ = ["fetch_web_context", "wants_web_search"]

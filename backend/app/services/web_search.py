"""Detect when web search is truly needed — avoid slowing every question."""

from __future__ import annotations

import re

import httpx

_RESEARCH = re.compile(
    r"\b("
    r"research|look up|look it up|find out|search for|google|on the internet|online|"
    r"latest|current|news|weather|forecast|today'?s?|tonight|tomorrow|"
    r"who is|who was|what is|what are|when did|when is|where is|how much|how many|"
    r"tell me about|explain|compare|"
    r"zoek|opzoeken|onderzoek|op het internet|nieuws|weer|voorspelling|vandaag|morgen|"
    r"wat is|wie is|waar is|wanneer|hoeveel|vertel over|leg uit|kun je.*zoeken"
    r")\b",
    re.I,
)


def wants_web_help(message: str) -> bool:
    """Only explicit research/facts — NOT every sentence with '?'."""
    text = message.strip()
    if len(text) < 10:
        return False
    return bool(_RESEARCH.search(text))


async def fetch_web_context(query: str, max_chars: int = 800) -> str:
    """Optional DuckDuckGo hint — skipped when google_search is used."""
    if not wants_web_help(query):
        return ""
    q = query.strip()[:200]
    if not q:
        return ""

    url = "https://api.duckduckgo.com/"
    params = {"q": q, "format": "json", "no_html": 1, "skip_disambig": 1}

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url, params=params)
            if not res.is_success:
                return ""
            data = res.json()
    except Exception:
        return ""

    parts: list[str] = []
    abstract = (data.get("AbstractText") or "").strip()
    if abstract:
        parts.append(abstract[:400])

    blob = " ".join(parts).strip()
    return blob[:max_chars] if blob else ""

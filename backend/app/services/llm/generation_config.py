"""Shared Gemini generation settings for low-latency voice and chat."""

from __future__ import annotations


def flash_generation_config(
    *,
    temperature: float,
    max_output_tokens: int,
    model: str,
) -> dict:
    """Build generationConfig, turning off Flash "thinking" so replies start sooner.

    Gemini 2.5 Flash thinks by default. That silent extra pass is a large part of
    the 4–10s wait after a resident stops talking. Next.js voice already sets
    thinkingBudget to 0; the Python backend must do the same.
    """
    config: dict = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }
    if "flash" in (model or "").lower():
        config["thinkingConfig"] = {"thinkingBudget": 0}
    return config

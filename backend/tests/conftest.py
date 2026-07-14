"""Pytest configuration for HartMaatje backend."""

import pytest

from app.services.personas.persona_loader import clear_persona_cache


@pytest.fixture(autouse=True)
def _clear_persona_cache() -> None:
    clear_persona_cache()

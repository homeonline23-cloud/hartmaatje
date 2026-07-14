"""Tests for persona loader."""

from app.services.personas.persona_loader import (
    VALID_PERSONA_IDS,
    get_persona,
    get_persona_catalog,
    normalize_persona_id,
)


def test_catalog_loads_four_personas() -> None:
    catalog = get_persona_catalog()
    ids = {p.id for p in catalog.characters}
    assert ids == set(VALID_PERSONA_IDS)


def test_get_fenna() -> None:
    persona = get_persona("fenna")
    assert persona.name == "Fenna"


def test_normalize_unknown_defaults_to_fenna() -> None:
    assert normalize_persona_id("unknown") == "fenna"

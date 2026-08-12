"""Tests for the voice-changer model registry (storage/metadata only)."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.services.voice import voice_model_registry as registry


@pytest.fixture(autouse=True)
def _isolated_voice_models_dir(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("VOICE_MODELS_DIR", str(tmp_path))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_no_model_by_default() -> None:
    status = registry.get_status("peter")
    assert status.has_model is False
    assert status.has_index is False
    assert registry.get_model_path("peter") is None


def test_save_and_read_model() -> None:
    status = registry.save_model(
        "peter", model_bytes=b"fake-weights", model_filename="peter.pth"
    )
    assert status.has_model is True
    assert status.has_index is False
    assert status.original_filename == "peter.pth"
    assert status.uploaded_at is not None

    path = registry.get_model_path("peter")
    assert path is not None
    assert path.read_bytes() == b"fake-weights"


def test_save_with_index() -> None:
    status = registry.save_model(
        "colette",
        model_bytes=b"weights",
        model_filename="colette.pth",
        index_bytes=b"index-data",
        index_filename="colette.index",
    )
    assert status.has_index is True
    assert status.index_filename == "colette.index"
    assert registry.get_index_path("colette").read_bytes() == b"index-data"


def test_list_status_covers_all_personas() -> None:
    registry.save_model("peter", model_bytes=b"x", model_filename="peter.pth")
    statuses = {s.persona_id: s for s in registry.list_status()}
    assert set(statuses) == {"fenna", "maarten", "peter", "colette"}
    assert statuses["peter"].has_model is True
    assert statuses["fenna"].has_model is False


def test_delete_model_removes_files() -> None:
    registry.save_model("maarten", model_bytes=b"x", model_filename="maarten.pth")
    assert registry.has_model("maarten") is True

    removed = registry.delete_model("maarten")
    assert removed is True
    assert registry.has_model("maarten") is False
    assert registry.get_status("maarten").original_filename is None


def test_delete_nonexistent_model_returns_false() -> None:
    assert registry.delete_model("fenna") is False

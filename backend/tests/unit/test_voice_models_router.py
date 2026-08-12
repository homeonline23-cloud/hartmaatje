"""Voice-changer admin endpoints — auth gating and upload flow."""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _isolated_env(tmp_path, monkeypatch):
    monkeypatch.setenv("VOICE_MODELS_DIR", str(tmp_path))
    # Explicit empty override (not delenv) — process env vars take priority
    # over a developer's local backend/.env file, so this reliably disables
    # the feature regardless of what's in that (gitignored) file.
    monkeypatch.setenv("ADMIN_API_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_list_voice_models_does_not_require_admin_key() -> None:
    response = client.get("/voice-models")
    assert response.status_code == 200
    ids = {m["persona_id"] for m in response.json()["models"]}
    assert ids == {"fenna", "maarten", "peter", "colette"}


def test_upload_without_configured_admin_key_returns_503(monkeypatch) -> None:
    files = {"model_file": ("peter.pth", io.BytesIO(b"weights"), "application/octet-stream")}
    response = client.post("/voice-models/peter", files=files)
    assert response.status_code == 503


def test_upload_with_wrong_admin_key_returns_401(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    get_settings.cache_clear()

    files = {"model_file": ("peter.pth", io.BytesIO(b"weights"), "application/octet-stream")}
    response = client.post(
        "/voice-models/peter", files=files, headers={"X-Admin-Key": "wrong"}
    )
    assert response.status_code == 401


def test_upload_unknown_persona_returns_404(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    get_settings.cache_clear()

    files = {"model_file": ("x.pth", io.BytesIO(b"weights"), "application/octet-stream")}
    response = client.post(
        "/voice-models/unknown", files=files, headers={"X-Admin-Key": "secret"}
    )
    assert response.status_code == 404


def test_upload_rejects_non_pth_model_file(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    get_settings.cache_clear()

    files = {"model_file": ("peter.txt", io.BytesIO(b"weights"), "text/plain")}
    response = client.post(
        "/voice-models/peter", files=files, headers={"X-Admin-Key": "secret"}
    )
    assert response.status_code == 400


def test_upload_and_delete_roundtrip(monkeypatch) -> None:
    monkeypatch.setenv("ADMIN_API_KEY", "secret")
    get_settings.cache_clear()
    headers = {"X-Admin-Key": "secret"}

    files = {
        "model_file": ("peter.pth", io.BytesIO(b"weights"), "application/octet-stream"),
        "index_file": ("peter.index", io.BytesIO(b"index"), "application/octet-stream"),
    }
    upload_response = client.post("/voice-models/peter", files=files, headers=headers)
    assert upload_response.status_code == 200
    body = upload_response.json()
    assert body["has_model"] is True
    assert body["has_index"] is True
    assert body["original_filename"] == "peter.pth"

    list_response = client.get("/voice-models")
    peter_status = next(
        m for m in list_response.json()["models"] if m["persona_id"] == "peter"
    )
    assert peter_status["has_model"] is True

    delete_response = client.delete("/voice-models/peter", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["has_model"] is False

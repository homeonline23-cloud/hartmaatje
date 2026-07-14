"""Admin metrics endpoint."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.observability.metrics import record_turn_metric, reset

client = TestClient(app)


def test_admin_metrics_returns_snapshot() -> None:
    reset()
    record_turn_metric("turns_total", 2.0)
    response = client.get("/admin/metrics")
    assert response.status_code == 200
    body = response.json()
    assert body["metrics"]["turns_total"] == 2.0


def test_admin_metrics_prometheus_format() -> None:
    reset()
    record_turn_metric("turns_total", 1.0)
    response = client.get("/admin/metrics/prometheus")
    assert response.status_code == 200
    assert "turns_total 1.0" in response.text

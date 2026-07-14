"""Admin / ops endpoints — lightweight status for care-home pilots."""

from fastapi import APIRouter, Response

from app.core.config import get_settings
from app.services.observability.metrics import snapshot, to_prometheus_text
from app.services.personas.persona_loader import VALID_PERSONA_IDS

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/status")
async def admin_status() -> dict:
    settings = get_settings()
    return {
        "app": settings.app_name,
        "personas": list(VALID_PERSONA_IDS),
        "gemini_configured": bool(settings.gemini_api_key),
        "staff_webhook_configured": bool(settings.staff_alert_webhook_url),
        "care_home_id": settings.care_home_id,
        "memory_backend": settings.memory_backend,
    }


@router.get("/metrics")
async def admin_metrics() -> dict:
    return {"metrics": snapshot()}


@router.get("/metrics/prometheus")
async def admin_metrics_prometheus() -> Response:
    return Response(content=to_prometheus_text(), media_type="text/plain; version=0.0.4")

"""Staff alert webhook — placeholder for care-home notification."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def send_staff_alert(
    *,
    alert_type: str,
    resident_id: str,
    session_id: str,
    excerpt: str,
) -> tuple[str, bool]:
    """
    POST alert to STAFF_ALERT_WEBHOOK_URL.
    Returns (alert_id, webhook_sent).
    """
    alert_id = str(uuid.uuid4())
    settings = get_settings()

    payload: dict[str, Any] = {
        "alert_id": alert_id,
        "alert_type": alert_type,
        "care_home_id": settings.care_home_id,
        "resident_id": resident_id,
        "session_id": session_id,
        "excerpt": excerpt[:500],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "hartmaatje-fenna",
    }

    if not settings.staff_alert_webhook_url:
        logger.warning("Staff webhook not configured — alert logged only: %s", payload)
        return alert_id, False

    headers = {"Content-Type": "application/json"}
    if settings.staff_alert_webhook_secret:
        headers["X-Webhook-Secret"] = settings.staff_alert_webhook_secret

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                settings.staff_alert_webhook_url,
                json=payload,
                headers=headers,
            )
            res.raise_for_status()
        logger.info("Staff alert sent: %s", alert_id)
        return alert_id, True
    except Exception as exc:
        logger.error("Staff webhook failed: %s", exc)
        return alert_id, False

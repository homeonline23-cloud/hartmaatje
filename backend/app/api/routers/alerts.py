from fastapi import APIRouter, HTTPException

from app.schemas import EmergencyAlertRequest, EmergencyAlertResponse
from app.services.safety.alerts import send_staff_alert
from app.services.chat.session_manager import session_manager

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/emergency", response_model=EmergencyAlertResponse)
async def emergency_alert(body: EmergencyAlertRequest) -> EmergencyAlertResponse:
    """
    Manual or system-triggered staff alert.
    Distress uses alert_type=distress.
    """
    session = session_manager.get_any(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet gevonden.")

    alert_id, webhook_sent = await send_staff_alert(
        alert_type=body.alert_type,
        resident_id=body.resident_id or session.resident_id,
        session_id=body.session_id,
        excerpt=body.excerpt,
    )
    return EmergencyAlertResponse(
        logged=True,
        webhook_sent=webhook_sent,
        alert_id=alert_id,
    )

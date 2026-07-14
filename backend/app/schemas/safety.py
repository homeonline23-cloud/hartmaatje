"""Safety-related API schemas."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel


class AlertType(str, Enum):
    emergency = "emergency"
    distress = "distress"
    medical_boundary = "medical_boundary"


class SafetyFlag(BaseModel):
    type: AlertType
    triggered: bool = False
    message: str | None = None


class EmergencyAlertRequest(BaseModel):
    session_id: str
    resident_id: str
    excerpt: str
    alert_type: Literal["emergency", "distress"] = "emergency"


class EmergencyAlertResponse(BaseModel):
    logged: bool
    webhook_sent: bool
    alert_id: str

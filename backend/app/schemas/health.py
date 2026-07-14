"""Health check schemas."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str
    fenna_ready: bool

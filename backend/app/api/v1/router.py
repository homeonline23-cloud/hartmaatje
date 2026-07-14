"""API v1 router bundle."""

from fastapi import APIRouter

from app.api.routers import admin, alerts, chat, health, personas, session

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health.router)
api_v1_router.include_router(session.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(alerts.router)
api_v1_router.include_router(personas.router)
api_v1_router.include_router(admin.router)

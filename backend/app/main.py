"""HartMaatje — Fenna backend API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.api.routers import admin, alerts, chat, health, personas, session
from app.api.v1.router import api_v1_router

setup_logging()
settings = get_settings()

app = FastAPI(
    title="HartMaatje API",
    description="Voice-first AI companion backend — Fenna",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(session.router)
app.include_router(chat.router)
app.include_router(alerts.router)
app.include_router(personas.router)
app.include_router(admin.router)
app.include_router(api_v1_router)


@app.get("/")
async def root() -> dict:
    return {
        "app": "HartMaatje",
        "companion": "Fenna",
        "docs": "/docs",
        "health": "/health",
    }

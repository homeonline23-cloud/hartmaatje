"""HartMaatje — Fenna backend API."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import alerts, chat, health, session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

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


@app.get("/")
async def root() -> dict:
    return {
        "app": "HartMaatje",
        "companion": "Fenna",
        "docs": "/docs",
        "health": "/health",
    }

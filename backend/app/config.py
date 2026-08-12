from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "hartmaatje"
    app_env: str = "local"
    log_level: str = "debug"
    timezone: str = "Europe/Amsterdam"
    default_locale: str = "nl-NL"

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_cors_origins: str = (
        "http://localhost:3010,http://127.0.0.1:3010,http://localhost:3000"
    )
    api_session_ttl_seconds: int = 3600

    fsm_initial_state: str = "READY"
    fsm_enable_barge_in: bool = True
    fsm_log_transitions: bool = True
    enable_debug_routes: bool = True

    database_url: str | None = None
    redis_url: str | None = None

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    # Prefer Edge neural for clear Dutch (nl-NL-FennaNeural). Local Piper NL
    # often sounds muffled / "underwater" — keep as optional fallback only.
    stt_provider: str = "gemini"
    # clone = XTTS from welcome-video voice-refs (services/voice-clone :9200)
    tts_provider: str = "clone"
    stt_base_url: str = "http://127.0.0.1:8090"
    tts_base_url: str = "http://127.0.0.1:9100"
    voice_clone_base_url: str = "http://127.0.0.1:9200"
    stt_fallback_gemini: bool = True
    tts_fallback_edge: bool = True
    tts_fallback_local: bool = False

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""Application settings loaded from environment."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "HartMaatje"
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    cors_origins: str = (
        "http://localhost:5500,http://127.0.0.1:5500,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3010,http://127.0.0.1:3010"
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"

    # Per-persona Gemini TTS prebuilt voice — must match src/lib/voice/geminiVoiceConfig.ts
    # so a character sounds the same whether the client or the backend synthesizes audio.
    fenna_voice_name: str = "Aoede"
    colette_voice_name: str = "Aoede"
    maarten_voice_name: str = "Charon"
    peter_voice_name: str = "Algenib"

    def voice_name_for(self, persona_id: str) -> str:
        return {
            "fenna": self.fenna_voice_name,
            "colette": self.colette_voice_name,
            "maarten": self.maarten_voice_name,
            "peter": self.peter_voice_name,
        }.get(persona_id, self.fenna_voice_name)

    memory_data_path: str = "./data/memory"
    memory_backend: str = "json"  # json | sqlite | postgres
    database_url: str = ""
    persona_config_path: str = ""
    personas_dir: str = ""

    staff_alert_webhook_url: str = ""
    staff_alert_webhook_secret: str = ""
    care_home_id: str = "pilot-home-1"

    # Voice-changer — custom cloned voices (RVC) per persona, uploaded via
    # POST /voice-models/{persona_id}. Optional: requires ADMIN_API_KEY to be
    # set to enable the upload/delete endpoints, and backend/requirements-voice.txt
    # installed to actually run conversion (otherwise TTS falls back silently
    # to the default Gemini voice).
    admin_api_key: str = ""
    voice_models_dir: str = ""
    rvc_device: str = "cpu:0"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_personas_dir(self) -> Path:
        if self.personas_dir.strip():
            return Path(self.personas_dir)
        return BACKEND_ROOT / "data" / "personas"

    @property
    def resolved_persona_config_path(self) -> Path:
        if self.persona_config_path.strip():
            return Path(self.persona_config_path)
        return (
            BACKEND_ROOT.parent
            / "src"
            / "lib"
            / "companion"
            / "productionCharacters.json"
        )

    @property
    def resolved_voice_models_dir(self) -> Path:
        if self.voice_models_dir.strip():
            return Path(self.voice_models_dir)
        return BACKEND_ROOT / "data" / "voice_models"


@lru_cache
def get_settings() -> Settings:
    return Settings()

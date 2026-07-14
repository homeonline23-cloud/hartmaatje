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

    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    fenna_voice_name: str = "Aoede"

    memory_data_path: str = "./data/memory"
    memory_backend: str = "json"  # json | sqlite | postgres
    database_url: str = ""
    persona_config_path: str = ""
    personas_dir: str = ""

    staff_alert_webhook_url: str = ""
    staff_alert_webhook_secret: str = ""
    care_home_id: str = "pilot-home-1"

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


@lru_cache
def get_settings() -> Settings:
    return Settings()

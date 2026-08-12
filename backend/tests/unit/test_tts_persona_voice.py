"""Each persona must be synthesized with its own Gemini voice, not always Fenna's.

Regression test for the bug where the backend voice path (used for
safety/emergency replies and the /speech/speak endpoint) always used
settings.fenna_voice_name ("Aoede") regardless of which character was
speaking — so Peter, Maarten, and Colette would all sound like Fenna.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.services.chat import tts as tts_module


def test_voice_name_for_maps_each_persona_like_the_frontend_config() -> None:
    settings = Settings(gemini_api_key="test-key")
    # Must match src/lib/voice/geminiVoiceConfig.ts PROFILES.
    assert settings.voice_name_for("fenna") == "Aoede"
    assert settings.voice_name_for("colette") == "Aoede"
    assert settings.voice_name_for("maarten") == "Charon"
    assert settings.voice_name_for("peter") == "Algenib"
    assert settings.voice_name_for("unknown-id") == "Aoede"


class _FakeResponse:
    status_code = 200
    text = "{}"
    is_success = True

    @staticmethod
    def json() -> dict:
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "inlineData": {
                                    "data": "AAAA",
                                    "mimeType": "audio/L16;rate=24000",
                                }
                            }
                        ]
                    }
                }
            ]
        }


@pytest.mark.asyncio
async def test_synthesize_fenna_speech_sends_the_persona_voice_name(monkeypatch) -> None:
    settings = Settings(gemini_api_key="test-key")
    monkeypatch.setattr(tts_module, "get_settings", lambda: settings)

    captured: dict[str, str] = {}

    async def fake_post(self, url, json=None, **kwargs):  # noqa: ANN001
        captured["voice"] = json["generationConfig"]["speechConfig"]["voiceConfig"][
            "prebuiltVoiceConfig"
        ]["voiceName"]
        captured["prompt"] = json["contents"][0]["parts"][0]["text"]
        return _FakeResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", fake_post)

    await tts_module.synthesize_fenna_speech("Wat fijn dat u er bent.", "nl", persona_id="peter")
    assert captured["voice"] == "Algenib"
    assert "Peter" in captured["prompt"]

    await tts_module.synthesize_fenna_speech("Wat fijn dat u er bent.", "nl", persona_id="maarten")
    assert captured["voice"] == "Charon"

    await tts_module.synthesize_fenna_speech("Wat fijn dat u er bent.", "nl", persona_id="fenna")
    assert captured["voice"] == "Aoede"
    assert "Fenna" in captured["prompt"]

from app.services.llm.generation_config import flash_generation_config


def test_flash_models_disable_thinking() -> None:
    cfg = flash_generation_config(
        temperature=0.82,
        max_output_tokens=140,
        model="gemini-2.5-flash",
    )
    assert cfg["thinkingConfig"] == {"thinkingBudget": 0}
    assert cfg["temperature"] == 0.82
    assert cfg["maxOutputTokens"] == 140


def test_flash_lite_also_disables_thinking() -> None:
    cfg = flash_generation_config(
        temperature=0.0,
        max_output_tokens=200,
        model="gemini-2.5-flash-lite",
    )
    assert cfg["thinkingConfig"] == {"thinkingBudget": 0}


def test_non_flash_models_leave_thinking_unset() -> None:
    cfg = flash_generation_config(
        temperature=0.5,
        max_output_tokens=256,
        model="gemini-1.5-pro",
    )
    assert "thinkingConfig" not in cfg

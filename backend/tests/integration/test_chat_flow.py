"""Integration tests for chat flow."""

from app.services.dialogue.intent_service import classify_intent
from app.services.dialogue.dialogue_manager import decide_dialogue
from app.services.dialogue.response_planner import build_response_plan
from app.services.memory.memory_service import MemoryContext
from app.services.nlu.service import analyze_text
from app.services.safety.safety_guard import GuardResult, analyze_user_message


def test_chat_flow_layers_produce_plan() -> None:
    text = "Ik voel me eenzaam vandaag."
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    decision = decide_dialogue(
        intent=intent,
        nlu=nlu,
        memory_ctx=MemoryContext(prompt_block="", updated=False, known_name=None),
        guard=guard,
        lang="nl",
        user_text=text,
    )
    plan = build_response_plan(
        intent=intent,
        decision=decision,
        memory_ctx=MemoryContext(prompt_block="", updated=False, known_name=None),
        lang="nl",
    )
    assert plan.intent == "emotional_support"
    assert plan.tone_mode == "supportive"
    assert plan.follow_up_allowed is False

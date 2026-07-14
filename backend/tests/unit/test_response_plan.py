"""Tests for ResponsePlan building."""

from app.services.dialogue.dialogue_manager import decide_dialogue
from app.services.dialogue.intent_service import classify_intent
from app.services.dialogue.response_planner import build_response_plan
from app.services.memory.memory_service import MemoryContext
from app.services.nlu.service import analyze_text
from app.services.safety.safety_guard import analyze_user_message


def test_plan_limits_memory_to_three_lines() -> None:
    text = "Mijn hond Max was vandaag blij."
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    memory_ctx = MemoryContext(
        prompt_block="Lijn 1\nLijn 2\nLijn 3\nLijn 4\nLijn 5",
        updated=False,
        known_name=None,
    )
    decision = decide_dialogue(
        intent=intent, nlu=nlu, memory_ctx=memory_ctx, guard=guard, lang="nl", user_text=text
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    if plan.use_memory:
        assert plan.selected_memory_count <= 3


def test_greeting_plan_disables_follow_up() -> None:
    text = "Goedenavond!"
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    memory_ctx = MemoryContext(prompt_block="", updated=False, known_name=None)
    decision = decide_dialogue(
        intent=intent, nlu=nlu, memory_ctx=memory_ctx, guard=guard, lang="nl", user_text=text
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    assert plan.follow_up_allowed is False
    assert plan.max_questions == 0

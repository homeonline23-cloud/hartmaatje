"""Tests for dialogue_manager service."""

from app.domain.models.dialogue import ClassifiedIntent
from app.services.dialogue.dialogue_manager import decide_dialogue
from app.services.dialogue.intent_service import classify_intent
from app.services.dialogue.response_planner import build_response_plan
from app.services.memory.memory_service import MemoryContext
from app.services.nlu.service import analyze_text
from app.services.safety.safety_guard import analyze_user_message


def test_greeting_short_warm_no_memory() -> None:
    text = "Hallo!"
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    memory_ctx = MemoryContext(prompt_block="Naam: Jan", updated=False, known_name="Jan")
    decision = decide_dialogue(
        intent=intent, nlu=nlu, memory_ctx=memory_ctx, guard=guard, lang="nl", user_text=text
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    assert plan.use_memory is False
    assert plan.follow_up_allowed is False
    assert plan.tone_mode == "warm_soft"
    assert plan.short_warm_reply is True


def test_emotional_support_plan() -> None:
    text = "Ik voel me zo eenzaam vandaag."
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    memory_ctx = MemoryContext(prompt_block="", updated=False, known_name=None)
    decision = decide_dialogue(
        intent=intent, nlu=nlu, memory_ctx=memory_ctx, guard=guard, lang="nl", user_text=text
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    assert plan.intent == "emotional_support"
    assert plan.tone_mode == "supportive"
    assert plan.short_warm_reply is True
    assert plan.follow_up_allowed is False
    assert plan.max_questions == 0


def test_research_candidate_sets_tool_action() -> None:
    text = "Kun je opzoeken wat het nieuws vandaag is?"
    nlu = analyze_text(text, "nl")
    guard = analyze_user_message(text)
    intent = classify_intent(text, nlu, guard, "nl")
    memory_ctx = MemoryContext(prompt_block="", updated=False, known_name=None)
    decision = decide_dialogue(
        intent=intent, nlu=nlu, memory_ctx=memory_ctx, guard=guard, lang="nl", user_text=text
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    assert plan.tool_action == "research"
    assert plan.tone_mode == "clear_explain"


def test_emotional_support_example_shape() -> None:
    intent = ClassifiedIntent(id="emotional_support", confidence=0.9)
    memory_ctx = MemoryContext(
        prompt_block="Familie: kleindochter Marie", updated=False, known_name=None
    )
    decision = decide_dialogue(
        intent=intent,
        nlu=analyze_text("Ik voel me eenzaam.", "nl"),
        memory_ctx=memory_ctx,
        guard=analyze_user_message("Ik voel me eenzaam."),
        lang="nl",
        user_text="Ik voel me eenzaam.",
    )
    plan = build_response_plan(intent=intent, decision=decision, memory_ctx=memory_ctx, lang="nl")
    assert plan.intent == "emotional_support"
    assert plan.use_memory is True
    assert plan.selected_memory_count == 1
    assert plan.tool_action is None
    assert plan.tone_mode == "supportive"
    assert plan.follow_up_allowed is False
    assert plan.max_questions == 0
    assert plan.safety_mode is False

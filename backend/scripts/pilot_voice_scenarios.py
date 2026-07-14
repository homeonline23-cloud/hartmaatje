#!/usr/bin/env python3
"""Representative voice/chat scenarios for pilot readiness (requires GEMINI_API_KEY)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.services.chat.chat_service import get_chat_orchestrator
from app.services.chat.session_manager import session_manager
from app.services.dialogue.dialogue_manager import decide_dialogue
from app.services.dialogue.intent_service import classify_intent
from app.services.dialogue.response_planner import build_response_plan
from app.services.memory.memory_service import get_memory_service
from app.services.nlu.service import analyze_text
from app.services.personas.persona_loader import get_persona
from app.services.safety.safety_guard import analyze_user_message

SCENARIOS: list[tuple[str, str, str]] = [
    ("greeting", "nl", "Hallo, goedemorgen."),
    ("loneliness", "nl", "Ik voel me zo eenzaam vandaag."),
    ("family_memory", "nl", "Mijn kleindochter heet Marie."),
    ("practical", "nl", "Hoe laat is het ongeveer?"),
    ("calendar", "nl", "Wanneer komt er bezoek op mijn agenda?"),
    ("care_notes", "nl", "Zijn er zorgnotities over medicatie?"),
    ("identity", "nl", "Wie bent u?"),
]


async def run_scenario(name: str, lang: str, user_text: str) -> dict:
    persona = get_persona("fenna")
    memory = get_memory_service()
    session = session_manager.start("pilot-scenario", lang=lang, character_id="fenna")
    orchestrator = get_chat_orchestrator()

    try:
        if name == "family_memory":
            await orchestrator.process_text_turn(session, user_text, lang)
            session = session_manager.get(session.session_id) or session
            follow_up = "Weet je nog hoe mijn kleindochter heet?"
            result = await orchestrator.process_text_turn(session, follow_up, lang)
            return {
                "name": name,
                "pass": "Marie" in result.reply or memory.load("pilot-scenario").family,
                "user_text": follow_up,
                "reply_preview": (result.reply or "")[:120],
            }

        result = await orchestrator.process_text_turn(session, user_text, lang)
        nlu = analyze_text(user_text, lang)  # type: ignore[arg-type]
        guard = analyze_user_message(user_text)
        intent = classify_intent(user_text, nlu, guard, lang)  # type: ignore[arg-type]
        memory_ctx = memory.build_context(
            session.resident_id, user_text, persona, lang, nlu=nlu
        )
        decision = decide_dialogue(
            intent=intent,
            nlu=nlu,
            memory_ctx=memory_ctx,
            guard=guard,
            lang=lang,  # type: ignore[arg-type]
            user_text=user_text,
        )
        plan = build_response_plan(
            intent=intent, decision=decision, memory_ctx=memory_ctx, lang=lang  # type: ignore[arg-type]
        )

        passed = bool(result.reply and result.reply.strip())
        if name == "identity":
            passed = passed and not memory_ctx.prompt_block.strip()
        if name == "calendar":
            passed = passed and (plan.tool_action == "calendar" or decision.tool_action == "calendar")
        if name == "care_notes":
            passed = passed and (plan.tool_action == "care_notes" or decision.tool_action == "care_notes")

        return {
            "name": name,
            "pass": passed,
            "intent": intent.id,
            "tool_action": decision.tool_action,
            "memory_block_empty": not memory_ctx.prompt_block.strip(),
            "reply_preview": (result.reply or "")[:120],
        }
    finally:
        session_manager.end(session.session_id)


async def main() -> int:
    print("HartMaatje pilot voice scenarios (backend orchestrator)")
    print("=" * 55)
    results: list[dict] = []
    for name, lang, text in SCENARIOS:
        try:
            outcome = await run_scenario(name, lang, text)
            results.append(outcome)
            status = "PASS" if outcome.get("pass") else "FAIL"
            print(f"  [{status}] {name}: {outcome.get('reply_preview', '')[:80]}")
        except Exception as exc:
            results.append({"name": name, "pass": False, "error": str(exc)})
            print(f"  [FAIL] {name}: {exc}")

    passed = sum(1 for r in results if r.get("pass"))
    total = len(results)
    print("=" * 55)
    print(f"Result: {passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

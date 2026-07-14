"""Chat turn orchestration — MindMeld-style layered flow."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal

from app.domain.models.dialogue import ResponsePlan
from app.schemas import SafetyFlag
from app.services.nlu.service import analyze_text
from app.services.safety.alerts import send_staff_alert
from app.services.dialogue.dialogue_manager import decide_dialogue
from app.services.dialogue.intent_service import classify_intent
from app.services.chat.lang import resolve_session_lang
from app.services.llm.llm_service import generate_companion_reply
from app.services.memory.memory_service import JsonMemoryService, get_memory_service
from app.services.personas.persona_loader import get_persona, normalize_persona_id
from app.services.prompts.prompt_builder import build_system_prompt
from app.services.quality.quality_enforcer import build_quality_retry_hint, validate_reply
from app.services.dialogue.response_planner import build_response_plan
from app.services.safety.safety_guard import analyze_user_message
from app.services.chat.session_manager import Session
from app.services.chat.speech_sanitize import sanitize_user_transcript
from app.services.observability.structured_logger import log_turn
from app.services.tools.tool_service import apply_tools

AppLang = Literal["nl", "en"]

SAFETY_EN = {
    "emergency": (
        "I'm going to get help for you right away, so someone can check on you. "
        "Please stay calm if you can."
    ),
    "distress": (
        "I'm really glad you told me that. You matter, and I want someone to support you. "
        "Please stay with me for a moment."
    ),
    "medical": (
        "I want you to get the best care. "
        "Please ask a nurse, doctor, or caregiver about that."
    ),
    "default": "I'm still here — mention whatever's on your mind.",
}


@dataclass
class TurnResult:
    reply: str
    safety: List[SafetyFlag] = field(default_factory=list)
    memory_updated: bool = False
    persona_id: str = "fenna"
    prompt_version: str = "orchestration-v1"
    reply_retried: bool = False
    used_safety_reply: bool = False


class ChatOrchestrator:
    def __init__(self, memory_service: JsonMemoryService | None = None) -> None:
        self._memory = memory_service or get_memory_service()

    async def process_text_turn(
        self,
        session: Session,
        user_text: str,
        lang_override: str | None = None,
        *,
        voice_mode: bool = False,
        overlap_mode: bool = False,
        conversation_thread: str = "",
    ) -> TurnResult:
        lang = resolve_session_lang(session, lang_override)
        persona_id = normalize_persona_id(session.character_id)
        persona = get_persona(persona_id)

        # 1. Sanitize
        memory = self._memory.load(session.resident_id)
        known_name = memory.display_name or session.display_name
        user_text = sanitize_user_transcript(user_text, known_name)

        # 2. NLU
        nlu = analyze_text(user_text, lang)
        guard = analyze_user_message(user_text)

        # 3. Intent classification
        intent = classify_intent(user_text, nlu, guard, lang)
        nlu.intent = intent.id

        # Memory save + context build
        memory_updated = self._memory.save_candidates(
            session.resident_id, nlu.candidate_memories
        )
        memory_ctx = self._memory.build_context(
            session.resident_id,
            user_text,
            persona,
            lang,
            session_summary=_session_summary(session, lang),
            fallback_name=session.display_name,
            nlu=nlu,
        )
        known_name = memory_ctx.known_name

        # Hard safety stops (before dialogue planning)
        if guard.emergency_reply:
            return await self._safety_turn(
                session, user_text, lang, guard, memory_updated, persona_id,
                SAFETY_EN["emergency"] if lang == "en" else guard.emergency_reply,
                "emergency", nlu, intent.id,
            )
        if guard.distress_reply:
            return await self._safety_turn(
                session, user_text, lang, guard, memory_updated, persona_id,
                SAFETY_EN["distress"] if lang == "en" else guard.distress_reply,
                "distress", nlu, intent.id,
            )
        if guard.medical_reply:
            reply = SAFETY_EN["medical"] if lang == "en" else guard.medical_reply
            return TurnResult(
                reply=reply or SAFETY_EN["medical"],
                safety=guard.flags,
                memory_updated=memory_updated,
                persona_id=persona_id,
                used_safety_reply=True,
            )

        # 4. Dialogue decision
        decision = decide_dialogue(
            intent=intent,
            nlu=nlu,
            memory_ctx=memory_ctx,
            guard=guard,
            lang=lang,
            voice_mode=voice_mode,
            user_text=user_text,
        )

        # 5. Response plan
        plan = build_response_plan(
            intent=intent,
            decision=decision,
            memory_ctx=memory_ctx,
            lang=lang,
        )

        # 6. Memory / tool selection
        plan = await apply_tools(plan, user_text, lang)

        # 7. Prompt builder
        system_prompt = build_system_prompt(
            persona,
            lang=lang,
            conversation_thread=conversation_thread or _session_summary(session, lang),
            voice_mode=voice_mode,
            overlap_mode=overlap_mode,
            nlu=nlu,
            plan=plan,
        )

        # 8. LLM call
        history = session.recent_turns(limit=16 if not voice_mode else 8)
        reply = await generate_companion_reply(
            system_prompt=system_prompt,
            persona=persona,
            user_message=user_text,
            history=history,
            lang=lang,
            voice_mode=voice_mode,
            overlap_mode=overlap_mode,
            known_name=known_name,
            plan=plan,
            tool_context=plan.tool_context,
        )
        reply = reply or (
            SAFETY_EN["default"] if lang == "en" else "Ik ben er — noem maar waar u aan denkt."
        )

        # 9. Quality enforcement
        reply, quality_violations, reply_guard = validate_reply(
            reply, plan, persona, nlu, lang
        )
        retried = False
        retry_hints: list[str] = []

        if reply_guard.reply_violations:
            retry_hints.append(
                "Avoid dependency, possessive, medical, or wrong identity language."
            )
        if quality_violations:
            retry_hints.append(build_quality_retry_hint(quality_violations, lang))

        if retry_hints:
            retry = await generate_companion_reply(
                system_prompt=system_prompt + "\n\n" + " ".join(retry_hints),
                persona=persona,
                user_message=user_text,
                history=history,
                lang=lang,
                voice_mode=voice_mode,
                overlap_mode=overlap_mode,
                known_name=known_name,
                plan=plan,
                tool_context=plan.tool_context,
            )
            if retry:
                reply = retry
                retried = True
                reply, quality_violations, reply_guard = validate_reply(
                    reply, plan, persona, nlu, lang
                )

        all_flags = list(guard.flags)
        for flag in reply_guard.flags:
            if not any(f.type == flag.type and f.message == flag.message for f in all_flags):
                all_flags.append(flag)

        # Structured log
        log_turn(
            session_id=session.session_id,
            resident_id=session.resident_id,
            persona_id=persona_id,
            plan=plan,
            lang=lang,
            detected_tone=nlu.detected_tone.primary,
            selected_topics=[t.id for t in nlu.detected_topics],
            memory_updated=memory_updated,
            safety_triggered=False,
            response_length=len(reply),
            reply_retried=retried,
            quality_violations=quality_violations,
        )

        return TurnResult(
            reply=reply,
            safety=all_flags,
            memory_updated=memory_updated,
            persona_id=persona_id,
            reply_retried=retried,
        )

    async def _safety_turn(
        self,
        session: Session,
        user_text: str,
        lang: AppLang,
        guard,
        memory_updated: bool,
        persona_id: str,
        reply: str,
        alert_type: str,
        nlu,
        intent_id: str,
    ) -> TurnResult:
        await send_staff_alert(
            alert_type=alert_type,
            resident_id=session.resident_id,
            session_id=session.session_id,
            excerpt=user_text,
        )
        safety_plan = ResponsePlan(
            intent=intent_id,
            use_memory=False,
            safety_mode=True,
            follow_up_allowed=False,
            max_questions=0,
            tone_mode="warm_soft",
        )
        log_turn(
            session_id=session.session_id,
            resident_id=session.resident_id,
            persona_id=persona_id,
            plan=safety_plan,
            lang=lang,
            detected_tone=nlu.detected_tone.primary,
            selected_topics=[t.id for t in nlu.detected_topics],
            memory_updated=memory_updated,
            safety_triggered=True,
            response_length=len(reply),
        )
        return TurnResult(
            reply=reply,
            safety=guard.flags,
            memory_updated=memory_updated,
            persona_id=persona_id,
            used_safety_reply=True,
        )


def _session_summary(session: Session, lang: AppLang) -> str:
    summary = session.conversation_summary or ""
    if session.active_topic:
        label = "Active topic" if lang == "en" else "Actief onderwerp"
        summary = f"{summary}\n{label}: {session.active_topic}".strip()
    return summary


_default_orchestrator: ChatOrchestrator | None = None


def get_chat_orchestrator() -> ChatOrchestrator:
    global _default_orchestrator
    if _default_orchestrator is None:
        _default_orchestrator = ChatOrchestrator()
    return _default_orchestrator

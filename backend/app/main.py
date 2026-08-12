from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import get_settings
from app.events import make_event, new_turn_id
from app.services.retrieval_service import retrieval_service
from app.services.stt_service import decode_upload_to_b64, transcribe_audio
from app.services.reply_service import companion_reply, is_short_greeting
from app.services.tts_service import synthesize_speech
from app.sessions import SessionManager

logger = logging.getLogger(__name__)
settings = get_settings()
manager = SessionManager(initial_state=settings.fsm_initial_state)

app = FastAPI(title="HartMaatje API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateSessionRequest(BaseModel):
    external_user_id: str = "demo-user-1"
    display_name: str = "Annie"
    device_type: str = "tablet-web"
    locale: str = "nl-NL"
    companion_id: str | None = None


class CloseSessionRequest(BaseModel):
    reason: str = "client_close"


class UpdateLocaleRequest(BaseModel):
    locale: str


class SpeakRequest(BaseModel):
    text: str


class RetrievalQueryRequest(BaseModel):
    text: str
    display_name: str | None = None
    locale: str = "nl-NL"


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "fsm_initial_state": settings.fsm_initial_state,
        "knowledge_docs": retrieval_service.reload_docs(),
        "voice": {
            "stt_provider": settings.stt_provider,
            "tts_provider": settings.tts_provider,
            "gemini_configured": bool(settings.gemini_api_key),
        },
    }


@app.post("/api/v1/retrieval/query")
def retrieval_query(body: RetrievalQueryRequest) -> dict[str, Any]:
    """Debug/test endpoint: intent → retrieve → prompt blocks."""
    result = retrieval_service.retrieve(
        body.text,
        display_name=body.display_name,
        locale=body.locale,
    )
    return {
        "intent": result.intent.intent.value,
        "confidence": result.intent.confidence,
        "reason": result.intent.reason,
        "profile_bits": result.profile_bits,
        "knowledge_bits": result.knowledge_bits,
        "tools": result.tool_bits,
        "place": None
        if not result.place
        else {
            "name": result.place.name,
            "kind": result.place.kind,
            "summary": result.place.summary(body.locale),
            "summary_nl": result.place.summary_nl,
            "summary_en": result.place.summary_en,
            "lat": result.place.lat,
            "lon": result.place.lon,
            "map_hint": result.place.map_hint(body.locale),
        },
        "prompt_blocks": result.prompt_blocks,
        "trace": result.trace,
    }


@app.post("/api/v1/sessions")
async def create_session(body: CreateSessionRequest) -> dict[str, Any]:
    record = manager.create(
        external_user_id=body.external_user_id,
        display_name=body.display_name,
        device_type=body.device_type,
        locale=body.locale,
        companion_id=body.companion_id,
    )
    public = manager.to_public(record)
    public["ws_url"] = f"ws://localhost:{settings.api_port}/ws/events?session_id={record.session_id}"
    return public


@app.get("/api/v1/sessions/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    record = manager.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")
    return manager.to_public(record)


@app.patch("/api/v1/sessions/{session_id}/locale")
async def update_session_locale(
    session_id: str, body: UpdateLocaleRequest
) -> dict[str, Any]:
    """Keep STT/TTS/reply language in sync with the UI language bar."""
    record = manager.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")
    record.locale = body.locale.strip() or record.locale
    record.touch()
    await manager.publish(
        session_id,
        make_event(
            type="session.locale",
            session_id=session_id,
            seq=record.next_seq(),
            source="client",
            turn_id=record.current_turn_id,
            payload={"locale": record.locale},
        ),
    )
    return manager.to_public(record)


@app.post("/api/v1/sessions/{session_id}/speak")
async def speak_text(session_id: str, body: SpeakRequest) -> dict[str, Any]:
    """Synthesize companion speech (welcome / reply) — Edge neural or Gemini."""
    record = manager.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="empty_text")
    synthesized = await synthesize_speech(
        text,
        locale=record.locale,
        companion_id=record.companion_id,
    )
    if not synthesized:
        return {
            "ok": False,
            "audio_base64": None,
            "audio_mime": None,
            "error": "tts_failed",
        }
    audio_b64, audio_mime = synthesized
    return {
        "ok": True,
        "audio_base64": audio_b64,
        "audio_mime": audio_mime,
        "companion_id": record.companion_id,
    }


@app.post("/api/v1/sessions/{session_id}/voice-turn")
async def voice_turn(
    session_id: str,
    audio: UploadFile = File(...),
    mime_type: str = Form("audio/webm"),
) -> dict[str, Any]:
    """Hold-to-talk voice turn: STT → retrieval → TTS."""
    record = manager.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")

    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty_audio")

    if not record.current_turn_id:
        record.current_turn_id = new_turn_id()

    await manager.apply_trigger(
        session_id,
        "speech_start",
        reason="voice_turn_upload",
        source="api",
        turn_id=record.current_turn_id,
    )

    b64 = decode_upload_to_b64(raw)
    content_type = mime_type or audio.content_type or "audio/webm"
    try:
        with open("/tmp/last-voice-turn.bin", "wb") as fh:
            fh.write(raw)
        with open("/tmp/last-voice-turn.meta", "w", encoding="utf-8") as fh:
            fh.write(f"bytes={len(raw)}\nmime={content_type}\nsession={session_id}\n")
    except OSError:
        pass
    print(
        f"voice-turn recv session={session_id} bytes={len(raw)} mime={content_type}",
        flush=True,
    )
    transcript = await transcribe_audio(b64, content_type, locale=record.locale)
    print(
        f"voice-turn stt session={session_id} transcript={transcript!r}",
        flush=True,
    )
    if not transcript:
        logger.info(
            "voice-turn stt_empty session=%s bytes=%s mime=%s",
            session_id,
            len(raw),
            content_type,
        )

    if not transcript:
        err = make_event(
            type="error",
            session_id=session_id,
            seq=record.next_seq(),
            source="api",
            turn_id=record.current_turn_id,
            payload={
                "code": "stt_empty",
                "message": "Ik verstond u niet goed. Probeer het nog eens rustig.",
            },
        )
        await manager.publish(session_id, err)
        await manager.apply_trigger(
            session_id,
            "abort",
            reason="stt_empty",
            source="api",
            turn_id=record.current_turn_id,
        )
        return {
            "ok": False,
            "transcript": "",
            "reply_text": "",
            "audio_base64": None,
            "audio_mime": None,
            "error": "stt_empty",
        }

    await manager.apply_trigger(
        session_id,
        "speech_end",
        reason="voice_turn_end",
        source="api",
        turn_id=record.current_turn_id,
    )

    await manager.publish(
        session_id,
        make_event(
            type="stt.final",
            session_id=session_id,
            seq=record.next_seq(),
            source="stt-worker",
            turn_id=record.current_turn_id,
            payload={
                "text": transcript,
                "confidence": 0.9,
                "language": record.locale,
                "is_final": True,
            },
        ),
    )
    await manager.apply_trigger(
        session_id,
        "stt_final",
        reason="voice_stt_final",
        source="api",
        turn_id=record.current_turn_id,
    )

    # Retrieval for map/reminders + conversational reply (not canned "Ik luister")
    if is_short_greeting(transcript):
        reply_text = await companion_reply(
            transcript,
            companion_id=record.companion_id,
            locale=record.locale,
        )
    else:
        await _run_retrieval_turn(session_id, transcript)

        retrieval_hint = ""
        for event in reversed(record.event_log):
            if event.type == "llm.partial" and event.payload.get("text"):
                retrieval_hint = str(event.payload["text"])
                break

        intent = ""
        for event in reversed(record.event_log):
            if event.type == "retrieval.result":
                intent = str(event.payload.get("intent") or "")
                break

        if intent in {"place", "route", "reminder", "personal_context", "photo"} and retrieval_hint:
            reply_text = retrieval_hint
        else:
            reply_text = await companion_reply(
                transcript,
                companion_id=record.companion_id,
                locale=record.locale,
                retrieval_hint=None if intent == "social" else retrieval_hint,
            )

    audio_b64 = None
    audio_mime = None
    if reply_text:
        await manager.publish(
            session_id,
            make_event(
                type="tts.start",
                session_id=session_id,
                seq=record.next_seq(),
                source="tts-worker",
                turn_id=record.current_turn_id,
                payload={"text": reply_text},
            ),
        )
        synthesized = await synthesize_speech(
            reply_text,
            locale=record.locale,
            companion_id=record.companion_id,
        )
        if synthesized:
            audio_b64, audio_mime = synthesized
            await manager.publish(
                session_id,
                make_event(
                    type="tts.stop",
                    session_id=session_id,
                    seq=record.next_seq(),
                    source="tts-worker",
                    turn_id=record.current_turn_id,
                    payload={"ok": True, "mime": audio_mime},
                ),
            )
        else:
            await manager.publish(
                session_id,
                make_event(
                    type="tts.stop",
                    session_id=session_id,
                    seq=record.next_seq(),
                    source="tts-worker",
                    turn_id=record.current_turn_id,
                    payload={"ok": False, "fallback": "browser"},
                ),
            )

    return {
        "ok": True,
        "transcript": transcript,
        "reply_text": reply_text,
        "audio_base64": audio_b64,
        "audio_mime": audio_mime,
        "session_id": session_id,
        "companion_id": record.companion_id,
        "locale": record.locale,
    }


@app.post("/api/v1/sessions/{session_id}/close")
async def close_session(session_id: str, body: CloseSessionRequest | None = None) -> dict[str, Any]:
    reason = body.reason if body else "client_close"
    record = manager.close(session_id, reason=reason)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")
    done = make_event(
        type="done",
        session_id=session_id,
        seq=record.next_seq(),
        source="api",
        payload={"reason": reason},
    )
    await manager.publish(session_id, done)
    return manager.to_public(record)


@app.get("/api/v1/admin/sessions/{session_id}/trace")
def session_trace(session_id: str) -> dict[str, Any]:
    if not settings.enable_debug_routes:
        raise HTTPException(status_code=404, detail="not_found")
    record = manager.get(session_id)
    if not record:
        raise HTTPException(status_code=404, detail="session_not_found")
    return {
        "session": manager.to_public(record),
        "transitions": record.transitions,
        "events": [e.model_dump() for e in record.event_log[-100:]],
    }


@app.websocket("/ws/events")
async def ws_events(websocket: WebSocket, session_id: str = Query(...)) -> None:
    record = manager.get(session_id)
    if not record:
        # Accept first so browsers get a clean close instead of opaque 403
        await websocket.accept()
        await websocket.close(code=4404)
        return

    await websocket.accept()
    queue = manager.subscribe(session_id)
    if queue is None:
        await websocket.close(code=4404)
        return

    ready = make_event(
        type="ready",
        session_id=session_id,
        seq=record.next_seq(),
        source="api",
        payload={
            "current_state": record.current_state,
            "companion_id": record.companion_id,
            "display_name": record.display_name,
        },
    )
    await manager.publish(session_id, ready)

    try:
        while True:
            # Drain outbound events and accept inbound client events concurrently
            if not queue.empty():
                event = await queue.get()
                await websocket.send_json(event.model_dump())
                continue

            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                err = make_event(
                    type="error",
                    session_id=session_id,
                    seq=record.next_seq(),
                    source="api",
                    payload={"code": "invalid_json", "message": "Ongeldig bericht."},
                )
                await manager.publish(session_id, err)
                await websocket.send_json(err.model_dump())
                continue

            await _handle_client_event(session_id, data)

            # Flush any published events from handling
            while not queue.empty():
                event = await queue.get()
                await websocket.send_json(event.model_dump())

    except WebSocketDisconnect:
        pass
    finally:
        manager.unsubscribe(session_id, queue)


async def _handle_client_event(session_id: str, data: dict[str, Any]) -> None:
    record = manager.get(session_id)
    if not record:
        return

    event_type = str(data.get("type") or "")
    payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
    turn_id = data.get("turn_id") or record.current_turn_id

    # Echo/store inbound as canonical event
    inbound = make_event(
        type=event_type or "error",
        session_id=session_id,
        seq=record.next_seq(),
        source="client",
        turn_id=turn_id,
        payload=payload if event_type else {"code": "missing_type"},
    )
    if event_type:
        await manager.publish(session_id, inbound)

    if event_type == "session.keepalive":
        record.touch()
        return

    if event_type == "audio.start" or event_type == "speech.start":
        if not record.current_turn_id:
            record.current_turn_id = new_turn_id()
        await manager.apply_trigger(
            session_id,
            "speech_start",
            reason="client_speech_start",
            source="api",
            turn_id=record.current_turn_id,
        )
        return

    if event_type == "audio.end" or event_type == "speech.end":
        await manager.apply_trigger(
            session_id,
            "speech_end",
            reason="client_speech_end",
            source="api",
            turn_id=record.current_turn_id,
        )
        return

    if event_type == "interrupt":
        await manager.apply_trigger(
            session_id,
            "interrupt",
            reason=str(payload.get("reason") or "client_interrupt"),
            source="api",
            turn_id=record.current_turn_id,
            extra_payload=payload,
        )
        barge = make_event(
            type="barge.ack",
            session_id=session_id,
            seq=record.next_seq(),
            source="api",
            turn_id=record.current_turn_id,
            payload={"ok": True, "stop_audio_before_seq": payload.get("stop_audio_before_seq")},
        )
        await manager.publish(session_id, barge)
        await manager.apply_trigger(
            session_id,
            "interrupt_handled",
            reason="barge_ack",
            source="api",
            turn_id=record.current_turn_id,
        )
        return

    if event_type == "stream.finalize":
        # Dev helper: simulate STT final → retrieval → thinking (LLM/TTS later)
        text = str(payload.get("text") or "").strip()
        if text:
            await manager.apply_trigger(
                session_id,
                "speech_end",
                reason="stream_finalize",
                source="api",
                turn_id=record.current_turn_id,
            )
            final = make_event(
                type="stt.final",
                session_id=session_id,
                seq=record.next_seq(),
                source="api",
                turn_id=record.current_turn_id,
                payload={
                    "text": text,
                    "confidence": 1.0,
                    "language": "nl",
                    "is_final": True,
                    "simulated": True,
                },
            )
            await manager.publish(session_id, final)
            await manager.apply_trigger(
                session_id,
                "stt_final",
                reason="simulated_final",
                source="api",
                turn_id=record.current_turn_id,
            )
            await _run_retrieval_turn(session_id, text)


async def _run_retrieval_turn(session_id: str, text: str) -> None:
    """Intent → retrieve → events. LLM-worker gets prompt_blocks later."""
    record = manager.get(session_id)
    if not record:
        return

    query_event = make_event(
        type="retrieval.query",
        session_id=session_id,
        seq=record.next_seq(),
        source="api",
        turn_id=record.current_turn_id,
        payload={"text": text},
    )
    await manager.publish(session_id, query_event)

    result = retrieval_service.retrieve(
        text,
        display_name=record.display_name,
        locale=record.locale,
    )

    result_event = make_event(
        type="retrieval.result",
        session_id=session_id,
        seq=record.next_seq(),
        source="api",
        turn_id=record.current_turn_id,
        payload={
            "intent": result.intent.intent.value,
            "confidence": result.intent.confidence,
            "knowledge_bits": result.knowledge_bits,
            "tools": result.tool_bits,
            "prompt_blocks": result.prompt_blocks,
            "trace": result.trace,
            "locale": record.locale,
        },
    )
    await manager.publish(session_id, result_event)

    if result.place:
        await manager.publish(
            session_id,
            make_event(
                type="place.lookup",
                session_id=session_id,
                seq=record.next_seq(),
                source="api",
                turn_id=record.current_turn_id,
                payload={"query": text},
            ),
        )
        await manager.publish(
            session_id,
            make_event(
                type="place.result",
                session_id=session_id,
                seq=record.next_seq(),
                source="api",
                turn_id=record.current_turn_id,
                payload={
                    "name": result.place.name,
                    "kind": result.place.kind,
                    "summary": result.place.summary(record.locale),
                    "summary_nl": result.place.summary_nl,
                    "summary_en": result.place.summary_en,
                    "lat": result.place.lat,
                    "lon": result.place.lon,
                    "map_hint": result.place.map_hint(record.locale),
                },
            ),
        )
        if result.place.lat is not None and result.place.lon is not None:
            await manager.publish(
                session_id,
                make_event(
                    type="ui.map_render",
                    session_id=session_id,
                    seq=record.next_seq(),
                    source="api",
                    turn_id=record.current_turn_id,
                    payload={
                        "name": result.place.name,
                        "lat": result.place.lat,
                        "lon": result.place.lon,
                        "summary": result.place.summary(record.locale),
                        "summary_nl": result.place.summary_nl,
                        "summary_en": result.place.summary_en,
                    },
                ),
            )

    draft = _draft_reply_from_retrieval(result, record.locale)
    await manager.apply_trigger(
        session_id,
        "reply_ready",
        reason="retrieval_draft",
        source="api",
        turn_id=record.current_turn_id,
    )
    await manager.publish(
        session_id,
        make_event(
            type="llm.partial",
            session_id=session_id,
            seq=record.next_seq(),
            source="api",
            turn_id=record.current_turn_id,
            payload={"text": draft, "draft": True, "from_retrieval": True},
        ),
    )
    await manager.apply_trigger(
        session_id,
        "reply_done",
        reason="retrieval_draft_done",
        source="api",
        turn_id=record.current_turn_id,
    )


def _draft_reply_from_retrieval(result: Any, locale: str = "nl-NL") -> str:
    from app.services.locale_utils import lang_code

    code = lang_code(locale)
    intent = result.intent.intent.value
    unknown = {
        "nl": "Onbekende plek",
        "en": "Unknown place",
        "de": "Unbekannter Ort",
        "fr": "Lieu inconnu",
        "es": "Lugar desconocido",
    }.get(code, "Onbekende plek")

    if result.place and result.place.name != unknown:
        map_tail = {
            "nl": "Ik kan de plek op de kaart tonen.",
            "en": "I can show the place on the map.",
            "de": "Ich kann den Ort auf der Karte zeigen.",
            "fr": "Je peux montrer l’endroit sur la carte.",
            "es": "Puedo mostrar el lugar en el mapa.",
        }[code]
        return f"{result.place.summary(locale)} {map_tail}"

    if intent == "reminder" and result.knowledge_bits:
        lines = [
            b.replace("Reminder: ", "")
            for b in result.knowledge_bits
            if b.startswith("Reminder:")
        ]
        if lines:
            prefix = {
                "nl": "Dit stond er nog voor u: ",
                "en": "This was still on your list: ",
                "de": "Das stand noch auf Ihrer Liste: ",
                "fr": "Voici ce qui restait pour vous : ",
                "es": "Esto seguía en su lista: ",
            }[code]
            return prefix + "; ".join(lines[:2]) + "."

    if intent == "personal_context":
        family = [
            b
            for b in result.profile_bits
            if ":" in b and "Name" not in b and "Preferred" not in b
        ]
        if family:
            prefix = {
                "nl": "Dit weet ik over uw familie: ",
                "en": "This is what I know about your family: ",
                "de": "Das weiß ich über Ihre Familie: ",
                "fr": "Voici ce que je sais de votre famille : ",
                "es": "Esto sé de su familia: ",
            }[code]
            return prefix + "; ".join(family) + "."

    drafts = {
        "photo": {
            "nl": "Ik kan later de foto tonen. Voor nu: die staat klaar in uw album.",
            "en": "I can show the photo later. For now, it is ready in your album.",
            "de": "Ich kann das Foto später zeigen. Für jetzt liegt es in Ihrem Album bereit.",
            "fr": "Je pourrai montrer la photo plus tard. Pour l’instant, elle est prête dans votre album.",
            "es": "Puedo mostrar la foto más tarde. Por ahora está lista en su álbum.",
        },
        "dementia_support": {
            "nl": "Ik hoor dat het onduidelijk voelt. We doen het rustig, stap voor stap.",
            "en": "I hear that it feels unclear. We will take it calmly, step by step.",
            "de": "Ich höre, dass es unklar wirkt. Wir machen es ruhig, Schritt für Schritt.",
            "fr": "J’entends que ce n’est pas clair. Nous y allons calmement, pas à pas.",
            "es": "Oigo que se siente poco claro. Lo haremos con calma, paso a paso.",
        },
        "elder_communication": {
            "nl": "Goed, ik praat rustiger en houd het kort.",
            "en": "Alright — I will speak more calmly and keep it short.",
            "de": "Gut — ich spreche ruhiger und halte es kurz.",
            "fr": "D’accord — je parle plus calmement et je reste bref.",
            "es": "De acuerdo — hablaré con más calma y seré breve.",
        },
        "live_info": {
            "nl": "Actueel weer haal ik straks live op. Voor nu blijf ik even bij u.",
            "en": "I will fetch live weather later. For now I stay with you.",
            "de": "Aktuelles Wetter hole ich später live. Für jetzt bleibe ich bei Ihnen.",
            "fr": "La météo actuelle arrivera plus tard en direct. Pour l’instant je reste avec vous.",
            "es": "El tiempo actual lo traeré luego en vivo. Por ahora me quedo con usted.",
        },
        "default": {
            "nl": "Ik luister. Vertel maar, in uw eigen tempo.",
            "en": "I am listening. Tell me in your own time.",
            "de": "Ich höre zu. Erzählen Sie in Ihrem Tempo.",
            "fr": "J’écoute. Parlez à votre rythme.",
            "es": "Escucho. Cuénteme a su ritmo.",
        },
    }
    bucket = drafts.get(intent, drafts["default"])
    return bucket.get(code, bucket["en"])

@app.post("/api/v1/transcribe")
async def transcribe_only(
    audio: UploadFile = File(...),
    mime_type: str = Form("audio/webm"),
    locale: str = Form("nl-NL"),
) -> dict[str, Any]:
    """Bare speech-to-text for Bioscoop Kamer voice-pick (no chat/TTS)."""
    raw = await audio.read()
    if not raw:
        raise HTTPException(status_code=400, detail="empty_audio")

    b64 = decode_upload_to_b64(raw)
    content_type = mime_type or audio.content_type or "audio/webm"
    transcript = await transcribe_audio(b64, content_type, locale=locale)
    print(
        f"transcribe bytes={len(raw)} mime={content_type} locale={locale} text={transcript!r}",
        flush=True,
    )
    return {"ok": bool(transcript), "text": transcript or ""}


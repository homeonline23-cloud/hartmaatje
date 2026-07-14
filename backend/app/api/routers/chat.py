from fastapi import APIRouter, HTTPException

from app.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    SpeakRequest,
    SpeakResponse,
    TranscribeRequest,
    TranscribeResponse,
    VoiceTurnRequest,
    VoiceTurnResponse,
)
from app.prompts import normalize_lang
from app.services.chat.chat_turn import process_user_message
from app.services.chat.lang import resolve_session_lang
from app.services.chat.session_manager import session_manager
from app.services.chat.speech import transcribe_audio
from app.services.chat.tts import synthesize_fenna_speech
from app.services.chat.voice_pipeline import process_voice_turn

router = APIRouter(tags=["chat", "speech"])


@router.post("/chat/message", response_model=ChatMessageResponse)
async def chat_message(body: ChatMessageRequest) -> ChatMessageResponse:
    session = session_manager.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet actief.")

    reply, safety, memory_updated = await process_user_message(
        session, body.message.strip(), body.lang
    )

    return ChatMessageResponse(
        session_id=session.session_id,
        reply=reply,
        safety=safety,
        memory_updated=memory_updated,
    )


@router.post("/chat/voice-turn", response_model=VoiceTurnResponse)
async def voice_turn(body: VoiceTurnRequest) -> VoiceTurnResponse:
    """Transcribe → memory → LLM → parallel TTS (quick ack + reply)."""
    session = session_manager.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet actief.")

    try:
        result = await process_voice_turn(
            session,
            body.audio_base64,
            body.mime_type,
            body.lang,
            turn_phase=body.turn_phase,
        )
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return VoiceTurnResponse(
        session_id=session.session_id,
        user_text=result.user_text,
        reply=result.reply,
        quick_ack=result.quick_ack,
        audio_base64=result.audio_base64,
        mime_type=result.mime_type,
        quick_ack_audio_base64=result.quick_ack_audio_base64,
        quick_ack_mime_type=result.quick_ack_mime_type,
        safety=result.safety or [],
        memory_updated=result.memory_updated,
        timings_ms=result.timings or {},
    )


@router.post("/speech/transcribe", response_model=TranscribeResponse)
async def speech_transcribe(body: TranscribeRequest) -> TranscribeResponse:
    session = session_manager.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet actief.")
    lang = resolve_session_lang(session, body.lang)
    text = await transcribe_audio(body.audio_base64, body.mime_type, lang)
    if not text:
        raise HTTPException(status_code=503, detail="Spraak kon niet worden verstaan.")
    return TranscribeResponse(text=text)


@router.post("/speech/speak", response_model=SpeakResponse)
async def speech_speak(body: SpeakRequest) -> SpeakResponse:
    session = session_manager.get(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sessie niet actief.")
    lang = resolve_session_lang(session, body.lang)
    audio = await synthesize_fenna_speech(body.text, lang)
    if not audio:
        raise HTTPException(status_code=503, detail="Spraak kon niet worden gemaakt.")
    b64, mime = audio
    return SpeakResponse(audio_base64=b64, mime_type=mime)

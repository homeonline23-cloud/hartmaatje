# HartMaatje Backend — Fenna API

Python **FastAPI** backend for the HartMaatje voice companion.

**Fenna** is one continuous identity: same name, persona, voice, and memory — no separate welcome system.

## Quick start

### 1. Python environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

Edit `.env` and set:

```
GEMINI_API_KEY=your_key_here
```

Optional: `STAFF_ALERT_WEBHOOK_URL` for care-home alerts.

### 3. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health |
| POST | `/session/start` | Start Fenna session (no auto-close) |
| POST | `/session/end` | User ends session |
| POST | `/chat/message` | Send text → Fenna reply + safety + memory |
| POST | `/speech/transcribe` | Audio → text (Gemini STT) |
| POST | `/speech/speak` | Text → Fenna neural voice |
| POST | `/alerts/emergency` | Staff webhook (emergency/distress) |

## Project layout

```
backend/
  app/
    main.py                 # FastAPI entry
    config.py               # Settings
    routes/                 # HTTP handlers
    services/
      session_manager.py    # In-memory sessions (MVP)
      fenna_chat.py         # LLM conversation
      speech.py             # STT placeholder → Gemini
      tts.py                # TTS — one Fenna voice
    memory/
      store.py              # JSON file memory per resident
    safety/
      detector.py           # Emergency & distress keywords
      alerts.py             # Staff webhook
    prompts/
      fenna_persona.yaml    # Fenna system prompt
    models/
      schemas.py            # Pydantic models
  data/memory/              # Created at runtime
  requirements.txt
  .env.example
```

## Architecture notes

- **Sessions** stay open until `POST /session/end`.
- **Memory** saves to `data/memory/{resident_id}.json` (upgrade to Postgres later).
- **Safety** triggers webhook on emergency/distress phrases.
- **Avatar** is not in this backend — add later as a presentation layer using the same `/chat/message` output.

See `../docs/HARTMAATJE-BUILD-PLAN.md` for the full build plan.

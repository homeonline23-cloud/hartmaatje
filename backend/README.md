# HartMaatje Backend — Companion API

Python **FastAPI** backend for HartMaatje voice companions.

**Personas:** Fenna, Maarten, Peter, Colette — loaded from `../src/lib/companion/productionCharacters.json` (single source of truth).

## Architecture

Layered, MindMeld-inspired layout. Routes stay thin; business logic lives in services.

```
user message
→ NLU (services/nlu)
→ intent_service (services/dialogue)
→ dialogue_manager → response_planner
→ tool_service → prompt_builder → LLM
→ quality_enforcer → structured_logger + metrics
```

| Layer | Path | Role |
|-------|------|------|
| API | `app/api/routers/` | HTTP handlers (health, chat, session, alerts, personas, admin) |
| Schemas | `app/schemas/` | API DTOs |
| Domain | `app/domain/models/` | Persona, NLU, dialogue models |
| Services | `app/services/` | Chat, NLU, memory, dialogue, safety, LLM, tools, quality |
| Repositories | `app/repositories/` | JSON memory store |

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
| GET | `/personas` | List available companions |
| GET | `/personas/{id}` | Persona detail (fenna/maarten/peter/colette) |
| GET | `/admin/status` | Ops status (personas, config flags) |
| GET | `/admin/metrics` | In-process turn counters |
| POST | `/session/start` | Start session (`character_id`: fenna/maarten/peter/colette) |
| POST | `/session/end` | User ends session |
| POST | `/chat/message` | Send text → companion reply + safety + memory |
| POST | `/speech/transcribe` | Audio → text (Gemini STT) |
| POST | `/speech/speak` | Text → neural voice |
| POST | `/alerts/emergency` | Staff webhook (emergency/distress) |

## Project layout

```
backend/
  app/
    main.py
    core/                 # config, logging, enums
    api/routers/          # health, chat, session, alerts, personas, admin
    schemas/              # API DTOs
    domain/models/        # persona, nlu, dialogue
    services/
      chat/               # chat_service, voice pipeline, session
      personas/           # persona_loader
      nlu/                # entity/topic/tone extraction
      memory/             # memory_service, ranker, filters
      dialogue/           # intent, dialogue_manager, response_planner
      safety/             # safety_guard, alerts
      prompts/            # prompt_builder
      llm/                # Gemini calls
      tools/              # web search, tool router
      quality/            # post-LLM validation
      observability/      # structured logging, metrics
    repositories/         # memory_repository (JSON)
    prompts/              # YAML reference + normalize_lang helper
  tests/
    unit/
    integration/
  data/memory/            # Created at runtime
  requirements.txt
  .env.example
```

## Tests

```bash
cd backend
.venv\Scripts\activate
pytest -q
```

## Architecture notes

- **Sessions** stay open until `POST /session/end`.
- **Memory** saves to `data/memory/{resident_id}.json` (upgrade to Postgres later).
- **Safety** triggers webhook on emergency/distress phrases.
- **Avatar** is not in this backend — add later as a presentation layer using the same `/chat/message` output.

See `docs/BACKEND-STRUCTURE.md` for the full folder mapping and remaining TODOs.
See `../docs/HARTMAATJE-BUILD-PLAN.md` for the full build plan.

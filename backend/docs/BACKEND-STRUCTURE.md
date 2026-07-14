# Backend structure — MindMeld-style separation

Incremental refactor of the HartMaatje FastAPI backend. Routes stay thin; business logic lives in `services/`.

## Target tree

```
app/
  main.py
  core/                     # config, logging, enums, lang helpers
  api/
    dependencies.py
    routers/                # health, chat, session, alerts, personas, admin
    v1/router.py            # versioned /api/v1/* surface
  schemas/                  # FastAPI request/response DTOs
  domain/models/            # persona, nlu, dialogue domain models
  repositories/             # memory protocol + json/sqlite/postgres backends
  services/
    chat/                   # turn orchestration, voice, session, speech, TTS
    personas/               # persona_loader (data/personas/)
    nlu/
    memory/                 # memory_service, ranker, filters
    dialogue/               # intent, dialogue_manager, response_planner
    safety/
    prompts/                # prompt_builder + legacy YAML reference
    llm/
    tools/                  # research, calendar, care_notes, web_search
    quality/
    observability/          # structured_logger, metrics (Prometheus export)
  prompts/                  # thin legacy facade (re-exports core + personas)
data/
  personas/                 # catalog.json + fenna.json, maarten.json, ...
  memory/                   # JSON resident files (when MEMORY_BACKEND=json)
  care_notes/               # optional staff notes per resident
tests/
  unit/
  integration/
scripts/
  sync_personas.py          # sync from frontend productionCharacters.json
```

## Turn flow

```
user message
  → NLU (services/nlu)
  → intent_service (services/dialogue)
  → dialogue_manager → response_planner
  → tool_service (research | calendar | care_notes)
  → prompt_builder → llm_service
  → quality_enforcer
  → structured_logger + metrics
```

## Configuration

| Variable | Purpose |
|----------|---------|
| `MEMORY_BACKEND` | `json` (default), `sqlite`, or `postgres` |
| `DATABASE_URL` | SQLite file path or Postgres DSN when not using JSON |
| `PERSONAS_DIR` | Override persona directory (default: `data/personas/`) |
| `PERSONA_CONFIG_PATH` | Legacy monolith JSON override |

## API surfaces

- Unversioned routes: `/health`, `/chat/message`, `/personas`, `/admin/status`, etc.
- Versioned mirror: `/api/v1/health`, `/api/v1/chat/message`, ...
- Metrics: `GET /admin/metrics` (JSON) and `GET /admin/metrics/prometheus` (text)

## Old → new file mapping

| Old path | New path |
|----------|----------|
| `app/config.py` | `app/core/config.py` |
| `app/routes/*.py` | `app/api/routers/*.py` |
| `app/models/schemas.py` | `app/schemas/*.py` |
| `app/models/persona.py` | `app/domain/models/persona.py` |
| `app/services/chat_orchestrator.py` | `app/services/chat/chat_service.py` |
| `app/services/persona_loader.py` | `app/services/personas/persona_loader.py` |
| `app/services/web_search.py` | `app/services/tools/web_search_tool.py` |
| `app/nlu/*` | `app/services/nlu/*` |
| `app/memory/store.py` | `app/repositories/memory_repository.py` (+ sqlite/postgres) |
| `app/prompts` normalize_lang | `app/core/lang.py` |

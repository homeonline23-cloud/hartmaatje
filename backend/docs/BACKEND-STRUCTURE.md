# Backend structure — MindMeld-style separation

Incremental refactor of the HartMaatje FastAPI backend. Routes stay thin; business logic lives in `services/`.

## Target tree (current)

```
app/
  main.py
  core/                     # config, logging, enums, constants
  api/
    dependencies.py
    routers/                # health, chat, session, alerts, personas, admin
    v1/                     # reserved for versioned API surface
  schemas/                  # FastAPI request/response DTOs
  domain/
    models/                   # persona, nlu, dialogue domain models
  repositories/             # persistence (JSON memory store today)
  services/
    chat/                   # turn orchestration, voice, session, speech, TTS
    personas/               # persona_loader
    nlu/                    # entity/topic/tone extraction, memory candidates
    memory/                 # memory_service, ranker, filters
    dialogue/               # intent, dialogue_manager, response_planner
    safety/                 # safety_guard, detector, alerts
    prompts/                # prompt_builder (+ legacy YAML reference)
    llm/                    # Gemini calls (no embedded web search)
    tools/                  # tool_router, tool_service, web_search_tool
    quality/                # post-LLM validation
    observability/          # structured_logger, metrics, timing
  prompts/                  # legacy YAML + normalize_lang helper (TODO: move to core)
data/
  personas/                 # TODO: per-persona JSON (today: productionCharacters.json)
  memory/                   # runtime resident memory files
tests/
  unit/
  integration/
docs/
  BACKEND-STRUCTURE.md
```

## Old → new file mapping

| Old path | New path | Notes |
|----------|----------|-------|
| `app/config.py` | `app/core/config.py` | Settings via `get_settings()` |
| `app/routes/health.py` | `app/api/routers/health.py` | Thin HTTP layer |
| `app/routes/chat.py` | `app/api/routers/chat.py` | |
| `app/routes/session.py` | `app/api/routers/session.py` | |
| `app/routes/alerts.py` | `app/api/routers/alerts.py` | |
| — | `app/api/routers/personas.py` | New: list/detail personas |
| — | `app/api/routers/admin.py` | New: `/admin/status`, `/admin/metrics` |
| `app/models/schemas.py` | `app/schemas/*.py` | Split by domain |
| `app/models/persona.py` | `app/domain/models/persona.py` | |
| `app/models/nlu.py` | `app/domain/models/nlu.py` | |
| `app/models/dialogue.py` | `app/domain/models/dialogue.py` | |
| `app/services/chat_orchestrator.py` | `app/services/chat/chat_service.py` | Main turn flow |
| `app/services/persona_loader.py` | `app/services/personas/persona_loader.py` | |
| `app/services/prompt_builder.py` | `app/services/prompts/prompt_builder.py` | |
| `app/services/memory_service.py` | `app/services/memory/memory_service.py` | + ranker, filters |
| `app/services/safety_guard.py` | `app/services/safety/safety_guard.py` | |
| `app/safety/detector.py` | `app/services/safety/detector.py` | |
| `app/safety/alerts.py` | `app/services/safety/alerts.py` | |
| `app/services/llm_service.py` | `app/services/llm/llm_service.py` | Web search removed |
| `app/services/web_search.py` | `app/services/tools/web_search_tool.py` | Tools layer |
| `app/tools/*` | `app/services/tools/*` | tool_router, tool_service |
| `app/nlu/*` | `app/services/nlu/*` | |
| `app/services/intent_service.py` | `app/services/dialogue/intent_service.py` | |
| `app/services/dialogue_manager.py` | `app/services/dialogue/dialogue_manager.py` | |
| `app/services/response_plan.py` | `app/services/dialogue/response_planner.py` | |
| `app/services/quality_enforcer.py` | `app/services/quality/quality_enforcer.py` | |
| `app/services/structured_logger.py` | `app/services/observability/structured_logger.py` | |
| `app/services/timing.py` | `app/services/observability/timing.py` | |
| `app/memory/store.py` | `app/repositories/memory_repository.py` | |
| `app/services/session_manager.py` | `app/services/chat/session_manager.py` | |
| `app/services/voice_pipeline.py` | `app/services/chat/voice_pipeline.py` | |
| `app/services/speech.py` | `app/services/chat/speech.py` | |
| `app/services/tts.py` | `app/services/chat/tts.py` | |

## Turn flow

```
user message
  → NLU (services/nlu)
  → intent_service (services/dialogue)
  → dialogue_manager → response_planner
  → tool_service (services/tools) — web search here, not in LLM
  → prompt_builder → llm_service
  → quality_enforcer
  → structured_logger + metrics
```

## Remaining TODOs

| Area | Location | Status |
|------|----------|--------|
| Per-persona JSON files | `data/personas/` | Not migrated — still reads `productionCharacters.json` |
| `normalize_lang` helper | `app/prompts/__init__.py` | TODO: move to `app/core/` |
| Duplicate YAML personas | `app/prompts/` + `app/services/prompts/` | Reference only; consolidate later |
| Calendar / care notes tools | `services/tools/tool_router.py` | Stubbed |
| Research tool | `services/tools/research_tool.py` | Re-export stub |
| Metrics export | `services/observability/metrics.py` | In-process counters; add Prometheus |
| Memory store | `repositories/memory_repository.py` | JSON files; Postgres later |
| API versioning | `app/api/v1/` | Reserved, not wired |

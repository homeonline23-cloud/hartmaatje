# HartMaatje — Build Plan & Architecture

> **Fenna** is one continuous companion identity: one name, one voice style, one memory system.  
> No welcome-video voice separate from the chat voice.

---

## 1. Product interpretation

HartMaatje is a **voice-first companion** for older adults in homes, daycare, and care settings. The product is **Fenna** — a warm, patient conversational presence that:

- Stays in conversation until the **user** ends the session (no 5-minute auto-close).
- Remembers personal details across days (children, pets, hobbies, worries).
- Uses **reminiscence-friendly** questions (childhood, music, family, gardens).
- Stays within **safety boundaries** (no medical advice; emergency & distress alerting).
- Works on **PC, tablet, phone browser** today; native apps later via the same API.

The MVP proves one loop: **open → talk → Fenna replies by voice → remembers → stays open → user ends**.

---

## 2. Best architecture recommendation

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (HTML/JS MVP → later React Native / Capacitor)    │
│  Large UI · mic · status · end session                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JSON
┌──────────────────────────▼──────────────────────────────────┐
│  Python FastAPI backend (this scaffold)                       │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│  │ Session Mgr │ │ Fenna Chat   │ │ Safety detector        │ │
│  └─────────────┘ └──────┬───────┘ └───────────┬────────────┘ │
│                         │                      │              │
│  ┌─────────────┐ ┌──────▼───────┐ ┌───────────▼────────────┐ │
│  │ Memory      │ │ LLM (Gemini) │ │ Alerts / webhooks      │ │
│  │ (MVP: JSON) │ │              │ │                        │ │
│  └─────────────┘ └──────────────┘ └────────────────────────┘ │
│  ┌─────────────┐ ┌──────────────┐                            │
│  │ STT service │ │ TTS service  │  ← pluggable providers   │
│  └─────────────┘ └──────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                           │
              Optional later: avatar/video layer (LiveAvatar etc.)
              — separate from core engine, same Fenna text + voice
```

**Why Python + FastAPI:** clear services, easy care-home deployment (Docker), one API for all clients.

**Why not avatar-first:** conversation quality and memory matter more; avatar is an optional presentation layer.

---

## 3. MVP scope

| In MVP | Later |
|--------|-------|
| Session start/end (manual only) | Multi-home tenant isolation |
| Text + voice chat with Fenna | Native iOS/Android shells |
| Gemini LLM replies | Model routing / fallback |
| In-memory + JSON file memory | Postgres + vector search |
| Keyword safety + webhook stub | ML classifier + nurse dashboard |
| Browser mic + neural TTS via API | On-device STT, offline mode |
| Single resident profile | Staff admin, family portal |

---

## 4. Step-by-step build plan

### Phase 1 — Foundation (this scaffold) ✅
1. FastAPI backend with routes: health, session, chat, alerts, speech placeholders.
2. Fenna persona config (YAML).
3. In-memory session manager.
4. Simple static frontend (large buttons, talk, end session).
5. `.env` + README run instructions.

### Phase 2 — Voice loop
1. Wire `POST /speech/transcribe` → Gemini audio understanding.
2. Wire `POST /speech/speak` → Gemini TTS (one voice: Aoede / Fenna).
3. Frontend: record → transcribe → chat → play audio (single Fenna voice).

### Phase 3 — Memory
1. Structured profile fields (names, pets, hometown, hobbies).
2. Post-turn extraction (LLM → JSON facts).
3. Inject memory into system prompt each turn.
4. Persist to SQLite or Postgres per `resident_id`.

### Phase 4 — Safety & care home
1. Emergency keyword + intent detection.
2. Distress logging + staff webhook (Slack, email, care platform).
3. Audit log for compliance.

### Phase 5 — Scale
1. Docker Compose: API + DB + Redis sessions.
2. Per-home configuration.
3. Optional avatar layer consuming same `/chat/message` output.

---

## 5. Suggested Python backend structure

```
backend/
  app/
    main.py              # FastAPI app
    config.py            # Settings from env
    routes/              # HTTP endpoints
    services/            # Business logic
    models/              # Pydantic schemas
    memory/              # Long-term memory (MVP → DB)
    safety/              # Emergency & distress
    prompts/             # Fenna persona
  requirements.txt
  .env.example
```

---

## 6. Suggested frontend structure

```
frontend/
  index.html             # Single calm screen
  css/styles.css         # Large type, high contrast
  js/
    api.js               # Backend client
    voice.js             # Mic record + playback (MVP)
    app.js               # Session + UI state
```

Later: wrap in **Capacitor** or **React Native** — same REST API.

---

## 7. Memory architecture recommendation

### MVP (now)
- **Structured profile memory** in JSON per `resident_id`:
  - `names`, `family`, `pets`, `hometown`, `hobbies`, `preferences`, `gentle_topics`
- **Session transcript** in memory for current chat (last N turns).
- **Simple extraction** after each user message (regex + later LLM JSON).

### Scale (later)
- **Hybrid:**
  - Postgres: structured profile + conversation summaries (daily).
  - Vector DB (pgvector / Qdrant): semantic recall of stories.
  - Rolling summary: compress old turns, keep recent verbatim.

**Best for dementia-friendly care:** structured facts + gentle recall phrases, not raw chat dumps.

---

## 8. Safety and care-home alert design

| Level | Trigger | Fenna says | Backend |
|-------|---------|------------|---------|
| Emergency | fall, chest pain, can't breathe, 112 | "Ik ga meteen hulp regelen…" | `POST /alerts/emergency` → webhook |
| Distress | hopelessness, give up, extreme loneliness | "U bent belangrijk…" | `POST /alerts/distress` → log + webhook |
| Medical | diagnosis, medication | Redirect to nurse/doctor | No alert, template reply |

Webhook payload: `{ resident_id, session_id, alert_type, excerpt, timestamp }`.

Staff dashboard is **out of MVP** — webhook to existing nurse call system is enough.

---

## 9. Cross-platform deployment strategy

| Stage | How |
|-------|-----|
| Dev | `uvicorn` + static `frontend/` on localhost |
| Pilot (1 home) | Docker on small VPS; HTTPS via Caddy; tablets use browser |
| Multi-home | API per region; Postgres; env per `CARE_HOME_ID` |
| App stores | Capacitor shell around `frontend/` |

---

## 10. Cost risks and lower-cost alternatives

| Risk | Mitigation |
|------|------------|
| Premium avatar credits | Avatar optional; voice + text core |
| LLM cost at scale | Short replies; cache memory context; gemini-flash |
| TTS per turn | One TTS call per reply; limit length |
| Vector DB ops | Start with structured JSON; add vectors when needed |

**Affordable stack:** FastAPI + Gemini Flash + Gemini TTS + SQLite/Postgres + static frontend.

---

## 11. Example system prompt for Fenna

See `backend/app/prompts/fenna_persona.yaml` — full persona used by the chat service.

---

## 12. Recommended first coding milestone

**Milestone 1 (complete when):**
- [ ] User opens frontend → session starts
- [ ] User sends message (typed or voice)
- [ ] Fenna replies with persona-consistent text
- [ ] One TTS voice plays reply
- [ ] Session stays open; user taps "End session"
- [ ] Emergency phrase triggers alert endpoint (test webhook)

**Command to verify:**
```bash
cd backend && uvicorn app.main:app --reload --port 8000
# open frontend/index.html or serve frontend on :5500
```

---

*This document lives next to the runnable scaffold in `backend/` and `frontend/`.*

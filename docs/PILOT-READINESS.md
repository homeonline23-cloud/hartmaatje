# Pilot readiness — voice turns (HartMaatje)

Lightweight checklist for browser-based voice pilots. Metrics are collected client-side (`voiceMetrics.ts`) and server-side (`/admin/metrics`).

## What is measured

| Metric | Source | Target (p95) |
|--------|--------|----------------|
| User stop → backend reply | `vadEndToBackendMs` | < 4000 ms |
| User stop → first TTS audio | `vadEndToFirstAudioMs` | < 5000 ms |
| Failed turn rate | `turns_failed / turns_started` | < 5% |
| Recovered turn rate | `turns_recovered` | logged, not blocking |
| Interruption count | `interruptions` | must work (manual test) |
| Double response rate | `turnInFlight` guard | 0% |

**Dev console:** `window.__hartmaatjeVoiceMetrics()` after a session.

**Backend:** `GET /admin/metrics` and `GET /admin/metrics/prometheus`.

## Scripted scenarios

Run (requires `GEMINI_API_KEY` and optional running API on :8000):

```bash
cd backend
.venv\Scripts\python.exe scripts\pilot_voice_scenarios.py
```

Scenarios:

1. Greeting — short warm reply, no memory grab bag
2. Loneliness — supportive tone
3. Family memory — save + retrieve on follow-up
4. Practical question — no irrelevant memory
5. Calendar question — tool enrichment when visits stored
6. Care notes question — care context when notes exist
7. Identity question — no resident memory leak ("Wie bent u?")

## Passing criteria (guest voice session)

- [ ] Session starts without mic error
- [ ] Turn completes with audible reply
- [ ] Failed turn shows recovery message and returns to listening
- [ ] No duplicate replies when speaking twice quickly
- [ ] TTS stops when user speaks again
- [ ] `vadEndToFirstAudioMs` under 5s on typical Wi-Fi
- [ ] Identity question does not inject resident name from memory block

## Still risky (known gaps)

| Risk | Status |
|------|--------|
| Voice turn still via Next.js `/api/fenna-voice-turn` | Prompt 1 — route to Python backend |
| Duplicate memory (frontend + backend) | Prompt 2 — unified pipeline |
| Logged-in Supabase chat separate memory | Out of pilot scope |
| No automated browser E2E (Playwright) | Manual + `pilot_voice_scenarios.py` |
| Quick-ack / dead-air filler | Not implemented — thinking phase is silent |

## Blockers for live care pilot

1. **Voice routing to backend orchestrator** (Prompt 1) — safety/memory must be single path
2. **Failed turn rate < 5%** over 20+ test turns
3. **Zero double responses** in interrupt scenario
4. **Staff alert webhook** configured for safety tests
5. **Privacy / consent** flow for residents (product, not backend)

## Not blockers for technical pilot

- Postgres memory backend
- API v1 versioning
- Per-persona JSON sync automation

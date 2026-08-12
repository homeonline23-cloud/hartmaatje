<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

HartMaatje is a voice-first companion product with three local surfaces (same product, not separate apps):

| Surface | Start | Port |
|---------|-------|------|
| Next.js UI (primary) | `npm run dev` (see root `package.json`) | 3000 |
| FastAPI companion API | from `backend/`: `PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` | 8000 |
| Static MVP frontend | from `frontend/`: `python3 -m http.server 5500` | 5500 |

Standard install/run/test commands: root `README.md`, `backend/README.md`, `frontend/README.md`, and `package.json` scripts. Backend tests need `PYTHONPATH=.` (e.g. `cd backend && PYTHONPATH=. .venv/bin/pytest -q`).

### Non-obvious caveats

- Copy `.env.local.example` → `.env.local` and set `NEXT_PUBLIC_HARTMAATJE_API_URL=http://localhost:8000`. Backend reads `backend/.env` (`GEMINI_API_KEY=`). Without a Gemini key, `/health` reports `fenna_ready: false` and chat uses local fallback replies (session start/chat still work).
- Guest voice on Next.js can fall back to Next `/api/*` if FastAPI is down; pilot voice flow expects both Next + FastAPI. Supabase and LiveAvatar are optional (auth/avatar only).
- `npm run lint` currently reports pre-existing errors (React hooks / unused vars); do not treat a clean lint as a setup gate.
- Microphone/TTS are limited in headless Cloud Agent VMs; prefer API or text UI paths for hello-world checks (`POST /session/start`, `POST /chat/message`).
- System package `python3.12-venv` is required once for `backend/.venv`; the update script assumes it is already present on the image.

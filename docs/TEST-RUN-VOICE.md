# Voice test-run (5 minuten)

Korte handleiding om lokaal backend + frontend te starten en een voice-sessie te testen.

## Vereisten

- Python 3.11+ met venv in `backend/.venv`
- Node.js 20+
- **Gemini API key** in beide env-bestanden:
  - `backend/.env` → `GEMINI_API_KEY=...`
  - `.env.local` → `GEMINI_API_KEY=...` (fallback als backend uitvalt)
- `.env.local` → `NEXT_PUBLIC_HARTMAATJE_API_URL=http://localhost:8000`
- Microfoon toegestaan in Chrome/Edge
- Windows: test microfoon onder **Instellingen → Systeem → Geluid → Ingang**

---

## 1. Backend starten (terminal 1)

```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Check:** open http://localhost:8000/health  
Verwacht: `"status": "ok"` en `"fenna_ready": true`

---

## 2. Frontend starten (terminal 2)

```powershell
cd web
npm run dev
```

**Check:** open http://localhost:3000

---

## 3. Voice-sessie openen

1. Open het boek op de homepage (klik om te openen).
2. Kies een portret (bijv. **Fenna**).
3. Klik **Start gesprek** (of vergelijkbare startknop).
4. Sta microfoon-toegang toe.

**Backend actief?** In de browserconsole (F12) zie je logs zoals `backend session` met een echte `session_id` (geen `guest-...` prefix).

---

## 4. Five-minute test script (~5 min)

| Min | Actie | Verwacht |
|-----|--------|----------|
| 0:00 | Wacht tot openingstekst klaar is | Fenna spreekt welkom, mic gaat op **luisteren** |
| 0:30 | Zeg: *"Hallo Fenna, hoe gaat het?"* | Korte, warme reactie; geen harde error |
| 1:30 | Zeg: *"Mijn kleindochter Marie komt morgen op bezoek."* | Antwoord erkent bezoek; geheugen wordt opgeslagen |
| 2:30 | Zeg: *"Wanneer komt Marie?"* | Antwoord verwijst naar eerder gezegde info |
| 3:00 | **Interrupt:** spreek terwijl Fenna praat | TTS stopt; geen dubbel antwoord |
| 3:30 | Zeg snel 2× achter elkaar iets korts | Alleen **één** antwoord (geen dubbele reply) |
| 4:00 | Zeg: *"Wie bent u?"* | Geen resident-naam uit geheugen in antwoord |
| 4:30 | Stop sessie | Mic uit; sessie netjes beëindigd |

---

## 5. Metrics controleren

**Browser (na sessie):**

```js
window.__hartmaatjeVoiceMetrics()
```

Let op:
- `turns_started` ≥ aantal gesproken zinnen
- `turns_failed` = 0 (of laag)
- `vadEndToFirstAudioMs` p95 < 5000 ms (doel)

**Backend:**

- http://localhost:8000/admin/metrics
- Of: `GET /admin/metrics/prometheus`

---

## 6. Optioneel — backend scenario's (zonder microfoon)

```powershell
cd backend
.venv\Scripts\python.exe scripts\pilot_voice_scenarios.py
```

7 tekstscenario's via de Python-orchestrator (geen browser nodig).

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| `fenna_ready: false` | `GEMINI_API_KEY` in `backend/.env` |
| *Kan Fenna nu niet bereiken* | Backend draait? Poort 8000 vrij? |
| Geen geluid microfoon | Windows mic-test; andere tab met mic sluiten |
| Fallback naar Next.js | Backend down — voice werkt nog via `/api/fenna-voice-turn` |
| Geen TTS | `GEMINI_API_KEY` in `.env.local`; quota/key check |
| CORS error | `CORS_ORIGINS` in `backend/.env` bevat `http://localhost:3000` |

---

## Snelle regressie (voor commit)

```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests -q

cd ..
npm run test:voice-metrics
```

Verwacht: **54 passed** (backend) + **2 passed** (voice metrics).

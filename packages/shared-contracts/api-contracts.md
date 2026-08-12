# HartMaatje — API contracts (fase 1)

## Richtlijn

- **REST** — sessies, profielen, tools, debug
- **WebSocket** — transcripts, states, tool-events, interrupts (`GET /ws/events?session_id=…`)
- **WebRTC** — live audio transport (WS audio fallback toegestaan)

## REST

| Method | Path | Doel |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck |
| `POST` | `/api/v1/sessions` | Sessie aanmaken |
| `GET` | `/api/v1/sessions/{session_id}` | Sessie ophalen |
| `POST` | `/api/v1/sessions/{session_id}/close` | Sessie sluiten |
| `GET` | `/api/v1/users/{user_id}/profile` | Gebruikersprofiel |
| `POST` | `/api/v1/tools/reminders/query` | Reminders opvragen |
| `POST` | `/api/v1/tools/photos/query` | Foto's opvragen |
| `POST` | `/api/v1/realtime/webrtc/offer` | WebRTC offer |
| `POST` | `/api/v1/realtime/webrtc/ice-candidate` | ICE candidate |
| `GET` | `/api/v1/admin/sessions/{session_id}/trace` | Debug trace |

## WebSocket

`GET /ws/events?session_id={session_id}`

Envelope: zie `events.json`.

## POST /api/v1/sessions — request

```json
{
  "external_user_id": "demo-user-1",
  "display_name": "Annie",
  "device_type": "tablet-web",
  "locale": "nl-NL",
  "companion_id": "fenna"
}
```

## POST /api/v1/sessions — response

```json
{
  "session_id": "uuid",
  "session_token": "…",
  "user_id": "uuid",
  "current_state": "READY",
  "ws_url": "ws://localhost:8000/ws/events?session_id=…",
  "locale": "nl-NL",
  "companion_id": "fenna"
}
```

## Eventflow (happy path)

1. Client `POST /sessions`
2. Client opent WebSocket → server stuurt `ready`
3. Client audio (WebRTC of WS)
4. `speech.start` → `stt.partial*` → `speech.end` → `stt.final`
5. State → `THINKING` → LLM → `tts.start` / `tts.chunk` / `tts.stop`
6. Bij barge-in: client stopt audio, stuurt `interrupt` → `barge.ack` → `LISTENING`

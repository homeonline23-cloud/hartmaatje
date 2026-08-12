# HartMaatje — Finite state machine (fase 1)

Expliciete FSM voor turn-taking en barge-in. Partials, finals, TTS-stops en reconnects
horen hier — niet verspreid over losse callbacks.

## States

| State | Betekenis |
| --- | --- |
| `IDLE` | Geen actieve sessie |
| `READY` | Sessie klaar, wacht op spraak |
| `LISTENING` | Gebruiker spreekt / audio binnen |
| `TRANSCRIBING` | Segment gesloten, final STT onderweg |
| `THINKING` | Final transcript geaccepteerd, LLM bezig |
| `SPEAKING` | TTS speelt (of streamt) antwoord |
| `SPEAKING_INTERRUPTED` | Gebruiker onderbrak tijdens TTS |
| `ERROR_RECOVERABLE` | Tijdelijk probleem, herstel mogelijk |
| `RECONNECTING` | Transport weggevallen |

Initial (fase 1): `READY` (`FSM_INITIAL_STATE`).

## Transitions

| Van | Trigger | Naar |
| --- | --- | --- |
| `IDLE` | sessie klaar | `READY` |
| `READY` | gebruiker start spreken | `LISTENING` |
| `LISTENING` | spraaksegment sluit | `TRANSCRIBING` |
| `TRANSCRIBING` | final transcript geaccepteerd | `THINKING` |
| `THINKING` | eerste bruikbare reply beschikbaar | `SPEAKING` |
| `SPEAKING` | reply voltooid | `READY` |
| `SPEAKING` | gebruiker onderbreekt | `SPEAKING_INTERRUPTED` |
| `SPEAKING_INTERRUPTED` | interrupt afgehandeld | `LISTENING` |
| *actieve state* | tijdelijk probleem | `ERROR_RECOVERABLE` |
| *actieve state* | transport valt weg | `RECONNECTING` |
| `ERROR_RECOVERABLE` | herstel OK | vorige veilige state / `READY` |
| `RECONNECTING` | verbinding hersteld | `READY` |

## Regels

1. Elke transitie publiceert `state.update` en wordt gelogd in `state_transitions`.
2. Sequence-bewuste stoplogica: na `interrupt` mag geen oude TTS-audio met lagere `seq` meer afspelen.
3. `FSM_ENABLE_BARGE_IN=true` in fase 1.
4. Duplicate-event protection aan (`FSM_DUPLICATE_EVENT_PROTECTION`).
5. Partials (`stt.partial`) wijzigen de state **niet** — alleen finals / expliciete triggers.

# AI Chat Partner — backend opnieuw opzetten (Supabase + Gemini)

Alles hieronder blijft binnen jouw eigen diensten: **Supabase** en **Google (Gemini)**.
Geen andere betaalde diensten.

De volgorde is belangrijk. Werk van boven naar beneden.

---

## 1. Nieuw Supabase-project maken

1. Ga naar je Supabase dashboard → **New project**.
2. Naam: bv. `ai-chat-partner`.
3. **Region: Europe (Frankfurt)** — belangrijk voor Nederlandse gebruikers/AVG.
4. Kies een database-wachtwoord en bewaar het.
5. Wacht tot het project klaar is (~1–2 min).

## 2. Database vullen

1. Open **SQL Editor** in het nieuwe project.
2. Open het bestand `supabase/setup-all-in-one.sql`, kopieer **alles**.
3. Plak in de SQL Editor en klik **Run**.
4. Je moet onderaan "Success. No rows returned" zien.

## 3. Je API-sleutels ophalen (Supabase)

Ga naar **Project Settings → API** en noteer:
- **Project URL** (bv. `https://xxxx.supabase.co`)
- **anon / publishable key** (mag in de browser)
- **service_role key** (GEHEIM — nooit in de browser; alleen nodig als je later handmatig test)

> De edge functions krijgen `SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY`
> automatisch van Supabase. Die hoef je NIET zelf in te stellen.

## 4. Gemini-sleutel ophalen (Google)

1. Ga naar **Google AI Studio** (aistudio.google.com) — dit is Google, binnen jouw stack.
2. **Get API key** → maak een sleutel aan.
3. Bewaar hem; we zetten hem zo in Supabase (nooit in de browser/frontend).

## 5. Edge functions plaatsen

**Optie A — via dashboard (geen extra software):**
Voor elke functie: **Edge Functions → Deploy a new function**, naam exact zoals hieronder,
en plak de inhoud van het bijbehorende bestand:

| Functienaam       | Bestand                                   |
|-------------------|-------------------------------------------|
| `chat`            | `supabase/functions/chat/index.ts`        |
| `transcribe`      | `supabase/functions/transcribe/index.ts`  |
| `delete-account`  | `supabase/functions/delete-account/index.ts` |
| `retention-sweep` | `supabase/functions/retention-sweep/index.ts` |

**Optie B — via Supabase CLI** (officieel Supabase-gereedschap):
```
supabase login
supabase link --project-ref <jouw-project-ref>
supabase functions deploy chat transcribe delete-account
supabase functions deploy retention-sweep --no-verify-jwt
```

## 6. Geheimen (secrets) instellen

In **Edge Functions → Secrets** (of Project Settings → Edge Functions) toevoegen:

| Naam                   | Waarde                                          | Nodig voor            |
|------------------------|-------------------------------------------------|-----------------------|
| `GEMINI_API_KEY`       | je Gemini-sleutel uit stap 4                    | chat + transcribe     |
| `GEMINI_MODEL`         | `gemini-2.0-flash` (optioneel; dit is standaard)| chat + transcribe     |
| `RETENTION_CRON_SECRET`| een zelfverzonnen lang wachtwoord (optioneel)   | retention-sweep       |

## 7. E-mailbevestiging (voor testen makkelijker)

Voor snel testen: **Authentication → Providers → Email** → zet **"Confirm email" tijdelijk UIT**.
Dan kun je direct registreren en inloggen zonder e-mail te bevestigen.
(Voor productie zet je dit weer aan.)

## 8. App koppelen

Geef mij de **Project URL** en de **anon key** uit stap 3, dan zet ik ze in `web/.env.local`
en starten we de test.

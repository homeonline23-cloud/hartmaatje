# Hartmaatje — feature roadmap

> Bron: `Feature-Tool-Purpose-Buildnoworlater.csv`  
> Laatst bijgewerkt: juli 2026  
> Stack vandaag: **Next.js + Gemini + regels/prompts + bestandsgeheugen** (geen spaCy in repo)

De CSV noemt vaak **spaCy** als tool. Dat is een *optie* voor later. Hartmaatje gebruikt nu vooral **prompts, regex en Gemini** — dat werkt al voor veel “Now”-items. spaCy voegt pas waarde toe als we snellere/cheaper lokale NLP willen zonder elke turn naar het LLM te sturen.

---

## Prioriteit uit de CSV

| Prioriteit (CSV) | Betekenis |
|------------------|-----------|
| **Now** | Kern voor warm, veilig, bruikbaar gesprek — nu afmaken of versterken |
| **Second** | Na de kern — betere herkenning van emotie en onderwerp |
| **Third** | Routing en intent — als gesprek en geheugen stabiel zijn |

---

## Status per feature

| Feature | CSV | Status | Nu in code | Volgende stap |
|---------|-----|--------|------------|---------------|
| Identity protection | Now | **Grotendeels klaar** | `conversationLogic.ts`, `productionCharacters.json`, `fennaVoiceTurn.ts` | Voice + tekst dezelfde guardrails; E3 exclusiviteit retesten |
| Response style control | Now | **Klaar** | `productionConfig.ts`, `productionCharacters.json`, `trimCompanionReply` | Personages Colette/Peter/Maarten safety-test |
| Safety filter | Now | **Grotendeels klaar** | `conversationLogic.ts`, `safetyTestMatrix.ts`, crisis in Supabase chat | Post-reply safety retry ook op `/api/chat` (nu vooral voice) |
| Basic memory extraction | Now | **Deels** | `memory/extract.ts` (regex/regels) | LLM-extractie na turn versterken; optioneel spaCy NER later |
| Memory storage | Now | **Deels** | JSON per resident + Supabase `memory_facts` / pgvector migraties | Eén pad voor guest én ingelogde gebruiker |
| Memory retrieval | Now | **Deels** | Keyword in `retrieve.ts`; vector als `MEMORY_USE_VECTOR=true` | Vector standaard aan voor ingelogd; voice krijgt profile/episodes |
| Research tool | Now | **Deels** | Python `web_search.py`; natuurbeeld `natureShowcase.ts` | Web search in Next.js chat/voice waar nodig |
| Summarization | Now | **Deels** | Rolling summary guest; Gemini thread summary ingelogd | Zelfde kwaliteit voor voice-sessies |
| Entity linking / coreference | Now | **Nog niet** | — | Later: “zij/ hij / mijn dochter” via LLM-context of Coreferee |
| Readability check | Now | **Deels** | Prompts (“eenvoudig”, korte zinnen) | Optioneel: automatische score (Flesch) op dev-antwoorden |
| Analytics / quality scoring | Now | **Deels** | `voiceTranscriptLog.ts`, safety PDF, `replyFailsLiveVoiceQuality` | Vaste checklist na elke persona-test (Fenna E3, enz.) |
| Emotion / sentiment | Second | **Minimaal** | Keyword hints in `extract.ts`, `guestChat.ts` | Lichte classifier of LLM-tag per turn |
| Topic extraction | Second | **Minimaal** | `inferActiveTopic`, story hints | Terugkerende onderwerpen in profiel opslaan |
| Intent classification | Third | **Nog niet** | Losse regex (nature, crisis, web) | Eén router: chat / memory / safety / tool |
| Conversation routing | Third | **Deels** | Voice live vs LLM; guest vs Supabase chat | Centrale `routeTurn()` in backend |

---

## Wat “nu” echt betekent voor Hartmaatje

### 1. Afmaken wat al bijna werkt (geen spaCy nodig)
- [ ] Fenna safety E3 (exclusiviteit) opnieuw testen na Gemini-quota reset
- [ ] Colette, Peter, Maarten dezelfde safety-ronde
- [ ] Voice: geheugen uit profiel ook in `buildVoiceMemoryContext`
- [ ] Tekst-chat: zelfde safety-retry als voice waar mogelijk
- [ ] Maandprijs invullen in `hartmaatjePricing.ts` wanneer bekend

### 2. Geheugen één lijn trekken
- [ ] Guest (bestand) en ingelogd (Supabase) zelfde feiten-structuur
- [ ] Na elke sessie: extract → opslaan → volgende turn ophalen
- [ ] Vector search inschakelen waar Postgres + migraties draaien

### 3. Later (Second / Third)
- [ ] Emotie + onderwerp structureel (niet alleen keywords)
- [ ] Intent + routing in één module
- [ ] Optioneel: spaCy-service naast Gemini (NER, sentiment, leesbaarheid)

---

## Bestanden om te kennen

| Onderdeel | Pad |
|-----------|-----|
| Persona's (bron van waarheid) | `src/lib/companion/productionCharacters.json` |
| Gespreksregels & safety | `src/lib/companion/conversationLogic.ts` |
| Voice turn + retry | `src/lib/server/fennaVoiceTurn.ts` |
| Geheugen extract/retrieve | `src/lib/memory/` |
| Safety testformulier | `docs/SAFETY-TEST-FORM-NL.md` |
| Prijzen copy | `src/lib/appLocale.ts` → `PRICING_COPY` |
| Dev transcript | `src/app/api/dev/voice-transcript/` |

---

## Koppeling met build plan

| Build plan fase | Roadmap |
|-----------------|---------|
| Phase 3 — Memory | Basic extraction, storage, retrieval (deels live) |
| Phase 4 — Safety | Safety filter + alerts (deels live) |
| Phase 5 — Scale | Vector DB, routing, analytics |

*Voor dagelijkse voortgang: werk deze checklist af en vink items in safety-test PDF.*

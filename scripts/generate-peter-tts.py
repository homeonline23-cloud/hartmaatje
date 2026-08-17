#!/usr/bin/env python3
"""
Generate Peter's TTS narration for a story using Gemini API.
Run on the Hetzner server where the API key is configured.

Usage:
  cd /opt/hartmaatje
  source backend/.venv/bin/activate
  python3 scripts/generate-peter-tts.py
"""
import asyncio
import base64
import os
import re
import struct
import sys

# ---------------------------------------------------------------------------
# Load API key from backend/.env
# ---------------------------------------------------------------------------
def load_env(path):
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass

load_env("/opt/hartmaatje/backend/.env")
load_env("/opt/hartmaatje/.env.local")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in backend/.env or .env.local")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Story text (Dutch — De Magische Bakkerij)
# ---------------------------------------------------------------------------
STORY_TEXT = (
    "In een klein hoekje van de wereld, genesteld in Pipersville, een klein stadje in Oostenrijk, "
    "stond een kleine bakkerij die een oud woonhuis sierde met haar zoete, verleidelijke aroma. "
    "De bakkerij was eigendom van een bescheiden man genaamd Thomas, een weduwnaar die dag en nacht "
    "in zijn eentje werkte om zijn kleine zaakje draaiende te houden. Hij stond bekend om zijn magische "
    "gave om desserts te creëren die zoetheid, genegenheid en warmte belichaamden. "
    "Het was echter een moeilijke tijd voor Thomas. De recessie had zijn vaste klantenbestand doen krimpen, "
    "en zonder andere inkomstenbron dan deze kleine bakkerij, vervaagden zijn dromen om zijn kleine wereld "
    "van zoetigheid uit te breiden elke dag een beetje meer. "
    "Op een heldere, zonnige middag stapte een vreemdeling in een koningsblauw pak de bakkerij binnen. "
    "Zijn ogen gleden over de kleine bakkerij en bleven hangen bij de vitrine met versgebakken lekkernijen. "
    "Hij bestelde één stuk van Thomas's kenmerkende gebak, appelkruimel. "
    "Terwijl hij zijn tanden in de kruimel zette, verscheen er een glimlach op zijn strenge gezicht. "
    "Geïntrigeerd door de heerlijkheid, prees hij Thomas's talenten en vroeg naar de kleine omvang "
    "en het minimalistische decor van de bakkerij. Thomas deelde, met een zucht, zijn aspiraties van "
    "een grotere, majestueuze bakkerij, gevuld met meer personeel, diverse items en meer aanloop. "
    "De vreemdeling leek verdiept in Thomas's verhalen en stelde zich uiteindelijk voor. "
    "Hij was meneer Howard, een succesvolle ondernemer en filantroop die de wereld had rondgereisd "
    "om lokale bedrijven te helpen hun potentieel te bereiken. "
    "Meneer Howard beloofde een aanzienlijk bedrag te doneren om de uitbreiding van Thomas's bakkerij "
    "te ondersteunen. Thomas was overweldigd; zijn diepgewortelde dromen zagen plotseling de belofte "
    "van ontluiken tot een prachtige realiteit. "
    "Trouw aan zijn woord moedigde meneer Howard Thomas aan om de donatie verstandig te gebruiken. "
    "Hij moderniseerde al snel de infrastructuur van de bakkerij, nam bekwame, gepassioneerde helpers aan "
    "en introduceerde een breder assortiment gebak. Het nieuws over de getransformeerde bakkerij verspreidde "
    "zich al snel door Pipersville, en trok fijnproevers en trouwe klanten van heinde en verre aan. "
    "Binnen de kortste keren was Sweet Dreams Bakery een geliefde naam onder liefhebbers van desserts. "
    "Elke hoek van de bakkerij, elke hap van de geserveerde lekkernijen, belichaamde Thomas's passie voor "
    "bakken en zijn dankbaarheid voor de levensveranderende donatie. "
    "Zo ontvouwde zich een verhaal waarin dromen, hoe onbereikbaar ze ook leken, toch uitkomen, "
    "en levens onderweg zoeter maken."
)

PERSONA = (
    "Peter — warme, diepe mannenstem van een volwassen man rond zestig. "
    "Lage bariton, rustig en gelijkwaardig. Praat langzaam en natuurlijk, met korte adempauzes."
)
VOICE_NAME = "Algenib"
TTS_MODEL = "gemini-2.5-flash-preview-tts"
OUTPUT_PATH = "/opt/hartmaatje/public/stories/magical-bakery/nl/peter.mp3"
CHUNK_CHARS = 220

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def split_chunks(text, max_chars=CHUNK_CHARS):
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_chars:
        return [cleaned]
    sentences = re.split(r"(?<=[.!?…])\s+", cleaned)
    chunks, current = [], ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if not re.search(r"[.!?…]$", sentence):
            sentence += "."
        if len(sentence) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(sentence), max_chars):
                part = sentence[i:i+max_chars].strip()
                if part:
                    chunks.append(part)
            continue
        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current.strip())
            current = sentence
    if current:
        chunks.append(current.strip())
    return chunks or [cleaned[:max_chars]]

def pcm_to_wav(pcm_bytes, sample_rate=24000):
    n = len(pcm_bytes)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + n, b"WAVE",
        b"fmt ", 16, 1, 1,
        sample_rate, sample_rate * 2, 2, 16,
        b"data", n,
    )
    return header + pcm_bytes

async def synthesize_chunk(session, chunk, chunk_num, total):
    import json as _json
    prompt = (
        f"Lees hardop voor in één natuurlijke flow ({PERSONA}). "
        f"Praat natuurlijk en maak elke zin volledig af met een duidelijk einde.\n\n{chunk}"
    )
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{TTS_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE_NAME}}
            },
        },
    }
    print(f"  Chunk {chunk_num}/{total} ({len(chunk)} chars)...", flush=True)
    resp = await session.post(url, json=body)
    if not resp.is_success:
        print(f"  ERROR chunk {chunk_num}: {resp.status_code} {resp.text[:200]}")
        return None
    data = resp.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        inline = part.get("inlineData")
        if inline and inline.get("data"):
            raw = base64.b64decode(inline["data"])
            mime = inline.get("mimeType", "audio/wav")
            return raw, mime
    return None

async def main():
    try:
        import httpx
    except ImportError:
        print("Installing httpx...")
        os.system(f"{sys.executable} -m pip install httpx -q")
        import httpx

    chunks = split_chunks(STORY_TEXT)
    print(f"Story split into {len(chunks)} chunks. Generating TTS with Peter's voice ({VOICE_NAME})...")

    results = []
    async with httpx.AsyncClient(timeout=60.0) as session:
        for i, chunk in enumerate(chunks, 1):
            result = await synthesize_chunk(session, chunk, i, len(chunks))
            if result:
                results.append(result)
            else:
                # retry once
                await asyncio.sleep(1)
                result = await synthesize_chunk(session, chunk, i, len(chunks))
                if result:
                    results.append(result)
                else:
                    print(f"  SKIPPED chunk {i} after retry")

    if not results:
        print("ERROR: No audio generated.")
        sys.exit(1)

    print(f"Combining {len(results)} audio chunks...")
    pcm_parts = []
    sample_rate = 24000
    for raw, mime in results:
        if "pcm" in mime or "L16" in mime:
            m = re.search(r"rate=(\d+)", mime)
            if m:
                sample_rate = int(m.group(1))
            pcm_parts.append(raw)
        else:
            pcm_parts.append(raw)

    combined_pcm = b"".join(pcm_parts)
    wav_bytes = pcm_to_wav(combined_pcm, sample_rate)

    # Save WAV then convert to MP3
    wav_tmp = "/tmp/peter-magical-bakery.wav"
    with open(wav_tmp, "wb") as f:
        f.write(wav_bytes)
    print(f"WAV saved ({len(wav_bytes)} bytes). Converting to MP3...")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    ret = os.system(
        f'ffmpeg -i {wav_tmp} -codec:a libmp3lame -q:a 2 -map_metadata -1 "{OUTPUT_PATH}" -y 2>/dev/null'
    )
    if ret == 0:
        size = os.path.getsize(OUTPUT_PATH)
        print(f"\nDone! Saved to {OUTPUT_PATH} ({size // 1024} KB)")
        print("Open hartmaatje.app/verhalen, choose story 2, pick Peter, press Voorlees.")
    else:
        print(f"ffmpeg failed. WAV is at {wav_tmp}")

if __name__ == "__main__":
    asyncio.run(main())

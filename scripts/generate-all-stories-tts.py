#!/usr/bin/env python3
"""
Generate Gemini TTS narration MP3s for ALL stories × companions × languages.

- Skips files that already exist (safe to rerun / resume).
- Run on the Hetzner server where the Gemini API key is configured.

Usage:
  cd /opt/hartmaatje
  source backend/.venv/bin/activate
  python3 scripts/generate-all-stories-tts.py

Leave it running — it will log progress and can be safely interrupted and
restarted; it always resumes from where it left off.
"""
import asyncio
import base64
import json
import os
import re
import struct
import sys

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = "/opt/hartmaatje"
STORIES_JSON = os.path.join(BASE_DIR, "src/lib/storyLocales.json")
PUBLIC_DIR = os.path.join(BASE_DIR, "public/stories")
TMP_DIR = "/tmp/hm-tts"
os.makedirs(TMP_DIR, exist_ok=True)

LANGS = ["nl", "en", "de", "fr", "es"]

COMPANIONS = {
    "fenna": {
        "voiceName": "Aoede",
        "persona": {
            "nl": "Fenna — rustige Nederlandse vrouwenstem, 60-plus. Praat natuurlijk en gelijkwaardig, alsof u met een bekende aan tafel zit — niet zoet of bewonderend voorlezen. Rustig tempo, levendige intonatie, korte adempauzes.",
            "en": "Fenna — calm female voice. Natural, equal conversation — not sugary or gushing. Calm pace with gentle pauses.",
            "de": "Fenna — ruhige deutsche Frauenstimme. Natürlich und gleichwertig — nicht süßlich. Ruhiges Tempo, lebendige Intonation.",
            "fr": "Fenna — voix féminine calme. Naturelle et égale — pas sucrée. Tempo calme, intonation vivante.",
            "es": "Fenna — voz femenina tranquila. Natural e igualitaria — no almibarada. Ritmo tranquilo, entonación animada.",
        },
    },
    "colette": {
        "voiceName": "Aoede",
        "persona": {
            "nl": "Colette — warme, heldere Nederlandse vrouwenstem. Volwassen, rustig en duidelijk.",
            "en": "Colette — warm, clear adult female voice — calm and reassuring.",
            "de": "Colette — warme, klare Frauenstimme. Erwachsen, ruhig und deutlich.",
            "fr": "Colette — voix féminine chaude et claire. Adulte, calme et rassurante.",
            "es": "Colette — voz femenina cálida y clara. Adulta, tranquila y reconfortante.",
        },
    },
    "maarten": {
        "voiceName": "Charon",
        "persona": {
            "nl": "Maarten — rustige Nederlandse mannenstem. Betrouwbaar en geduldig.",
            "en": "Maarten — calm male voice. Trustworthy and patient.",
            "de": "Maarten — ruhige Männerstimme. Vertrauenswürdig und geduldig.",
            "fr": "Maarten — voix masculine calme. Digne de confiance et patient.",
            "es": "Maarten — voz masculina tranquila. Confiable y paciente.",
        },
    },
    "peter": {
        "voiceName": "Algenib",
        "persona": {
            "nl": "Peter — diepe, warme mannenstem van een volwassen man rond zestig. Spreek met oprechte zachtheid en gevoel, alsof elk woord van binnenuit komt — rustig, zorgzaam en vol menselijkheid. Praat traag en natuurlijk, met zachte adempauzes vol warmte.",
            "en": "Peter — deep, warm male voice of a mature man in his sixties. Speak with genuine gentleness and emotion, as if every word comes from the heart — calm, caring and full of humanity. Speak slowly and naturally, with warm gentle pauses.",
            "de": "Peter — tiefe, warme Männerstimme. Sprechen Sie mit echter Sanftheit und Gefühl, als käme jedes Wort von Herzen — ruhig, fürsorglich und voller Menschlichkeit.",
            "fr": "Peter — voix masculine profonde et chaleureuse. Parlez avec une vraie douceur et de l'émotion, comme si chaque mot venait du cœur — calme, bienveillant et plein d'humanité.",
            "es": "Peter — voz masculina profunda y cálida. Hablar con genuina suavidad y emoción, como si cada palabra viniera del corazón — tranquilo, cariñoso y lleno de humanidad.",
        },
    },
}

LEAD = {
    "nl": "Lees hardop voor in één natuurlijke flow",
    "en": "Read aloud in one natural flow",
    "de": "Lesen Sie laut in einem natürlichen Fluss vor",
    "fr": "Lisez à voix haute dans un flux naturel",
    "es": "Lea en voz alta en un flujo natural",
}

CHUNK_CHARS = 220
TIMEOUT = 180.0

# ---------------------------------------------------------------------------
# Load env / API key
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

load_env(os.path.join(BASE_DIR, "backend/.env"))
load_env(os.path.join(BASE_DIR, ".env.local"))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
TTS_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts")

if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found.")
    sys.exit(1)

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

async def synthesize_chunk(session, text, voice_name, prompt_prefix):
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{TTS_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    full_prompt = f"{prompt_prefix}:\n\n{text}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice_name}}
            },
        },
    }
    resp = await session.post(url, json=body)
    if not resp.is_success:
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

async def generate_mp3(session, story_id, companion_id, lang, text, out_path):
    companion = COMPANIONS[companion_id]
    voice_name = companion["voiceName"]
    persona = companion["persona"][lang]
    lead = LEAD.get(lang, LEAD["en"])
    prompt_prefix = f"{lead} ({persona})"

    chunks = split_chunks(text)
    chunk_files = []
    sample_rate = 24000
    success = True

    for i, chunk in enumerate(chunks):
        chunk_tmp = os.path.join(TMP_DIR, f"{story_id}-{companion_id}-{lang}-{i:03d}.wav")
        result = None
        for attempt in range(3):
            if attempt > 0:
                await asyncio.sleep(5 * attempt)
            result = await synthesize_chunk(session, chunk, voice_name, prompt_prefix)
            if result:
                break
        if not result:
            print(f"    SKIP chunk {i+1}/{len(chunks)} — API failed after 3 tries")
            success = False
            continue

        raw, mime = result
        if "pcm" in mime.lower() or "l16" in mime.lower():
            m = re.search(r"rate=(\d+)", mime)
            if m:
                sample_rate = int(m.group(1))
            wav = pcm_to_wav(raw, sample_rate)
            with open(chunk_tmp, "wb") as f:
                f.write(wav)
        else:
            raw_tmp = chunk_tmp.replace(".wav", ".raw")
            with open(raw_tmp, "wb") as f:
                f.write(raw)
            os.system(f'ffmpeg -i "{raw_tmp}" -ar 44100 -ac 1 "{chunk_tmp}" -y 2>/dev/null')
            if not os.path.exists(chunk_tmp):
                chunk_tmp = raw_tmp
        chunk_files.append(chunk_tmp)

    if not chunk_files:
        return False

    # Join with ffmpeg
    list_path = os.path.join(TMP_DIR, f"{story_id}-{companion_id}-{lang}.txt")
    with open(list_path, "w") as f:
        for p in chunk_files:
            f.write(f"file '{p}'\n")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    ret = os.system(
        f'ffmpeg -f concat -safe 0 -i "{list_path}" '
        f'-codec:a libmp3lame -q:a 2 -map_metadata -1 "{out_path}" -y 2>/dev/null'
    )

    # Cleanup chunk files
    for p in chunk_files:
        try:
            os.remove(p)
        except Exception:
            pass
    try:
        os.remove(list_path)
    except Exception:
        pass

    if ret == 0 and os.path.exists(out_path):
        size = os.path.getsize(out_path)
        print(f"    OK — {size // 1024} KB")
        return True
    else:
        print(f"    FAILED — ffmpeg error")
        return False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main():
    try:
        import httpx
    except ImportError:
        os.system(f"{sys.executable} -m pip install httpx -q")
        import httpx

    with open(STORIES_JSON) as f:
        story_locales = json.load(f)

    story_ids = list(story_locales.keys())
    companion_ids = list(COMPANIONS.keys())

    total = len(story_ids) * len(companion_ids) * len(LANGS)
    done = 0
    skipped = 0
    failed = 0

    print(f"Generating TTS for {len(story_ids)} stories × {len(companion_ids)} companions × {len(LANGS)} languages = {total} files")
    print(f"API key: ...{GEMINI_API_KEY[-6:]}, Model: {TTS_MODEL}")
    print()

    async with httpx.AsyncClient(timeout=TIMEOUT) as session:
        for story_id in story_ids:
            story_data = story_locales[story_id]
            for lang in LANGS:
                text_obj = story_data.get(lang) or story_data.get("en") or {}
                text = (text_obj.get("body") or "").strip()
                title = (text_obj.get("title") or story_id)
                if not text:
                    continue

                for companion_id in companion_ids:
                    out_path = os.path.join(PUBLIC_DIR, story_id, lang, f"{companion_id}.mp3")

                    if os.path.exists(out_path):
                        skipped += 1
                        done += 1
                        continue

                    progress = f"[{done+1}/{total}]"
                    print(f"{progress} {story_id} / {companion_id} / {lang} — {title[:40]}", flush=True)

                    ok = await generate_mp3(session, story_id, companion_id, lang, text, out_path)
                    if ok:
                        done += 1
                    else:
                        failed += 1
                        done += 1

    print()
    print(f"Finished. Generated: {done - skipped - failed}  Skipped (existed): {skipped}  Failed: {failed}")
    print("No restart needed — open hartmaatje.app/verhalen and test.")

if __name__ == "__main__":
    asyncio.run(main())

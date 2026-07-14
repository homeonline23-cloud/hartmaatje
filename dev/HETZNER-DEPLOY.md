# HartMaatje op Hetzner VPS — deploy guide

Stap-voor-stap om HartMaatje (Next.js + FastAPI) op een **Hetzner Cloud** server te zetten.  
Jij hoeft **geen eigen computer 24/7 aan** te laten staan — de VPS draait door.

**Repo:** `https://github.com/homeonline23-cloud/hartmaatje.git`  
**Stack:** Next.js (frontend) + FastAPI (backend) + Caddy (HTTPS)

---

## 1. Server kiezen bij Hetzner

1. Account: [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. **Add Server**
3. **Image:** Ubuntu 24.04 LTS
4. **Type:** CX22 (~€4–5/maand) — voldoende voor pilot; CX32 bij meer geheugen
5. **Location:** Nürnberg of Helsinki (EU)
6. **SSH key** toevoegen (aanbevolen)
7. Server aanmaken → noteer het **IP-adres**

### Firewall (Hetzner Cloud Console)

| Poort | Doel |
|-------|------|
| 22 | SSH |
| 80 | HTTP (redirect naar HTTPS) |
| 443 | HTTPS |

Alle andere poorten dicht houden.

---

## 2. Domein (aanbevolen)

Microfoon in de browser werkt alleen via **HTTPS**.

| Record | Type | Waarde |
|--------|------|--------|
| `@` | A | `<HETZNER_IP>` |
| `api` | A | `<HETZNER_IP>` |

Voorbeeld: `hartmaatje.nl` en `api.hartmaatje.nl`.

Vervang in deze guide `jouwdomein.nl` door jouw echte domein.

---

## 3. Eerste login en basissoftware

```bash
ssh root@JOUW_HETZNER_IP

apt update && apt upgrade -y
apt install -y git curl caddy python3 python3-venv python3-pip

# Node.js 20 (nodig voor Next.js 16)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
npm -v
```

Optioneel: aparte gebruiker (veiliger dan root):

```bash
adduser hartmaatje
usermod -aG sudo hartmaatje
su - hartmaatje
```

---

## 4. Code ophalen

```bash
sudo mkdir -p /opt/hartmaatje
sudo chown $USER:$USER /opt/hartmaatje
cd /opt/hartmaatje

git clone https://github.com/homeonline23-cloud/hartmaatje.git .
cd web
```

---

## 5. Backend configureren (FastAPI :8000)

```bash
cd /opt/hartmaatje/web/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
nano .env
```

Minimaal in `backend/.env`:

```env
APP_NAME=HartMaatje
DEBUG=false
API_HOST=0.0.0.0
API_PORT=8000

CORS_ORIGINS=https://jouwdomein.nl,https://www.jouwdomein.nl

GEMINI_API_KEY=jouw_gemini_sleutel_hier
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
FENNA_VOICE_NAME=Aoede

MEMORY_BACKEND=json
MEMORY_DATA_PATH=./data/memory
CARE_HOME_ID=pilot-home-1
```

Test handmatig:

```bash
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
# andere terminal: curl http://127.0.0.1:8000/health
# Verwacht: "fenna_ready": true
# Ctrl+C om te stoppen
```

---

## 6. Frontend configureren (Next.js :3000)

```bash
cd /opt/hartmaatje/web
npm install

cp .env.local.example .env.local
nano .env.local
```

Minimaal in `.env.local`:

```env
GEMINI_API_KEY=jouw_gemini_sleutel_hier

NEXT_PUBLIC_HARTMAATJE_API_URL=https://api.jouwdomein.nl
NEXT_PUBLIC_SITE_URL=https://jouwdomein.nl

NEXT_PUBLIC_VOICE_GEMINI_ONLY=true
```

Build:

```bash
npm run build
```

Test handmatig:

```bash
npm run start
# Browser (via SSH tunnel): curl http://127.0.0.1:3000
# Ctrl+C om te stoppen
```

---

## 7. Systemd — automatisch starten na reboot

Kopieer de service-bestanden uit `dev/systemd/` (of maak ze aan):

```bash
sudo cp /opt/hartmaatje/web/dev/systemd/hartmaatje-backend.service /etc/systemd/system/
sudo cp /opt/hartmaatje/web/dev/systemd/hartmaatje-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hartmaatje-backend hartmaatje-frontend
sudo systemctl start hartmaatje-backend hartmaatje-frontend
sudo systemctl status hartmaatje-backend hartmaatje-frontend
```

Logs bekijken:

```bash
journalctl -u hartmaatje-backend -f
journalctl -u hartmaatje-frontend -f
```

---

## 8. Caddy — HTTPS

```bash
sudo cp /opt/hartmaatje/web/dev/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile   # jouwdomein.nl invullen
sudo systemctl reload caddy
```

Caddy regelt Let's Encrypt-certificaten automatisch zodra DNS klopt.

---

## 9. Controleren

| Check | URL / commando | Verwacht |
|-------|----------------|----------|
| Backend health | `https://api.jouwdomein.nl/health` | `"fenna_ready": true` |
| Frontend | `https://jouwdomein.nl` | HartMaatje opent |
| Video | Menu → Video | Verhaalvideo speelt af |
| Voice | Fenna starten + microfoon | HTTPS vereist — werkt via domein |
| Services | `systemctl status hartmaatje-*` | `active (running)` |

Zie ook: [docs/TEST-RUN-VOICE.md](../docs/TEST-RUN-VOICE.md)

---

## 10. Updates uitrollen

Na `git pull` op de server:

```bash
cd /opt/hartmaatje/web

# Backend
cd backend && source .venv/bin/activate && pip install -r requirements.txt
sudo systemctl restart hartmaatje-backend

# Frontend
cd /opt/hartmaatje/web
npm install
npm run build
sudo systemctl restart hartmaatje-frontend
```

---

## 11. Gemini API — stemlimiet

Gratis Gemini-quota raakt snel vol (429). Voor een echte pilot:

- [Google AI Studio](https://aistudio.google.com/apikey) — key aanmaken
- Billing aanzetten in Google Cloud voor hogere limieten
- Zelfde key in **beide** `.env` (backend) en `.env.local` (frontend)

---

## 12. Kosten (indicatie)

| Onderdeel | Per maand |
|-----------|-----------|
| Hetzner CX22 | ~€4–5 |
| Domein | ~€1 (jaar / 12) |
| Gemini API | variabel (gebruik) |
| **Infra totaal** | **~€5–6** |

---

## 13. Bestanden in deze map

| Bestand | Doel |
|---------|------|
| `HETZNER-DEPLOY.md` | Deze guide |
| `systemd/hartmaatje-backend.service` | FastAPI als service |
| `systemd/hartmaatje-frontend.service` | Next.js als service |
| `Caddyfile.example` | HTTPS reverse proxy |

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| `502 Bad Gateway` | Backend/frontend service niet actief — `systemctl status` |
| CORS error | `CORS_ORIGINS` in backend `.env` moet exact `https://jouwdomein.nl` zijn |
| Microfoon werkt niet | Alleen via HTTPS + geldig certificaat |
| Stem quota (429) | Gemini billing / nieuwe key — zie sectie 11 |
De verhaalvideo staat **niet** in git (~224 MB). Upload handmatig naar de server:

```bash
scp "Hartmaatje met Einde.mp4" root@JOUW_IP:/opt/hartmaatje/web/public/videos/hartmaatje-verhaal.mp4
```

Zie `public/videos/README.md`.

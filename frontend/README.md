# HartMaatje Frontend — Fenna MVP

Simple, older-adult-friendly UI for talking with **Fenna**.

Works in any modern browser (PC, tablet, iPhone, Android).

## Run locally

### 1. Start the Python backend first

See `../backend/README.md` — API on **http://localhost:8000**

### 2. Serve this folder

**Option A — Python (easiest)**

```bash
cd frontend
python -m http.server 5500
```

Open: http://localhost:5500

**Option B — VS Code Live Server**

Open `index.html` with Live Server on port 5500.

### 3. Configure API URL (optional)

Default is `http://localhost:8000`. To change, add before `app.js` in `index.html`:

```html
<script>window.HARTMAATJE_API = "http://your-server:8000";</script>
```

## Usage

1. Tap **Start gesprek met Fenna**
2. Fenna greets you (same voice as all replies)
3. Tap **Praat met Fenna** → speak → tap again
4. Session stays open until you tap **Gesprek beëindigen**

## Files

```
frontend/
  index.html
  css/styles.css
  js/
    api.js      # Backend client
    voice.js    # Mic + audio playback
    app.js      # UI + session flow
```

Later: wrap in **Capacitor** for App Store / Play Store — same API.

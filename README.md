This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## HartMaatje — Fenna (new scaffold)

**Fenna** is rebuilt as a **Python FastAPI backend** + **simple browser frontend** — one continuous companion identity.

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI — sessions, chat, memory, safety, STT/TTS |
| `frontend/` | Calm voice-first UI (tablet / phone / PC browser) |
| `docs/HARTMAATJE-BUILD-PLAN.md` | Full architecture & build plan |

### Run Fenna locally

**Terminal 1 — backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # add GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```bash
cd frontend
python -m http.server 5500
```

Open **http://localhost:5500** → Start gesprek met Fenna.

The legacy Next.js app on port 3000 remains; the new foundation is `backend/` + `frontend/`.

---

## Getting Started (Next.js legacy UI)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

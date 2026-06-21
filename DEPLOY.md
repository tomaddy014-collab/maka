# ATLAS — Deployment

Three hosts: **frontend → Netlify**, **backend → Railway**, **database → Supabase**.
The frontend reads the backend URL from a config field (or `VITE_API_URL` in a
future React build); the backend holds all secrets.

---

## 1. Database — Supabase (free tier)
1. Create a project at https://supabase.com → **Project Settings → Database**.
2. Copy the **connection string** (URI form). This is your `DATABASE_URL`.
   Use the connection-pooler URI for serverless; the direct URI is fine for Railway.
3. (Optional, for meal/progress photos) enable **Storage** and create a bucket
   `atlas-photos`. The `photos` table already stores object keys.

## 2. Backend — Railway
1. New project at https://railway.app → **Deploy from GitHub repo** → pick this repo.
2. Set the **root directory** to `backend/`.
3. **Start command:**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. **Environment variables** (Railway → Variables):
   | Var | Value |
   |---|---|
   | `DATABASE_URL` | Supabase connection string |
   | `APP_PASSWORD` | your single-user app password |
   | `JWT_SECRET` | a long random string |
   | `GARMIN_EMAIL` / `GARMIN_PASSWORD` | your Garmin Connect login |
   | `GARMIN_ADAPTER` | `unofficial` |
   | `FRONTEND_ORIGINS` | your Netlify URL, e.g. `https://atlas.netlify.app` |
   | `ANTHROPIC_API_KEY` | from https://console.anthropic.com (cardio engine) |
   | `ENABLE_SCHEDULED_SYNC` | `true` to auto-sync Garmin (optional) |
5. Deploy. Note the public URL, e.g. `https://atlas-backend.up.railway.app`.
   Check `GET /health` returns `{"status":"ok"}`.

> ⚠️ Never commit the real `.env`. All secrets live in Railway's Variables.

## 3. Frontend — Netlify
This repo serves a single `index.html` (plus `sw.js`, `manifest.webmanifest`,
`icon.svg`) — a static site, no build step.
1. New site at https://netlify.com → **Import from GitHub** → this repo.
2. **Build command:** _(leave empty)_ · **Publish directory:** repo root (`.`).
3. Deploy. Open the site, go to **Garmin**, enter your Railway backend URL +
   `APP_PASSWORD`, and **Connect**.

> The Anthropic key is **only** on the backend. The frontend never sees it — it
> calls `POST /analytics/cardio-suggestion` and the backend makes the Claude call.

## 4. Install as a PWA (phone)
Open the Netlify site in your phone browser → **Add to Home Screen**. It installs
with the Atlas icon, runs full-screen, and the app shell works offline (live data
needs the backend reachable).

---

## Local development
```bash
# backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in secrets
uvicorn app.main:app --reload --port 8001

# frontend (separate terminal)
python3 -m http.server 8000   # open http://localhost:8000
```
Local DB defaults to SQLite (`backend/atlas.db`) if `DATABASE_URL` is unset.

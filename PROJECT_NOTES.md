# ATLAS — PROJECT_NOTES

Living context file. Point each new Claude Code session here so it picks up
state instead of re-deriving everything.

## What ATLAS is
Personal, single-user fitness / health / nutrition / weightlifting tracker.
Combines Strava + Garmin Connect + MyFitnessPal + MacroFactor ideas, with an
old-school Golden Age bodybuilding theme. Standout future feature: an advisory
AI cardio suggestion engine.

## Current reality vs. the eventual stack
- **Eventual target stack** (from the plan): React + Vite + Tailwind (Netlify) /
  FastAPI (Railway) / Postgres via SQLAlchemy (Supabase) / single-user password
  gate / Anthropic API server-side for the cardio engine.
- **What ships today:** this repo deploys by committing a single `index.html`.
  So Phase 1 is built as **one self-contained, offline-capable `index.html`**
  (vanilla JS, no CDN, no build step). All Phase 1 deliverables are client-side,
  so nothing is lost; the backend slots in at Phase 2.

> Decision (2026-06-21): build ATLAS as a brand-new single `index.html`,
> replacing the previous unrelated "Maths with Mr Addy" app (still in git
> history). Photo upload (meal + progress pics) is IN scope — schema accounts
> for it. Full Phase 1 built in one pass.

## Phase status
- [x] **Phase 1 — Skeleton** (this commit)
  - Atlas dark/gritty theme (charcoal/oxblood/brass/off-white + grain).
  - Placeholder Atlas-the-Titan SVG logo.
  - Single-user passphrase gate (client-side, SHA-256 + salt in localStorage).
  - Quote system: editable, category-seeded, context-aware per screen.
  - Dashboard shell + nav stubs for Phases 2–5.
  - Forward-looking localStorage data model mirroring the planned schema.
  - Quote Bank screen with verify workflow.
- [x] **Phase 2 — Garmin sync (backend)** — real FastAPI backend in `/backend`
  - Garmin **adapter layer**: one interface (`app/garmin/base.py`), two impls
    behind `GARMIN_ADAPTER` flag — `unofficial.py` (garth, default) +
    `official.py` (Health API stub). Factory in `factory.py`.
  - Session handling via garth token cache (`GARMIN_TOKEN_DIR`); re-auth +
    MFA via `POST /garmin/reauth`; expiry surfaces `needs_reauth`.
  - SQLAlchemy models for the whole schema (Phase 2 active, 3–5 defined).
  - Single-user auth: `APP_PASSWORD` → JWT (`/auth/login`).
  - Sync service (manual `POST /garmin/sync` + optional in-process APScheduler
    scheduled sync; trade-offs documented in `sync_service.py`).
  - Dashboard endpoint (readiness/sleep/weight/recent activities; surfaces a
    recovery quote when readiness ≤ 40). Quotes seeded server-side.
  - 12 passing pytest tests using an in-memory DB + FakeGarminAdapter (no real
    Garmin calls). Run: `cd backend && pytest -q`.
  - Frontend wired: `index.html` has an `api` client (backend URL + JWT in
    localStorage `atlas_cfg_v1`). Garmin screen connects (URL + APP_PASSWORD),
    runs "Sync now", MFA re-auth, shows sync status + recent activities.
    Dashboard pulls live readiness/sleep/weight + low-readiness recovery quote.
    Falls back to "not connected" state when no backend configured. Async
    post-render hooks (`AFTER_RENDER`) fetch live data after each navigate.
  - Note: `with TestClient(app)` is required in ad-hoc scripts so the lifespan
    runs `init_db()` (create_all) before requests.
- [x] **Phase 3 — Weightlifting tracker**
  - Backend `/lifting` router: exercise library (seeded 15, extensible via
    POST), workout logging (sets: reps/weight/RPE), `/prs` (heaviest weight +
    best Epley est. 1RM per exercise), `/exercises/{id}/progress` (per-day top
    weight, volume, best 1RM for overload charts).
  - Frontend Lifting screen: set builder + add-to-library, save workout, PR
    cards, exercise picker driving a CSS bar overload chart. Requires backend
    connection (workouts persisted server-side). pre_workout quote on screen.
  - 5 new tests (Epley, idempotent exercises, PR tracking, overload, validation).
    Suite: 17 passing.
- [x] **Phase 4 — Nutrition (Open Food Facts)**
  - Backend `/nutrition` router: OFF proxy (`/search`, `/barcode/{code}`,
    normalised server-side, no key), food upsert (by barcode), entry logging
    with gram-scaled macros, targets (GET/PUT), daily summary + 7-day kcal
    series. Energy stored kcal; responses include kJ (×4.184).
  - Frontend Fuel screen: macro cards vs targets (progress bars), OFF search +
    barcode lookup → log with grams, today's log (delete), 7-day kcal chart,
    set-targets prompt. nutrition quote on screen.
  - 6 new tests (kJ, OFF normaliser, macro scaling, targets/summary remaining,
    delete). Suite: 22 passing.
  - DEFERRED to Phase 5 polish: meal-photo UPLOAD UI + Supabase Storage wiring
    (the `photos` table + schema already exist).
- [ ] Phase 5 — Analytics + AI cardio engine + PWA

## Data model (localStorage `atlas_db_v1`, mirrors future Postgres schema)
Tables: `user`, `activities`, `sleep_records`, `body_metrics`,
`recovery_scores`, `exercises`, `workouts`, `sets`, `foods`, `food_entries`,
`nutrition_targets`, `photos`, `quotes`.
- `photos`: `{id, kind:'meal'|'progress', ref_id, taken_at, data_url, note}`
  — when the backend lands, swap `data_url` for Supabase Storage object keys.
- `quotes`: `{id, category, text, author, verified}`.
  Categories: `pre_workout`, `discipline`, `nutrition`, `recovery`, `perseverance`.

## Units (NZ)
kg / km / cm, 24-hour time. Energy stored as kcal; display supports kcal + kJ
(1 kcal = 4.184 kJ).

## Auth note
The gate is a **privacy curtain, not security** — it is client-side only.
Real auth = app-password env var + JWT/session in the FastAPI backend (Phase 2).

## ⚠️ Quote authenticity
All 15 seed quotes are **PLACEHOLDERS** (`verified: false`, author marked
"PLACEHOLDER — verify"). LLMs misattribute real-people quotes confidently. Do
NOT treat them as authentic. Verify wording + author from a real source, edit
`SEED_QUOTES` in `index.html` (or the stored table via the Quote Bank screen),
and mark verified.

## Env vars (for the future backend — none needed for the single-file app)
- `DATABASE_URL` — Supabase Postgres connection string.
- `APP_PASSWORD` — single-user gate password.
- `GARMIN_EMAIL`, `GARMIN_PASSWORD` — unofficial adapter.
- `GARMIN_ADAPTER` — `unofficial` (default) | `official`.
- `ANTHROPIC_API_KEY` — server-side only, for the cardio engine.
Provide via `.env` (never commit) + `.env.example` once the backend exists.

## How to run (Phase 1)
Open `index.html` in a browser, or serve the folder:
`python3 -m http.server 8000` → http://localhost:8000
First run asks you to set a passphrase.

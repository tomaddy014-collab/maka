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
- [ ] Phase 2 — Garmin sync (adapter layer, unofficial garth + official stub)
- [ ] Phase 3 — Weightlifting tracker
- [ ] Phase 4 — Nutrition (Open Food Facts)
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

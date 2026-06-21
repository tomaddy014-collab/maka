# ATLAS — Bear the Weight

A personal, single-user fitness / health / nutrition / weightlifting tracker
with an old-school Golden Age bodybuilding theme.

> **Phase 1 (Skeleton) is live.** Built as a single self-contained `index.html`
> (no build step, no CDN, works offline). See `PROJECT_NOTES.md` for the full
> plan, schema, and where the React + FastAPI + Supabase backend slots in
> (Phase 2+).

## Run it
Either open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On first run you set a passphrase (stored hashed in your browser only — a
privacy curtain, not real security; real auth lands with the Phase 2 backend).

## What's in Phase 1
- Dark, gritty Atlas theme (charcoal / oxblood / brass / off-white + grain).
- Placeholder Atlas-the-Titan logo (SVG you can replace).
- Single-user passphrase gate.
- Context-aware quote system (a fired-up, discipline, nutrition, recovery, or
  perseverance quote depending on the screen).
- Dashboard shell + navigation stubs for Phases 2–5.
- Editable **Quote Bank** with a verify workflow.

## ⚠️ Quotes are placeholders
All seed quotes are unverified placeholders. LLMs misattribute real quotes —
verify wording and author yourself before trusting any of them. Open the
**Quote Bank** screen to review and mark them verified.

## Roadmap
1. **Skeleton** ✅
2. Garmin sync (adapter layer: unofficial `garth` + official Health API stub)
3. Weightlifting tracker (progressive overload, PR tracking)
4. Nutrition (Open Food Facts search + barcode)
5. Analytics + advisory AI cardio engine + PWA

# ATLAS — installed design/dev skills

Five skills are vendored here so Claude Code (incl. web sessions) can use them.
Keep each in its lane — do not let them conflict over visual direction.

| Skill | Source | Lane |
|---|---|---|
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | **LEAD for visual style/theme.** ATLAS is DARK, gritty, old-school bodybuilding — use its Dark Mode + Vintage/Retro styles and dashboard patterns. Do NOT default to light "premium" styling. Self-contained: `scripts/search.py` queries `data/`. |
| `web-design-guidelines` | vercel-labs/agent-skills | Design / accessibility AUDIT of the UI. Does not override the visual direction above. |
| `react-best-practices` | vercel-labs/agent-skills | React/Next.js performance guidelines. (We deploy to Netlify, not Vercel — ignore Vercel-deploy-specific advice.) |
| `webapp-testing` | anthropics/skills | Playwright — verify UI flows end-to-end. |
| `web-artifacts-builder` | anthropics/skills | Artifact/HTML build patterns, used only when helpful. |

Installed manually (this environment has no `/plugin` or `npx`): cloned the
repos and copied the skill folders, materializing `ui-ux-pro-max`'s symlinked
`data/` and `scripts/` into real files.

# Findings & Decisions
<!-- 
  WHAT: Your knowledge base for the task. Stores everything you discover and decide.
  WHY: Context windows are limited. This file is your "external memory" - persistent and unlimited.
  WHEN: Update after ANY discovery, especially after 2 view/browser/search operations (2-Action Rule).
-->

## Requirements (Current)
- Tiles/panels should be white (not blue gradient tiles).
- Use the official FASTSIGNS logo in the UI for branding.
- Remove the "Assist" section/panel.
- Keep Phrase Library, and expand it.
- Overall UX should be more intuitive/easy for FASTSIGNS franchisees.
- Match the design language in `design-reference.html` (tiles, colors, background, shadows, edges/corners), excluding the sidebar.
- SVG output should preserve input line breaks (one braille line per input line) for operator clarity.

## Research Findings
- Previously, "Assist" was implemented in `app/page.tsx` via `runAssist()` from `lib/assist.ts`, and the Phrase Library lived inside the Assist section.
- Phrase Library defaults now come from `DEFAULT_PHRASE_GROUPS` in `lib/phraseLibrary.ts` (categorized + searchable).
- Official FASTSIGNS logo SVG contains brand red `rgb(200,18,41)` and brand blue `rgb(0,46,151)` (from the downloaded SVG).
- `design-reference.html` uses a light background with radial blue/cyan highlights, plus a bottom skyline overlay image.
- `design-reference.html` tile styling uses `--tile-bg` and `--shadow-card` / `--shadow-card-hover` with `--card-radius: 0.875rem` and subtle borders.
- Located planning templates at `/home/jacob/.codex/skills/planning-with-files/templates` due to missing `CLAUDE_PLUGIN_ROOT` env var.
- `homepage-static.html` defines design tokens and tile styles (gradients, border radii, shadows, hover lift).
- `department_operations.html` repeats the same base palette and adds a skyline overlay layer at the bottom of the page.
- Braille app UI is a single-page layout in `app/page.tsx` using `page`, `header`, `grid`, `panel`, `field`, `button`, `input`, `textarea`, `output`, `notice`, `chips` classes defined in `app/globals.css`.
- Current braille app styling uses its own palette, gradients, rounded panels, and pill buttons defined in `app/globals.css`.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep Phrase Library independent of Assist | Allows removing the Assist panel without losing the core phrase workflow |
| Store the FASTSIGNS logo in `public/fastsigns-logo.svg` | Avoids runtime network dependency and ensures consistent branding |
| Insert phrases as new lines | Better matches franchise sign workflows (one line per sign line) |
| Translate line-by-line for multiline input | Ensures SVG preview has one braille line per input line (operator-friendly) |
| Align CSS tokens to `design-reference.html` | Keeps the app visually consistent with the resource site (no sidebar) |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| session-catchup script path failed because `CLAUDE_PLUGIN_ROOT` is empty | Used known template path under `/home/jacob/.codex/skills/planning-with-files` |
| Network blocked when fetching logo | Re-ran `curl` with escalated permissions to download the SVG |
| Browser runtime crashes with `Uncaught abort()` in liblouis | Root cause likely unsafe buffer sizing/length units in upstream `easy-api.js` for UTF16 build; patched wrapper + added try/catch in worker |

## Resources
- `thehub-designreference` (design files to inspect)
- `task_plan.md`, `findings.md`, `progress.md`

## Visual/Browser Findings
- The deployed site at `fs-braille.vercel.app` (checked 2026-01-21) still reflects the pre-refresh UI (top “Braille Translator” pill + auto-translate label). Use it only as a baseline until the updated UI is deployed.
- `homepage-static.html` uses a light, airy background with a fixed body gradient overlay (radial blue/cyan highlights + soft linear gradient).
- Core palette tokens: brand blue `#1F3CFF`, accent cyan `#00CCFF`, base background `#FAFBFC`, surface white `#FFFFFF`, text primary `#1A202C`.
- Tile styles: gradient tile backgrounds (`--tile-bg`), subtle borders, rounded corners, glow shadows, hover lift (~3px) with brighter overlay and glow.
- Radius/shadow tokens include `--radius-md: 0.5rem`, `--card-radius: 0.875rem`, and layered card shadows (`--shadow-card`, `--shadow-card-hover`) with soft depth.
- Background includes an optional skyline overlay image with low opacity and large scale (fixed, bottom-aligned).
- Current braille app styles use a different palette, rounded panels, and pill buttons; will need to re-skin to match thehub tokens.

---
*Update this file after every 2 view/browser/search operations*

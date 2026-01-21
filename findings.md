# Findings & Decisions
<!-- 
  WHAT: Your knowledge base for the task. Stores everything you discover and decide.
  WHY: Context windows are limited. This file is your "external memory" - persistent and unlimited.
  WHEN: Update after ANY discovery, especially after 2 view/browser/search operations (2-Action Rule).
-->

## Requirements
- Match the design language from `thehub-designreference`.
- Exclude any sidebar elements from the reference.
- Apply tiles, colors, background, and overall visual style to the braille app UI.

## Research Findings
- Located planning templates at `/home/jacob/.codex/skills/planning-with-files/templates` due to missing `CLAUDE_PLUGIN_ROOT` env var.
- `homepage-static.html` defines design tokens and tile styles (gradients, border radii, shadows, hover lift).
- `department_operations.html` repeats the same base palette and adds a skyline overlay layer at the bottom of the page.
- Braille app UI is a single-page layout in `app/page.tsx` using `page`, `header`, `grid`, `panel`, `field`, `button`, `input`, `textarea`, `output`, `notice`, `chips` classes defined in `app/globals.css`.
- Current braille app styling uses its own palette, gradients, rounded panels, and pill buttons defined in `app/globals.css`.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Use file-based plan/logs (task_plan.md/findings.md/progress.md) | Required by planning-with-files skill |
| Re-skin existing classes in `app/globals.css` rather than changing markup | Faster alignment with reference while keeping app layout intact |
| Apply thehub gradients and tile backgrounds to core containers | Matches requested tiles/colors/background without adding a sidebar |
| Add skyline overlay via `body::after` | Matches reference atmosphere without changing layout structure |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| session-catchup script path failed because `CLAUDE_PLUGIN_ROOT` is empty | Used known template path under `/home/jacob/.codex/skills/planning-with-files` |

## Resources
- `thehub-designreference` (design files to inspect)
- `task_plan.md`, `findings.md`, `progress.md`

## Visual/Browser Findings
- `homepage-static.html` uses a light, airy background with a fixed body gradient overlay (radial blue/cyan highlights + soft linear gradient).
- Core palette tokens: brand blue `#1F3CFF`, accent cyan `#00CCFF`, base background `#FAFBFC`, surface white `#FFFFFF`, text primary `#1A202C`.
- Tile styles: gradient tile backgrounds (`--tile-bg`), subtle borders, rounded corners, glow shadows, hover lift (~3px) with brighter overlay and glow.
- Radius/shadow tokens include `--radius-md: 0.5rem`, `--card-radius: 0.875rem`, and layered card shadows (`--shadow-card`, `--shadow-card-hover`) with soft depth.
- Background includes an optional skyline overlay image with low opacity and large scale (fixed, bottom-aligned).
- Current braille app styles use a different palette, rounded panels, and pill buttons; will need to re-skin to match thehub tokens.

---
*Update this file after every 2 view/browser/search operations*

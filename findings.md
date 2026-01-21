# Findings & Decisions
<!-- 
  WHAT: Your knowledge base for the task. Stores everything you discover and decide.
  WHY: Context windows are limited. This file is your "external memory" - persistent and unlimited.
  WHEN: Update after ANY discovery, especially after 2 view/browser/search operations (2-Action Rule).
-->

## Requirements
<!-- 
  WHAT: What the user asked for, broken down into specific requirements.
  WHY: Keeps requirements visible so you don't forget what you're building.
  WHEN: Fill this in during Phase 1 (Requirements & Discovery).
  EXAMPLE:
    - Command-line interface
    - Add tasks
    - List all tasks
    - Delete tasks
    - Python implementation
-->
<!-- Captured from user request -->
- Next.js (App Router) + TypeScript web app, Vercel deployable with zero setup
- Deterministic braille translation using liblouis with profiles en-us-g1 and en-us-g2
- Output Unicode braille, dot bitstrings, dot-number notation, SVG preview, copy buttons
- Configurable normalization with warnings for unsupported chars
- Assist panel (advisory only) with suggestions, profile recommendation, flags, phrase library, local storage
- Include tests (golden cases), README with Vercel deploy + disclaimers

## Research Findings
<!-- 
  WHAT: Key discoveries from web searches, documentation reading, or exploration.
  WHY: Multimodal content (images, browser results) doesn't persist. Write it down immediately.
  WHEN: After EVERY 2 view/browser/search operations, update this section (2-Action Rule).
  EXAMPLE:
    - Python's argparse module supports subcommands for clean CLI design
    - JSON module handles file persistence easily
    - Standard pattern: python script.py <command> [args]
-->
<!-- Key discoveries during exploration -->
- Liblouis should be used as sole source of truth; avoid native binaries on Vercel by using WASM client-side
- Liblouis browser build is available via `liblouis` + `liblouis-build` npm packages; tables can be copied into `public/liblouis`
- The Emscripten “no tables” build needs `braille-patterns.cti` loaded *before* `chardefs.cti` defines letters/punctuation; otherwise liblouis emits cascades like `Character 'a' is not defined` and `Dot pattern \\12/ is not defined` and translation returns `null`.

## Technical Decisions
<!-- 
  WHAT: Architecture and implementation choices you've made, with reasoning.
  WHY: You'll forget why you chose a technology or approach. This table preserves that knowledge.
  WHEN: Update whenever you make a significant technical choice.
  EXAMPLE:
    | Use JSON for storage | Simple, human-readable, built-in Python support |
    | argparse with subcommands | Clean CLI: python todo.py add "task" |
-->
<!-- Decisions made with rationale -->
| Decision | Rationale |
|----------|-----------|
| Use liblouis browser build (Emscripten) | Avoids Vercel native binary issues; keeps deployment simple |
| Bundle only required en-us tables in repo | Reduces size and avoids external dependencies |
| Provide golden tests + update script | Keeps outputs deterministic after generating with liblouis |
| Use `liblouis` + `liblouis-build` browser build | Valid npm packages; avoids 404 dependency errors |

## Issues Encountered
<!-- 
  WHAT: Problems you ran into and how you solved them.
  WHY: Similar to errors in task_plan.md, but focused on broader issues (not just code errors).
  WHEN: Document when you encounter blockers or unexpected challenges.
  EXAMPLE:
    | Empty file causes JSONDecodeError | Added explicit empty file check before json.load() |
-->
<!-- Errors and how they were resolved -->
| Issue | Resolution |
|-------|------------|
| Vercel deployment: liblouis prints ~1983 errors (`Character 'a' is not defined`, `Dot pattern \\12/ is not defined`) and translation fails | Patch copied `chardefs.cti` to `include braille-patterns.cti` early; remove later `include braille-patterns.cti` from copied `en-us-g1.ctb` to avoid duplicate definitions |

## Resources
<!-- 
  WHAT: URLs, file paths, API references, documentation links you've found useful.
  WHY: Easy reference for later. Don't lose important links in context.
  WHEN: Add as you discover useful resources.
  EXAMPLE:
    - Python argparse docs: https://docs.python.org/3/library/argparse.html
    - Project structure: src/main.py, src/utils.py
-->
<!-- URLs, file paths, API references -->
- /home/jacob/.codex/skills/planning-with-files/skills/planning-with-files/SKILL.md

## Visual/Browser Findings
<!-- 
  WHAT: Information you learned from viewing images, PDFs, or browser results.
  WHY: CRITICAL - Visual/multimodal content doesn't persist in context. Must be captured as text.
  WHEN: IMMEDIATELY after viewing images or browser results. Don't wait!
  EXAMPLE:
    - Screenshot shows login form has email and password fields
    - Browser shows API returns JSON with "status" and "data" keys
-->
<!-- CRITICAL: Update after every 2 view/browser operations -->
<!-- Multimodal content must be captured as text immediately -->
- 2026-01-20: On `https://fs-braille.vercel.app/`, clicking Translate triggers liblouis compilation spam like `[40000] en-us-g2.ctb:31: error: Character 'a' is not defined` and `[40000] ... Dot pattern \\12/ is not defined`, ending with ~1983 errors and missing output.
- 2026-01-20: Network requests for `/liblouis/*.ctb|*.cti|*.uti` return 200/206 (Range) and files exist; compilation still fails until dot-pattern mappings are loaded first.
- 2026-01-20: Re-test after a new Vercel deployment still fails: translating `EXIT` produces `[40000] ... Character 'a' is not defined` / `Dot pattern \\15/ is not defined`, ending with `1829 errors found` + `en-us-g2.ctb could not be found`, and Outputs remain `—`.
- 2026-01-20: Live `/liblouis/easy-api.js` does **not** contain the `preloadTableFiles` patch (string check returns false), and runtime still performs on-demand table loading via `HEAD 200` + `GET 206` Range requests to `/liblouis/*.ctb|*.cti|*.uti` (suggesting the preload-based mitigation is not deployed/active).

---
<!-- 
  REMINDER: The 2-Action Rule
  After every 2 view/browser/search operations, you MUST update this file.
  This prevents visual information from being lost when context resets.
-->
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*

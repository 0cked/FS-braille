# Progress Log
<!-- 
  WHAT: Your session log - a chronological record of what you did, when, and what happened.
  WHY: Answers "What have I done?" in the 5-Question Reboot Test. Helps you resume after breaks.
  WHEN: Update after completing each phase or encountering errors. More detailed than task_plan.md.
-->

## Session: 2025-02-14
<!-- 
  WHAT: The date of this work session.
  WHY: Helps track when work happened, useful for resuming after time gaps.
  EXAMPLE: 2026-01-15
-->

### Phase 1: Requirements & Discovery
<!-- 
  WHAT: Detailed log of actions taken during this phase.
  WHY: Provides context for what was done, making it easier to resume or debug.
  WHEN: Update as you work through the phase, or at least when you complete it.
-->
- **Status:** in_progress
- **Started:** 2025-02-14 09:00
<!-- 
  STATUS: Same as task_plan.md (pending, in_progress, complete)
  TIMESTAMP: When you started this phase (e.g., "2026-01-15 10:00")
-->
- Actions taken:
  <!-- 
    WHAT: List of specific actions you performed.
    EXAMPLE:
      - Created todo.py with basic structure
      - Implemented add functionality
      - Fixed FileNotFoundError
  -->
  - Loaded planning-with-files skill and initialized planning docs
  - Captured initial requirements and decisions
- Files created/modified:
  <!-- 
    WHAT: Which files you created or changed.
    WHY: Quick reference for what was touched. Helps with debugging and review.
    EXAMPLE:
      - todo.py (created)
      - todos.json (created by app)
      - task_plan.md (updated)
  -->
  - /home/jacob/wslprojects/braille-app/task_plan.md
  - /home/jacob/wslprojects/braille-app/findings.md
  - /home/jacob/wslprojects/braille-app/progress.md

### Phase 2: Planning & Structure
<!-- 
  WHAT: Same structure as Phase 1, for the next phase.
  WHY: Keep a separate log entry for each phase to track progress clearly.
-->
- **Status:** complete
- Actions taken:
  - Chose WASM-based liblouis approach for browser translation
  - Created project structure for Next.js app, libs, config, tests, scripts
- Files created/modified:
  - /home/jacob/wslprojects/braille-app/package.json
  - /home/jacob/wslprojects/braille-app/tsconfig.json
  - /home/jacob/wslprojects/braille-app/next.config.js
  - /home/jacob/wslprojects/braille-app/vitest.config.ts
  - /home/jacob/wslprojects/braille-app/app/layout.tsx
  - /home/jacob/wslprojects/braille-app/app/globals.css
  - /home/jacob/wslprojects/braille-app/config/profiles.ts

### Phase 3: Implementation
- **Status:** complete
- Actions taken:
  - Implemented liblouis loader, normalization, translation output mapping
  - Added SVG renderer and Assist rules engine
  - Built main UI with outputs, assist, and advanced settings
  - Added tests and README, plus scripts for assets and golden outputs
- Files created/modified:
  - /home/jacob/wslprojects/braille-app/app/page.tsx
  - /home/jacob/wslprojects/braille-app/lib/louis.ts
  - /home/jacob/wslprojects/braille-app/lib/normalization.ts
  - /home/jacob/wslprojects/braille-app/lib/translation.ts
  - /home/jacob/wslprojects/braille-app/lib/svg.ts
  - /home/jacob/wslprojects/braille-app/lib/assist.ts
  - /home/jacob/wslprojects/braille-app/tests/normalization.test.ts
  - /home/jacob/wslprojects/braille-app/tests/translation.golden.test.ts
  - /home/jacob/wslprojects/braille-app/tests/golden.en-us-g1.json
  - /home/jacob/wslprojects/braille-app/tests/golden.en-us-g2.json
  - /home/jacob/wslprojects/braille-app/scripts/copy-liblouis-assets.cjs
  - /home/jacob/wslprojects/braille-app/scripts/generate-golden.ts
  - /home/jacob/wslprojects/braille-app/README.md

### Phase 4: Testing & Verification
- **Status:** in_progress
- Actions taken:
  - Identified Vercel npm E404 for liblouis-wasm dependency
  - Swapped to `liblouis` + `liblouis-build` and updated asset copy + loader
  - Fixed Next.js client bundle by loading liblouis assets via script tags
  - Fixed runtime table resolution and guarded translation errors
  - Duplicated tables to root to satisfy include lookups
  - Realigned table paths to `/liblouis/tables/` with `tables/...` table names
  - Switched profile table names back to bare filenames for on-demand loading
- Files created/modified:
  - /home/jacob/wslprojects/braille-app/tests/golden.en-us-g1.json
  - /home/jacob/wslprojects/braille-app/tests/golden.en-us-g2.json
  - /home/jacob/wslprojects/braille-app/lib/louis.ts
  - /home/jacob/wslprojects/braille-app/scripts/copy-liblouis-assets.cjs
  - /home/jacob/wslprojects/braille-app/package.json
  - /home/jacob/wslprojects/braille-app/README.md
  - /home/jacob/wslprojects/braille-app/config/profiles.ts
  - /home/jacob/wslprojects/braille-app/public/liblouis/README.txt
  - /home/jacob/wslprojects/braille-app/lib/louis.node.ts
  - /home/jacob/wslprojects/braille-app/lib/translation.node.ts
  - /home/jacob/wslprojects/braille-app/lib/translation.ts
  - /home/jacob/wslprojects/braille-app/lib/louis.ts
  - /home/jacob/wslprojects/braille-app/config/profiles.ts
  - /home/jacob/wslprojects/braille-app/scripts/copy-liblouis-assets.cjs

## Test Results
<!-- 
  WHAT: Table of tests you ran, what you expected, what actually happened.
  WHY: Documents verification of functionality. Helps catch regressions.
  WHEN: Update as you test features, especially during Phase 4 (Testing & Verification).
  EXAMPLE:
    | Add task | python todo.py add "Buy milk" | Task added | Task added successfully | ✓ |
    | List tasks | python todo.py list | Shows all tasks | Shows all tasks | ✓ |
-->
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Local prod: translate g2 | `EXIT` | Non-empty braille outputs; no liblouis compile errors | Outputs populated (`⠠⠠⠑⠭⠊⠞` etc); no `[40000]` spam | ✓ |

## Error Log
<!-- 
  WHAT: Detailed log of every error encountered, with timestamps and resolution attempts.
  WHY: More detailed than task_plan.md's error table. Helps you learn from mistakes.
  WHEN: Add immediately when an error occurs, even if you fix it quickly.
  EXAMPLE:
    | 2026-01-15 10:35 | FileNotFoundError | 1 | Added file existence check |
    | 2026-01-15 10:37 | JSONDecodeError | 2 | Added empty file handling |
-->
<!-- Keep ALL errors - they help avoid repetition -->
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2025-02-14 13:17 | npm E404 liblouis-wasm on Vercel | 1 | Switched to liblouis + liblouis-build packages |
| 2025-02-14 13:51 | Next.js build error: fs not found in browser bundle | 1 | Load liblouis assets via script tags; remove npm import from client |
| 2025-02-14 14:05 | Runtime error: tables not found in browser | 1 | Remove tables/ prefix and guard null translation |
| 2025-02-14 14:15 | Runtime error: characters not defined | 1 | Serve tables from /liblouis/ and /liblouis/tables/ |
| 2025-02-14 14:25 | Runtime error: characters not defined | 2 | Align table base path to /liblouis/tables/ |
| 2025-02-14 14:35 | Runtime error: tables not found | 2 | Use bare table names with base path /liblouis/tables/ |
| 2026-01-20 | Vercel: liblouis compile spam (`Character 'a' is not defined`) | 1 | Inject `braille-patterns.cti` early in copied `chardefs.cti`; remove duplicate include from copied `en-us-g1.ctb` |

## 5-Question Reboot Check
<!-- 
  WHAT: Five questions that verify your context is solid. If you can answer these, you're on track.
  WHY: This is the "reboot test" - if you can answer all 5, you can resume work effectively.
  WHEN: Update periodically, especially when resuming after a break or context reset.
  
  THE 5 QUESTIONS:
  1. Where am I? → Current phase in task_plan.md
  2. Where am I going? → Remaining phases
  3. What's the goal? → Goal statement in task_plan.md
  4. What have I learned? → See findings.md
  5. What have I done? → See progress.md (this file)
-->
<!-- If you can answer these, context is solid -->
| Question | Answer |
|----------|--------|
| Where am I? | Phase X |
| Where am I going? | Remaining phases |
| What's the goal? | [goal statement] |
| What have I learned? | See findings.md |
| What have I done? | See above |

---
<!-- 
  REMINDER: 
  - Update after completing each phase or encountering errors
  - Be detailed - this is your "what happened" log
  - Include timestamps for errors to track when issues occurred
-->
*Update after completing each phase or encountering errors*

## Session: 2026-01-20

### Phase 4: Testing & Verification
- **Status:** in_progress
- Actions taken:
  - Reproduced production failure on `https://fs-braille.vercel.app/`: liblouis logs ~1983 compile errors (`Character 'a' is not defined`, `Dot pattern \\12/ is not defined`) and translation output stays empty.
  - Traced failure to dot-pattern mappings (`braille-patterns.cti`) being loaded too late (after `chardefs.cti` already attempted to define letters/punctuation).
  - Patched `scripts/copy-liblouis-assets.cjs` to:
    - inject `include braille-patterns.cti` near the top of the copied `chardefs.cti`
    - remove the later `include braille-patterns.cti` from copied `en-us-g1.ctb` to avoid duplicate definitions
  - Verified fix with `npm run build` + `next start` and Playwright: translating `EXIT` produces unicode braille + dots with no liblouis `[40000]` error spam.

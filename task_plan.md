# Task Plan: Resource Site Alignment + Multiline SVG
<!-- 
  WHAT: This is your roadmap for the entire task. Think of it as your "working memory on disk."
  WHY: After 50+ tool calls, your original goals can get forgotten. This file keeps them fresh.
  WHEN: Create this FIRST, before starting any work. Update after each phase completes.
-->

## Goal
Make the braille app match `design-reference.html` (resource site design language, no sidebar), improve the layout, and ensure SVG output preserves input line breaks (one SVG braille line per input line) for operator intuitiveness.

## Current Phase
Phase 4

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm design tokens from `design-reference.html`
- [x] Confirm current line-break behavior in braille/SVG output
- [x] Identify layout changes needed to avoid tall 3-column layout
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Map resource-site tokens into `app/globals.css`
- [x] Decide new page layout (2-column + stacking)
- [x] Decide translation strategy for multiline (line-by-line translation)
- **Status:** complete

### Phase 3: Implementation
- [x] Update translation to preserve line breaks in SVG (option 1)
- [x] Rework layout to avoid tall 3-column layout
- [x] Update styles to match `design-reference.html` tiles/background/shadows
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Verify multiline input produces multiline SVG (unit test)
- [ ] Verify layout across desktop/mobile breakpoints (requires local preview; sandbox blocks `next dev` from listening)
- [x] Verify build/test passes
- [x] Document test results in progress.md
- **Status:** in_progress

### Phase 5: Delivery
- [x] Review modified files
- [x] Summarize changes for user
- [x] Provide next steps if needed
- **Status:** complete

## Key Questions
1. Which files define the current braille app UI layout and styling?
2. Which portions of `design-reference.html` define the tile/card styling?
3. Should multiline input always force multiline output (even if liblouis wraps)?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
|          |           |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| session-catchup script failed (CLAUDE_PLUGIN_ROOT empty) | 1 | Proceeded by using known template path under /home/jacob/.codex/skills/planning-with-files |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition

## Archived Context
- Previous plan focused on aligning the UI to `thehub-designreference`. This task supersedes that effort with a simpler, FASTSIGNS-branded UI update.

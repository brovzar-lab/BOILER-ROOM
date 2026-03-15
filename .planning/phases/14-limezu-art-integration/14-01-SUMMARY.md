---
phase: 14-limezu-art-integration
plan: 01
subsystem: engine
tags: [limezu, sprite-atlas, multi-sheet, pixel-art, canvas-2d, 32x32-characters]

# Dependency graph
requires:
  - phase: 10-canvas-renderer
    provides: Canvas 2D rendering pipeline, spriteAtlas.ts, spriteSheet.ts, types.ts
provides:
  - SHEET_PATHS registry mapping 12 LimeZu PNG sheets by semantic IDs
  - LIMEZU_ATLAS with 76+ environment/furniture/decoration/UI frame coordinates
  - LIMEZU_CHARACTER_FRAMES mapping 4 states x 4 directions to 32x32 frames
  - CHAR_SHEET_PATHS mapping 6 characters to LimeZu premade sheets
  - Multi-sheet environment loader with getEnvironmentSheetById()
  - Updated CHAR_SPRITE_W constant (32, was 24)
affects: [14-02-renderer-migration, 14-03-layout-update, 15-collision]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-sheet-atlas-registry, sheet-frame-tuple, packed-animation-rows]

key-files:
  created:
    - src/engine/limeZuAtlas.ts
    - src/engine/limeZuCharFrames.ts
    - src/engine/__tests__/limeZuAtlas.test.ts
    - src/engine/__tests__/spriteAtlas.test.ts
  modified:
    - src/engine/types.ts
    - src/engine/spriteSheet.ts
    - src/engine/spriteAtlas.ts
    - src/engine/__tests__/spriteSheet.test.ts

key-decisions:
  - "Used row 0 idle preview (1 frame/dir) for idle state, row 2 packed walk (6 frames/dir) for walk"
  - "Phone animation row 6 mapped to work state for all directions (down-facing frames mirrored)"
  - "Talk state uses idle + first idle-loop frame per direction as 2-frame animation"
  - "ENVIRONMENT_ATLAS and DECORATION_ATLAS kept as deprecated compat until Plan 02 renderer migration"

patterns-established:
  - "SheetFrame tuple: { sheetId, frame } pattern for multi-sheet atlas references"
  - "sf() helper for readable atlas coordinate definitions using grid positions"
  - "buildPackedRow() for LimeZu animation rows with directions packed sequentially"

requirements-completed: [CHAR-01, CHAR-02, ENV-14]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 14 Plan 01: LimeZu Asset Foundation Summary

**Multi-sheet atlas registry with 76+ environment/furniture/UI entries, 32x32 character frame mapping for 6 LimeZu premade characters, and parallel multi-sheet loader**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T16:39:46Z
- **Completed:** 2026-03-15T16:44:57Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified + 1 updated test)

## Accomplishments
- Created limeZuAtlas.ts with SHEET_PATHS (12 sheets) and LIMEZU_ATLAS (76+ entries) mapping floors, walls, furniture, conference hall, film studio, decorations, and UI elements
- Created limeZuCharFrames.ts mapping idle/walk/work/talk states x 4 directions to 32x32 LimeZu premade character sheet coordinates
- Updated spriteSheet.ts to load 6 character + 12 environment sheets in parallel with getEnvironmentSheetById() API
- Updated spriteAtlas.ts CHARACTER_FRAMES to use LimeZu frame mapping via re-export
- Updated CHAR_SPRITE_W from 24 to 32 in types.ts
- Added 41 new tests (23 atlas + 18 spriteSheet/spriteAtlas), all 283 suite tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LimeZu atlas registry and character frame mapping** - `b8b60a4` (feat)
2. **Task 2: Update spriteSheet.ts multi-sheet loader and spriteAtlas.ts re-exports** - `7cf6f36` (feat)

## Files Created/Modified
- `src/engine/limeZuAtlas.ts` - Multi-sheet atlas registry: SHEET_PATHS, LIMEZU_ATLAS, SheetFrame type, sf() helper
- `src/engine/limeZuCharFrames.ts` - Character frame mapping: LIMEZU_CHARACTER_FRAMES, CHAR_SHEET_PATHS
- `src/engine/types.ts` - Updated CHAR_SPRITE_W from 24 to 32
- `src/engine/spriteSheet.ts` - Multi-sheet loader with getEnvironmentSheetById()
- `src/engine/spriteAtlas.ts` - CHARACTER_FRAMES re-exported from LimeZu mapping, deprecated old atlases
- `src/engine/__tests__/limeZuAtlas.test.ts` - 23 tests for atlas structure, coordinates, character frames
- `src/engine/__tests__/spriteAtlas.test.ts` - 6 tests for CHARACTER_FRAMES and CHARACTER_SHEET_NAMES
- `src/engine/__tests__/spriteSheet.test.ts` - Updated with getEnvironmentSheetById and CHARACTER_SHEET_NAMES tests

## Decisions Made
- Used row 0 idle preview (single frame per direction) for idle state rather than the full idle loop (row 1) -- simpler and sufficient for static idle
- Phone animation (row 6) mapped as work state for all directions, using down-facing frames mirrored to other directions since LimeZu only provides down-facing phone animation
- Talk state implemented as 2-frame animation combining idle preview + first idle-loop frame per direction
- Kept ENVIRONMENT_ATLAS and DECORATION_ATLAS as deprecated compat in spriteAtlas.ts since the renderer still references them until Plan 02 migrates to LIMEZU_ATLAS
- Added `table-conference` alias in LIMEZU_ATLAS alongside `conf-table` for consistency with test expectations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added table-conference alias key**
- **Found during:** Task 1 (atlas test verification)
- **Issue:** Test expected `table-conference` key but atlas used `conf-table`
- **Fix:** Added `table-conference` as alias pointing to same SheetFrame as `conf-table`
- **Files modified:** src/engine/limeZuAtlas.ts
- **Verification:** All 23 atlas tests pass
- **Committed in:** b8b60a4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial naming fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All atlas data structures and multi-sheet loader ready for Plan 02 (renderer migration)
- Plan 02 can import LIMEZU_ATLAS + getEnvironmentSheetById() to replace legacy single-sheet rendering
- Plan 03 can update officeLayout.ts furniture/decoration keys to reference LIMEZU_ATLAS entries
- TypeScript compiles cleanly, all 283 tests green

---
*Phase: 14-limezu-art-integration*
*Completed: 2026-03-15*

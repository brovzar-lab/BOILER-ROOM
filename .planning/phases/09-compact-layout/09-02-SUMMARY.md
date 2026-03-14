---
phase: 09-compact-layout
plan: 02
subsystem: engine
tags: [characters, renderer, war-room, decorations, gathering, canvas]

requires:
  - phase: 09-compact-layout/01
    provides: "Centralized WAR_ROOM_SEATS, DECORATIONS, compact 31x28 tile map in officeLayout.ts"
provides:
  - "characters.ts consuming WAR_ROOM_SEATS from officeLayout.ts (no local definition)"
  - "War Room gathering bug fix with timeout and proper flag resets"
  - "BILLY walks to table head seat during War Room sessions"
  - "Data-driven renderDecorations() from DECORATIONS array"
  - "SPEED_RAMP_TILES adjusted to 4 for compact layout"
affects: [09-compact-layout, 10-renderer, 13-polish]

tech-stack:
  added: []
  patterns: ["Data-driven rendering from centralized coordinate arrays", "Gathering timeout for stuck-state prevention"]

key-files:
  created: []
  modified:
    - src/engine/characters.ts
    - src/engine/renderer.ts
    - src/engine/types.ts
    - src/engine/__tests__/warRoom.test.ts

key-decisions:
  - "GATHER_TIMEOUT_MS = 15s to prevent stuck isGathering state if agents can't reach seats"
  - "Reset isGathering + hasDispersed flags BEFORE calling gatherAgentsToWarRoom on re-entry"
  - "SPEED_RAMP_TILES reduced from 8 to 4 for compact layout's shorter paths"

patterns-established:
  - "characters.ts re-exports WAR_ROOM_SEATS from officeLayout.ts for backward compatibility"
  - "renderDecorations() uses DECORATION_ATLAS-first fallback to ENVIRONMENT_ATLAS pattern"

requirements-completed: [LAYOUT-03, LAYOUT-05]

duration: 3min
completed: 2026-03-14
---

# Phase 9 Plan 02: Characters & Renderer Layout Adaptation Summary

**WAR_ROOM_SEATS imported from officeLayout, gathering bug fixed with 15s timeout, BILLY walks to table head, renderDecorations data-driven from DECORATIONS array**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T04:50:57Z
- **Completed:** 2026-03-14T04:53:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Removed hardcoded WAR_ROOM_SEATS from characters.ts, now imported from officeLayout.ts with re-export for backward compatibility
- Fixed War Room gathering bug: reset flags on re-entry, added 15s timeout to prevent stuck state, BILLY now walks to his seat
- Replaced 11 hardcoded decoration calls in renderer.ts with data-driven loop over DECORATIONS array
- Adjusted SPEED_RAMP_TILES from 8 to 4 for compact layout's shorter walking paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Update characters.ts -- centralize WAR_ROOM_SEATS, fix gathering bug, adjust speed ramp** - `d724746` (feat)
2. **Task 2: Update renderer.ts -- data-driven decorations from DECORATIONS array** - `25b3549` (feat)

## Files Created/Modified
- `src/engine/characters.ts` - WAR_ROOM_SEATS imported from officeLayout, gathering bug fix, BILLY seat walking, re-export
- `src/engine/renderer.ts` - renderDecorations() data-driven from DECORATIONS array, zero hardcoded coordinates
- `src/engine/types.ts` - SPEED_RAMP_TILES reduced from 8 to 4
- `src/engine/__tests__/warRoom.test.ts` - War Room entry test mock updated with WAR_ROOM_SEATS

## Decisions Made
- 15s gathering timeout prevents infinite polling if agents can't pathfind to seats
- Reset isGathering and hasDispersed flags BEFORE calling gatherAgentsToWarRoom to guarantee re-entry triggers fresh gathering
- SPEED_RAMP_TILES = 4 balances fast-walk for cross-office traversals (typically 5-8 tiles) in the compact layout

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated warRoom.test.ts mock to include WAR_ROOM_SEATS**
- **Found during:** Task 1
- **Issue:** War Room entry test mocked officeLayout without WAR_ROOM_SEATS, causing "No export defined on mock" error when gatherAgentsToWarRoom tried to access it
- **Fix:** Added WAR_ROOM_SEATS to the officeLayout mock in the "updateAllCharacters - War Room entry" describe block
- **Files modified:** src/engine/__tests__/warRoom.test.ts
- **Verification:** All 37 war room + character tests pass
- **Committed in:** d724746 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test mock fix necessary for correctness after WAR_ROOM_SEATS import source changed. No scope creep.

## Issues Encountered
None beyond the test mock fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- characters.ts and renderer.ts now consume all coordinate data from officeLayout.ts
- All 109 engine tests pass, TypeScript compiles cleanly
- Remaining: Plan 09-03 (camera/input adaptation for compact layout)

---
*Phase: 09-compact-layout*
*Completed: 2026-03-14*

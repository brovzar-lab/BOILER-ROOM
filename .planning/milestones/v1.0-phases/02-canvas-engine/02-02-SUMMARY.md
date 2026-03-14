---
phase: 02-canvas-engine
plan: 02
subsystem: engine
tags: [canvas-2d, character-state-machine, bfs-pathfinding, click-navigation, animation, zustand, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-canvas-engine
    plan: 01
    provides: Engine types, tile map with BFS, officeLayout with rooms, camera, renderer, game loop, officeStore
provides:
  - Character state machine (walk/work/idle) with smooth tile interpolation
  - BFS-based click-to-walk room navigation via canvas input handlers
  - Speed ramping for long-distance walks (64px/s base, 128px/s fast)
  - Knock pause animation on room arrival with agent facing behavior
  - Camera follow integration tracking BILLY in zoom level 2
  - Zoom toggle between overview (1) and follow (2) via keyboard/double-click
  - Furniture data system with 25 items across all rooms and hallways
  - Office layout tests covering furniture placement and room integrity
affects: [02-03-react-integration, 03-agent-panel, 04-war-room, 08-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [character-state-machine, tdd-red-green, module-level-knock-timer, hover-tracking-for-renderer]

key-files:
  created:
    - src/engine/characters.ts
    - src/engine/input.ts
    - src/engine/__tests__/characters.test.ts
    - src/engine/__tests__/officeLayout.test.ts
  modified:
    - src/engine/gameLoop.ts
    - src/engine/officeLayout.ts

key-decisions:
  - "Knock timer stored in module-level Map per character ID -- avoids adding extra fields to Character interface"
  - "Camera follows BILLY only in zoom >= 2 (follow mode) -- overview mode centers on map origin"
  - "Hallway clicks ignored per user decision -- BILLY only walks to rooms, not arbitrary hallway tiles"
  - "FurnitureItem interface with roomId key -- enables per-room filtering and hallway decorations in same array"

patterns-established:
  - "Character state machine: switch on ch.state (walk/work/idle) with frame cycling and tile interpolation"
  - "TDD flow: write failing tests first (RED), implement to pass (GREEN), commit each phase"
  - "Module mocking with vi.doMock + dynamic import for store-dependent functions"
  - "Hover tracking via module-level variables read by renderer (no store writes per mousemove)"

requirements-completed: [NAV-01, NAV-02, NAV-04]

# Metrics
duration: 6min
completed: 2026-03-13
---

# Phase 02 Plan 02: Character Movement & Input Summary

**Character state machine with BFS walk-to-room navigation, speed ramping, knock animation, agent facing, and furniture data for all 7 rooms**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T01:13:25Z
- **Completed:** 2026-03-13T01:19:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete character state machine handling walk/work/idle transitions with smooth tile-to-tile interpolation
- Click-to-walk room navigation: canvas click resolves to room, triggers BILLY's BFS pathfinding walk
- Speed ramps from 64px/s to 128px/s for paths longer than 8 tiles
- Knock pause (0.5s idle) when BILLY arrives at an agent's room, with agent facing reaction
- Camera follows BILLY during walks in zoom level 2, centers on map in zoom level 1
- Zoom toggle between overview and follow via keyboard 'z' or double-click
- Furniture data system with 25 items: desks, chairs, tables, bookshelves, plants, water-cooler, artwork
- 35 new tests (28 character + 7 office layout) -- all 73 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Character state machine with movement, animation, and walk-to-room logic (TDD)** - `7b6376a` (test: RED), `7539a24` (feat: GREEN)
2. **Task 2: Canvas click input handling, room navigation, and game loop integration** - `d46240b` (feat)

_Note: Task 1 used TDD flow with separate RED (failing tests) and GREEN (implementation) commits._

## Files Created/Modified
- `src/engine/characters.ts` - Character state machine: updateCharacter, updateAllCharacters, startWalk, getCharacterDirection
- `src/engine/input.ts` - Canvas click handler, zoom toggle, hover tracking
- `src/engine/gameLoop.ts` - Integrated updateAllCharacters and camera follow for BILLY
- `src/engine/officeLayout.ts` - Added FurnitureItem interface and FURNITURE array with 25 items
- `src/engine/__tests__/characters.test.ts` - 28 tests covering walk/work/idle states, direction, speed ramp, knock, agent facing
- `src/engine/__tests__/officeLayout.test.ts` - 7 tests for furniture placement, room integrity, unique IDs

## Decisions Made
- Knock timer stored as module-level Map keyed by character ID -- keeps Character interface clean, allows independent timers per character
- Camera follows BILLY only at zoom >= 2 -- overview mode (zoom 1) centers the map with no follow
- Hallway clicks are silently ignored -- BILLY only navigates to rooms per user decision from CONTEXT.md
- FurnitureItem uses roomId string (including 'hallway') -- single flat array for all furniture, filterable by room

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Characters module complete: walk, idle, work states with animation frame cycling
- Input handling ready: click-to-walk, zoom toggle, hover tracking
- Game loop integrated: characters update before render, camera follows BILLY
- Furniture data exported for renderer to draw (Phase 8 will replace colored rectangles with sprites)
- Plan 03 (React Canvas integration) can mount OfficeCanvas component with full engine functionality

## Self-Check: PASSED

All 6 created/modified files verified on disk. All 3 task commits (7b6376a, 7539a24, d46240b) found in git log. 73 tests pass. TypeScript compiles clean.

---
*Phase: 02-canvas-engine*
*Completed: 2026-03-13*

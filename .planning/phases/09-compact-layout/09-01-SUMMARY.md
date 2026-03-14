---
phase: 09-compact-layout
plan: 01
subsystem: engine
tags: [tilemap, layout, pathfinding, canvas, game-engine]

requires:
  - phase: v1.0
    provides: "Existing officeLayout.ts, tileMap.ts BFS pathfinding, Room/FurnitureItem types"
provides:
  - "Compact 31x28 tile map replacing 42x34 hub-and-spoke layout"
  - "WAR_ROOM_SEATS centralized in officeLayout.ts with 6 seats (billy + 5 agents)"
  - "DECORATIONS array centralizing personality decoration positions"
  - "DecorationItem interface for typed decoration data"
  - "Comprehensive layout invariant test suite (BFS connectivity, tile type validation)"
affects: [09-compact-layout, 10-renderer, 11-sprites, 13-polish]

tech-stack:
  added: []
  patterns: ["Centralized coordinate data in officeLayout.ts", "Invariant-based layout testing"]

key-files:
  created: []
  modified:
    - src/engine/officeLayout.ts
    - src/engine/__tests__/officeLayout.test.ts
    - src/engine/__tests__/warRoom.test.ts
    - src/engine/__tests__/tileMap.test.ts

key-decisions:
  - "31x28 grid dimensions (adjusted from target ~28x24 to fit 4 bottom offices + corridors)"
  - "Bottom row order: Diana, Marcos, Roberto, Valentina (workflow adjacency: CFO-Counsel-Security-Ops)"
  - "War Room 12x8 exterior with 4x2 conference table centered in interior"
  - "2-row VOID headroom only above top rooms; corridors serve as visual headroom for center/bottom rooms"
  - "Vertical corridors at cols 8-9 and 22-23 flanking War Room for north-south connectivity"

patterns-established:
  - "All coordinate data centralized in officeLayout.ts (no hardcoded positions in other files)"
  - "WAR_ROOM_SEATS includes billy seat (6 total, not just 5 agents)"
  - "DECORATIONS array with roomId/key/col/row for renderer to consume data-driven"
  - "Layout tests validate invariants (tile types, BFS connectivity) not specific coordinates"

requirements-completed: [LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04]

duration: 7min
completed: 2026-03-14
---

# Phase 9 Plan 01: Compact Layout Summary

**Compact 31x28 tile map with 2-top/center-war-room/4-bottom grid, centralized WAR_ROOM_SEATS and DECORATIONS data, BFS-validated connectivity**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-14T04:41:06Z
- **Completed:** 2026-03-14T04:48:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Rewrote officeLayout.ts from 42x34 hub-and-spoke to compact 31x28 grid with correct room arrangement
- Centralized WAR_ROOM_SEATS (6 seats including billy) and DECORATIONS array, eliminating hardcoded coordinates in characters.ts and renderer.ts
- Expanded test suite from 7 to 25 layout tests with BFS connectivity validation between all 21 room pairs
- Updated warRoom.test.ts to derive War Room bounds from ROOMS/FURNITURE data instead of hardcoded coordinates

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite officeLayout.ts with compact grid data** - `ad77434` (feat)
2. **Task 2: Update and expand layout tests with invariant validation** - `5f659e5` (test)

## Files Created/Modified
- `src/engine/officeLayout.ts` - Compact 31x28 tile map, 7 room definitions, furniture, WAR_ROOM_SEATS (6 seats), DECORATIONS (13 items), DecorationItem interface
- `src/engine/__tests__/officeLayout.test.ts` - 25 tests: furniture, layout, grid invariants, WAR_ROOM_SEATS, DECORATIONS validation
- `src/engine/__tests__/warRoom.test.ts` - WAR_ROOM_SEATS tests now import from officeLayout, bounds derived from ROOMS/FURNITURE
- `src/engine/__tests__/tileMap.test.ts` - Hallway tile assertion updated to new corridor coordinates

## Decisions Made
- Grid dimensions 31x28 (slightly larger than ~28x24 target to fit 4 bottom offices with vertical corridors)
- Bottom row agent order: Diana (CFO) > Marcos (Counsel) > Roberto (Security) > Valentina (Ops) based on workflow adjacency
- War Room gets dual doors (north and south) for natural corridor connectivity, primary doorTile is north
- 2-row VOID headroom applied to top rooms only; corridors above War Room and bottom rooms provide equivalent visual space for future 3/4 wall rendering
- Conference table 4x2 tiles with BILLY at head (north), 2 agents each side, Valentina at south end

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Layout data finalized: all downstream phases (renderer, sprites, zoom) can build on these coordinates
- WAR_ROOM_SEATS and DECORATIONS centralized: characters.ts and renderer.ts still reference old data (to be updated in plans 09-02 and 09-03)
- All 109 engine tests pass, TypeScript compiles cleanly

---
*Phase: 09-compact-layout*
*Completed: 2026-03-14*

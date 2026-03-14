---
phase: 02-canvas-engine
plan: 01
subsystem: engine
tags: [canvas-2d, tile-map, bfs-pathfinding, game-loop, requestAnimationFrame, pixel-art, camera, zustand, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Zustand stores, TypeScript config, Vite build, app shell
provides:
  - Engine type system (TileType, Direction, CharacterState, Room, Camera, Character, SpriteFrame)
  - 42x34 tile map with 7-room hub-and-spoke office layout
  - BFS pathfinding on 4-connected grid with full room connectivity
  - Layered Canvas 2D renderer with viewport culling and placeholder colors
  - Camera system with integer zoom (overview + follow) and smooth lerp
  - Sprite sheet loading/caching infrastructure ready for Phase 8 assets
  - requestAnimationFrame game loop with delta time capping
  - Expanded officeStore with rooms, BILLY position, characters, zoom level
  - Vitest test infrastructure with jsdom + canvas mock
affects: [02-02-characters, 02-03-react-integration, 03-agent-panel, 08-polish]

# Tech tracking
tech-stack:
  added: [vitest, vitest-canvas-mock, "@vitest/coverage-v8", jsdom]
  patterns: [three-world-architecture, non-reactive-getState, layered-render-pipeline, integer-zoom, viewport-culling]

key-files:
  created:
    - src/engine/types.ts
    - src/engine/tileMap.ts
    - src/engine/officeLayout.ts
    - src/engine/renderer.ts
    - src/engine/camera.ts
    - src/engine/spriteSheet.ts
    - src/engine/gameLoop.ts
    - src/engine/__tests__/tileMap.test.ts
    - src/engine/__tests__/gameLoop.test.ts
    - src/engine/__tests__/renderer.test.ts
    - vitest.config.ts
  modified:
    - src/store/officeStore.ts
    - package.json

key-decisions:
  - "16x16 tiles at 2x zoom displaying as 32x32 -- matches pixel-agents reference"
  - "Hub-and-spoke layout: 42x34 tile grid with hallways connecting all 7 rooms"
  - "Placeholder colored rectangles for Phase 2 instead of sprite sheets"
  - "Camera offsets via integer math (no ctx.translate) for pixel-perfect rendering"
  - "Game loop reads officeStore via getState() non-reactively to avoid React re-renders"

patterns-established:
  - "Three-world architecture: Canvas engine (pure TS) / React DOM / Zustand bridge"
  - "Layered render pipeline: clear -> tiles -> furniture -> characters -> UI overlays"
  - "Viewport culling: only iterate visible tiles based on camera offset and canvas dimensions"
  - "Integer zoom enforcement: Math.round on zoom level, Math.floor/round on all pixel positions"
  - "Delta time capping: Math.min(dt, 0.1) prevents animation jumps on tab switch"

requirements-completed: [ENGN-01, ENGN-02, ENGN-04, ENGN-05, ENGN-06]

# Metrics
duration: 6min
completed: 2026-03-12
---

# Phase 02 Plan 01: Canvas Engine Core Summary

**Canvas 2D engine with 42x34 tile map, BFS pathfinding across 7 rooms, layered renderer with viewport culling, integer-zoom camera, and requestAnimationFrame game loop**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T01:03:18Z
- **Completed:** 2026-03-13T01:09:30Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Complete engine type system defining TileType, Room, Character, Camera, and all constants
- 42x34 hub-and-spoke office floor plan with 7 rooms fully connected via BFS pathfinding
- Layered Canvas 2D renderer with viewport culling, placeholder colors, and pixel-perfect integer math
- Camera system with zoom levels 1 (overview) and 2 (follow) with smooth lerp
- requestAnimationFrame game loop with delta time capping and HiDPI resize detection
- Expanded officeStore with rooms, BILLY position, characters, zoom, and camera state
- 38 passing unit tests covering tile map, pathfinding, renderer, and game loop

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vitest, create engine types, tile map with BFS, and office layout** - `18e852e` (feat)
2. **Task 2: Build renderer, camera, sprite sheet system, game loop, and expand officeStore** - `2dd81d2` (feat)

## Files Created/Modified
- `vitest.config.ts` - Test config with jsdom, canvas mock, path aliases
- `src/engine/types.ts` - All engine type definitions and constants (TileType, TILE_SIZE=16, WALK_SPEED, etc.)
- `src/engine/tileMap.ts` - Pure functions: createTileMap, getTileAt, isWalkable, findPath (BFS)
- `src/engine/officeLayout.ts` - 42x34 tile map with 7 rooms, ROOMS array, getRoomAtTile lookup
- `src/engine/camera.ts` - createCamera, updateCamera (lerp), screenToTile, tileToScreen
- `src/engine/spriteSheet.ts` - loadSpriteSheet, getCachedSprite, clearSpriteCache, PLACEHOLDER_COLORS
- `src/engine/renderer.ts` - renderFrame with 5-layer pipeline, viewport culling, character Y-sorting
- `src/engine/gameLoop.ts` - startGameLoop with requestAnimationFrame, delta time cap, resize detection
- `src/store/officeStore.ts` - Expanded with rooms, billyTileCol/Row, camera, characters, zoomLevel, actions
- `src/engine/__tests__/tileMap.test.ts` - 26 tests for tile operations, pathfinding, layout integrity
- `src/engine/__tests__/gameLoop.test.ts` - 4 tests for loop lifecycle and delta time capping
- `src/engine/__tests__/renderer.test.ts` - 8 tests for rendering, culling, zoom behavior

## Decisions Made
- Used 16x16 tiles (matching pixel-agents reference) displayed at 2x zoom as 32x32 -- satisfies the "~32x32 tiles" user requirement while keeping native data compact
- Built 42x34 tile grid with 2-tile-wide hallways -- provides 4-6 second walks between distant rooms at base walk speed
- Placeholder colored rectangles instead of sprites for Phase 2 -- PLACEHOLDER_COLORS map uses project warm/cool palette, spriteSheet module provides caching infrastructure for Phase 8
- Camera uses offset math with integer rounding instead of ctx.translate -- avoids floating-point drift and maintains pixel-perfect alignment
- officeStore.camera exposed as a mutable object read by game loop via getState() -- allows engine to update camera position each frame without triggering React re-renders

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing jsdom dependency**
- **Found during:** Task 1 (vitest setup)
- **Issue:** vitest requires jsdom package for test.environment: 'jsdom' but jsdom was not listed as a dependency
- **Fix:** Ran `npm install -D jsdom` to add it alongside vitest
- **Files modified:** package.json, package-lock.json
- **Verification:** All 26 tileMap tests pass after installation
- **Committed in:** 18e852e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard missing dependency, no scope change.

## Issues Encountered
None beyond the jsdom dependency (handled as deviation above).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine core modules complete: types, tileMap, officeLayout, renderer, camera, spriteSheet, gameLoop
- officeStore expanded and ready for character movement (Plan 02)
- Test infrastructure installed -- subsequent plans can add tests immediately
- React integration (OfficeCanvas component) deferred to Plan 03

## Self-Check: PASSED

All 12 created files verified on disk. Both task commits (18e852e, 2dd81d2) found in git log. 38 tests pass. TypeScript compiles clean.

---
*Phase: 02-canvas-engine*
*Completed: 2026-03-12*

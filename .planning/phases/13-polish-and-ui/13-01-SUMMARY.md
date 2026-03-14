---
phase: 13-polish-and-ui
plan: 01
subsystem: ui
tags: [canvas, glow, radial-gradient, day-night, time-of-day, room-labels]

# Dependency graph
requires:
  - phase: 12-smooth-zoom
    provides: "Zoom controller, camera follow, ZOOM_OVERVIEW_THRESHOLD"
  - phase: 11-sprite-gen
    provides: "24x32 character sprites, environment atlas, FURNITURE/DECORATIONS data"
provides:
  - "Ambient glow effects module (glowEffects.ts) with monitor blue halos and lamp amber circles"
  - "Day/night theming system (timeOfDay.ts) with system-clock-based factor and floor tint"
  - "All-room label rendering at zoom >= 1.5x with Name -- Title format"
  - "Renderer Layer 4.5 glow pass and Layer 2b floor tint in pipeline"
  - "Game loop elapsed time tracking for glow pulse animation"
affects: [13-polish-and-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Canvas 2D radial gradients with lighter composite for additive glow", "Time-cached system clock reads for per-frame ambient"]

key-files:
  created:
    - src/engine/glowEffects.ts
    - src/engine/timeOfDay.ts
  modified:
    - src/engine/renderer.ts
    - src/engine/gameLoop.ts
    - src/engine/__tests__/renderer.test.ts

key-decisions:
  - "Glow sources auto-built from FURNITURE data rather than hardcoded positions"
  - "computeTimeOfDay cached for 10 seconds to avoid per-frame Date construction"
  - "Room labels zoom-gated (>= 1.5x) for all rooms, no longer tied to activeRoomId"
  - "elapsedTime parameter added with default=0 for backward compatibility"

patterns-established:
  - "Additive glow: ctx.globalCompositeOperation='lighter' with radial gradients"
  - "Time-of-day caching: expensive reads cached with timestamp threshold"

requirements-completed: [ENV-03, ENV-04, UI-05]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 13 Plan 01: Ambient Glow and Day/Night Summary

**Canvas ambient glow effects (blue monitor halos, amber desk lamps) with system-clock day/night theming and all-room label rendering**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T19:57:16Z
- **Completed:** 2026-03-14T20:02:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Monitor glow (blue) and desk lamp glow (amber) for every office, with War Room conference-table-only glow
- Day/night floor tint system with gradual dawn/dusk transitions based on system clock
- All 7 room labels render at zoom >= 1.5x with "Patrik -- CFO" format

## Task Commits

Each task was committed atomically:

1. **Task 1: Create glow effects module + day/night system** - `2899010` (feat)
2. **Task 2: Integrate glow/day-night into render pipeline + all-room labels** - `pending` (feat)

## Files Created/Modified
- `src/engine/glowEffects.ts` - GlowSource interface, GLOW_SOURCES auto-built from FURNITURE, renderGlowEffects with additive radial gradients
- `src/engine/timeOfDay.ts` - computeTimeOfDay (0-1 factor, 10s cache), applyFloorTint (amber day / blue-black night)
- `src/engine/renderer.ts` - Layer 2b floor tint, Layer 4.5 glow effects, all-room labels at zoom >= 1.5x with Name -- Title format
- `src/engine/gameLoop.ts` - elapsedSeconds tracking passed to renderFrame
- `src/engine/__tests__/renderer.test.ts` - Added createRadialGradient mock, updated label test for zoom-gated behavior

## Decisions Made
- Glow sources auto-built from FURNITURE data rather than hardcoded positions for maintainability
- computeTimeOfDay cached for 10 seconds to avoid per-frame Date construction per research anti-pattern
- Room labels changed from activeRoomId-gated to zoom-gated (>= 1.5x) for all rooms simultaneously
- elapsedTime parameter given default value of 0 for backward compatibility with existing callers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mock missing createRadialGradient**
- **Found during:** Task 2
- **Issue:** Existing renderer test mock did not include createRadialGradient, globalCompositeOperation, or globalAlpha
- **Fix:** Added missing mock methods/properties to createMockCtx()
- **Files modified:** src/engine/__tests__/renderer.test.ts
- **Verification:** All 250 tests pass

**2. [Rule 1 - Bug] Updated label test for new zoom-gated behavior**
- **Found during:** Task 2
- **Issue:** Test "does not render room label when activeRoomId is null" expected no labels at zoom=2, but labels are now zoom-gated not activeRoomId-gated
- **Fix:** Changed test to verify labels DO render at zoom >= 1.5 regardless of activeRoomId
- **Files modified:** src/engine/__tests__/renderer.test.ts
- **Verification:** All 250 tests pass

---

**Total deviations:** 2 auto-fixed (2 bugs in test infrastructure)
**Impact on plan:** Both fixes necessary for test correctness after behavior change. No scope creep.

## Issues Encountered
None beyond the test mock updates documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Glow and day/night systems ready; future plans can add more glow sources or adjust intensity curves
- Room labels pattern established for any future label content changes
- elapsedTime available in renderer for future animation needs (fan rotation, screen flicker in v2)

---
*Phase: 13-polish-and-ui*
*Completed: 2026-03-14*

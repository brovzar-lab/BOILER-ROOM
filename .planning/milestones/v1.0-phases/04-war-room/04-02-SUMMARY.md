---
phase: 04-war-room
plan: 02
subsystem: engine
tags: [bfs-pathfinding, character-animation, keyboard-input, war-room, zustand]

# Dependency graph
requires:
  - phase: 02-canvas-engine
    provides: BFS pathfinding (startWalk, findPath), character state machine, officeLayout (ROOMS, tile map)
  - phase: 03-integration
    provides: Agent status bridge pattern (chatStore -> officeStore -> canvas), keyboard shortcuts
provides:
  - WAR_ROOM_SEATS constant with 5 agent positions around conference table
  - gatherAgentsToWarRoom() function with staggered BFS walks and Promise resolution
  - disperseAgentsToOffices() function for fire-and-forget return walks
  - War Room entry detection in updateAllCharacters (bypasses knock animation)
  - War Room departure detection with automatic agent dispersal
  - 'w' key shortcut for navigating BILLY to War Room
affects: [04-war-room, ui-components, chat-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level flags (isGathering, hasDispersed) for preventing re-triggering frame-by-frame"
    - "Promise-based polling pattern for multi-agent arrival detection"
    - "Staggered setTimeout for natural animation feel"

key-files:
  created:
    - src/engine/__tests__/warRoom.test.ts
  modified:
    - src/engine/characters.ts
    - src/engine/input.ts

key-decisions:
  - "Seat positions adjacent to conference table edges: Diana/Marcos above, Sasha left, Roberto right, Valentina below"
  - "Defensive agentStatuses access with nullish coalescing prevents crashes when officeStore mocks omit property"
  - "Gathering uses Promise with setInterval polling; dispersal is fire-and-forget (no Promise needed)"

patterns-established:
  - "War Room entry bypasses knock: room.id === 'war-room' branch before generic agent room knock"
  - "Departure detection via targetRoomId != war-room while activeRoomId === war-room with hasDispersed flag"

requirements-completed: [WAR-01]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 4 Plan 02: War Room Engine Summary

**BFS-based agent gathering/dispersal with staggered walks, War Room entry detection bypassing knock, and 'w' key navigation shortcut**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T04:18:12Z
- **Completed:** 2026-03-13T04:23:11Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- WAR_ROOM_SEATS places 5 agents around the 5x3 conference table on walkable floor tiles
- gatherAgentsToWarRoom walks all 5 agents with staggered 500-1000ms timing, returns Promise that resolves when all agents reach their seats (position-checked, not just idle)
- disperseAgentsToOffices sends agents back to their office seatTile with slightly faster staggered timing
- updateAllCharacters detects War Room entry and bypasses knock animation, directly calling setActiveRoom and gatherAgentsToWarRoom
- Leaving War Room (targetRoomId changes away) triggers automatic dispersal with re-trigger prevention
- 'w' key shortcut navigates BILLY to War Room billyStandTile, placed before 'z' zoom handler

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for War Room engine** - `2a8558d` (test)
2. **Task 1 (GREEN): War Room gathering, dispersal, entry detection, 'w' key** - `86d54a6` (feat)

## Files Created/Modified
- `src/engine/__tests__/warRoom.test.ts` - 9 tests covering WAR_ROOM_SEATS positions, gathering stagger timing, gathering Promise resolution, dispersal, War Room entry detection, 'w' key shortcut
- `src/engine/characters.ts` - Added WAR_ROOM_SEATS, gatherAgentsToWarRoom, disperseAgentsToOffices, War Room entry/exit detection in updateAllCharacters
- `src/engine/input.ts` - Added 'w'/'W' key handler before zoom handler for War Room navigation

## Decisions Made
- Seat positions placed immediately adjacent to table edges (row 13 above, row 17 below, col 17 left, col 23 right) -- all verified within War Room interior bounds (17-24, 12-19) and not on table tiles (18-22, 14-16)
- Used defensive `state.agentStatuses ?? {}` to prevent crashes when existing test mocks don't include agentStatuses property
- Gathering uses `setInterval(100ms)` polling with position-match check (not just idle state) per Research Pitfall 2
- Dispersal is fire-and-forget with no Promise -- agents walk back in background while UI transitions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Defensive agentStatuses access**
- **Found during:** Task 1 (GREEN phase -- full test suite regression check)
- **Issue:** Existing `characters.test.ts` mocks for updateAllCharacters don't include `agentStatuses` in the mocked store state, causing `TypeError: Cannot read properties of undefined` when the new agent status animation code ran
- **Fix:** Changed `const { agentStatuses } = state` to `const agentStatuses = state.agentStatuses ?? {}` for null-safe access
- **Files modified:** src/engine/characters.ts
- **Verification:** All 37 existing character tests pass, all 9 new War Room tests pass
- **Committed in:** `86d54a6` (part of GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for backward compatibility with existing tests. No scope creep.

## Issues Encountered
- Pre-existing test failures in `src/services/__tests__/retryBackoff.test.ts` and `src/services/__tests__/warRoomSummary.test.ts` (from 04-01 Wave 0 stubs referencing unimplemented files) -- not related to this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine-level War Room orchestration complete
- Ready for UI layer (WarRoomPanel component, chatStore multi-stream state) in subsequent plans
- gatherAgentsToWarRoom Promise can be used by UI to lock/unlock chat input

## Self-Check: PASSED

- All 3 source files exist (warRoom.test.ts, characters.ts, input.ts)
- Both commits verified (2a8558d RED, 86d54a6 GREEN)
- All exports confirmed (WAR_ROOM_SEATS, gatherAgentsToWarRoom, disperseAgentsToOffices, war-room key)

---
*Phase: 04-war-room*
*Completed: 2026-03-13*

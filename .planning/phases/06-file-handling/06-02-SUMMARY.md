---
phase: 06-file-handling
plan: 02
subsystem: files
tags: [context-injection, drag-and-drop, canvas-rendering, file-icons, system-prompt]

requires:
  - phase: 06-file-handling
    provides: FileRecord type, fileStore with CRUD actions, PDF/DOCX extraction
  - phase: 02-canvas-engine
    provides: renderer pipeline, input handlers, camera/tile coordinate system
  - phase: 05-deal-rooms
    provides: dealStore with activeDealId for deal-scoped file filtering
provides:
  - buildContext Layer 4 file injection with per-file and total token caps
  - Canvas drag-and-drop file upload routing to agent rooms
  - File icon rendering on agent desks with PDF/DOCX visual distinction
  - Drop zone highlight on desk area with invalid-drop tooltip
  - File icon click detection via onFileClickCallback
  - hoveredFileId for file hover state
affects: [06-03 file viewer UI, 07 memory extraction]

tech-stack:
  added: []
  patterns: [context layer injection from Zustand store, canvas drag event routing, deterministic scatter placement]

key-files:
  created:
    - src/services/context/__tests__/builder.test.ts
  modified:
    - src/services/context/builder.ts
    - src/engine/input.ts
    - src/engine/renderer.ts
    - src/engine/__tests__/renderer.test.ts

key-decisions:
  - "File icons placed on desk area (1 row above seatTile, 2 tiles wide) matching furniture placement"
  - "Desk-area-only drop zone highlight uses amber dashed border per user decision (not full room)"
  - "invalidDropMessage tooltip renders near cursor CSS coordinates for immediate feedback"
  - "File click detection integrated into existing handleClick via onFileClickCallback pattern"
  - "Per-file cap 2000 tokens (8000 chars), total cap 8000 tokens for context budget"

patterns-established:
  - "Context layer injection: read Zustand store via getState() inside buildContext, filter by agentId + dealId"
  - "Canvas drag-and-drop: dragover/drop/dragleave handlers with module-level state exports for renderer"
  - "Deterministic scatter: seeded offset from file index for reproducible messy desk placement"

requirements-completed: [FILE-03, FILE-04]

duration: 6min
completed: 2026-03-13
---

# Phase 6 Plan 02: Context Injection + Canvas Interaction Summary

**buildContext Layer 4 file injection with token caps, canvas drag-and-drop to agent desks, and file icon rendering with PDF/DOCX distinction**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T17:15:24Z
- **Completed:** 2026-03-13T17:21:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- buildContext injects uploaded documents as Layer 4 between deal context and memory placeholder
- Per-file truncation at ~2000 tokens and total file block capped at ~8000 tokens
- Canvas drag-and-drop routes PDF/DOCX files to correct agent room, rejects war-room/billy/hallway
- File icons render on agent desks with red (PDF) and blue (DOCX) header bars, folded corners, text lines
- Up to 5 icons per desk with "+N" overflow badge and hover tooltip showing filename
- Drop zone highlights desk area only (amber dashed border) per user decision
- Invalid drop areas show "Drop files on an agent's desk" tooltip near cursor
- onFileClickCallback exported for Plan 03 React FileViewer integration
- 26 total tests passing (7 builder + 19 renderer)

## Task Commits

Each task was committed atomically:

1. **Task 1: buildContext Layer 4 + canvas drag-and-drop** - `166a662` (test RED) -> `8e4336a` (feat GREEN)
2. **Task 2: File icon rendering + drop zone highlight** - `9b3a2dd` (feat)

_TDD task 1 has RED (failing test) and GREEN (implementation) commits_

## Files Created/Modified
- `src/services/context/builder.ts` - Layer 4 file injection between deal context and memory
- `src/services/context/__tests__/builder.test.ts` - 7 tests for file injection, truncation, caps, scoping
- `src/engine/input.ts` - Drag-and-drop handlers, file click detection, exported drag state
- `src/engine/renderer.ts` - File icon rendering, drop zone highlight, hover tooltip, invalid drop tooltip
- `src/engine/__tests__/renderer.test.ts` - 19 tests including drop zone and file icon coverage

## Decisions Made
- File icons placed on desk area (1 row above seatTile, 2 tiles wide) matching existing furniture layout
- Desk-area-only highlight with amber dashed border (not full room) per user decision
- Per-file cap at 2000 tokens (8000 chars), total cap at 8000 tokens for context budget
- File click detection reuses existing handleClick with onFileClickCallback pattern for clean React integration
- Invalid drop tooltip positioned at cursor CSS coordinates for immediate spatial feedback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed activeDealId redeclaration in builder.ts**
- **Found during:** Task 1 (buildContext Layer 4 implementation)
- **Issue:** Layer 4 code declared `const activeDealId` but Layer 3 already destructured it from useDealStore.getState()
- **Fix:** Removed duplicate declaration, reused existing `activeDealId` variable from Layer 3
- **Files modified:** src/services/context/builder.ts
- **Verification:** All 7 builder tests pass
- **Committed in:** 8e4336a (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor variable scoping fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Layer 4 context injection ready for agents to "see" uploaded file content
- Canvas interaction ready for Plan 03 (React FileViewer via onFileClickCallback)
- File icons visible on desks; hover and click detection operational
- All 26 tests pass

---
*Phase: 06-file-handling*
*Completed: 2026-03-13*

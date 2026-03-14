---
phase: 04-war-room
plan: 01
subsystem: state-management
tags: [zustand, multi-stream, war-room, retry, backoff, cross-visibility]

# Dependency graph
requires:
  - phase: 03-integration
    provides: chatStore with single-stream state, agent personas, types
provides:
  - War Room multi-stream state (warRoomStreaming Record<AgentId, WarRoomAgentStream>)
  - War Room actions (start/update/complete/fail/cancel/setMode/save/reset)
  - Message.source field for war-room tagging
  - Cross-visibility summary builder (buildCrossVisibilityBlock)
  - Exponential backoff retry utility (retryWithBackoff)
affects: [04-war-room, useWarRoom hook, WarRoomPanel, context builder]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-stream-zustand-state, per-agent-abort-controller, cross-visibility-truncation, exponential-backoff-with-jitter]

key-files:
  created:
    - src/services/context/warRoomSummary.ts
    - src/services/anthropic/retryBackoff.ts
    - src/store/__tests__/chatStore.warRoom.test.ts
    - src/services/__tests__/retryBackoff.test.ts
    - src/services/__tests__/warRoomSummary.test.ts
  modified:
    - src/types/chat.ts
    - src/store/chatStore.ts

key-decisions:
  - "WarRoomAgentStream stored alongside existing StreamingState (additive, no modifications to single-stream)"
  - "createEmptyWarRoomStreaming() helper initializes all 5 agents to idle state"
  - "Cross-visibility uses simple truncation at 160 chars per agent (no LLM call, zero latency)"
  - "retryWithBackoff uses 2^attempt * baseDelay + random(0-500ms) jitter formula"

patterns-established:
  - "Multi-stream Zustand state: Record<AgentId, WarRoomAgentStream> with per-agent selectors"
  - "Per-agent AbortController pattern: each stream has its own controller, cancelAll aborts all"
  - "Cross-visibility truncation: ~160 chars per agent, ~200 tokens total for 4 agents"

requirements-completed: [WAR-03, WAR-04, WAR-06]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 4 Plan 01: War Room Multi-Stream State Summary

**Zustand chatStore expanded with 5-agent parallel streaming state, cross-visibility summary builder, and exponential backoff retry utility**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T04:17:59Z
- **Completed:** 2026-03-13T04:23:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- chatStore expanded with warRoomStreaming Record<AgentId, WarRoomAgentStream> tracking 5 independent streams
- All War Room actions implemented: start/update/complete/fail per agent, cancelAll aborts all controllers
- Message type extended with optional source field ('direct' | 'war-room') for badge rendering
- Cross-visibility summary builder truncates other agents' responses to ~160 chars each
- Retry backoff utility with configurable maxRetries, exponential delay, and jitter

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand types and chatStore with War Room multi-stream state**
   - `3c0d12f` (test: add failing tests for War Room multi-stream state)
   - `5035dfd` (feat: implement War Room multi-stream state in chatStore)
2. **Task 2: Create cross-visibility summary builder and retry backoff utility**
   - `07ca7b7` (test: add failing tests for retryBackoff and warRoomSummary)
   - `533e6da` (feat: add cross-visibility summary builder and retry backoff utility)

_TDD flow: each task has separate test and implementation commits_

## Files Created/Modified
- `src/types/chat.ts` - Added WarRoomAgentStream interface and Message.source field
- `src/store/chatStore.ts` - Added warRoomStreaming state, all War Room actions, createEmptyWarRoomStreaming helper
- `src/services/context/warRoomSummary.ts` - Cross-visibility summary builder excluding current agent
- `src/services/anthropic/retryBackoff.ts` - Exponential backoff retry with jitter and onRetry callback
- `src/store/__tests__/chatStore.warRoom.test.ts` - 11 tests for multi-stream state management
- `src/services/__tests__/retryBackoff.test.ts` - 4 tests for retry backoff behavior
- `src/services/__tests__/warRoomSummary.test.ts` - 5 tests for cross-visibility block generation

## Decisions Made
- WarRoomAgentStream sits alongside the existing single-stream `streaming` field (additive, no modifications to existing functionality)
- `createEmptyWarRoomStreaming()` initializes all 5 agents to idle state at store creation
- `cancelAllWarRoomStreams` iterates all agents and calls abort() on non-null controllers before resetting state
- `setWarRoomMode(true)` resets streaming state to prevent stale data from previous sessions
- Cross-visibility uses simple truncation (160 chars) per research recommendation -- zero latency, stays within ~200 token budget
- Retry backoff formula: `2^attempt * baseDelayMs + random(0-500ms)` provides ~1s, ~2s, ~4s delays with jitter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- chatStore data layer ready for Plan 03's useWarRoom hook to consume
- warRoomStreaming state provides per-agent selectors for WarRoomPanel components
- retryWithBackoff ready for use in parallel stream orchestration
- buildCrossVisibilityBlock ready for context builder injection on follow-up messages

## Self-Check: PASSED

All 8 files verified present. All 4 commits verified in git log. 102/102 tests passing.

---
*Phase: 04-war-room*
*Completed: 2026-03-13*

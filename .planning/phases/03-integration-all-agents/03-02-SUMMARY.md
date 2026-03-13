---
phase: 03-integration-all-agents
plan: 02
subsystem: integration
tags: [zustand-bridge, canvas-chat-integration, agent-status, keyboard-nav, speech-bubble, reactive-ui]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AgentId type, AgentStatus type, chatStore, useChat hook, ChatPanel component
  - phase: 02-canvas-engine
    provides: officeStore, characters.ts, renderer.ts, input.ts, gameLoop.ts, officeLayout rooms
  - phase: 03-integration-all-agents
    plan: 01
    provides: All 5 agent personas registered in agent registry
provides:
  - Per-agent status tracking (agentStatuses map) in officeStore
  - Agent-aware ChatPanel that switches based on activeRoomId
  - Keyboard shortcuts 1-5 for agent room navigation
  - Canvas speech bubble overlay for needs-attention agents
  - Canvas thinking dots overlay for streaming agents
  - Status-driven agent character animations (idle/work states)
affects: [03-03-overview-panel, 04-war-room, phase-8-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-bridge-pattern, split-component-pattern, status-overlay-rendering]

key-files:
  created: []
  modified:
    - src/store/officeStore.ts
    - src/components/chat/ChatPanel.tsx
    - src/hooks/useChat.ts
    - src/engine/input.ts
    - src/engine/characters.ts
    - src/engine/renderer.ts
    - src/engine/gameLoop.ts

key-decisions:
  - "ChatPanel split into outer (room-aware) + inner (AgentChatPanel) to ensure clean useChat initialization per agent via React key prop"
  - "Agent status flows: chatStore streaming -> officeStore agentStatuses -> characters.ts animation + renderer.ts overlays (Zustand bridge pattern)"
  - "Keyboard 1-5 mirrors click-to-walk logic with input focus guard for chat textarea safety"
  - "Speech bubble uses white rounded rect with red dot; thinking uses amber triple dots"

patterns-established:
  - "Split component pattern: outer reads store + decides what to render, inner receives stable props"
  - "Zustand bridge for canvas: chatStore state -> officeStore agentStatuses -> engine reads via getState()"
  - "Input focus guard: check activeElement tag before processing keyboard shortcuts"

requirements-completed: [AGNT-07, AGNT-08, NAV-03, NAV-05, NAV-06]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 3 Plan 02: Canvas-to-Chat Integration Summary

**Reactive chat panel switching via room navigation, per-agent status tracking with canvas speech bubbles and thinking dots, keyboard shortcuts 1-5**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T02:38:13Z
- **Completed:** 2026-03-13T02:42:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Connected canvas navigation to chat system -- walking to an agent's room switches the chat panel to that agent's conversation
- Per-agent status tracking (idle/thinking/needs-attention) syncs from chat streaming state to canvas overlays
- Canvas renders speech bubble with red dot above agents with unread responses, amber dots above thinking agents
- Keyboard shortcuts 1-5 navigate BILLY to agent rooms with input focus guard
- Agent characters switch to work animation during API streaming

## Task Commits

Each task was committed atomically:

1. **Task 1: Add agent status tracking to officeStore and wire chat panel switching** - `fe15b21` (feat)
2. **Task 2: Add keyboard navigation, status-driven animations, and speech bubble rendering** - `99a2075` (feat)

## Files Created/Modified
- `src/store/officeStore.ts` - Added agentStatuses map and setAgentStatus action
- `src/components/chat/ChatPanel.tsx` - Split into room-aware outer + AgentChatPanel inner with agent identity header
- `src/hooks/useChat.ts` - Added agent status transitions (thinking/idle/needs-attention) and officeStore integration
- `src/engine/input.ts` - Keyboard shortcuts 1-5 with input focus guard
- `src/engine/characters.ts` - Agent animation state driven by agentStatuses (work for thinking, idle otherwise)
- `src/engine/renderer.ts` - Speech bubble and thinking dots overlay rendering
- `src/engine/gameLoop.ts` - Passes agentStatuses to renderFrame

## Decisions Made
- Split ChatPanel into outer (room-aware router) + inner (AgentChatPanel) to avoid conditional hook calls and ensure clean useChat initialization via React key prop
- Agent status flows through the Zustand bridge: chatStore streaming events -> officeStore agentStatuses -> engine reads non-reactively via getState() -> canvas renders overlays
- Keyboard shortcuts mirror existing click-to-walk logic but guard against triggering while typing in chat input
- Speech bubble rendered as white rounded rect with red notification dot; thinking state rendered as three amber dots
- Removed duplicate loadConversations call in useChat (App.tsx already handles this on mount)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Canvas and chat are fully integrated -- navigating rooms switches agents
- Ready for Plan 03 (overview panel at BILLY's office with agent cards grid)
- agentStatuses exposed in officeStore for overview panel to display agent status
- PersonaConfig available from agent registry for overview card metadata

## Self-Check: PASSED

All 7 modified files verified present. Both task commits (fe15b21, 99a2075) verified in git log.

---
*Phase: 03-integration-all-agents*
*Completed: 2026-03-13*

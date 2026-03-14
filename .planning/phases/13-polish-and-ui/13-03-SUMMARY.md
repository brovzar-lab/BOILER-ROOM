---
phase: 13-polish-and-ui
plan: 03
subsystem: ui
tags: [chat-panel, deals-sidebar, token-counter, ui-redesign]
dependency_graph:
  requires: [13-00]
  provides: [always-visible-sidebar, inline-input-buttons, progress-bar-token-counter, per-agent-activity]
  affects: [App.tsx, ChatPanel.tsx, ChatInput.tsx, TokenCounter.tsx, DealSidebar.tsx, DealCard.tsx]
tech_stack:
  added: []
  patterns: [collapsible-sidebar-strip, inline-input-action-buttons, conditional-progress-bar, agent-color-theming]
key_files:
  created: []
  modified:
    - src/App.tsx
    - src/components/deal/DealSidebar.tsx
    - src/components/deal/DealCard.tsx
    - src/components/chat/ChatPanel.tsx
    - src/components/chat/ChatInput.tsx
    - src/components/chat/TokenCounter.tsx
decisions:
  - Sidebar manages own collapsed state internally (no parent prop)
  - Attach/Memory buttons rendered in input area row, not chat header
  - Token counter hidden below 60%, amber 60-80%, red above 80%
  - Agent name displayed in signature color with top border accent bar
metrics:
  duration: 5min
  completed: "2026-03-14"
---

# Phase 13 Plan 03: Chat Panel Redesign + Always-Visible Deals Sidebar Summary

Chat panel header redesigned with agent signature color accent bar and inline input-area Attach/Memory buttons; deals sidebar always visible with 40px collapsible strip, prominent active deal name, and per-agent message count activity display.

## What Was Done

### Task 1: Always-visible DealSidebar with collapsible strip and per-agent activity
**Commit:** `c5fd06a`

- Removed `isOpen`/`onClose` props from DealSidebar; sidebar manages own `collapsed` state via `useState(false)`
- Collapsed mode: 40px strip showing active deal name vertically with expand chevron
- Expanded mode: 240px sidebar with large bold active deal name at top, collapse chevron in corner
- Smooth `transition-all duration-200` between collapsed and expanded states
- DealCard updated to show per-agent message counts with colored initials (e.g., `P:3 S:1`) and "Last active: Xh ago" relative time
- App.tsx: removed `sidebarOpen` state; `<DealSidebar />` rendered without isOpen/onClose props

**Files:** `src/components/deal/DealSidebar.tsx`, `src/components/deal/DealCard.tsx`, `src/App.tsx`

### Task 2: Redesign chat panel header and move buttons to input area
**Commit:** `1302ba3`

- Chat header redesigned: thin `border-t-2` accent bar in agent signature color, agent name rendered in signature color, title in muted text below
- Attach (paperclip) and Memory (brain) buttons moved from header to input area as icon buttons
- File count pill badge on Attach button (small circular badge, only visible when fileCount > 0)
- Thinking state: typing indicator dots in message area + `animate-pulse` on agent color accent bar
- TokenCounter converted to hidden-by-default progress bar: invisible below 60%, amber fill 60-80%, red fill above 80%, smooth `transition-all` on width

**Files:** `src/components/chat/ChatPanel.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/chat/TokenCounter.tsx`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: passed (`npx tsc --noEmit`)
- Test suite: passed (`npx vitest run`)
- Visual: sidebar always visible, collapses to 40px strip
- Visual: chat header clean with accent bar, buttons in input area
- Visual: token counter hidden by default, appears as progress bar above 60%

## Decisions Made

1. **Sidebar self-manages collapsed state** -- no parent component involvement needed, simpler API
2. **Top border accent bar** chosen over left-edge bar for chat header -- spans full width, more modern look
3. **Token counter thresholds** -- hidden below 60%, amber 60-80%, red above 80% as specified
4. **Per-agent activity format** -- colored initial + count (e.g., P:3) compact enough for sidebar cards

## Self-Check: PASSED

- All 6 modified files exist on disk
- Commit `c5fd06a` (Task 1) verified in git log
- Commit `1302ba3` (Task 2) verified in git log

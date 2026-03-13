---
phase: 05-deal-rooms
plan: 01
subsystem: database, state-management
tags: [zustand, indexeddb, deal-scoping, crud, tdd, migration, context-builder]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "PersistenceAdapter, IndexedDB schema with deals store and dealId indexes"
  - phase: 03-integration
    provides: "buildContext layered system prompt, chatStore conversation management"
  - phase: 04-war-room
    provides: "War Room streaming state in chatStore, crossVisibilityBlock in buildContext"
provides:
  - "Deal type definitions (Deal, DealStatus, DealSummary interfaces)"
  - "Full dealStore CRUD (create, rename, updateDescription, archive, softDelete, switchDeal, ensureDefault, deleteCascade)"
  - "Deal-scoped chatStore (loadConversations filters by dealId, getOrCreateConversation scopes by agentId+dealId)"
  - "buildContext Layer 3 deal context injection (deal name + description in system prompt)"
  - "migrateConversationsToDeals utility for legacy conversation migration"
affects: [05-deal-rooms, 06-file-context, 07-memory]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-store coordination: dealStore.switchDeal() calls chatStore.loadConversations() via getState()"
    - "IndexedDB index queries: persistence.query('conversations', 'dealId', dealId) replaces getAll"
    - "Dual-scope lookup: getOrCreateConversation filters by agentId AND dealId"
    - "Deal context Layer 3 injection in buildContext between persona and history layers"

key-files:
  created:
    - src/types/deal.ts
    - src/services/persistence/migration.ts
    - src/store/__tests__/dealStore.test.ts
    - src/store/__tests__/chatStore.deal.test.ts
    - src/services/context/__tests__/builder.deal.test.ts
  modified:
    - src/store/dealStore.ts
    - src/store/chatStore.ts
    - src/services/context/builder.ts

key-decisions:
  - "dealStore uses crypto.randomUUID() for deal IDs, 'default' for General deal"
  - "switchDeal aborts in-flight streaming before context swap (race condition prevention)"
  - "loadConversations with null activeDealId returns empty state (no conversations loaded)"
  - "migrateConversationsToDeals uses bulkSet for efficient orphan conversation stamping"
  - "Layer 3 deal context positioned after crossVisibilityBlock (Layer 2.5), before Layers 4-5"

patterns-established:
  - "Deal-scoped store pattern: read activeDealId from dealStore.getState() in chatStore actions"
  - "Cascade delete pattern: query conversations by dealId, collect messages, delete in order"
  - "Default deal pattern: ensureDefaultDeal creates 'General' with id='default' if no deals"

requirements-completed: [DEAL-01, DEAL-02, DEAL-03, DEAL-04]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 5 Plan 01: Deal Data Layer Summary

**Full CRUD dealStore with deal-scoped chatStore queries, Layer 3 buildContext injection, and legacy migration utility -- 26 new tests, 136 total passing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T14:27:54Z
- **Completed:** 2026-03-13T14:32:33Z
- **Tasks:** 2 (both TDD: RED -> GREEN)
- **Files modified:** 8

## Accomplishments
- Full dealStore CRUD with 9 actions: loadDeals, createDeal, renameDeal, updateDealDescription, archiveDeal, softDeleteDeal, switchDeal, ensureDefaultDeal, deleteDealCascade
- chatStore.loadConversations filters by activeDealId via IndexedDB dealId index query (no cross-deal leaks)
- chatStore.getOrCreateConversation scopes by agentId + dealId (prevents conversation sharing between deals)
- buildContext Layer 3 injects active deal name and description into all agent system prompts
- migrateConversationsToDeals stamps orphan conversations with default deal via bulkSet
- 26 new tests (20 dealStore/chatStore + 6 buildContext), 136 total passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Deal types, dealStore CRUD, chatStore deal-scoping (TDD RED)** - `d210131` (test)
2. **Task 1: Deal types, dealStore CRUD, chatStore deal-scoping (TDD GREEN)** - `356283f` (feat)
3. **Task 2: buildContext Layer 3 deal injection (TDD RED)** - `35f34b5` (test)
4. **Task 2: buildContext Layer 3 deal injection (TDD GREEN)** - `65e7c2b` (feat)

_TDD tasks have separate test and implementation commits_

## Files Created/Modified
- `src/types/deal.ts` - Deal, DealStatus, DealSummary type definitions
- `src/store/dealStore.ts` - Expanded from stub to full CRUD with 9 actions, persistence via IndexedDB
- `src/store/chatStore.ts` - Deal-scoped loadConversations (index query) and getOrCreateConversation (dual scope)
- `src/services/persistence/migration.ts` - migrateConversationsToDeals utility for legacy data
- `src/services/context/builder.ts` - Layer 3 deal context injection (name + description)
- `src/store/__tests__/dealStore.test.ts` - 20 tests covering CRUD, switch, cascade delete, migration
- `src/store/__tests__/chatStore.deal.test.ts` - 6 tests covering deal-scoped conversation loading
- `src/services/context/__tests__/builder.deal.test.ts` - 6 tests covering Layer 3 injection

## Decisions Made
- dealStore uses crypto.randomUUID() for deal IDs, with reserved 'default' ID for General deal
- switchDeal aborts in-flight streaming before swapping activeDealId (prevents race conditions)
- loadConversations with null activeDealId returns empty state rather than loading all conversations
- migrateConversationsToDeals uses bulkSet for efficiency rather than individual set calls
- Layer 3 positioned after crossVisibilityBlock to maintain prompt layer ordering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Deal data layer is complete and ready for Plan 02 (Deal Switcher UI, sidebar, header integration)
- dealStore exports all CRUD actions needed by UI components
- chatStore automatically filters by activeDealId -- UI just calls switchDeal
- buildContext automatically injects deal context -- no UI wiring needed for prompts
- Migration utility ready to be called on app boot

## Self-Check: PASSED

All 8 files verified present. All 4 commits verified in git log.

---
*Phase: 05-deal-rooms*
*Completed: 2026-03-13*

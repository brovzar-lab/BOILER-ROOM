---
phase: 11-jrpg-sprite-integration
plan: 01
subsystem: agents, ui, engine
tags: [agent-rename, persona-prompts, bilingual, office-layout, keyboard-shortcuts]

# Dependency graph
requires:
  - phase: 09-compact-layout
    provides: Room definitions, tile map, furniture data, keyboard shortcuts
  - phase: 10-rendering-pipeline
    provides: Y-sorted depth rendering, sprite atlas structure
provides:
  - Updated AgentId type with patrik/marcos/sandra/isaac/wendy
  - 5 bilingual persona prompts with Mexican entertainment expertise
  - Redesigned office layout with workflow-based room assignments
  - Wendy's non-standard coaching room furniture
  - Role-appropriate office decorations for all agents
  - Updated keyboard shortcuts P/M/S/I/W + 6 (War Room)
affects: [11-02-PLAN, 11-03-PLAN, sprite-generation, rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [bilingual-persona-prompts, coaching-room-layout, workflow-adjacency-rooms]

key-files:
  created:
    - src/config/agents/patrik.ts
    - src/config/agents/sandra.ts
    - src/config/agents/isaac.ts
    - src/config/agents/wendy.ts
  modified:
    - src/types/agent.ts
    - src/config/agents/index.ts
    - src/config/agents/marcos.ts
    - src/engine/officeLayout.ts
    - src/engine/input.ts
    - src/engine/spriteAtlas.ts
    - src/engine/spriteSheet.ts
    - src/engine/characters.ts
    - src/store/chatStore.ts
    - src/store/officeStore.ts

key-decisions:
  - "Patrik (CFO) placed top-right adjacent to BILLY for frequent financial consultations"
  - "Sandra (Line Producer) upper-left, Marcos (Lawyer) upper-right for budget/contract workflow adjacency"
  - "Isaac (Development) lower-left, Wendy (Coach) lower-right for creative/private separation"
  - "War Room accessible via '6' key to resolve W conflict with Wendy"
  - "Signature colors: Patrik=#8B5CF6 (Violet), Sandra=#10B981 (Emerald), Isaac=#F59E0B (Amber), Wendy=#EC4899 (Pink), Marcos=#3B82F6 (Blue)"

patterns-established:
  - "Bilingual persona prompts: Spanish terms of art woven into domain expertise sections"
  - "Non-standard room layouts: Wendy's coaching room breaks desk+chair pattern with couch+plants"

requirements-completed: [SPRT-03, ENV-02]

# Metrics
duration: 11min
completed: 2026-03-14
---

# Phase 11 Plan 01: Agent Identity & Office Layout Summary

**Renamed all 5 agents (diana->patrik, sasha->sandra, roberto->isaac, valentina->wendy) with bilingual persona prompts, workflow-based room assignments, and Wendy's coaching room layout**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-14T15:12:44Z
- **Completed:** 2026-03-14T15:23:19Z
- **Tasks:** 3
- **Files modified:** 61

## Accomplishments
- Complete agent identity replacement across 58 source and test files with zero straggler references
- 5 substantive bilingual persona prompts (3100-3600 chars each) with Mexican entertainment industry expertise
- Workflow-optimized room assignments: CFO adjacent to CEO, Producer near CFO/Lawyer
- Wendy's coaching room with couch, 3 plants, and secondary desk (non-standard layout)
- Keyboard shortcuts updated: P/M/S/I/W for agents, 6 for War Room

## Task Commits

Each task was committed atomically:

1. **Task 1: Mechanical rename of agent IDs** - `87309a4` (feat) - 58 files, all old IDs eliminated
2. **Task 2: Write 5 new persona prompts** - `5e50855` (feat) - 5 agent config files with bilingual prompts
3. **Task 3: Update office layout** - `bd39180` (feat) - Room assignments, Wendy's coaching room, decorations
4. **Task 3 test fixes** - `f4ae75d` (fix) - Updated tests for new room positions and keyboard shortcuts

## Files Created/Modified
- `src/config/agents/patrik.ts` - CFO persona with financial/EFICINE expertise
- `src/config/agents/sandra.ts` - Line Producer persona with scheduling/ANDA expertise
- `src/config/agents/isaac.ts` - Head of Development persona with script/IP expertise
- `src/config/agents/wendy.ts` - Performance Coach persona with coaching/strategic expertise
- `src/config/agents/marcos.ts` - Lawyer persona (refined from Counsel) with entertainment law
- `src/config/agents/index.ts` - Updated agent registry
- `src/types/agent.ts` - AgentId type updated
- `src/engine/officeLayout.ts` - Room assignments, furniture, decorations redesigned
- `src/engine/input.ts` - Keyboard shortcuts P/M/S/I/W + 6
- `src/engine/spriteAtlas.ts` - DECORATION_ATLAS with new agent-specific keys
- `src/engine/spriteSheet.ts` - PLACEHOLDER_COLORS with new agent IDs
- `src/engine/characters.ts` - AGENT_IDS array updated
- `src/store/chatStore.ts` - War Room streaming keys updated
- `src/store/officeStore.ts` - Agent statuses and initialization updated
- 20 test files updated with new agent IDs and assertions

## Decisions Made
- Patrik (CFO) placed top-right adjacent to BILLY for frequent financial consultations
- Sandra (Line Producer) upper-left for production budget workflow proximity
- Marcos (Lawyer) upper-right for contract review adjacency to CFO/Producer
- Isaac (Development) lower-left to separate creative from finance operations
- Wendy (Coach) lower-right for private coaching space separate from operations
- War Room accessible via '6' key (resolves W conflict with Wendy)
- Distinct signature colors chosen for visual contrast across all agents

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertions assumed old room positions**
- **Found during:** Task 3 (office layout update)
- **Issue:** 3 tests assumed Sandra in top-right, Patrik in upper-left, 'w' key for War Room
- **Fix:** Updated tileMap test sort order, fileService test sort order, warRoom test key from 'w' to '6'
- **Files modified:** src/engine/__tests__/tileMap.test.ts, src/services/files/__tests__/fileService.test.ts, src/engine/__tests__/warRoom.test.ts
- **Verification:** All 231 tests pass
- **Committed in:** f4ae75d

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test fixes necessary for correctness after room reassignment. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Agent identity layer complete: all subsequent plans (11-02 sprite generation, 11-03 polish) can build on new agent IDs
- DECORATION_ATLAS has placeholder coordinates for new decoration keys -- Plan 02 will generate actual sprites
- Sprite PNGs are temporary copies of old sprites at new filenames -- Plan 02 regenerates at 24x32

---
*Phase: 11-jrpg-sprite-integration*
*Completed: 2026-03-14*

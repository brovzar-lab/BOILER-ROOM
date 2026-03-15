# Roadmap: Lemon Command Center

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-14)
- ✅ **v1.1 Visual Overhaul** — Phases 9-13 (shipped 2026-03-14)
- 🚧 **v2.0 Professional Art & Agent Autonomy** — Phases 14-17 (in progress)

<details>
<summary>v1.0 MVP (Phases 1-8) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Foundation + Single-Agent Chat (3/3 plans) — completed 2026-03-12
- [x] Phase 2: Canvas Engine (3/3 plans) — completed 2026-03-13
- [x] Phase 3: Integration + All Agents (3/3 plans) — completed 2026-03-13
- [x] Phase 4: War Room (3/3 plans) — completed 2026-03-13
- [x] Phase 5: Deal Rooms (2/2 plans) — completed 2026-03-13
- [x] Phase 6: File Handling (3/3 plans) — completed 2026-03-13
- [x] Phase 7: Agent Memory (4/4 plans) — completed 2026-03-13
- [x] Phase 8: Polish (3/3 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Visual Overhaul (Phases 9-13) — SHIPPED 2026-03-14</summary>

- [x] Phase 9: Compact Layout (3/3 plans) — completed 2026-03-14
- [x] Phase 10: Rendering Pipeline (2/2 plans) — completed 2026-03-14
- [x] Phase 11: JRPG Sprite Integration (3/3 plans) — completed 2026-03-14
- [x] Phase 12: Smooth Zoom (2/2 plans) — completed 2026-03-14
- [x] Phase 13: Polish and UI (4/4 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

## v2.0 Professional Art & Agent Autonomy

**Milestone Goal:** Replace programmatic sprites with LimeZu Modern Interiors professional pixel art, add furniture collision physics, idle agent behaviors, and autonomous agent-to-agent collaboration with user-approved chaining.

## Phases

- [ ] **Phase 14: LimeZu Art Integration** - Professional pixel art replaces all programmatic sprites (characters, environment, UI)
- [ ] **Phase 15: Furniture Collision** - Characters navigate around furniture with collision-aware pathfinding
- [ ] **Phase 16: Idle Behaviors** - Agents autonomously work, stretch, and visit water cooler when not engaged
- [ ] **Phase 17: Agent-to-Agent Collaboration** - Agents visit each other, share context, and produce work with user approval

## Phase Details

### Phase 14: LimeZu Art Integration
**Goal**: The entire office renders with professional LimeZu Modern Interiors pixel art — characters, floors, walls, furniture, decorations, and UI overlays — replacing every programmatic placeholder
**Depends on**: Phase 13 (v1.1 complete)
**Requirements**: CHAR-01, CHAR-02, CHAR-03, CHAR-04, ENV-08, ENV-09, ENV-10, ENV-11, ENV-12, ENV-13, ENV-14, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. All 6 characters (BILLY, Patrik, Marcos, Sandra, Isaac, Wendy) appear as distinct 32x32 LimeZu sprites with walk, idle, and sit animations playing correctly
  2. Every office floor, wall, and furniture piece renders from LimeZu tilesets with no programmatic placeholders remaining anywhere on the canvas
  3. War Room displays LimeZu Conference Hall assets (conference table, office chairs, whiteboard) matching the professional art style
  4. Agent thinking/status indicators appear as LimeZu emote sprites on the canvas, and speech bubbles use LimeZu UI elements
  5. Drop shadows, depth sorting, and foot-center anchoring work correctly at all zoom levels with the new 32x32 character dimensions on the 16x16 tile grid
**Plans**: 3 plans

Plans:
- [ ] 14-01-PLAN.md — Atlas foundation: multi-sheet registry, character frame mapping, 32x32 dimensions, loader
- [ ] 14-02-PLAN.md — Renderer overhaul: floors, 3D walls, furniture, decorations, character anchoring
- [ ] 14-03-PLAN.md — UI overlays (emotes, speech bubbles) + visual verification checkpoint

### Phase 15: Furniture Collision
**Goal**: Characters respect physical furniture boundaries — no agent or BILLY walks through desks, tables, bookshelves, or any solid furniture
**Depends on**: Phase 14 (LimeZu furniture sprites define collision footprints)
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04
**Success Criteria** (what must be TRUE):
  1. BILLY and all agents path around desks, tables, bookshelves, and other solid furniture — never walking through them
  2. Agents can still reach and sit at their own desk chairs (seat tiles exempted from collision)
  3. War Room gathering works correctly — all agents reach conference chairs through collision-aware paths within the existing 15-second timeout
  4. BFS pathfinding finds valid routes between all rooms without getting stuck or producing excessively long detours
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD

**Research flag:** SKIP — standard tile-based collision overlay pattern. No novel elements.

### Phase 16: Idle Behaviors
**Goal**: Agents feel alive — they work at their desks, occasionally stretch or visit the water cooler, and snap back to attention the moment the user needs them
**Depends on**: Phase 15 (idle walks must respect furniture collision)
**Requirements**: IDLE-01, IDLE-02, IDLE-03, IDLE-04, IDLE-05
**Success Criteria** (what must be TRUE):
  1. Agents play work-at-desk animations (typing, looking at monitor) when idle, rather than standing motionless
  2. Agents occasionally walk to the water cooler and back, or stand and stretch at their desk, on randomized timers
  3. Any idle behavior is interrupted immediately when the user enters the room or sends a message — the agent returns to their desk and faces the user
  4. Idle behavior state and timers live entirely in the game engine (no Zustand store updates, no React re-renders during idle cycles)
**Plans**: TBD

Plans:
- [ ] 16-01: TBD
- [ ] 16-02: TBD

**Research flag:** SKIP — weighted random timer plus state machine is an established simulation game pattern.

### Phase 17: Agent-to-Agent Collaboration
**Goal**: Users can instruct agents to consult each other — agents physically walk to colleagues' offices, share context, produce work autonomously, and report back — while BILLY continues working uninterrupted
**Depends on**: Phase 16 (collaboration reuses startWalk + interrupt system from idle behaviors)
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04, COLLAB-05, COLLAB-06, COLLAB-07, COLLAB-08, COLLAB-09, COLLAB-10
**Success Criteria** (what must be TRUE):
  1. User can tell an agent to visit another agent — the instructed agent visually walks to the target agent's office on the canvas and a collaboration conversation begins
  2. User can watch the collaboration live by clicking into the room, or stay away and receive a summary when it completes
  3. BILLY can continue chatting with other agents while a collaboration runs in the background without any interference or state corruption
  4. When an agent determines they need another specialist, the user is prompted to approve or deny the next hop — no unsupervised chaining
  5. Collaboration has safety limits (max token budget, max chain length, timeout) and state persists across page reloads
**Plans**: TBD

Plans:
- [ ] 17-01: TBD
- [ ] 17-02: TBD
- [ ] 17-03: TBD

**Research flag:** NEEDS RESEARCH-PHASE — collaboration trigger format (JSON vs sentinel tags), approval UX design (per-hop vs upfront chain plan), and context budget calibration must be resolved before implementation.

## Progress

**Execution Order:** Phases execute sequentially: 14 → 15 → 16 → 17

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1-8 | v1.0 | 24/24 | Complete | 2026-03-14 |
| 9-13 | v1.1 | 14/14 | Complete | 2026-03-14 |
| 14. LimeZu Art Integration | 2/3 | In Progress|  | - |
| 15. Furniture Collision | v2.0 | 0/TBD | Not started | - |
| 16. Idle Behaviors | v2.0 | 0/TBD | Not started | - |
| 17. Agent Collaboration | v2.0 | 0/TBD | Not started | - |

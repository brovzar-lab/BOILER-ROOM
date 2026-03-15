# Requirements: Lemon Command Center

**Defined:** 2026-03-15
**Core Value:** Multi-perspective, context-aware AI advisory for complex production deals

## v2.0 Requirements

Requirements for v2.0 Professional Art & Agent Autonomy. Each maps to roadmap phases.

### Art — Characters

- [ ] **CHAR-01**: Characters render as 32x32 LimeZu sprites replacing programmatic 24x32 placeholders
- [ ] **CHAR-02**: Each of the 6 characters (BILLY, Patrik, Marcos, Sandra, Isaac, Wendy) has a distinct LimeZu character with walk, idle, sit animations
- [ ] **CHAR-03**: Character foot-center anchoring updated for 32x32 on 16x16 tile grid (characters are 2 tiles tall)
- [ ] **CHAR-04**: Drop shadows and depth sorting work correctly with 32x32 character sprites

### Art — Environment

- [ ] **ENV-08**: Floor tiles replaced with LimeZu Room Builder tiles (wood, carpet variants)
- [ ] **ENV-09**: Walls replaced with LimeZu 3D wall system (Room Builder walls + baseboards)
- [ ] **ENV-10**: All furniture replaced with LimeZu furniture sprites (desks, chairs, monitors, bookshelves, plants, couches, filing cabinets)
- [ ] **ENV-11**: War Room uses LimeZu Conference Hall assets (conference table, office chairs, whiteboard, projector)
- [ ] **ENV-12**: Rec area furniture replaced with LimeZu living room/generic assets (water cooler, couch, plants)
- [ ] **ENV-13**: Personality decorations per office use LimeZu decoration sprites (rugs, art, charts, books)
- [ ] **ENV-14**: Multi-sheet atlas loader supports LimeZu's categorized tile organization (multiple PNG source sheets)

### Art — UI

- [ ] **UI-06**: LimeZu thinking emotes integrated as agent status indicators on canvas
- [ ] **UI-07**: LimeZu UI elements used for speech bubbles and status overlays

### Collision

- [ ] **COLL-01**: Furniture tiles marked as non-walkable in a collision overlay
- [ ] **COLL-02**: BFS pathfinding routes characters around furniture (no walking through tables/desks)
- [ ] **COLL-03**: Agent seat tiles exempted from collision (agents can sit at their desks)
- [ ] **COLL-04**: War Room seating works correctly with collision overlay (agents reach conference chairs)

### Idle Behaviors

- [ ] **IDLE-01**: Agents play work-at-desk animation when idle (typing, looking at monitor)
- [ ] **IDLE-02**: Agents occasionally walk to water cooler, pause, then return to desk
- [ ] **IDLE-03**: Agents occasionally stand up and stretch at their desk
- [ ] **IDLE-04**: Idle behaviors interrupted immediately when user enters the room or sends a message
- [ ] **IDLE-05**: Idle behavior timers and state are engine-local (not Zustand store — no React re-renders)

### Agent Collaboration

- [ ] **COLLAB-01**: User can instruct an agent to visit another agent and collaborate on a task
- [ ] **COLLAB-02**: Instructed agent visually walks to the target agent's office on the canvas
- [ ] **COLLAB-03**: Instructed agent shares relevant context (file content, conversation summary) with target agent via API
- [ ] **COLLAB-04**: Target agent produces work autonomously using shared context and their domain expertise
- [ ] **COLLAB-05**: User can watch the collaboration conversation live by clicking into the room, or stay away and get a summary when done
- [ ] **COLLAB-06**: BILLY can continue working with other agents while a collaboration runs in the background
- [ ] **COLLAB-07**: A new Deal is automatically created when agent collaboration is triggered
- [ ] **COLLAB-08**: When an agent determines they need another agent's input, they request approval — user approves or denies each hop
- [ ] **COLLAB-09**: Collaboration has circuit breakers (max token budget, max chain length, timeout)
- [ ] **COLLAB-10**: Collaboration state persists across page reloads (IndexedDB)

## v2.1 Requirements

Deferred to future release.

### Advanced Collaboration

- **COLLAB-11**: Agents can freely chain to multiple agents without per-hop approval (autonomous mode)
- **COLLAB-12**: Agents proactively suggest consultations based on conversation context

### Advanced Art

- **ART-03**: Animated environment elements (ceiling fan rotation, screen flicker, plant sway)
- **ART-04**: Custom LimeZu characters built from Character Generator parts (body + outfit + hair + eyes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaboration / multi-user | Personal productivity tool |
| Mobile app | Web-first, responsive desktop only |
| Server-side backend | Client-side with direct Anthropic API calls |
| OAuth/SSO authentication | Single-user, API key in .env |
| Casual agent-to-agent visits (social idle) | Keep idle behaviors to personal activities only |
| Free agent chaining without approval | v2.1 — need controlled approval first |
| WebGL upgrade | Canvas 2D handles all required effects |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAR-01 | Phase 14 | Pending |
| CHAR-02 | Phase 14 | Pending |
| CHAR-03 | Phase 14 | Pending |
| CHAR-04 | Phase 14 | Pending |
| ENV-08 | Phase 14 | Pending |
| ENV-09 | Phase 14 | Pending |
| ENV-10 | Phase 14 | Pending |
| ENV-11 | Phase 14 | Pending |
| ENV-12 | Phase 14 | Pending |
| ENV-13 | Phase 14 | Pending |
| ENV-14 | Phase 14 | Pending |
| UI-06 | Phase 14 | Pending |
| UI-07 | Phase 14 | Pending |
| COLL-01 | Phase 15 | Pending |
| COLL-02 | Phase 15 | Pending |
| COLL-03 | Phase 15 | Pending |
| COLL-04 | Phase 15 | Pending |
| IDLE-01 | Phase 16 | Pending |
| IDLE-02 | Phase 16 | Pending |
| IDLE-03 | Phase 16 | Pending |
| IDLE-04 | Phase 16 | Pending |
| IDLE-05 | Phase 16 | Pending |
| COLLAB-01 | Phase 17 | Pending |
| COLLAB-02 | Phase 17 | Pending |
| COLLAB-03 | Phase 17 | Pending |
| COLLAB-04 | Phase 17 | Pending |
| COLLAB-05 | Phase 17 | Pending |
| COLLAB-06 | Phase 17 | Pending |
| COLLAB-07 | Phase 17 | Pending |
| COLLAB-08 | Phase 17 | Pending |
| COLLAB-09 | Phase 17 | Pending |
| COLLAB-10 | Phase 17 | Pending |

**Coverage:**
- v2.0 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*

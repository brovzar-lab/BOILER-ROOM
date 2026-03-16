# Lemon Command Center — Backlog

> Consolidated list of features, improvements, and fixes inspired by pixel-agents and project evolution.
> Updated: 2026-03-16

---

## What We Took From pixel-agents (Already Built)

These patterns were studied from [pixel-agents](https://github.com/pablodelucca/pixel-agents) and adapted into Lemon Command Center during v1.0 and v1.1:

| Feature | pixel-agents Pattern | Our Implementation |
|---------|---------------------|-------------------|
| Canvas 2D game loop | requestAnimationFrame with delta time | `gameLoop.ts` — 60fps with dt capping at 0.1s |
| BFS pathfinding | 4-connected tile grid, shortest path | `tileMap.ts` — BFS on walkable tiles, no diagonals |
| Character state machines | idle/walk/work states with frame cycling | `characters.ts` — IDLE, WALK, WORK, TALK, KNOCK states |
| Sprite sheet system | PNG sheets with frame extraction + caching | `spriteSheet.ts` + `limeZuAtlas.ts` — LimeZu 16x16 tiles |
| Three-world architecture | Engine (pure TS) / UI (React) / State (bridge) | Engine writes to Zustand, React reads from Zustand, no direct coupling |
| Top-down pixel office | Office rooms with agents at desks | 10-room 3x3 grid with 7 characters |
| Integer zoom | Pixel-perfect rendering, no fractional scaling | `camera.ts` — exponential zoom with cursor-centered scaling |
| Layered renderer | Background → tiles → furniture → characters → UI | 6-layer pipeline with Y-sorted depth occlusion |
| Non-reactive engine reads | getState() instead of React subscriptions | Game loop reads officeStore via `getState()`, writes only on meaningful changes |

---

## Backlog

### P0 — In Progress (v2.0 Active)

#### ART-01: LimeZu Character Sprites
Replace 24x32 programmatic placeholder sprites with 32x32 LimeZu Modern Interiors character sprites. Walk/idle/sit/phone animations for all 7 characters.
- **Status:** Atlas mapped, integration in progress
- **Files:** `limeZuCharFrames.ts`, `characters.ts`, `renderer.ts`

#### ART-02: LimeZu Environment Tiles
Replace colored rectangle floor/wall tiles with 16x16 LimeZu Modern Interiors environment tilesets. Floors, walls, furniture, decorations.
- **Status:** Atlas mapped, `environment.png` updated, needs full integration
- **Files:** `limeZuAtlas.ts`, `officeLayout.ts`, `renderer.ts`

#### ART-03: LimeZu Conference Hall for War Room
Use LimeZu Conference Hall assets (conference table, whiteboard, projector) for the War Room / Board Room.
- **Files:** `limeZuAtlas.ts`, `officeLayout.ts`

#### ART-04: LimeZu UI Elements
Integrate LimeZu UI sprite elements (speech bubbles, emote sprites, panel frames) into chat/deal panels for visual cohesion.
- **Files:** `limeZuAtlas.ts`, chat components

---

### P1 — Next Up (v2.0 Planned)

#### ENGINE-01: Furniture Collision Boundaries
Characters should respect table/desk/furniture boundaries instead of walking through them. Add collision flag to FurnitureItem, update BFS pathfinding to treat collision furniture as unwalkable.
- **Complexity:** Medium
- **Files:** `types.ts` (collision field), `tileMap.ts` (pathfinding), `officeLayout.ts` (furniture data)

#### ANIM-01: Agent Idle Behaviors
Agents perform ambient activities when not engaged: work at desk (typing), get water from cooler, stretch, check phone. Each agent has 2-3 personality-appropriate idle routines that cycle randomly.
- **Inspired by:** pixel-agents shows agents with ambient activity at their desks
- **Complexity:** Medium-High
- **Files:** `characters.ts` (state machine expansion), new idle behavior scheduler

#### ANIM-02: Speech/Thought Bubbles
Show LimeZu emote sprites above character heads: thinking emote while API is streaming, exclamation when response is ready, speech bubble during conversation. Replaces current amber dot status indicators.
- **Inspired by:** pixel-agents status indicators + LimeZu UI emote sprites
- **Complexity:** Medium
- **Files:** `renderer.ts` (bubble rendering layer), `limeZuAtlas.ts` (emote sprites mapped)
- **Atlas ready:** `emote-thinking`, `emote-exclamation`, `speech-bubble-left`, `speech-bubble-right`

#### AI-01: Agent-to-Agent Collaboration
Agents can visit each other's offices to share context and collaborate autonomously. Example: Diana (CFO) walks to Marcos (Lawyer) office to discuss a contract's financial implications, then reports back.
- **Inspired by:** pixel-agents showing agents interacting in the office space
- **Complexity:** High
- **Key decisions needed:**
  - How collaboration chains are initiated (user triggers vs agent suggests)
  - How context is shared between agents during a visit
  - Visual representation: agent physically walks to other agent's office
  - Conversation stored as sub-thread within the deal

#### AI-02: User-Approved Agent Chaining
When agents collaborate, each "hop" (Agent A visits Agent B) requires user approval before proceeding. Prevents runaway API costs and keeps user in control.
- **Depends on:** AI-01
- **Complexity:** Medium
- **UI:** Approval dialog showing: who wants to visit whom, why, estimated tokens

#### AI-03: Live View / Background Summary of Agent Collaboration
User can either watch agent collaboration live (see the conversation as it streams between agents) or let it run in background and get a summary when done.
- **Depends on:** AI-01, AI-02
- **Complexity:** Medium-High
- **UI:** Split view or notification badge when collaboration completes

#### AI-04: Concurrent BILLY Activity During Collaboration
BILLY can continue chatting with other agents or working while an agent collaboration chain runs in the background. Requires decoupling the streaming pipeline from BILLY's active conversation.
- **Depends on:** AI-01, AI-03
- **Complexity:** High

#### AI-05: Auto Deal Creation from Agent Instructions
Agents can suggest or auto-create a new deal when collaboration context warrants it (e.g., "This Netflix negotiation should be its own deal").
- **Depends on:** AI-01
- **Complexity:** Medium
- **Files:** `parseDealAction.ts` (already started), `dealStore.ts`

---

### P2 — Future Enhancements

#### VISUAL-01: Agent Personality Animations
Each agent has unique animation quirks beyond generic idle:
- **Sandra:** Stands up while talking, paces
- **Isaac:** Barely moves, deep focus at screen
- **Wendy:** Post-its flying, gestures while talking
- **Patrik:** Checks spreadsheets, adjusts glasses
- **Marcos:** Always has document in hand, reads
- **Charlie:** Moves around office, sketches on board
- **Complexity:** Medium per character

#### VISUAL-02: Room Transition Polish
Smooth door-frame transition effect when BILLY enters a room (brief fade or zoom shift). Currently walks through open doorways with no visual punctuation.
- **Complexity:** Low

#### VISUAL-03: Notification Badges on Rooms
In overview zoom, show notification badges on rooms with unread agent responses. Currently room labels show but no unread indicators at overview level.
- **Complexity:** Low
- **Files:** `renderer.ts` (Layer 6 overlays)

#### VISUAL-04: Minimap
Optional minimap in corner showing full office layout with BILLY's position highlighted. Useful when zoomed in and navigating.
- **Complexity:** Medium
- **Deferred from:** Phase 2 original spec (decided "room label, no minimap")

#### AUDIO-01: Contextual Room Audio
Subtle audio shift between rooms — War Room more energetic ambience, offices quieter, break room casual. Currently ambient audio is uniform.
- **Complexity:** Low-Medium
- **Files:** Audio system already exists, needs room-aware volume/tone

#### AUDIO-02: Agent Voice Chimes
Each agent gets a subtle unique chime or sound when they start/finish responding. Helps identify which agent is active without looking.
- **Complexity:** Low

#### PERF-01: Sprite Cache Optimization
Sprite cache exists but renderer bypasses it (draws via setTransform). Evaluate whether re-enabling cache improves performance at high zoom levels.
- **Known issue from:** PROJECT.md

#### PERF-02: renderHeight Dead Field Cleanup
Remove unused `renderHeight` field from FurnitureItem — not used by depthSort.
- **Known issue from:** PROJECT.md
- **Complexity:** Trivial

---

### P3 — Known Bugs

#### BUG-01: War Room Agent Gathering Inconsistency
War Room agent gathering animation may not always trigger. Pre-existing pathfinding edge case where some agents fail to find path to their war room seat.
- **Known issue from:** PROJECT.md
- **Severity:** Low (cosmetic — agents still participate in War Room chat)

---

## Out of Scope (Decided)

These were explicitly discussed and rejected:

| Feature | Reason |
|---------|--------|
| Real-time collaboration / multi-user | Personal productivity tool |
| Mobile app | Desktop-only, web-first |
| Server-side backend | Client-side with direct Anthropic API |
| OAuth/SSO authentication | Single-user, API key in .env |
| Custom LLM fine-tuning | Standard API with system prompts |
| Agents visiting each other casually (idle social visits) | Keep idle behaviors to personal activities only |
| Keyboard typing sounds | User decision — audio kept subtle |

---

## Reference

- **pixel-agents source:** https://github.com/pablodelucca/pixel-agents
- **LimeZu Modern Interiors:** https://limezu.itch.io/moderninteriors (paid pack, stored locally)
- **Architecture doc:** `.planning/PROJECT.md`
- **Original spec:** `LEMON-COMMAND-CENTER-PROMPT.md`
- **Office 3.0 plan:** `docs/superpowers/plans/2026-03-15-office-3.0-redesign.md`

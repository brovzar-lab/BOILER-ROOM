# Project Research Summary

**Project:** Lemon Command Center v2.0 — Professional Art & Agent Autonomy
**Domain:** JRPG-style multi-agent AI workspace — tile-based game engine + Anthropic API orchestration
**Researched:** 2026-03-15
**Confidence:** HIGH (stack, architecture, pitfalls); MEDIUM (agent-to-agent collaboration UX)

## Executive Summary

Lemon Command Center v2.0 is a feature-architecture milestone, not a technology-addition milestone. The existing stack (React 19, TypeScript 5.7, Vite 6, Tailwind v4, Zustand 5, Canvas 2D, Anthropic SDK 0.78) requires zero new runtime dependencies to deliver every v2.0 capability. The upgrade decomposes into four sequential feature groups — LimeZu professional art integration, furniture collision, idle behaviors, and agent-to-agent collaboration — each of which maps entirely onto established patterns already present in the codebase. The highest-leverage insight from research: all four feature groups follow proven game development patterns (atlas remapping, collision overlays, timer-driven behavior state machines, sentinel-tag orchestration) with one genuinely novel element being the visual agent locomotion layered on top of an AI collaboration pipeline.

The recommended approach is strict phase ordering driven by hard architectural dependencies. Art must come first because sprite dimensions affect every downstream rendering calculation. Collision must precede idle behaviors because agents walking through desks during idle cycles destroys immersion. Idle behaviors should stabilize before collaboration ships because the collaboration feature reuses the same `startWalk()` + interrupt system. The collaboration phase itself is the highest-risk work: it requires a new parallel execution pipeline (dedicated `collaborationStore`, separate context builder, independent streaming state) that must be designed correctly from the start — the singleton `streaming` state in `chatStore` cannot support concurrent user chat plus background agent collaboration without an upfront store architecture separation.

The primary risks concentrate in two areas. First, the LimeZu sprite integration is deceptively complex: LimeZu characters are 32x32 (not the current 24x32), and environment tiles ship across multiple categorized PNGs rather than the single `environment.png` the engine currently expects. Both require architecture changes to the atlas system, not just asset swaps. Second, the collaboration pipeline has four distinct failure modes — context window explosion, runaway circular chains, concurrent store pollution, and phantom deal creation — all of which require deliberate circuit breakers that must ship with the feature, not as follow-up patches.

---

## Key Findings

### Recommended Stack

v2.0 adds zero new runtime dependencies. Every integration point maps to existing codebase patterns: `spriteAtlas.ts` was designed with an explicit asset-swap contract (SPRT-04), furniture collision is a walkability flag change in `tileMap.ts`, idle behaviors extend the `CharacterState` union with a module-scoped sub-state map, and agent collaboration is a new orchestration layer over the existing `sendStreamingMessage()` + Zustand store pattern.

The one area requiring entirely new code is the collaboration execution pipeline: a new `collaborationStore.ts`, `services/collaboration/orchestrator.ts`, and `services/collaboration/contextBuilder.ts` — roughly 700 LOC across 6 new files plus ~200 LOC of modifications to existing files.

**Core technologies (all unchanged from current):**
- Canvas 2D + rAF game loop — no migration to PixiJS or Phaser; 6-layer setTransform pipeline is already built
- Zustand 5 — new `collaborationStore` slice follows the existing per-frame-safe store discipline exactly
- Anthropic SDK 0.78 — `sendStreamingMessage()` + `AbortController` already handle all collaboration API needs
- TypeScript discriminated unions — idle behavior sub-states, collaboration chain state; no XState needed
- Native Promise chains — sequential collaboration hops with user approval gates; no RxJS or message queue

### Expected Features

**Must have (table stakes for v2.0):**
- 32x32 LimeZu character sprites — current 24x32 programmatic sprites are the most visible placeholder
- 16x16 LimeZu environment tiles — floor/wall/furniture art must match character art quality; mixing styles looks jarring
- LimeZu Conference Hall assets for War Room — flagship multi-agent space gets first-class treatment
- Furniture collision boundaries — agents walking through desks is the number one visual flaw in the current engine
- Agent idle behaviors (work at desk, get water, stretch, phone) — static agents feel lifeless in a simulation
- Agent-to-agent collaboration with user approval gates — the core v2.0 value proposition
- Visual agent locomotion during collaboration — the key differentiator; no other AI tool visualizes agent interaction as spatial movement

**Should have (competitive differentiators):**
- Background collaboration summary notification when chains complete
- Live collaboration panel showing active agent exchanges with streaming output
- Concurrent BILLY activity while background collaboration runs
- Auto deal creation from agent collaboration output (parsing infrastructure already exists)
- Personality-matched idle behaviors (Patrik checks financial charts, Sandra reviews schedule board)

**Defer to v2.1+:**
- Multi-hop chains (A -> B -> C) — ship single-hop first, validate demand; multi-hop adds loop detection and chain visualization complexity
- Collaboration chain visualization / flowchart view — summary text suffices for v2.0
- Agent phone call animation for remote consultation — walking visits work fine for v2.0
- LimeZu UI elements in React panels — polish item, not functional

### Architecture Approach

The existing three-world separation (Canvas game engine / React DOM layer / Zustand + services) must be strictly preserved throughout v2.0. All new features follow the established boundary rules: per-frame visual state (idle behavior timers, animation sub-states) lives in module-scoped Maps, not Zustand; agent-to-agent collaboration gets its own dedicated store rather than extending `chatStore`; LimeZu frame coordinates go into `spriteAtlas.ts`, never hardcoded in the renderer; the collision overlay is derived data computed once at init from `OFFICE_TILE_MAP` plus `FURNITURE` array without modifying the tile map itself (which room detection depends on).

**Major new components:**
1. `engine/collisionMap.ts` — builds `boolean[][]` walkability overlay from tile map plus furniture footprints; `isWalkable()` delegates here
2. `engine/idleBehavior.ts` — timer-driven behavior state machine (module-scoped Map, NOT Zustand); ticked from `updateAllCharacters()`
3. `store/collaborationStore.ts` — independent streaming state, chain lifecycle, approval queue; zero coupling to `chatStore` singleton streaming
4. `services/collaboration/orchestrator.ts` — chain execution, hop approval flow, context assembly, `startWalk()` integration for visual locomotion
5. `services/collaboration/contextBuilder.ts` — lean context builder for agent-to-agent prompts (strips Layer 5.5 deal creation capability, no full conversation history, hard 2K token handoff budget)

### Critical Pitfalls

1. **LimeZu 32x32 sprite size mismatch** — `CHAR_SPRITE_W/H` constants propagate through 6+ files; foot-center anchor, shadow ellipses, status overlay Y-offsets, and camera follow all break silently when dimensions change. Audit the actual LimeZu sheet layout before writing any code; abstract dimensions into `CharacterSpriteConfig`; search for all hardcoded `24`/`32` rendering references before touching implementation.

2. **LimeZu multi-file tile sheet organization** — The current `environment.png` is a single flat atlas; LimeZu ships as categorized PNGs with possible 1px padding between tiles for Tiled editor compatibility. Requires a multi-sheet atlas registry (`{ sheet, x, y, w, h }` per entry) and padding-aware source rects. Verify at all zoom levels for alpha-edge bleeding.

3. **Furniture collision breaks BFS pathing** — Agent seat tiles are at or adjacent to furniture footprints. Marking all furniture tiles non-walkable can break `gatherAgentsToWarRoom()` (15-second timeout) and block BILLY from reaching `billyStandTile`. Solution: runtime collision overlay with explicit `walkableTiles` exemptions per `FurnitureItem`; validate with automated path tests covering all 7 rooms plus War Room before shipping.

4. **Idle behavior state conflicts with user actions and API status** — Idle walks can start while an agent is streaming, or BILLY can enter a room while an agent is at the water cooler. Must implement behavior priority (`USER_COMMAND > API_RESPONSE > IDLE_BEHAVIOR`), add `'idle-walk'` as an interruptible state distinct from user-initiated `'walk'`, and gate all idle triggers on `agentStatuses[id] !== 'thinking'`.

5. **Collaboration store architecture — concurrent chat plus background collaboration** — `chatStore.streaming` is a singleton that cannot handle concurrent user chat and background agent collaboration without state corruption. The `collaborationStore` with its own streaming state and abort lifecycle must be designed before any collaboration feature code is written. This is an architecture decision, not a feature addition.

6. **Context window explosion and runaway chains** — Passing full `buildContext()` output between agents accumulates 14K+ tokens per hop and degrades response quality. Use `buildCollaborationContext()` with a hard 2000-token handoff budget. Add a max 5-hop chain limit, circular reference detection via a `visitedAgents` Set, and JSON structured output for collaboration triggers rather than fragile regex sentinel tags.

---

## Implications for Roadmap

Based on the dependency graph established across all four research files, v2.0 decomposes into four sequential phases. The ordering is non-negotiable — each phase is a hard dependency for the one that follows.

### Phase 1: LimeZu Art Integration

**Rationale:** Pure visual work with zero behavioral risk. Unblocks all subsequent phases — collision shapes derive from LimeZu furniture tile dimensions, idle behaviors need LimeZu sit/stretch/phone animations, and collaboration walking animations look professional only with LimeZu characters in place. The sprite atlas remapping (SPRT-04 contract update) is the highest-risk item in this phase and must be done carefully.

**Delivers:** Professional pixel art across all 7 offices plus War Room. Replaces all placeholder programmatic art. Sets the visual baseline for the rest of v2.0.

**Addresses:** 32x32 character sprites, 16x16 environment tiles, Conference Hall assets, multi-sheet atlas loader

**Avoids:** Pitfall 1 (sprite size mismatch — audit LimeZu sheet layout before writing any code), Pitfall 2 (tile bleeding — multi-sheet atlas registry with padding-aware source rects)

**Research flag:** NEEDS RESEARCH-PHASE — the LimeZu sheet layout must be audited against purchased assets before implementation begins. Frame arrangement, animation counts per state, tile padding, and multi-file organization are unknown until assets are inspected. This single gap blocks all atlas remapping code from starting.

---

### Phase 2: Furniture Collision

**Rationale:** Small, well-scoped phase (~10-20 LOC for `collisionMap.ts` plus a single `isWalkable()` modification) that is a hard dependency for both Phase 3 (idle agents must navigate around desks) and Phase 4 (collaborating agents walk between offices). Doing this before idle behaviors means the pathfinding foundation is validated before more complex autonomous movement is layered on top.

**Delivers:** Physically accurate pathfinding. Agents navigate around furniture. BFS-based `findPath()` automatically benefits with zero changes to pathfinding logic.

**Addresses:** Furniture collision boundaries, walkability overlay, seat-tile exemptions for chairs, automated path validation tests

**Avoids:** Pitfall 3 (BFS path breakage — collision overlay preserves room structure, exempts seat tiles, validated with automated path tests for all required routes before shipping)

**Research flag:** SKIP — standard tile-based collision layer pattern with strong precedent. RPG Maker, Tiled, and every grid-based game engine use this exact derived-overlay approach. No novel elements.

---

### Phase 3: Idle Behaviors

**Rationale:** Depends on Phase 2 (agents need collision-aware paths to water cooler) and Phase 1 (sit/stretch/phone animations require LimeZu sprites). Provides the visual foundation for Phase 4 — collaboration walk animations are more convincing when agents are already demonstrating autonomous movement, and the interrupt system built here is reused directly by the collaboration orchestrator.

**Delivers:** Living office simulation. Agents work at desks, stretch, visit water cooler, and use phone on randomized timers (30-120 seconds). Immediate interrupt on user room entry or API activity, with a post-interaction cooldown before idle behaviors resume.

**Addresses:** Idle behavior state machine, POI definitions in `officeLayout.ts`, behavior interruption system, `'idle-walk'` interruptible state, per-agent cooldowns after user interaction

**Avoids:** Pitfall 4 (state conflicts — behavior priority system prevents idle walks during API activity; interrupt system returns agents to desk when BILLY enters)

**Research flag:** SKIP — weighted random timer plus state machine is the established simulation game pattern (The Sims, Two Point Hospital, Game Dev Tycoon all use this exact structure). Maps directly onto the existing `CharacterState` switch in `updateAllCharacters()`.

---

### Phase 4: Agent-to-Agent Collaboration

**Rationale:** The highest-complexity feature. Depends on Phases 1-3 being stable. Requires the most new code (orchestrator, collaboration store, context builder, approval UI). Must be designed as a parallel execution pipeline from day one — `chatStore` singleton streaming cannot be extended, only separated.

**Delivers:** Agents consult each other with user approval gates. Visual locomotion (agent walks to colleague's office). Streaming responses visible in collaboration panel. BILLY unblocked during background collaboration. Auto deal creation from collaboration output (requires user confirmation). Chain termination at max 5 hops with circular reference detection.

**Addresses:** Collaboration orchestrator, user approval queue, context passing, visual locomotion, auto deal creation with pending state, live viewing panel, concurrent BILLY activity

**Avoids:**
- Pitfall 5 (context explosion — `buildCollaborationContext()` with 2K token budget, no files or history passed)
- Pitfall 6 (runaway chains — max 5 hops, `visitedAgents` Set for loop detection, JSON structured triggers instead of regex sentinel tags)
- Pitfall 7 (store concurrency — dedicated `collaborationStore` with independent streaming state designed before writing feature code)
- Pitfall 8 (phantom deals — collaboration contexts strip Layer 5.5 deal creation capability; all agent-created deals enter `pending` state requiring explicit user confirmation)

**Research flag:** NEEDS RESEARCH-PHASE — three open design decisions must be resolved before implementation begins: (1) JSON structured output vs XML sentinel tags for collaboration triggers; (2) per-hop approval dialogs vs upfront chain plan with "approve all"; (3) `buildCollaborationContext()` token budget calibration. These are architecture decisions, not implementation details.

---

### Phase Ordering Rationale

- Art before everything: purely visual changes with zero behavioral risk; every subsequent phase benefits from professional art being in place during development
- Collision before idle: agents must not walk through furniture during autonomous movement cycles
- Idle before collaboration: validates `startWalk()` + interrupt integration before the higher-stakes collaboration feature depends on it; the idle behavior priority system is directly reused by the collaboration orchestrator
- Collaboration last: highest risk, most new code, most design decisions to make; all prior phases reduce unknowns and provide a stable visual foundation

All four research files converge on this exact ordering independently, which is the strongest validation of the phase sequence.

---

### Research Flags

**Needs `/gsd:research-phase` during planning:**
- Phase 1 (Art Integration): LimeZu actual sheet layout, frame counts per animation state, tile padding — must audit purchased assets before any atlas remapping code
- Phase 4 (Collaboration): collaboration trigger format (JSON vs sentinel tags), approval UX design (per-hop vs upfront chain plan), `buildCollaborationContext()` token budget calibration

**Standard patterns, skip research-phase:**
- Phase 2 (Collision): tile-based collision overlay is a solved, well-documented pattern; small scope (~20 LOC)
- Phase 3 (Idle Behaviors): weighted random timer plus state machine has strong simulation game precedent; maps cleanly onto existing architecture

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis confirms all v2.0 capabilities map to existing patterns; zero new dependencies validated by examining every integration point |
| Features | HIGH (art/collision/idle) MEDIUM (collaboration UX) | Art/collision/idle follow established game dev patterns; collaboration approval UX is novel application-specific design that will need iteration |
| Architecture | HIGH | All recommendations grounded in direct analysis of 15+ source files; phase ordering has hard dependencies that are unambiguous; anti-patterns identified with specific file references |
| Pitfalls | HIGH | Every pitfall traced through actual constant and function references in the codebase; not speculative |

**Overall confidence:** HIGH for execution plan; MEDIUM for collaboration UX details that require design validation before implementation

### Gaps to Address

- **LimeZu actual asset layout** (Phase 1 blocker): Frame counts, animation row/column arrangement, tile padding, and multi-file organization are unknown until the purchased pack is inspected. This single gap blocks all atlas remapping code. Resolve by auditing assets at the start of Phase 1 planning.

- **Collaboration trigger format** (Phase 4 design decision): Research flags XML sentinel tags (matches existing `parseDealAction` pattern, fragile with non-deterministic LLM output) versus JSON structured output (more reliable, requires different parsing). Pitfalls research recommends JSON for collaboration triggers given the higher stakes of autonomous agent actions. Must be decided in Phase 4 planning, not during implementation.

- **Collaboration approval UX** (Phase 4 design decision): Per-hop approval dialogs create friction at scale (5 dialogs in a row causes reflexive clicking). Upfront chain plan ("Patrik -> Marcos -> Sandra, estimated cost: $0.12, Approve all?") is more ergonomic but requires knowing the full chain in advance. Needs a design decision before building `CollaborationPanel`.

- **Idle behavior POI tile coordinates** (Phase 3 start): Water cooler and stretch zone positions in `officeLayout.ts` are illustrative in the research docs, not verified against the actual tile map. Must be confirmed against real room coordinates at Phase 3 start.

- **`buildCollaborationContext()` token budget** (Phase 4): The 2000-token handoff budget is a research recommendation based on typical agent response lengths. The actual budget must be calibrated against real Claude output during Phase 4 implementation; too tight and collaboration context is lossy, too loose and multi-hop chains become expensive.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `engine/` (types.ts, spriteAtlas.ts, spriteSheet.ts, renderer.ts, depthSort.ts, tileMap.ts, characters.ts, officeLayout.ts, gameLoop.ts), `store/` (officeStore.ts, chatStore.ts, dealStore.ts), `services/` (stream.ts, builder.ts, summarizer.ts, parseDealAction.ts), `hooks/useChat.ts`
- PROJECT.md v2.0 milestone specification and known issues list
- Anthropic SDK 0.78 streaming API — verified against `stream.ts` implementation

### Secondary (MEDIUM confidence)
- LimeZu Modern Interiors asset pack conventions — standard itch.io pixel art pack format (16x16 environment, 32x32 characters); actual layout requires asset inspection
- Multi-agent AI orchestration patterns — CrewAI, AutoGen (Microsoft), LangGraph agent-to-agent message passing

### Tertiary (well-established patterns, MEDIUM confidence)
- Tile-based collision layers — RPG Maker, Tiled Map Editor collision objects; decades-old standard applied to this codebase
- Idle behavior systems — The Sims, Two Point Hospital, Game Dev Tycoon weighted random timer plus state machine pattern
- Sprite atlas composition — TexturePacker, ShoeBox, custom build scripts; standard game dev pipeline

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*

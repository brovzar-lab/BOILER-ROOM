# Technology Stack: v2.0 Additions

**Project:** Lemon Command Center v2.0 -- Professional Art & Agent Autonomy
**Researched:** 2026-03-15
**Baseline:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS v4, Zustand 5, HTML5 Canvas 2D, Anthropic SDK 0.78

## Executive Assessment

**v2.0 requires ZERO new runtime dependencies.** The existing stack handles everything. This is a feature-architecture milestone, not a technology-addition milestone. Every v2.0 capability maps directly to patterns already established in the codebase.

The LimeZu art integration is a pure asset swap (the sprite sheet loading pipeline in `spriteSheet.ts` and atlas maps in `spriteAtlas.ts` were explicitly designed for this -- see the SPRT-04 asset swap contract in the code comments). Furniture collision is a tile map flag change. Idle behaviors extend the existing `CharacterState` union. Agent collaboration is an orchestration layer over the existing `sendStreamingMessage` + store pattern.

---

## Recommended Stack Changes

### New Runtime Dependencies: NONE

| Technology | Version | Purpose | Why NOT Needed |
|------------|---------|---------|----------------|
| Physics engine (matter.js, etc.) | -- | Collision | Tile-based collision is a walkability flag, not physics simulation. BFS pathfinding already respects `isWalkable()`. |
| State machine library (xstate, etc.) | -- | Idle behaviors | TypeScript union types + switch statements match existing `CharacterState` pattern. Adding xstate for 4-5 states is over-engineering. |
| Task queue library | -- | Agent collaboration | Native `Promise` chains with `AbortController` match existing War Room parallel streaming pattern. |
| Animation library | -- | Sprite animations | Canvas 2D `drawImage` with frame cycling already handles all animation. |
| Pathfinding library | -- | Enhanced routing | Existing BFS is correct for 4-connected grid. A* would be marginal gain on a 32x30 grid (< 1ms either way). |

### Dev Dependencies: No Changes

The existing toolchain (Vite 6, TypeScript 5.7, Vitest, sharp for sprite generation) covers all v2.0 needs.

### Anthropic SDK: No Upgrade Needed

Current `@anthropic-ai/sdk` 0.78.0 already supports:
- Streaming via `.stream()` method (used in `stream.ts`)
- AbortController cancellation (used for War Room cancel-all)
- System prompt + messages format (used in `buildContext`)

Agent-to-agent collaboration pipes output from one `sendStreamingMessage` call as input context to another. No new SDK features required.

---

## What Actually Changes (Architecture, Not Libraries)

### 1. Sprite Atlas Expansion (Asset Swap)

**What exists:** `spriteAtlas.ts` defines `CHARACTER_FRAMES` (24x32, 10col x 4row layout) and `ENVIRONMENT_ATLAS`/`DECORATION_ATLAS` (16x16 tiles). `spriteSheet.ts` loads PNGs from `/sprites/`.

**What changes for LimeZu:**

| Component | Current | v2.0 |
|-----------|---------|------|
| Character sheet layout | 24x32 frames, 10col x 4row (240x128px) | 32x32 frames from LimeZu pack. New layout mapping in `CHARACTER_FRAMES`. |
| Character sprite constants | `CHAR_SPRITE_W=24, CHAR_SPRITE_H=32` | `CHAR_SPRITE_W=32, CHAR_SPRITE_H=32` (LimeZu standard) |
| Environment tiles | Custom 16x16 in `environment.png` | LimeZu Modern Interiors 16x16 tiles. Rebuild `ENVIRONMENT_ATLAS` coordinates. |
| Tile count | ~30 environment sprites, ~10 decoration sprites | 100+ LimeZu tiles. `ENVIRONMENT_ATLAS` grows significantly. |
| Sprite sheets loaded | 6 character + 1 environment = 7 PNGs | 6 character + N environment/tileset PNGs. May need multiple environment sheets. |

**Key decision: 32x32 vs 24x32 characters.** LimeZu Modern Interiors characters are 32x32. Options:
- **Option A (recommended):** Change `CHAR_SPRITE_W` to 32 and update foot-center anchor math in `renderer.ts` (one line: `drawX = x - (32 - 16) / 2 = x - 8`). The depth sort already uses foot position, so Y-sorting stays correct.
- **Option B:** Crop/repack LimeZu 32x32 into 24x32 frames. Loses detail for no architectural benefit.

**Impact radius:** `types.ts` (constants), `spriteAtlas.ts` (atlas coordinates), `renderer.ts` (anchor math), `spriteSheet.ts` (sheet loading -- minimal, just paths).

### 2. Furniture Collision Layer

**What exists:** `tileMap.ts` has `isWalkable()` checking `FLOOR` or `DOOR`. Furniture is rendered by `depthSort.ts` but has no collision data. `FURNITURE` array in `officeLayout.ts` has `col, row, width, height` for every piece.

**What changes:**

| Component | Current | v2.0 |
|-----------|---------|------|
| `TileType` enum | `VOID=0, FLOOR=1, WALL=2, DOOR=3` | Add `FURNITURE=4` (or use a separate collision overlay) |
| `isWalkable()` | Returns true for `FLOOR` or `DOOR` | Returns false for `FURNITURE` tiles too |
| Tile map build | `buildTileMap()` fills rooms with `FLOOR` | After room fill, stamp furniture footprints as `FURNITURE` |
| BFS pathfinding | Already respects `isWalkable()` | Automatically avoids furniture -- zero changes to `findPath()` |

**Recommended approach:** Add a `FURNITURE` tile type to the enum. In `buildTileMap()`, after constructing the base map, iterate `FURNITURE` array and stamp blocking tiles. This is ~10 lines of code. Chairs should NOT block (characters sit in them). Tables, desks, bookshelves, and couches SHOULD block.

**No separate collision layer needed.** The existing single-layer `TileType[][]` is sufficient because furniture doesn't move. If furniture ever becomes dynamic, then add a collision overlay map -- but that is not in scope.

### 3. Idle Behavior State Machine

**What exists:** `CharacterState = 'idle' | 'walk' | 'work'` in `types.ts`. The `updateCharacter()` function in `characters.ts` switches on state. Agents currently sit at their desk in `idle` state doing nothing, or cycle `work` animation when "thinking."

**What changes:**

| Component | Current | v2.0 |
|-----------|---------|------|
| `CharacterState` | `'idle' \| 'walk' \| 'work'` | Keep these 3 states. Add `idleBehavior` sub-state field. |
| `updateCharacter()` | 3 cases in switch | `idle` case gains timer + sub-behavior transitions |
| Agent animation | idle=stationary, walk=4 frames, work=3 frames | Idle sub-behaviors reuse existing animations (walk to water cooler, work at desk, talk for phone) |
| Sprite atlas | 10 cols: idle(1), walk(4), work(3), talk(2) | No new animation states needed. Sub-behaviors map to existing states. |

**Recommended approach:** Keep `CharacterState` simple. Add an `idleBehavior` field to `Character`:

```typescript
type IdleBehavior = 'desk' | 'water-cooler' | 'stretch' | 'phone';

interface Character {
  // ... existing fields
  idleBehavior: IdleBehavior;
  idleTimer: number;        // seconds until next behavior change
  idleTarget?: TileCoord;   // where to walk for current behavior
}
```

The idle behavior system is a timer-driven loop that runs ONLY when `ch.state === 'idle'` and the agent is not engaged (no active conversation). Every 30-90 seconds (randomized), pick a new behavior:
- **"water-cooler"**: `startWalk()` to recreation area water cooler tile, idle there 5-10s, walk back to seatTile.
- **"stretch"**: Play idle animation at desk position (subtle frame cycling).
- **"phone"**: Use talk animation at desk (existing talk frames).
- **"desk"**: Default sit-at-desk (current behavior, no change).

**Integration with existing systems:** When BILLY enters the room or a stream starts, immediately interrupt: set `ch.state = 'walk'`, path back to seatTile, then transition to 'work' or 'idle' as appropriate. This mirrors the existing `disperseAgentsToOffices()` pattern.

### 4. Agent-to-Agent Collaboration Orchestration

**What exists:** `sendStreamingMessage()` in `stream.ts` sends to one agent, `buildContext()` creates system prompts, `parseDealAction()` extracts structured actions from responses. War Room already handles 5 parallel streams with per-agent abort controllers.

**What changes:**

| Component | Current | v2.0 |
|-----------|---------|------|
| Orchestration | User sends message -> one agent responds | Agent A responds -> parsed output -> user approves -> Agent B gets context -> responds |
| Message routing | Direct user-to-agent only | Agent-to-agent messages with source attribution |
| Deal creation | `<create-deal>` tag in agent response, user-triggered | Auto-created when collaboration chain starts |
| Stream management | Single stream or War Room parallel | Sequential chain with approval gates between hops |

**No new library needed.** The collaboration orchestrator is a service module:

```
1. Agent A receives user message, generates response
2. Response is parsed for <collaborate with="marcos" task="review contract terms"/>
3. UI shows approval dialog: "Patrik wants to ask Marcos to review contract terms. Allow?"
4. On approval: create conversation context with Agent A's output as input
5. sendStreamingMessage(agentB, contextFromAgentA)
6. Agent B responds, may trigger another <collaborate> tag
7. Repeat until no more collaboration tags or user cancels
```

**Key pattern:** This is a recursive `Promise` chain with user approval gates (async `Promise` that resolves on user click). Each hop is a standard `sendStreamingMessage` call. The orchestrator tracks the chain in a new Zustand store slice:

```typescript
interface CollaborationChain {
  id: string;
  dealId: string;
  steps: CollaborationStep[];
  status: 'pending-approval' | 'streaming' | 'complete' | 'cancelled';
}

interface CollaborationStep {
  fromAgent: AgentId;
  toAgent: AgentId;
  task: string;
  input: string;   // previous agent's response (context)
  output: string;  // this agent's response
  status: 'pending' | 'approved' | 'streaming' | 'complete' | 'rejected';
}
```

**Game engine integration:** When Agent A "visits" Agent B for collaboration, use `startWalk()` to walk Agent A's character to Agent B's office. The walking animation already exists. This is purely visual -- the API call happens regardless of walk completion.

### 5. Auto Deal Creation

**What exists:** `parseDealAction.ts` parses `<create-deal name="..." description="..."/>` from agent responses. `dealStore.ts` manages deal CRUD.

**What changes:** Add a `<collaborate>` tag parser alongside the existing `<create-deal>` parser. The collaboration orchestrator calls `dealStore.createDeal()` when starting a chain if no active deal exists.

This is a ~15-line addition to `parseDealAction.ts`:
- Add `parseCollaborateAction()` that extracts `with` and `task` attributes
- Add `stripCollaborateAction()` for display text cleaning

---

## Integration Points (How v2.0 Features Connect)

```
LimeZu Sprites ──> spriteAtlas.ts ──> renderer.ts (draw calls unchanged, just new coordinates)
                                   ──> spriteSheet.ts (load new PNGs, same loadSpriteSheet API)

Furniture Collision ──> officeLayout.ts (FURNITURE array already exists with col/row/width/height)
                    ──> tileMap.ts (stamp FURNITURE tiles in buildTileMap, add to isWalkable check)
                    ──> characters.ts (BFS already respects isWalkable -- zero changes)

Idle Behaviors ──> types.ts (extend Character interface with idleBehavior, idleTimer)
               ──> characters.ts (add idle timer logic in updateCharacter idle case)
               ──> officeLayout.ts (define idle target tiles: water cooler position, etc.)
               ──> renderer.ts (already renders any state with sprite frames -- zero changes)

Collaboration ──> NEW: services/collaboration/orchestrator.ts (chain management)
              ──> NEW: services/collaboration/parser.ts (or extend parseDealAction.ts)
              ──> NEW: store/collaborationStore.ts (chain state, approval tracking)
              ──> stream.ts (reuse sendStreamingMessage -- no changes)
              ──> chatStore.ts (collaboration messages stored in conversations)
              ──> characters.ts (startWalk for visual agent-visits between offices)
              ──> officeStore.ts (agentStatuses extended for 'collaborating' status)
```

---

## What NOT to Add

| Temptation | Why Resist |
|------------|-----------|
| **XState for idle behaviors** | 4 idle states with timer transitions is a simple switch statement. XState's value is in complex state charts with guards/actions/parallel states. This is not that. |
| **Tiled map editor export format** | LimeZu tiles will be hand-placed in `officeLayout.ts` data arrays, matching the existing pattern. Importing Tiled `.tmx`/`.json` adds parsing complexity for a fixed 32x30 map that changes rarely. |
| **TexturePacker / sprite sheet packing tool** | LimeZu already ships as organized sprite sheets. Manual atlas coordinate mapping in `spriteAtlas.ts` gives full control and zero build-time dependencies. |
| **A* pathfinding library** | BFS on a 32x30 grid (960 tiles) runs in microseconds. A* saves nothing at this scale. |
| **React state machine (useReducer for collaboration)** | Collaboration state belongs in Zustand, matching every other store in the codebase. The game loop reads via `getState()` (non-reactive), React subscribes reactively. Do not break this pattern. |
| **Message queue (RxJS, etc.)** | Agent-to-agent messages are sequential with user approval gates. A Promise chain with AbortController handles this cleanly. RxJS is overkill for "wait for response, ask user, send next." |
| **Web Workers for pathfinding** | BFS on 960 tiles takes <0.1ms. Moving it off-thread adds message-passing complexity for zero performance gain. |
| **Canvas rendering library (PixiJS, Phaser)** | The 6-layer setTransform pipeline is already built and working. Migrating to a framework would be a rewrite, not an upgrade. |
| **LangChain / AI orchestration framework** | The collaboration chain is 3 concepts: parse tag, await approval, pipe context. LangChain adds 500KB+ for abstractions the app does not need. The existing `sendStreamingMessage` + `buildContext` pattern handles this directly. |

---

## New Files to Create (v2.0)

| File | Purpose | Estimated Size |
|------|---------|---------------|
| `src/services/collaboration/orchestrator.ts` | Chain execution: parse collaborate tags, manage approval flow, pipe context between agents | ~150 LOC |
| `src/services/collaboration/parser.ts` | Parse `<collaborate>` tags from agent responses | ~40 LOC |
| `src/store/collaborationStore.ts` | Zustand store for collaboration chain state, step tracking, approval status | ~100 LOC |
| `src/components/CollaborationPanel.tsx` | UI for viewing/approving collaboration chain steps | ~200 LOC |
| `src/components/ApprovalDialog.tsx` | Modal for approving individual collaboration hops | ~80 LOC |
| `src/engine/idleBehavior.ts` | Timer-driven idle behavior logic, separated from `characters.ts` for clarity | ~120 LOC |

**Total new code estimate:** ~700 LOC across 6 new files, plus ~200 LOC modifications to existing files.

---

## Existing Stack: Version Verification

All current dependencies are at appropriate versions for v2.0 work:

| Dependency | Current | Action |
|------------|---------|--------|
| `@anthropic-ai/sdk` | 0.78.0 | No upgrade needed. Streaming + abort works. |
| `react` | ^19 | Current. No new React features needed for collaboration UI. |
| `zustand` | ^5 | Current. New store slice for collaboration follows existing pattern. |
| `vite` | ^6 | Current. Static asset handling for new LimeZu sprite PNGs. |
| `typescript` | ^5.7 | Current. Discriminated unions for new types. |
| `tailwindcss` | ^4 | Current. Approval dialog and collaboration panel styling. |
| `idb` | ^8 | Current. Collaboration chains can persist to IndexedDB using existing adapter. |

---

## Installation

```bash
# No new packages to install.
# v2.0 is entirely new TypeScript code + LimeZu PNG assets.

# Asset preparation (one-time):
# 1. Prepare LimeZu Modern Interiors character sprites -> public/sprites/{characterId}.png
#    - Repack LimeZu 32x32 character frames into the expected sheet layout
#    - 6 sheets: billy.png, patrik.png, marcos.png, sandra.png, isaac.png, wendy.png
#
# 2. Prepare LimeZu environment tiles -> public/sprites/environment.png (or multiple sheets)
#    - Map LimeZu floor/wall/furniture tile coordinates
#    - Rebuild ENVIRONMENT_ATLAS and DECORATION_ATLAS in spriteAtlas.ts
#
# 3. Update types.ts: CHAR_SPRITE_W = 32 (from 24)
#
# 4. Update spriteAtlas.ts: CHARACTER_FRAMES for 32x32 layout
#    - Column/row structure may differ from current 10x4 layout
#    - Depends on how LimeZu animations are organized
#
# 5. Update renderer.ts: foot-center anchor drawX = x - (32 - 16) / 2
```

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| Zero new runtime dependencies | HIGH | Direct codebase analysis -- every integration point maps to existing patterns |
| LimeZu sprite integration path | HIGH | `spriteAtlas.ts` SPRT-04 contract explicitly designed for asset swaps |
| Furniture collision via TileType | HIGH | `isWalkable()` + `findPath()` already respect tile types; adding FURNITURE is trivial |
| Idle behavior without XState | HIGH | Existing `CharacterState` switch in `updateCharacter()` is the proven pattern |
| Collaboration via Promise chains | MEDIUM | War Room parallel streaming validates the pattern, but sequential chaining with user approval gates is architecturally new. Edge cases around cancellation mid-chain, chain persistence across page reloads, and concurrent BILLY activity during background collaboration need careful design. |
| Auto deal creation extension | HIGH | `parseDealAction.ts` pattern is proven; adding `<collaborate>` tag is identical approach |
| No Anthropic SDK upgrade needed | HIGH | `sendStreamingMessage()` already has all needed capabilities for agent-to-agent context routing |
| ~700 LOC new code estimate | MEDIUM | Based on comparable features in the codebase; collaboration orchestrator complexity may be higher |

---

## Sources

- **Direct codebase analysis** (HIGH): `spriteSheet.ts`, `spriteAtlas.ts`, `tileMap.ts`, `characters.ts`, `types.ts`, `officeLayout.ts`, `renderer.ts`, `depthSort.ts`, `stream.ts`, `chatStore.ts`, `officeStore.ts`, `parseDealAction.ts`, `package.json`
- **LimeZu Modern Interiors** (MEDIUM): Standard 16x16 tile, 32x32 character format -- standard pixel art asset pack conventions
- **Anthropic SDK 0.78** (HIGH): Streaming API verified from `stream.ts` implementation in codebase

---
*Stack research for: Lemon Command Center v2.0 Professional Art & Agent Autonomy*
*Researched: 2026-03-15*

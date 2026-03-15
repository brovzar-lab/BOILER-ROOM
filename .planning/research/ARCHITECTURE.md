# Architecture Research: v2.0 Integration Points

**Domain:** JRPG-style multi-agent AI workspace -- adding professional art, collision, idle behaviors, and agent-to-agent collaboration
**Researched:** 2026-03-15
**Confidence:** HIGH (based on direct codebase analysis; all recommendations grounded in existing code)

## Existing Architecture Overview

```
+-----------------------------------------------------------------------+
|                          React DOM Layer                               |
|  +------------+  +------------+  +-------------+  +----------------+  |
|  | ChatPanel  |  | DealSidbar |  | MemoryPanel |  | OfficeCanvas   |  |
|  +-----+------+  +-----+------+  +------+------+  +-------+--------+  |
|        |              |                |                  |            |
+--------+--------------+----------------+------------------+------------+
|                      Zustand Store Layer                               |
|  +----------+  +-----------+  +----------+  +---------+  +----------+ |
|  | chatStore|  | dealStore |  | fileStore|  |memoryStr|  |officeStr | |
|  +----------+  +-----------+  +----------+  +---------+  +----+-----+ |
+-----------------------------------------------+-----------+----+------+
|                      Service Layer             |  Canvas Engine        |
|  +----------+  +---------+  +------------+     | +----------+         |
|  | anthropic|  | context |  | memory     |     | | gameLoop |         |
|  | /stream  |  | /builder|  | /extract   |     | | renderer |         |
|  +----------+  +---------+  +------------+     | | characters|        |
|  +----------+  +---------+                     | | tileMap  |         |
|  | actions  |  | files   |                     | | depthSort|         |
|  +----------+  +---------+                     | +----------+         |
+------------------------------------------------+-----------------------+
```

### Three-World Separation (Existing)

| World | Technology | Owns | Update Pattern |
|-------|-----------|------|----------------|
| Game Engine | Canvas 2D, rAF loop | Characters, camera, tiles, rendering | 60fps via `getState()` (non-reactive) |
| Chat Interface | React DOM | Conversation UI, deal sidebar, file viewer | React re-renders via Zustand subscriptions |
| Services/Stores | Framework-agnostic TS | API calls, persistence, context building | Called by hooks and engine, reads stores |

### Key Architectural Contracts

1. **Sprite Sheet Contract (SPRT-04):** Character PNGs at `public/sprites/{id}.png`, layout 10 cols x 4 rows at 24x32. Environment PNG at `public/sprites/environment.png`, 16 cols x 12 rows at 16x16.
2. **Tile Map Contract:** `OFFICE_TILE_MAP` is a `TileType[][]` (VOID/FLOOR/WALL/DOOR). BFS pathfinding via `findPath()` respects only FLOOR and DOOR as walkable.
3. **Character State Machine:** Three states: `idle | walk | work`. Walk uses BFS path with lerp interpolation. Work cycles animation frames. Idle does nothing.
4. **Store Update Discipline:** officeStore updates only on meaningful state changes (room arrival, zoom change), never per-frame.
5. **Depth Sort Contract:** All visible objects go through `buildRenderables()` with Y-sort by `baseRow`. Priority 0 = furniture/decorations, priority 1 = characters.
6. **Agent Action Pattern:** Agents emit sentinel tags in response text (e.g., `<create-deal .../>`), parsed by `parseDealAction()`, handled in `useChat.onComplete`.

---

## v2.0 Integration Architecture

### Integration Point 1: LimeZu Sprite Sheet Mapping

**What changes:** Replace 24x32 programmatic character sprites with 32x32 LimeZu sprites. Replace 16x16 environment sheet with LimeZu Modern Interiors tiles.

**Where it integrates:**

| File | Change Type | What Changes |
|------|------------|--------------|
| `engine/types.ts` | MODIFY | `CHAR_SPRITE_W = 32`, `CHAR_SPRITE_H = 32` (was 24x32) |
| `engine/spriteAtlas.ts` | MODIFY | `makeCharFrame()` uses new 32x32 grid; column layout will differ from current 10x4 |
| `engine/spriteSheet.ts` | MODIFY (minor) | `loadAllAssets()` paths unchanged if PNGs keep same names |
| `engine/renderer.ts` | MODIFY | Foot-center anchor math changes: `drawX = x - (32 - 16) / 2 = x - 8` (was x - 4), `drawY = y - (32 - 16) = y - 16` (unchanged if 32 tall) |
| `engine/depthSort.ts` | NO CHANGE | baseRow uses `ch.y / TILE_SIZE` which is tile-based, independent of sprite dimensions |
| `public/sprites/*.png` | REPLACE | Drop new PNGs, same filenames |

**Critical constraint:** LimeZu character sprites use a different sheet layout than the current 10-column (idle/walk4/work3/talk2) arrangement. The `spriteAtlas.ts` `stateConfigs` array must be remapped to match LimeZu's actual frame layout. This is the highest-risk integration point because it touches rendering of every character on every frame.

**Recommended approach:**
1. Audit the LimeZu character sheet layout to determine exact frame positions
2. Create updated `stateConfigs` in `spriteAtlas.ts` mapping to LimeZu positions
3. Update `CHAR_SPRITE_W` / `CHAR_SPRITE_H` in `types.ts`
4. Keep the existing fallback (colored rectangles) until all characters are swapped
5. Add new animation states (`sit`, `phone`) to `CharacterState` type for idle behaviors

**Environment tiles (16x16):** LimeZu Modern Interiors uses 16x16 tiles -- matches `TILE_SIZE = 16` exactly. The `ENVIRONMENT_ATLAS` keys need remapping to LimeZu tile positions, but the rendering pipeline is unchanged. Furniture rendering in `renderFurnitureSprite()` already composes multi-tile items from single-tile atlas entries.

**LimeZu UI elements:** These integrate into the React DOM layer (chat panels, deal sidebar), not the Canvas engine. They are CSS/image assets applied to existing React components. No architectural changes needed -- purely visual replacement.

---

### Integration Point 2: Furniture Collision System

**What changes:** Characters currently walk through furniture. Furniture tiles need to be marked unwalkable.

**Where it integrates:**

| File | Change Type | What Changes |
|------|------------|--------------|
| `engine/collisionMap.ts` | NEW FILE | Builds walkability overlay from tile map + furniture |
| `engine/tileMap.ts` | MODIFY | `isWalkable()` delegates to collision map |
| `engine/characters.ts` | NO CHANGE | Already uses `findPath()` which calls `isWalkable()` |
| `engine/officeLayout.ts` | NO CHANGE | Furniture data already has col/row/width/height |

**Recommended approach -- Collision Overlay Map:**

Do NOT modify `OFFICE_TILE_MAP` directly (it defines room structure, not furniture). Build a derived walkability map at initialization:

```typescript
// engine/collisionMap.ts (NEW FILE)

let walkabilityMap: boolean[][] = [];

export function buildWalkabilityMap(): boolean[][] {
  const rows = OFFICE_TILE_MAP.length;
  const cols = OFFICE_TILE_MAP[0]!.length;
  const map: boolean[][] = [];

  // Base walkability from tile types
  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      const tile = OFFICE_TILE_MAP[r]![c]!;
      row.push(tile === TileType.FLOOR || tile === TileType.DOOR);
    }
    map.push(row);
  }

  // Stamp furniture footprints as unwalkable (skip chairs -- agents sit in them)
  for (const item of FURNITURE) {
    if (item.type === 'chair') continue;
    for (let r = item.row; r < item.row + item.height; r++) {
      for (let c = item.col; c < item.col + item.width; c++) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          map[r]![c] = false;
        }
      }
    }
  }

  walkabilityMap = map;
  return map;
}

export function isWalkableWithFurniture(col: number, row: number): boolean {
  if (row < 0 || row >= walkabilityMap.length) return false;
  return walkabilityMap[row]?.[col] ?? false;
}
```

Then modify `tileMap.ts::isWalkable()` to delegate to `isWalkableWithFurniture()`, or pass the collision map to `findPath()`.

**Why a separate overlay, not modifying OFFICE_TILE_MAP:** The tile map encodes room structure (`getRoomAtTile()` depends on it). Furniture is a separate layer. Mixing them makes room editing brittle. The collision overlay is derived data, computed once from source data.

**Agent seat tiles must remain walkable.** `seatTile` and `billyStandTile` for each room must be excluded from furniture collision stamps. Currently chairs occupy seat positions, so skipping `type === 'chair'` handles this. Verify no desk tiles overlap `billyStandTile` positions.

---

### Integration Point 3: Idle Behavior State Machine

**What changes:** Agents currently have 3 states (`idle | walk | work`). Idle does nothing. v2.0 adds autonomous idle behaviors: work at desk, get water, stretch.

**Where it integrates:**

| File | Change Type | What Changes |
|------|------------|--------------|
| `engine/idleBehavior.ts` | NEW FILE | Idle behavior state machine, POI definitions |
| `engine/types.ts` | MODIFY | Expand `CharacterState` with `sit`, `stretch`, etc. |
| `engine/characters.ts` | MODIFY | `updateAllCharacters()` ticks idle behaviors |
| `engine/officeLayout.ts` | MODIFY (minor) | Add IDLE_POIS for water cooler, stretch zones |
| `engine/spriteAtlas.ts` | MODIFY | Add frame mappings for new animation states |
| `store/officeStore.ts` | NO CHANGE | `agentStatuses` unchanged; idle behaviors are engine-internal |

**Recommended approach -- Hierarchical State Machine:**

```typescript
// engine/idleBehavior.ts (NEW FILE)

type IdleSubState =
  | { type: 'seated'; timer: number }           // working at desk
  | { type: 'walking-to-poi'; poi: string }     // heading to water cooler
  | { type: 'at-poi'; poi: string; timer: number } // standing at water cooler
  | { type: 'returning-to-desk' };              // walking back to seat

interface AgentIdleState {
  subState: IdleSubState;
  nextActionTime: number;  // seconds until next behavior check
}

// Module-scoped state -- NOT in Zustand
const agentIdleStates = new Map<string, AgentIdleState>();
```

**Key design decision: Idle behaviors are engine-local state, NOT Zustand store state.**

Rationale: Idle behaviors update per-frame (timers, sub-states). The store update discipline forbids per-frame writes. Idle state is purely visual -- it has no meaning to the React UI layer. Store it in a `Map<string, AgentIdleState>` module variable, ticked from `updateAllCharacters()`.

**Interaction with existing agent status system:** When `agentStatuses[id]` is `'thinking'` (agent streaming response), idle behavior is paused -- they switch to `work` animation. When status returns to `'idle'`, idle behavior resumes. The existing bridge in `updateAllCharacters()` already handles these transitions; idle behaviors layer underneath.

**POI definitions:** Add to `officeLayout.ts`:

```typescript
export const IDLE_POIS: Record<string, TileCoord[]> = {
  'water-cooler': [
    { col: 15, row: 9 },   // hallway water cooler
    { col: 10, row: 23 },  // rec area water cooler
  ],
  'stretch-zone': [
    { col: 8, row: 15 },   // left corridor
    { col: 23, row: 15 },  // right corridor
  ],
};
```

**Out of scope (per PROJECT.md):** Agents visiting each other's offices (idle social visits). Idle behaviors are personal activities only -- agent walks to water cooler and back to own desk, never into another agent's room.

---

### Integration Point 4: Agent-to-Agent Collaboration Service

**What changes:** Agents autonomously converse with each other, producing work. User approves each hop. BILLY can keep working during collaboration.

**Where it integrates:**

| File | Change Type | What Changes |
|------|------------|--------------|
| `services/collaboration/orchestrator.ts` | NEW FILE | Chain execution, hop management |
| `services/collaboration/contextBuilder.ts` | NEW FILE | Build collaboration-specific context |
| `services/actions/parseCollabAction.ts` | NEW FILE | Parse `<collaborate-with .../>` sentinel |
| `store/collaborationStore.ts` | NEW FILE | Chain state, approval queue |
| `components/chat/CollaborationPanel.tsx` | NEW FILE | View/approve collaboration chains |
| `hooks/useCollaboration.ts` | NEW FILE | Wire collab store to UI |
| `hooks/useChat.ts` | MODIFY | `onComplete` detects collaboration sentinel tags |
| `services/context/builder.ts` | MODIFY | New collaboration context layer |
| `engine/characters.ts` | MODIFY | Agent walk-to-office animation during collab |
| `store/dealStore.ts` | NO CHANGE | `createDeal()` already exists |

**This is the most architecturally significant new feature.** It creates a parallel execution context alongside user-to-agent chat.

**Recommended architecture -- Collaboration Service Layer:**

```
+-------------------------------------------------------------------+
|                  Collaboration Orchestration                       |
|  +-------------------+  +------------------+  +----------------+  |
|  | CollaborationStore|  | orchestrator.ts  |  | CollabPanel UI |  |
|  | (approval queue,  |  | (chain exec,     |  | (live view,    |  |
|  |  chain state,     |  |  agent API calls, |  |  approve/deny) |  |
|  |  active chains)   |  |  context passing) |  +-------+--------+  |
|  +--------+----------+  +--------+---------+          |            |
|           |                      |                    |            |
+-----------+----------------------+--------------------+------------+
            |                      |
   +--------v----------+  +-------v----------+
   | officeStore       |  | chatStore        |
   | (agent walking    |  | (persist collab  |
   |  animations)      |  |  messages)       |
   +-------------------+  +------------------+
```

**New store: `collaborationStore.ts`**

```typescript
interface CollaborationChain {
  id: string;
  dealId: string;
  originAgentId: AgentId;
  currentAgentId: AgentId;
  targetAgentId: AgentId;
  status: 'awaiting-approval' | 'in-progress' | 'completed' | 'cancelled';
  hops: CollaborationHop[];
  createdAt: number;
}

interface CollaborationHop {
  fromAgent: AgentId;
  toAgent: AgentId;
  context: string;      // what the sending agent wants
  response?: string;    // what the receiving agent produced
  status: 'pending' | 'approved' | 'streaming' | 'complete';
  approvedAt?: number;
}

interface CollaborationState {
  activeChains: CollaborationChain[];
  pendingApprovals: CollaborationHop[];

  proposeHop: (chain: CollaborationChain, hop: CollaborationHop) => void;
  approveHop: (chainId: string, hopIndex: number) => void;
  denyHop: (chainId: string, hopIndex: number) => void;
  completeHop: (chainId: string, hopIndex: number, response: string) => void;
}
```

**Why a separate store, not extending chatStore:** chatStore manages user-to-agent conversations with per-deal indexing, single-stream mode, and War Room parallel mode. Agent-to-agent collaboration has a fundamentally different lifecycle: multiple concurrent chains, approval queues, background execution while user chats. Mixing these concerns would violate chatStore's single responsibility and create tangled state transitions.

**How agent-to-agent API calls work:**

The collaboration service reuses `sendStreamingMessage()` from `services/anthropic/stream.ts` with modified context. Instead of user conversation history, it builds context from:
1. Base system prompt (layer 1, same)
2. Agent persona (layer 2, same)
3. Deal context (layer 3, same)
4. **Collaboration context (NEW layer):** "Agent X has asked you to help with: {context}. Their relevant findings: {summary}"
5. Memory/files (layers 4-5, same)

This means `buildContext()` needs a new optional parameter for collaboration context, similar to the existing `crossVisibilityBlock` parameter.

**How auto deal creation integrates:**

The existing `parseDealAction()` pattern already handles `<create-deal ... />` sentinel tags. When a collaboration needs a new deal, the initiating agent's response includes the sentinel. The collaboration service detects it (same as `useChat.onComplete`) and calls `dealStore.createDeal()`. No new mechanism needed.

**Canvas animation during collaboration:**

When a collaboration hop is approved and in-progress:
1. Sending agent walks from their office to receiving agent's office (reuses `startWalk()`)
2. Both agents face each other (reuses `getCharacterDirection()`)
3. Receiving agent enters `work` state (typing animation)
4. On completion, sending agent walks back

This uses the same movement system as War Room gathering. The engine integration is minimal: collaboration service calls `startWalk()` and sets `agentStatuses`.

**Concurrent user activity:**

BILLY's chat flow is completely independent of the collaboration pipeline. The user can walk to any room and chat while agents collaborate in the background. The only shared resource is the Anthropic API -- concurrent requests are fine (client-side, rate limits per-key).

---

### Integration Point 5: Auto Deal Creation from Agent Collaboration

**What changes:** When agent collaboration is triggered and no deal exists for the topic, a deal is auto-created.

**Where it integrates:** Already solved by existing patterns. The collaboration service reuses `parseDealAction()`:

```typescript
// In collaboration service, after receiving agent response:
const dealAction = parseDealAction(agentResponse);
if (dealAction) {
  const newDealId = await dealStore.createDeal(dealAction.name, dealAction.description);
  collaborationStore.updateChainDeal(chainId, newDealId);
}
```

No new architecture needed. The sentinel tag pattern is the mechanism.

---

## Recommended Project Structure (New Files)

```
src/
  engine/
    collisionMap.ts          # NEW: Furniture collision overlay
    idleBehavior.ts          # NEW: Agent idle behavior state machine
    types.ts                 # MODIFY: New CharacterState values, sprite dimensions
    characters.ts            # MODIFY: Tick idle behaviors in update loop
    officeLayout.ts          # MODIFY: Add IDLE_POIS
    spriteAtlas.ts           # MODIFY: LimeZu frame mappings, new animation states
    renderer.ts              # MODIFY: Updated sprite dimensions in anchor math
  store/
    collaborationStore.ts    # NEW: Agent-to-agent chain state
  services/
    collaboration/
      orchestrator.ts        # NEW: Chain execution, hop management
      contextBuilder.ts      # NEW: Build collaboration-specific prompt context
    actions/
      parseCollabAction.ts   # NEW: Parse <collaborate-with .../> sentinel
  components/
    chat/
      CollaborationPanel.tsx # NEW: View/approve collaboration chains
      CollabHopCard.tsx      # NEW: Individual hop approval UI
  hooks/
    useCollaboration.ts      # NEW: Hook wiring collab store to UI
```

---

## Data Flow: New Flows

### Flow 1: Furniture Collision (Build Time)

```
officeLayout.ts::FURNITURE
    |
    v
collisionMap.ts::buildWalkabilityMap()  -- called once at init
    |
    v
walkabilityMap: boolean[][]  -- cached module variable
    |
    v (read by)
tileMap.ts::isWalkable() -> findPath() -> characters.ts
```

### Flow 2: Idle Behavior Loop (Per Frame)

```
gameLoop.ts::frame()
    |
    v
characters.ts::updateAllCharacters(dt)
    |
    +--> For each agent where agentStatuses[id] !== 'thinking':
    |      idleBehavior.ts::tickIdleBehavior(agentId, dt)
    |        |
    |        +--> Timer expires? Pick random behavior
    |        +--> 'walking-to-poi'? Call startWalk() to water cooler
    |        +--> 'at-poi'? Run timer, then set 'returning-to-desk'
    |        +--> 'returning-to-desk'? Call startWalk() to seatTile
    v
    Character.state updates (walk/idle) -- engine-local, no store writes
```

### Flow 3: Agent-to-Agent Collaboration

```
User sends message to Agent A
    |
    v
useChat.onComplete()
    |
    +--> parseDealAction() -- existing
    +--> parseCollabAction() -- NEW: detects <collaborate-with .../>
           |
           v
    collaborationStore.proposeHop(chain, hop)
           |
           v
    CollaborationPanel shows pending approval
           |
           v (user clicks Approve)
    collaborationStore.approveHop()
           |
           v
    orchestrator.executeHop()
      1. startWalk(agentA, agentB.office)     -- canvas animation
      2. officeStore.setAgentStatus(agentB, 'thinking')
      3. sendStreamingMessage(agentB, collabContext)
      4. On complete: collaborationStore.completeHop()
      5. Check for next hop or chain completion
           |
           v
    If agentB response contains <collaborate-with agentC .../>:
      Recurse: proposeHop() for next leg
```

---

## Architectural Patterns

### Pattern 1: Engine-Local State for Visual-Only Data

**What:** Per-frame visual state (idle behavior timers, animation sub-states) lives in module-scoped Maps, not Zustand stores.
**When to use:** Data that changes every frame, has no meaning to React UI, and does not need persistence.
**Trade-offs:** Invisible to React DevTools; cannot trigger React re-renders. This is a feature -- it prevents 60fps store churn.

### Pattern 2: Sentinel Tag Action Parsing

**What:** Agents embed structured XML-like tags in natural language responses. A parser extracts the action, the orchestration layer executes it.
**When to use:** Any new agent-initiated action (deal creation, collaboration requests).
**Trade-offs:** Fragile if agent does not emit the tag correctly. Mitigated by clear prompt instructions and forgiving regex parsing.

**Extend for collaboration:**
```typescript
// <collaborate-with agent="marcos" context="Review the loan terms"/>
export function parseCollabAction(content: string): CollabAction | null { ... }
```

### Pattern 3: Derived Data Maps (Collision Overlay)

**What:** Compute a derived data structure from source data (tile map + furniture = walkability map). Cache it. Recompute on source change.
**When to use:** When multiple data sources combine for a query-optimized structure.
**Trade-offs:** Must recompute when sources change. For static furniture, compute once at init.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying OFFICE_TILE_MAP for Collision

**What people do:** Mark furniture tiles as WALL in the tile map.
**Why it's wrong:** Tile map defines room structure (`getRoomAtTile()` depends on it). Marking furniture as WALL breaks room detection, floor rendering, and makes the map impossible to reason about.
**Do this instead:** Separate collision overlay that composes tile walkability + furniture footprints.

### Anti-Pattern 2: Storing Idle Behavior State in Zustand

**What people do:** Put idle timers, sub-states, and POI targets in officeStore.
**Why it's wrong:** 60fps timer updates would trigger store mutations and potential React re-renders. The store update discipline explicitly forbids per-frame writes.
**Do this instead:** Module-scoped Map in `idleBehavior.ts`, ticked from game loop.

### Anti-Pattern 3: Extending chatStore for Agent-to-Agent Collaboration

**What people do:** Add collaboration chains, approval queues, multi-agent streaming into chatStore.
**Why it's wrong:** chatStore manages user-to-agent conversations with single-stream and War Room modes. Agent-to-agent is a parallel pipeline with different lifecycle (approval gates, background execution, chain state). Mixing creates a god-store with tangled state transitions.
**Do this instead:** New `collaborationStore` with its own state shape, connected to chatStore only for message persistence.

### Anti-Pattern 4: Hardcoding LimeZu Frame Positions in Renderer

**What people do:** Put sprite sheet coordinates directly in `renderCharacterWorld()`.
**Why it's wrong:** The existing architecture correctly separates atlas (coordinates) from renderer (drawing). Hardcoding breaks the swap contract.
**Do this instead:** Update `spriteAtlas.ts` frame mappings. Renderer remains coordinate-agnostic.

### Anti-Pattern 5: Making Collaboration Blocking

**What people do:** Lock BILLY's chat while agent-to-agent collaboration runs.
**Why it's wrong:** The PROJECT.md requirement explicitly states "BILLY can keep working while agents collaborate independently." The user's primary workflow must not be interrupted.
**Do this instead:** Collaboration runs as a separate async pipeline. The only user interaction point is the approval step, shown as a non-blocking notification in the CollaborationPanel.

---

## Integration Boundaries

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Idle behaviors <-> Character system | Direct function calls in game loop | `tickIdleBehavior()` calls `startWalk()`, reads `Character.state` |
| Collision map <-> Pathfinding | Collision map replaces `isWalkable()` internals | Single integration point in `tileMap.ts` |
| Collaboration service <-> Chat | Reuses `sendStreamingMessage()` | Same API client, different context builder |
| Collaboration service <-> Engine | Calls `startWalk()` for agent movement | Same as War Room gathering pattern |
| Collaboration store <-> Deal store | Calls `dealStore.createDeal()` | Existing API, no new coupling |
| LimeZu sprites <-> Renderer | spriteAtlas.ts coordinate mapping | Same contract as current programmatic sprites |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic API | Existing `stream.ts` + `retryBackoff.ts` | Collaboration adds concurrent requests; rate limiting per-API-key |
| IndexedDB | Existing persistence adapter | Collaboration messages persist via same `addMessage()` path |

---

## Build Order (Dependency-Driven)

Based on the dependency graph between features:

```
Phase 1: LimeZu Art Integration
  - No dependencies on other v2.0 features
  - Unblocks: visual quality for all subsequent features
  - Risk: sprite atlas remapping (highest effort in this phase)
  - Scope: types.ts, spriteAtlas.ts, sprite PNGs, renderer anchor math

Phase 2: Furniture Collision
  - Depends on: Phase 1 (LimeZu furniture tiles define visual collision shapes)
  - Unblocks: Phase 3 (idle behaviors need collision-aware pathfinding)
  - Risk: low (small, well-scoped change to walkability)
  - Scope: collisionMap.ts (new), tileMap.ts (modify isWalkable)

Phase 3: Idle Behaviors
  - Depends on: Phase 2 (agents must not walk through furniture)
  - Depends on: Phase 1 (need sit/stretch/phone animations from LimeZu)
  - Unblocks: Phase 4 (visual foundation for agent movement)
  - Risk: medium (state machine complexity, animation timing tuning)
  - Scope: idleBehavior.ts (new), characters.ts, officeLayout.ts (POIs)

Phase 4: Agent-to-Agent Collaboration
  - Depends on: Phase 2 (agents walk between offices with collision)
  - Benefits from: Phase 3 (visually compelling idle -> walk transitions)
  - Most complex feature; benefits from all prior phases being stable
  - Risk: high (new execution pipeline, approval UX, concurrent state)
  - Scope: collaboration/ directory, collaborationStore, CollabPanel, useChat modification
```

**Phase ordering rationale:**
- Art first because it is purely visual, zero behavioral risk, and makes all subsequent work look professional during development.
- Collision before idle because idle behaviors that walk through furniture look broken.
- Idle before collaboration because collaboration reuses `startWalk()` which should already be tested with collision + idle integration.
- Collaboration last because it is the highest-risk, highest-complexity feature and benefits from a stable visual foundation.

---

## Sources

- Direct codebase analysis of all files in `/Users/quantumcode/CODE/BOILER-ROOM/src/`
- `engine/types.ts` -- sprite dimensions, character state machine contract
- `engine/officeLayout.ts` -- tile map, furniture data, room definitions, ROOMS[], FURNITURE[]
- `engine/characters.ts` -- character update loop, War Room gathering pattern, startWalk()
- `engine/tileMap.ts` -- BFS pathfinding, isWalkable()
- `engine/spriteAtlas.ts` -- sprite sheet coordinate contract (SPRT-04), CHARACTER_FRAMES
- `engine/depthSort.ts` -- Y-sorted rendering pipeline, Renderable interface
- `engine/renderer.ts` -- 6-layer rendering pipeline, renderCharacterWorld()
- `engine/spriteSheet.ts` -- asset loading, loadAllAssets()
- `store/officeStore.ts` -- Zustand bridge, store update discipline, Character creation
- `store/chatStore.ts` -- conversation management, War Room streaming, streaming state
- `store/dealStore.ts` -- deal CRUD, switchDeal(), createDeal()
- `hooks/useChat.ts` -- orchestration hook, sentinel tag handling in onComplete
- `services/actions/parseDealAction.ts` -- action parsing pattern (sentinel tags)
- `services/context/builder.ts` -- 5-layer system prompt assembly, crossVisibilityBlock

---
*Architecture research for: Lemon Command Center v2.0 integration*
*Researched: 2026-03-15*

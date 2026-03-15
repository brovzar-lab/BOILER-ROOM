# Feature Research: v2.0 Professional Art & Agent Autonomy

**Domain:** Multi-agent AI office with tile-based game engine -- tileset integration, collision physics, idle behaviors, agent-to-agent collaboration
**Researched:** 2026-03-15
**Confidence:** HIGH for art/collision/idle (well-established game dev patterns); MEDIUM for agent-to-agent collaboration (novel application-specific design)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that define "professional art with autonomous agents" -- without these the v2.0 upgrade feels incomplete.

#### Art Integration

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| 32x32 LimeZu character sprites with walk/idle/sit animations | Current 24x32 programmatic sprites are the most visible placeholder. Users expect polished character art. LimeZu Modern Interiors pack uses 32x32 character frames. | MEDIUM | Requires updating `CHAR_SPRITE_W` (24->32), `CHAR_SPRITE_H` (32->32), `CHARACTER_FRAMES` column/row layout in `spriteAtlas.ts`, foot-center anchor math in `renderer.ts` (`drawY = y - (CHAR_SPRITE_H - TILE_SIZE)` becomes `y - 16`). Sprite sheet layout changes from 10-col x 4-row to whatever LimeZu uses (typically 4-col x 4-row per animation state, multiple rows per direction). |
| 16x16 LimeZu environment tiles (floors, walls, furniture) | Floor/wall/furniture sprites should match the professional character art quality. Mixing LimeZu characters with programmatic environment tiles looks jarring. | HIGH | Current `ENVIRONMENT_ATLAS` maps string keys to `SpriteFrame` coords in a single `environment.png`. LimeZu packs ship as multiple tilesets (Room_Builder_16x16.png, various furniture sheets). Must remap ALL atlas entries to new sheet coordinates OR pre-compose a combined atlas. The `renderFurnitureSprite` switch statement in `renderer.ts` must handle new multi-tile furniture pieces from LimeZu (desks are typically 3x2 tiles, not 2x1). |
| Atlas remapping for LimeZu tileset format | LimeZu tilesets have specific grid layouts (48x48 autotile groups for walls, 16x16 for floors/furniture). Current engine expects a flat single-sheet atlas. | HIGH | Need a tileset loader that can parse LimeZu's sheet layout. Two approaches: (A) pre-compose a custom atlas at build time using a script, or (B) load multiple tileset PNGs and map coordinates per-sheet. Approach A is better -- keeps the runtime simple, just swaps `environment.png` for a LimeZu-composed version. |
| LimeZu Conference Hall assets for War Room | War Room is the flagship multi-agent space. Needs conference table, chairs, presentation screen matching LimeZu style. | MEDIUM | LimeZu Modern Interiors includes conference/meeting room furniture. Map War Room `FURNITURE` items to LimeZu conference set. May need to adjust War Room tile dimensions if LimeZu conference table has different proportions than current 4x6 tile table. |
| Furniture collision boundaries | Characters walking through desks breaks immersion instantly. This is the #1 visual flaw in current engine -- furniture tiles are walkable. | MEDIUM | Current `isWalkable()` checks only `FLOOR` and `DOOR`. Furniture occupies floor tiles but does NOT mark them unwalkable. Fix: add collision data to `FurnitureItem`, mark occupied tiles as unwalkable in the tile map after layout, OR maintain a separate collision layer. Separate collision layer is better -- preserves the floor tile for rendering while blocking pathfinding. |
| Agent idle behaviors (work at desk, stretch, get water) | Static agents feel dead. Users expect NPCs in a simulation to have idle activity cycles -- working at desk, occasionally stretching, walking to water cooler. This is standard in every office/sim game (Two Point Hospital, Game Dev Tycoon). | HIGH | Major new system. Current `CharacterState` is `'idle' | 'walk' | 'work'`. Need an idle behavior scheduler that cycles agents through activities when not engaged in conversation. Requires: new states ('stretch', 'drink', 'phone'), timer-based behavior selection, pathfinding to activity locations (water cooler, hallway), return-to-desk logic, and interruption handling (user enters room -> agent stops idle behavior and faces BILLY). |

#### Agent Autonomy

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Agent-to-agent collaboration (visit, share context, produce work) | The core v2.0 promise. Agents should be able to consult each other -- Sandra asks Marcos to review a contract clause, Patrik requests Isaac's development budget estimate. This transforms the tool from "5 separate chatbots" to "a functioning team." | HIGH | Requires: (1) agent-to-agent message routing (one agent sends a message, another receives it as context), (2) visual representation (agent walks to other agent's office), (3) context passing (the requesting agent's deal context + specific question flows to the target agent), (4) response routing (target agent's answer flows back to requesting agent and into conversation history). Must integrate with existing 5-layer prompt system, deal scoping, and memory system. |
| User-approved agent chaining | Users must approve each hop in a collaboration chain. Without this, agents could burn API credits on irrelevant cross-agent chats. Approval is the trust mechanism. | MEDIUM | UI component: "Sandra wants to ask Marcos about [X]. Allow?" with Approve/Reject buttons. Must show: who is asking, who they want to ask, what the question is, and estimated cost. Needs a queue/state machine for pending collaboration requests. |
| Auto deal creation from agent instructions | When agents collaborate on something new, a deal should be auto-created to scope the work. Agent says "Let's put together a term sheet for the Netflix series" -> deal "Netflix Series Term Sheet" is created. | LOW | Already half-built. `parseDealAction.ts` parses `<create-deal name="..." description="..."/>` tags from agent responses. Currently triggered only by user messages to agents. For v2.0: extend to detect deal-creation intent during agent-to-agent collaboration and auto-create via `dealStore.createDeal()`. |
| Live viewing of agent collaboration | Users should be able to watch agents collaborate in real-time (see the agent walk to another office, see streaming responses). Creates the "fishbowl office" feeling. | MEDIUM | Reuse existing streaming infrastructure (`warRoomStreaming` pattern in chatStore). The canvas already renders agent walking. Need: a new "collaboration view" panel that shows the current agent-to-agent exchange, and camera follow options to track the collaborating agent. |
| Concurrent BILLY activity during agent collaboration | While agents collaborate independently, BILLY should still be able to walk around, enter other rooms, chat with non-collaborating agents. This is the key autonomy promise. | MEDIUM | Current architecture already separates BILLY's chat from agent status. The challenge is UI: how to show both BILLY's active chat AND the background collaboration status. Solution: a persistent "collaboration status bar" showing active chains, with click-to-expand for details. |

### Differentiators (Competitive Advantage)

Features that set this apart from ChatGPT/Claude web UI and other multi-agent tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual agent locomotion during collaboration | Agents physically walk to each other's offices to "discuss." No other AI tool visualizes agent interaction as spatial movement. This is the killer feature -- it makes multi-agent collaboration tangible and watchable. | MEDIUM | Reuse existing `startWalk()` + BFS pathfinding. Agent A walks to Agent B's room, faces B, enters "talking" state. B faces A, enters "talking" state. After exchange, A returns to office. The pathfinding and character animation already exist -- this is orchestration, not new rendering. |
| Background collaboration summary | If user is busy chatting with another agent, completed collaboration chains produce a summary notification. "Sandra and Marcos completed their contract review. [View Summary]" | LOW | Store collaboration results in a new `collaborationStore`. Show notification badge on the collaboration status bar. Summary is just the final agent response, stored per-collaboration. |
| LimeZu UI elements in chat/deal panels | Pixel art styled UI elements (message bubbles, buttons, panel borders) matching the LimeZu aesthetic. Creates cohesive visual identity between game canvas and React UI. | LOW | LimeZu Modern Interiors includes UI element sprites (buttons, panels, frames). Extract relevant sprites and use as CSS `border-image` or background on React components. Does NOT require engine changes -- purely CSS/React styling. |
| Agent "phone call" animation for remote collaboration | Instead of always walking to another office, agents could use a phone animation (head tilted, hand up) for quick consultations. Faster visually, adds variety. | LOW | LimeZu character sets often include phone/sit animations. Add 'phone' state to `CharacterState`. Agent stays at desk, plays phone animation while the collaboration API call runs. Use for short consultations; reserve walking visits for longer multi-step chains. |
| Collaboration chain visualization | A visual diagram showing which agents talked to whom, in what order, with topic summaries. Like a flowchart of the collaboration. | MEDIUM | React component showing chain: "Sandra -> Marcos (contract review) -> Patrik (budget impact)". Click each node to see the full exchange. Useful for auditing what agents discussed. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully autonomous agent chains (no approval) | "Let agents work independently without interrupting me" | Uncontrolled API spend. Agents could chain indefinitely (A asks B, B asks C, C asks A -- infinite loop). Loss of user trust when agents make decisions without oversight. PROJECT.md explicitly requires user approval per hop. | User approves each hop. Fast-track: show "Sandra wants to ask Marcos" with one-click Approve. Keep human in the loop but make approval frictionless. |
| Agent-to-agent casual social visits (idle chitchat) | "Agents should visit each other during idle time for realism" | Explicitly marked out-of-scope in PROJECT.md. Would burn API credits on non-productive chatter. Idle visits would block agents from being available when the user needs them. Would require conversation generation for no functional value. | Keep idle behaviors personal only (stretch, water, work at desk). Agents only visit each other when there's a user-initiated or collaboration-driven reason. |
| Real-time voice for agent collaboration | "Agents should talk to each other with synthesized voices" | Massive complexity (TTS integration), audio mixing for overlapping agents, unclear UX value. Text streaming is already fast and readable. Audio would slow down the perceived collaboration speed. | Text-based streaming with visual speech indicators (existing speech bubble overlay). Users can read faster than listen. |
| Custom agent creation (user-defined new agents) | "Let me add a 6th agent for marketing" | Breaks the carefully designed 5-agent layout, room allocation, War Room seating, and color scheme. Each agent requires persona tuning, office design, seat position. Unbounded agent count breaks the fixed office floor plan. | Fixed 5-agent team. The existing agents cover the core advisory domains for film/TV production deals. If a new domain is needed, update an existing agent's persona or add the capability to an existing agent's system prompt. |
| Multi-model agent collaboration (mixing Claude with GPT) | "Use the best model for each agent's specialty" | Different API contracts, inconsistent response quality, complex error handling per provider, billing across multiple services. The Anthropic API integration is clean and validated. | All agents use Claude via Anthropic API. The 5-layer prompt system already specializes each agent. Model differences matter less than prompt quality for domain specialization. |
| Furniture placement editor for offices | "Let me customize agent office layouts" | Scope explosion. Needs UI for placing/removing furniture, validation for walkability, save/load, collision recalculation. The layout is set once and rarely changes. | Hardcode office layouts with LimeZu furniture in `officeLayout.ts`. Each office gets a curated design matching the agent's personality. Manual placement is faster for 7 rooms. |

## Feature Dependencies

```
[LimeZu Tileset Atlas Remapping]
    |-- requires --> [Tileset Loader / Build-time Atlas Composer]
    |-- enables  --> [16x16 Environment Tiles]
    |-- enables  --> [LimeZu Furniture Sprites]
    |-- enables  --> [LimeZu Conference Hall (War Room)]

[32x32 Character Sprites]
    |-- requires --> [spriteAtlas.ts frame layout update]
    |-- requires --> [renderer.ts anchor math update (24x32 -> 32x32)]
    |-- requires --> [Character sprite sheet PNGs from LimeZu pack]
    |-- enables  --> [Idle behavior animations (sit, phone, stretch)]
    |-- enables  --> [Agent-to-agent talking animation]

[Furniture Collision]
    |-- requires --> [Collision layer separate from floor tiles]
    |-- requires --> [Updated pathfinding to check collision layer]
    |-- conflicts --> [Current system where furniture sits on walkable floor tiles]
    |-- enables  --> [Agents navigating around desks during idle behaviors]

[Idle Behavior System]
    |-- requires --> [Furniture Collision] (agents must navigate around furniture)
    |-- requires --> [32x32 Character Sprites] (need sit/stretch/phone animations)
    |-- requires --> [Activity locations defined in office layout] (water cooler tile, stretch area)
    |-- requires --> [Behavior interruption system] (user enters room -> abort idle)

[Agent-to-Agent Collaboration]
    |-- requires --> [Collaboration orchestrator (new service)]
    |-- requires --> [User approval queue (new store + UI)]
    |-- requires --> [Context passing between agent conversations]
    |-- requires --> [Visual agent locomotion between offices]
    |-- enhances --> [Auto deal creation from parseDealAction.ts]

[User-Approved Agent Chaining]
    |-- requires --> [Agent-to-Agent Collaboration]
    |-- requires --> [Approval UI component in chat panel]
    |-- enables  --> [Multi-hop chains (A -> B -> C)]
    |-- enables  --> [Concurrent BILLY activity]

[Concurrent BILLY Activity]
    |-- requires --> [Collaboration running in background (non-blocking)]
    |-- requires --> [Collaboration status bar UI]
    |-- conflicts --> [Current architecture where chat panel shows one conversation]

[Auto Deal Creation]
    |-- requires --> [Agent-to-Agent Collaboration] (trigger source)
    |-- enhances --> [parseDealAction.ts] (already parses create-deal tags)
    |-- enhances --> [dealStore.createDeal()] (already exists)

[Live Collaboration Viewing]
    |-- requires --> [Agent-to-Agent Collaboration]
    |-- requires --> [Streaming infrastructure extension (reuse warRoomStreaming pattern)]
    |-- enhances --> [Camera follow system] (follow collaborating agent)
```

### Dependency Notes

- **Furniture Collision must precede Idle Behaviors:** If agents walk to the water cooler during idle, they MUST navigate around desks. Without collision, agents walk through furniture, destroying immersion. The collision system is foundational.
- **32x32 Sprites must precede Idle Behaviors:** Idle animations (sit at desk, stretch, phone call) require sprite frames that do not exist in the current 24x32 programmatic sheets. The LimeZu character sprites include these states.
- **Collaboration Orchestrator is the hardest new system:** It touches chat stores, prompt builder, agent streaming, office store (agent movement), and deal store (auto-creation). Must be designed carefully with clean interfaces to avoid coupling these systems.
- **User Approval Queue gates everything autonomous:** No collaboration can execute without approval. The queue UI must be implemented before any autonomous behavior ships, even for testing.
- **Atlas Remapping is the art integration bottleneck:** Until the LimeZu tilesets are mapped to the engine's atlas coordinate system, no professional art can render. This is the first task, period.

## v2.0 Phase Recommendations

### Phase A: Art Foundation (LimeZu Integration)

Core tileset/sprite integration that everything else builds on.

- [ ] **Tileset atlas remapping** -- Map LimeZu Modern Interiors sheets to engine atlas format. Build-time script to compose combined atlas OR remap `ENVIRONMENT_ATLAS` / `DECORATION_ATLAS` coordinates to LimeZu sheet positions.
- [ ] **32x32 character sprite integration** -- Update `CHAR_SPRITE_W/H`, `CHARACTER_FRAMES`, foot-center anchoring. Map LimeZu character sprites (or create custom characters using LimeZu base) to the engine's direction/state system.
- [ ] **16x16 environment tiles** -- Swap floor, wall, door, and furniture sprites to LimeZu art. Update `renderFurnitureSprite` for new multi-tile furniture dimensions.
- [ ] **LimeZu Conference Hall** -- War Room table + chairs + presentation board from LimeZu conference set.
- [ ] **LimeZu UI elements** -- CSS styling for chat/deal panels using extracted UI sprites.

### Phase B: Collision & Idle Behaviors

Physics and life-like agent behavior.

- [ ] **Furniture collision layer** -- Separate collision map from floor tile map. Mark furniture-occupied tiles as blocked. Update `isWalkable()` and `findPath()`.
- [ ] **Idle behavior state machine** -- Timer-based behavior scheduler per agent. States: work-at-desk (default), get-water, stretch, phone-idle. Random interval selection (30s-120s between transitions).
- [ ] **Activity location definitions** -- Define water cooler, stretch areas, and phone spots as reachable tiles in each room and hallway.
- [ ] **Behavior interruption** -- When user enters a room or initiates chat, idle behavior immediately cancels and agent faces BILLY.

### Phase C: Agent-to-Agent Collaboration

The autonomous intelligence layer.

- [ ] **Collaboration orchestrator service** -- Manages collaboration requests, context assembly, API calls, and result routing. Clean interface: `requestCollaboration(fromAgent, toAgent, question, dealId)`.
- [ ] **User approval queue + UI** -- Store for pending requests, approval/reject UI in chat panel, notification for new requests.
- [ ] **Context passing** -- Build target agent's prompt with: requesting agent's deal context + specific question + relevant memory. Reuse the 5-layer prompt builder with a new "collaboration" layer.
- [ ] **Visual locomotion** -- Agent walks to target's office, talking animation, return walk. Reuse `startWalk()`.
- [ ] **Auto deal creation** -- Detect `<create-deal>` tags in collaboration responses, auto-create deals.
- [ ] **Live viewing / background summary** -- Collaboration panel showing active exchanges. Summary notification for completed chains.
- [ ] **Concurrent BILLY activity** -- Ensure collaboration runs in background, BILLY can still navigate and chat.

### Defer to v2.1+

- [ ] **Multi-hop chains (A -> B -> C)** -- Start with single-hop (A -> B). Multi-hop adds loop detection, chain visualization, and complex approval UX. Ship single-hop first, validate demand.
- [ ] **Collaboration chain visualization** -- The flowchart view. Nice but not essential for v2.0 launch. Summary text suffices.
- [ ] **Agent phone call animation** -- Visual shortcut for remote consultation. Walking visits work fine for v2.0. Add phone as a polish item.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| LimeZu tileset atlas remapping | HIGH | HIGH | P1 | A |
| 32x32 character sprites | HIGH | MEDIUM | P1 | A |
| 16x16 environment tiles | HIGH | MEDIUM | P1 | A |
| LimeZu Conference Hall | MEDIUM | LOW | P1 | A |
| LimeZu UI elements | LOW | LOW | P2 | A |
| Furniture collision | HIGH | MEDIUM | P1 | B |
| Idle behavior state machine | MEDIUM | HIGH | P1 | B |
| Behavior interruption | HIGH | LOW | P1 | B |
| Collaboration orchestrator | HIGH | HIGH | P1 | C |
| User approval queue + UI | HIGH | MEDIUM | P1 | C |
| Context passing | HIGH | MEDIUM | P1 | C |
| Visual agent locomotion | HIGH | LOW | P1 | C |
| Auto deal creation | MEDIUM | LOW | P1 | C |
| Live viewing / background summary | MEDIUM | MEDIUM | P2 | C |
| Concurrent BILLY activity | MEDIUM | MEDIUM | P2 | C |
| Multi-hop chains | LOW | HIGH | P3 | defer |
| Chain visualization | LOW | MEDIUM | P3 | defer |
| Agent phone animation | LOW | LOW | P3 | defer |

## How Each Feature Domain Works

### Tileset-Based Sprite Sheet Integration

**How tileset games handle atlas remapping:**

LimeZu Modern Interiors ships as multiple PNG sheets with specific grid layouts:
- `Room_Builder_16x16.png`: floor tiles, wall autotile groups (48x48 autotile standard), doors, windows
- Individual furniture sheets: desks, chairs, tables, electronics, decorations
- Character sheets: typically 32x32 frames, 3-4 frames per animation, 4 directions

The standard approach is a **build-time atlas composition pipeline**:
1. Load source LimeZu PNGs
2. Extract needed tiles by coordinate
3. Pack into a single combined atlas (or small number of sheets)
4. Generate a coordinate map (JSON or TypeScript) mapping semantic names to atlas positions
5. Runtime loads the composed atlas, uses the coordinate map

For this project, the simplest path is:
- Keep the existing `ENVIRONMENT_ATLAS` / `DECORATION_ATLAS` / `CHARACTER_FRAMES` pattern
- Update the coordinate values to match LimeZu sheet positions
- Either compose a combined atlas at build time (Vite plugin or npm script) or load multiple sheets and track which sheet each frame comes from (add `sheetId` to `SpriteFrame`)

**Key LimeZu integration detail:** LimeZu characters are 32x32, but the current engine uses 24x32. The character is now square, which changes the foot-center anchor math and the sprite-wider-than-tile offset. Current: `drawX = x - (24 - 16) / 2 = x - 4`. New: `drawX = x - (32 - 16) / 2 = x - 8`. The character now extends 8px beyond the tile on each side instead of 4px.

**Confidence:** HIGH -- tileset integration is a solved problem in every 2D game engine. The project's existing atlas pattern (`SpriteFrame` + coordinate maps) is the standard approach.

### Furniture Collision in Tile-Based Games

**How tile-based games handle furniture collision:**

The standard approach is a **collision layer** separate from the visual tile map:

1. **Visual layer:** What renders on screen (floor tiles, wall tiles, furniture sprites)
2. **Collision layer:** A parallel 2D boolean array (`collisionMap[row][col] = true/false`) indicating walkability
3. **Pathfinding reads the collision layer**, not the visual layer

For this project:
- Current `OFFICE_TILE_MAP` serves as BOTH visual and collision data (`isWalkable` checks `TileType.FLOOR | DOOR`)
- Furniture sits on `FLOOR` tiles but does NOT mark them blocked
- Solution: create a `COLLISION_MAP` initialized from `OFFICE_TILE_MAP`, then iterate `FURNITURE` array and mark each furniture item's occupied tiles as blocked

```typescript
// Conceptual -- collision layer overlay
const collisionMap: boolean[][] = buildCollisionFromTileMap(OFFICE_TILE_MAP);
for (const item of FURNITURE) {
  for (let r = item.row; r < item.row + item.height; r++) {
    for (let c = item.col; c < item.col + item.width; c++) {
      collisionMap[r][c] = false; // blocked
    }
  }
}
```

Then update `isWalkable` and `findPath` to check `collisionMap` instead of (or in addition to) `OFFICE_TILE_MAP`.

**Important edge case:** Chair tiles where agents sit must be walkable FOR THAT AGENT but blocked for others. Solution: the pathfinding check allows a character to walk to their own seat tile regardless of collision. This is a simple character-specific override in `isWalkable`.

**Confidence:** HIGH -- this is the universal pattern in tile-based games. Every RPG Maker game uses collision layers. The existing codebase is perfectly structured for this addition.

### Idle Behavior Systems in Office/Simulation Games

**How idle behaviors work in simulation games:**

The standard pattern is a **weighted random timer + state machine**:

1. **Behavior pool:** List of available idle behaviors with weights/probabilities
   - Work at desk (weight: 60%) -- default, agent types at keyboard
   - Get water (weight: 15%) -- walk to cooler, pause, walk back
   - Stretch (weight: 10%) -- stand up, play stretch animation at desk
   - Check phone (weight: 10%) -- phone animation at desk
   - Look around (weight: 5%) -- turn to face different directions

2. **Timer:** Each agent has a random cooldown (30-120 seconds) between behavior changes
   - When timer expires, pick a behavior from the weighted pool
   - Execute the behavior (may involve pathfinding + animation)
   - When behavior completes, reset timer

3. **Priority interruption:** External events override idle behavior
   - User enters room -> immediately cancel current behavior, face BILLY, enter idle-facing state
   - Collaboration request -> cancel, walk to target office
   - War Room gathering -> cancel, walk to War Room seat

**State machine for an agent:**
```
                  +----------+
                  |  IDLE    |  (timer counting down)
                  +----+-----+
                       |  timer expired
                       v
              +---------+---------+
              | SELECT BEHAVIOR   |
              +----+---------+----+
                   |         |
            +------+    +----+------+
            | WORK |    | GET_WATER |
            +------+    +-----+-----+
                              |
                         walk to cooler
                              |
                         pause (drink)
                              |
                         walk back to desk
                              |
                         +----+----+
                         |  IDLE   |
                         +---------+

    At ANY state: user enters room -> INTERRUPT -> face BILLY
    At ANY state: collaboration request -> INTERRUPT -> walk to target
```

**For this project**, the behavior system should:
- Live in a new `idleBehaviorManager.ts` in the engine
- Run per-agent, independent timers
- Use the existing `startWalk()` for movement behaviors
- Add new `CharacterState` values: `'sit'`, `'stretch'`, `'phone'` (in addition to existing `'idle' | 'walk' | 'work'`)
- Register interruption hooks with the room-entry detection in `updateAllCharacters`

**Confidence:** HIGH -- idle behavior systems are standard in simulation games (The Sims, Two Point Hospital, Game Dev Tycoon all use this exact pattern).

### Multi-Agent AI Collaboration (Agent-to-Agent)

**How multi-agent collaboration should work:**

This is the most novel feature. No direct game reference -- this is AI orchestration with a game-engine visualization layer.

**Architecture: Collaboration Orchestrator**

A new service (`collaborationService.ts`) that manages the lifecycle:

1. **Trigger:** Agent A's response includes a collaboration intent tag (similar to `<create-deal>`), e.g., `<consult agent="marcos" question="Review this contract clause for IP rights"/>`. OR the user explicitly tells an agent to "ask Marcos about this."

2. **Queue:** The collaboration request enters a pending queue in `collaborationStore`. UI shows the request to the user.

3. **Approval:** User clicks Approve. The orchestrator:
   a. Assembles the target agent's prompt: base persona + deal context + requesting agent's question + relevant memory
   b. Starts the visual sequence: Agent A stands up, walks to Agent B's office
   c. Fires the Anthropic API call for Agent B with the assembled prompt
   d. Streams the response (visible in collaboration panel)

4. **Completion:** Agent B's response is:
   a. Stored in collaboration history (new IndexedDB store)
   b. Injected back into Agent A's conversation context as a "consultation result"
   c. Agent A walks back to their office
   d. If Agent B's response contains another `<consult>` tag, a new approval request is queued (multi-hop)

**Context passing format:**
```
[Collaboration Context]
Sandra (Line Producer) asked you:
"Review this contract clause for IP rights in the Netflix deal."

Deal: Netflix Series Term Sheet
Relevant context from Sandra's conversation:
[compressed summary of Sandra's recent exchange about this deal]

Respond with your professional assessment. If you need input from another agent, use <consult agent="[name]" question="[question]"/>.
```

**Key design decisions:**
- **Single-hop first, multi-hop later:** v2.0 ships with A->B collaboration. Multi-hop (A->B->C) is v2.1 because it requires loop detection and chain management.
- **Collaboration as a deal-scoped activity:** All collaboration is within a deal context. The deal scoping already exists.
- **Memory integration:** Collaboration results should be extracted into the memory system (facts, decisions, numbers) just like regular conversations.
- **API budget awareness:** Each collaboration step costs one API call. Show estimated cost in the approval UI.

**Confidence:** MEDIUM -- the AI orchestration pattern is sound (similar to CrewAI/AutoGen multi-agent frameworks), but the specific UX of visual agent locomotion + approval queue + game engine integration is novel. Expect iteration on the approval UX and context passing format.

### Auto Deal Creation from Natural Language

**How "auto deal creation" works:**

The infrastructure already exists in `parseDealAction.ts`. The current flow:
1. User tells an agent "Create a deal for the Netflix series"
2. Agent response includes `<create-deal name="Netflix Series" description="..."/>`
3. UI detects the tag, creates the deal

For v2.0, extend this to:
1. During agent-to-agent collaboration, Agent A says "We should track this as a separate deal"
2. Agent A's response includes `<create-deal>` tag
3. Collaboration orchestrator detects the tag (same parser)
4. Shows user approval: "Sandra suggests creating deal 'Netflix Series Term Sheet'. Create it?"
5. On approval, `dealStore.createDeal()` fires, and the collaboration continues scoped to the new deal

This is LOW complexity because the parsing and creation logic already exist. Just needs the collaboration orchestrator to call `parseDealAction()` on collaboration responses.

**Confidence:** HIGH -- the existing `parseDealAction.ts` + `dealStore.createDeal()` pattern is clean and extensible.

## Competitor Feature Analysis

| Feature | CrewAI / AutoGen | ChatGPT Team | Our Approach |
|---------|-----------------|--------------|--------------|
| Multi-agent orchestration | Code-level agent chaining, no visual representation | Single agent, no multi-agent | Visual agent-to-agent with office locomotion |
| Collaboration approval | None -- fully autonomous | N/A | Per-hop user approval (trust + cost control) |
| Agent idle behavior | None -- agents are code objects | None | Visual idle cycles (work, stretch, water) |
| Professional art | None -- CLI or web chat UI | Standard web UI | LimeZu pixel art office with personality per agent |
| Furniture collision | N/A | N/A | Tile-based collision layer + BFS pathfinding |
| Deal/project scoping | Manual context management | Conversation-level | Deal-scoped conversations, memory, files, collaboration |
| Live collaboration view | Log output | N/A | Streaming panel with camera follow on collaborating agent |

## Sources

- Codebase analysis: `src/engine/` (tileMap.ts, characters.ts, officeLayout.ts, spriteSheet.ts, spriteAtlas.ts, renderer.ts, depthSort.ts, types.ts), `src/store/` (officeStore.ts, chatStore.ts, dealStore.ts), `src/services/actions/parseDealAction.ts`
- LimeZu Modern Interiors: well-known itch.io tileset pack (16x16 environment, 32x32 characters) -- standard format for RPG Maker / custom engine integration
- Tile-based collision patterns: RPG Maker collision layers, Tiled Map Editor collision objects -- decades-old standard
- Idle behavior systems: The Sims (Maxis), Two Point Hospital, Game Dev Tycoon -- weighted random timer + state machine pattern
- Multi-agent AI orchestration: CrewAI, AutoGen (Microsoft), LangGraph -- agent-to-agent message passing patterns
- Sprite atlas composition: TexturePacker, ShoeBox, custom scripts -- standard game dev pipeline

---
*Feature research for: v2.0 Professional Art & Agent Autonomy*
*Researched: 2026-03-15*

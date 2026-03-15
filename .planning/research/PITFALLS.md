# Pitfalls Research: v2.0 Feature Additions

**Domain:** Adding LimeZu art integration, furniture collision, idle behaviors, and agent-to-agent collaboration to existing JRPG pixel art multi-agent AI workspace
**Project:** Lemon Command Center v2.0
**Researched:** 2026-03-15
**Confidence:** HIGH (based on direct analysis of 15+ source files in the existing codebase)

**Scope:** This document covers pitfalls specific to ADDING the v2.0 features to the existing v1.1 codebase. The v1.1 pitfalls (zoom rendering, compact layout, depth sorting) have already been addressed. These pitfalls focus on the NEW integration risks.

---

## Critical Pitfalls

### Pitfall 1: LimeZu 32x32 Character Sprites vs Existing 24x32 Frame Contract

**What goes wrong:**
The entire rendering pipeline is built around 24x32 character sprites. The sprite atlas contract (SPRT-04 in `spriteAtlas.ts`) specifies 240x128 sheets (10 cols x 4 rows of 24x32 frames). LimeZu Modern Interiors characters are 32x32. Dropping in LimeZu sprites without updating every downstream reference produces misaligned rendering, broken depth sorting, incorrect foot-center anchoring, and clipped shadow ellipses.

**Why it happens:**
The constants `CHAR_SPRITE_W = 24` and `CHAR_SPRITE_H = 32` propagate through at least 6 files:
- `types.ts` -- constant definitions
- `renderer.ts` -- foot-center anchor: `drawX = x - (CHAR_SPRITE_W - TILE_SIZE) / 2` (currently `x - 4`, becomes `x - 8` with 32px wide sprites). Shadow ellipse uses `TILE_SIZE * 0.4` for radius. Status overlay Y-offsets reference `CHAR_SPRITE_H - TILE_SIZE`.
- `depthSort.ts` -- character baseRow uses `ch.y / TILE_SIZE` plus offset
- `spriteAtlas.ts` -- `makeCharFrame()` uses `CHAR_SPRITE_W x CHAR_SPRITE_H` for frame extraction
- `spriteSheet.ts` -- sprite cache dimensions based on frame size
- `gameLoop.ts` -- camera follow targets `billy.y + TILE_SIZE / 2`, assumes specific sprite height for centering

LimeZu's character sprite sheets likely have different animation frame counts and layout (not necessarily the idle/walk4/work3/talk2 column arrangement). The entire `buildCharacterFrames()` state-to-frame mapping may need rewriting.

**How to avoid:**
1. Audit the actual LimeZu character sheet layout FIRST, before writing any code. Document: frame dimensions, animation frame counts per state, row/column arrangement, which directions are provided.
2. Abstract sprite dimensions into a `CharacterSpriteConfig` interface: `{ frameW, frameH, sheetCols, sheetRows, stateMap }`. Each character can have its own config (enables mixing sprite sizes if needed).
3. Search the codebase for ALL references to `CHAR_SPRITE_W`, `CHAR_SPRITE_H`, and hardcoded `24`/`32` values in rendering contexts. Update them to read from config.
4. Keep the colored-rectangle fallback path (`PLACEHOLDER_COLORS`) working as a visual regression signal -- if rectangles appear, new sprites failed to load or map.

**Warning signs:**
- Characters float above the ground (foot-center anchor math wrong)
- Characters clip through furniture at certain Y positions (depth sort broken)
- Shadow ellipses appear offset from character feet
- Status overlays (thinking dots, speech bubbles) render inside sprite heads, not above
- Walk animation plays wrong frames, stutters, or shows idle frame mid-walk

**Phase to address:**
Phase 1 (Art Integration) -- must be solved first because collision, idle behaviors, and collaboration all depend on correct character rendering.

---

### Pitfall 2: LimeZu Tile Sheet Layout is NOT a Drop-in Replacement

**What goes wrong:**
The current environment atlas (`ENVIRONMENT_ATLAS` in `spriteAtlas.ts`) maps semantic names (`floor-office`, `desk-left`, `chair`) to exact `(col, row)` coordinates in a single 256x192 custom-generated `environment.png`. LimeZu Modern Interiors is a MASSIVE tileset -- hundreds of tiles across multiple categorized PNG files (floors, walls, furniture, decorations, etc.). The layouts are completely different. There is no single file to swap.

**Why it happens:**
Developers see `TILE_SIZE = 16` and LimeZu tiles are also 16x16, and assume "same size = drop-in." But the sprite sheet LAYOUT is the contract, not just the tile size. Every `makeEnvFrame(col, row)` call in `ENVIRONMENT_ATLAS` and `DECORATION_ATLAS` points at coordinates in the custom sheet. LimeZu's sheets have entirely different arrangements.

**How to avoid:**
1. Build a new multi-sheet atlas registry. Instead of one `environment.png`, support loading from multiple source sheets (e.g., `limezu-floors.png`, `limezu-furniture.png`). The atlas maps semantic names to `{ sheet: string, x, y, w, h }`.
2. The `getEnvironmentSheet()` singleton pattern must become `getSheet(sheetName)` to support multiple sprite sheets.
3. Audit LimeZu's actual tile organization. Many packs organize tiles with padding/spacing between tiles (1px gaps for Tiled editor compatibility). If LimeZu uses padding, source rectangles need to account for it or tile bleeding occurs.
4. Watch for alpha channel anti-aliasing on tile edges. LimeZu's art style may include semi-transparent edge pixels. With `imageSmoothingEnabled = false`, these render as visible dotted borders between tiles. Either process tiles to remove alpha edges, or use 0.5px inset source rectangles.

**Warning signs:**
- Visible 1px dark lines or gaps between floor tiles at any zoom level
- Furniture sprites render the wrong tile (atlas coordinates pointing at wrong region)
- Mixed art styles visible (some old programmatic tiles, some LimeZu)
- Tiles with visible "fringes" of transparency at edges

**Phase to address:**
Phase 1 (Art Integration) -- environment and character art should ship together for visual consistency.

---

### Pitfall 3: Furniture Collision Breaks BFS Pathfinding and War Room Gathering

**What goes wrong:**
The current BFS pathfinder (`tileMap.ts:findPath`) checks walkability via `tile === FLOOR || tile === DOOR`. Furniture has ZERO physical presence -- it is purely visual data in the `FURNITURE` array in `officeLayout.ts`. Adding collision means marking furniture tiles as non-walkable. But agent seat tiles are at or adjacent to furniture:
- Patrik sits at `(20, 5)`, his desk occupies `(19, 3, 2x1)` -- one row above, pathable.
- But the chair at `(20, 4)` occupies the tile BETWEEN desk and seat. If the chair becomes non-walkable, Patrik cannot reach his own seat.
- The War Room table occupies `(14, 14, 4x6)`. War Room seats are at the table edges. Marking the table as non-walkable blocks agents from reaching seats if they path through the table area.

The `gatherAgentsToWarRoom()` function in `characters.ts` stagger-walks all 5 agents + BILLY through corridors to their seats. With narrow corridors (2 tiles wide) and furniture collision, agents may block each other. The function has a 15-second timeout (`GATHER_TIMEOUT_MS`) -- if agents get stuck, it silently resolves without everyone seated.

**Why it happens:**
The v1.0/v1.1 design deliberately separated walkability from visuals. Furniture was "just decoration." Retrofitting collision onto existing pathfinding requires solving the "seat is inside furniture" problem, which the original tile map model does not support.

**How to avoid:**
1. Create a RUNTIME collision overlay (`collisionMap: boolean[][]`) that merges tile-map walls with furniture footprints. Do NOT modify `OFFICE_TILE_MAP` directly.
2. Each `FurnitureItem` needs a `walkableTiles?: TileCoord[]` field listing tiles inside the furniture footprint that remain walkable (seats, chair positions). The collision overlay EXCLUDES these tiles.
3. Validate all paths BEFORE shipping. Write a test that:
   - Paths BILLY from his seat to every agent's `billyStandTile` with collision active
   - Paths every agent from their seat to their War Room seat with collision active
   - Paths every agent from their War Room seat back to their office seat
4. For multi-agent pathing (War Room gathering), consider whether agents should treat other walking agents as obstacles. If yes, you need dynamic collision updates each frame (expensive). If no (agents pass through each other), just handle furniture collision and accept that agents briefly overlap during walks. The JRPG convention is agents pass through each other.

**Warning signs:**
- BILLY arrives at a room door but cannot reach `billyStandTile` (stands in doorway)
- War Room gathering times out (15s), agents stuck in corridors or at table edges
- `findPath()` returns empty array for previously valid routes (silent failure -- character just does not move)
- Agent "teleports" to seat after timeout (if you add a fallback teleport)

**Phase to address:**
Phase 2 (Collision System) -- after art integration, before idle behaviors.

---

### Pitfall 4: Idle Behavior State Machine Conflicts with User Actions and API Status

**What goes wrong:**
The character state machine has three states: `idle`, `walk`, `work`. The `updateAllCharacters()` function bridges Zustand `agentStatuses` to character states: `thinking` -> `work`, `idle`/`needs-attention` -> `idle` (if was `work`). Adding idle behaviors (get water, stretch, walk to break room) introduces autonomous `walk` states. Several conflict scenarios:

1. **User clicks room while agent is mid-idle-walk.** Agent is at the water cooler. BILLY arrives, knock animation triggers, but agent is not in their office. `getRoomAtTile(billy.tileCol, billy.tileRow)` returns the room, but the agent is elsewhere. The "face BILLY" code (`characters.ts:267`) finds the agent but they are 10 tiles away at the cooler -- they "face" BILLY from across the building.

2. **API response arrives while agent is idle-walking.** The `agentStatuses` bridge sets `ch.state = 'work'` when status is `thinking`. But the character is mid-walk. The current code checks `if (ch.state === 'idle' || ch.state === 'work')` before setting `work`. An agent mid-walk will NOT get their state overridden -- they continue walking while "thinking." Their thinking dots render above a walking character, which looks wrong.

3. **Idle walk starts during streaming response.** Nothing currently prevents an idle behavior scheduler from initiating a walk while the agent's status is `thinking`. The status bridge only transitions `work -> idle`, not `idle -> prevent-walk`.

**Why it happens:**
The current architecture has exactly ONE path assignment per character (`ch.path`). There is no priority system, no action queue, and no concept of "interruptible" vs "committed" actions. The Zustand bridge was designed for a world where agents only move during War Room gathering -- never autonomously.

**How to avoid:**
1. Introduce behavior priority: `USER_COMMAND > API_RESPONSE > IDLE_BEHAVIOR`. Higher-priority actions immediately preempt lower ones: cancel current path, override state.
2. Add `CharacterState` values to distinguish autonomous movement: `'idle-walk'` for going to water cooler (interruptible), vs `'walk'` for user-initiated pathing (not interruptible by idle behaviors).
3. The idle behavior scheduler MUST check `agentStatuses[id]` before initiating. Rule: never start idle behavior if agent is `thinking` or `needs-attention`.
4. When BILLY enters a room and the agent is NOT at their seat, immediately: (a) cancel agent's idle walk, (b) path agent back to seat, (c) delay room activation until agent arrives (or show "Agent is returning..." message).
5. Add a post-interaction cooldown: after any user interaction ends (BILLY leaves room or chat completes), wait 15-30 seconds before resuming idle behaviors for that agent.

**Warning signs:**
- Agent walks away from desk while their response is streaming
- BILLY enters an empty office (agent at water cooler), knock plays to empty room
- Agent "faces" BILLY from a distant location
- Multiple agents crowd at water cooler simultaneously (no coordination)
- Thinking dots render above a walking character

**Phase to address:**
Phase 3 (Idle Behaviors) -- requires collision system from Phase 2 (agents need walkable paths to cooler/break room).

---

### Pitfall 5: Agent-to-Agent Collaboration Explodes Context Windows

**What goes wrong:**
Agent-to-agent collaboration means Agent A's output becomes Agent B's input. The current `buildContext()` in `builder.ts` assembles a multi-layer system prompt: base (~500 tokens) + persona (~1000) + deal (~200) + files (up to 8000) + memory (up to 4000) + conversation history. Each agent response is up to 4096 output tokens. A 3-agent chain (A -> B -> C) accumulates:

- Agent A: ~14K tokens context + 4K output = 18K total
- Agent B: ~14K own context + 4K from A's output = 18K total
- Agent C: ~14K own context + 4K from A + 4K from B = 22K total

If the chain grows to 5 agents, or if full conversation histories are shared, you hit 50K+ tokens per call. The Anthropic API bills per token on both input and output -- a single 5-agent chain could cost $1-2 at Claude Sonnet rates.

Worse: the current auto-summarization (`summarizer.ts`) triggers at 80% of 200K context. But collaboration conversations might be stored in the SAME conversation table as user conversations. Summarization could fire on a collaboration thread, mixing its summary with user chat context.

**Why it happens:**
The `buildContext()` function was designed for one user talking to one agent. There is no concept of a "lightweight collaboration context" vs "full user context." Every API call gets the full 5-layer treatment.

**How to avoid:**
1. Create `buildCollaborationContext()` -- a separate, lean context builder for agent-to-agent messages. Include ONLY: base prompt + persona + deal name + the handoff message (structured summary from previous agent). Exclude: files, full memory, conversation history.
2. BEFORE passing Agent A's output to Agent B, compress it. Use structured output: force agents in collaboration mode to produce JSON with `{summary, key_facts[], action_items[], questions_for_next_agent[]}`. This constrains output size and makes handoffs parseable.
3. Hard token budget per handoff: max 2000 tokens. If Agent A's output exceeds this, auto-summarize before passing.
4. Store collaboration conversations in a SEPARATE IndexedDB object store (or separate conversation namespace with a `type: 'collaboration'` field) to prevent cross-contamination with user conversations and their summarization triggers.
5. Track and display cumulative API cost for the entire chain, per-hop, visible to the user at approval time.

**Warning signs:**
- API 400 errors during collaboration (context too long -- unlikely with 200K window but possible with file-heavy deals)
- Collaboration responses are generic/shallow (model overwhelmed by context noise from previous agents)
- Auto-summarization fires during collaboration, corrupting user's conversation summary
- API costs spike unexpectedly ($5+ per collaboration session)
- Agent B's response just paraphrases Agent A's output (no value added, just token burn)

**Phase to address:**
Phase 4 (Agent Collaboration) -- the most architecturally complex phase.

---

### Pitfall 6: Runaway Collaboration Chains and Circular Agent References

**What goes wrong:**
Without hard limits, a collaboration chain can loop: Patrik asks Marcos for legal review, Marcos asks Sandra for production context, Sandra asks Patrik for budget numbers -- circular reference, each hop burning 4K+ output tokens. Even without loops, the chain can grow unboundedly if agents keep "needing one more consult."

The v2.0 design specifies "user approves each hop." But the implementation will likely extend the `parseDealAction()` sentinel-tag pattern for collaboration triggers. That regex parser (`parseDealAction.ts`) is already fragile -- it uses a simple regex match on `<create-deal .../>`. Agents generate non-deterministic text. They may:
- Emit collaboration tags inside quoted/hypothetical text ("In theory, we could `<collaborate-with agent='marcos'/>` but...")
- Emit malformed tags that partially match the regex
- Emit multiple tags in one response
- Use the tag's attribute values to pass instructions that reference other agents recursively

**Why it happens:**
LLMs do not reliably follow structured output constraints. The more complex the sentinel tag format, the more ways it can be malformed. And without circuit breakers, even correct tags can create infinite loops.

**How to avoid:**
1. Hard maximum chain length: 5 hops. After max hops, chain terminates with a summary. Configurable but default-capped.
2. Circular reference detection: track `visitedAgents: Set<AgentId>` per chain. If an agent appears twice, break the cycle and surface what was accomplished.
3. Use JSON-structured output for collaboration triggers, not XML sentinel tags. JSON is more reliably generated by Claude and easier to validate:
   ```json
   {"action": "collaborate", "target_agent": "marcos", "reason": "Need legal review of term sheet"}
   ```
4. Validate parsed collaboration triggers: `target_agent` must be a valid agent ID, `reason` must be non-empty, must not target self.
5. Rate limit: max 1 collaboration trigger per agent response. Ignore additional triggers.
6. Per-hop timeout: 60 seconds. If API call exceeds this, abort with partial results.
7. Do NOT include the collaboration instruction prompt in agent-to-agent contexts. Only the first agent (user-initiated) should see the collaboration capability. Subsequent agents receive their task but cannot initiate further chains (unless the chain explicitly allows it with depth tracking).

**Warning signs:**
- API spend spikes during collaboration (check total tokens per chain)
- Same agent appears multiple times in chain log
- Collaboration "hangs" -- never completes, no error
- Agent output contains collaboration tags inside prose or code blocks (false positives)
- Chain produces 10+ hops before user notices

**Phase to address:**
Phase 4 (Agent Collaboration) -- circuit breaker MUST ship with the collaboration feature itself, not as a follow-up.

---

### Pitfall 7: Concurrent User Chat + Background Collaboration Breaks Store Architecture

**What goes wrong:**
The v2.0 spec says "BILLY can keep working while agents collaborate independently." The `useChatStore` has a SINGLETON streaming state:
```typescript
streaming: {
  isStreaming: false,
  currentContent: '',
  abortController: null,
}
```
This tracks ONE active stream. If BILLY chats with Sandra (user stream) while a background Patrik-Marcos collaboration runs (collaboration stream), both compete for the same `streaming` state. The UI shows wrong content, abort cancels the wrong stream, and completion handlers fire out of order.

The War Room has per-agent streaming (`warRoomStreaming`), but that is designed for the broadcast pattern (one user message, 5 parallel responses to the SAME message). Background collaboration is a different pattern: sequential agent-to-agent calls running independently from whatever the user is doing.

**Why it happens:**
The store was designed for mutual exclusivity: you are EITHER chatting with one agent, OR broadcasting in War Room. Never both. Background collaboration is a third concurrent mode that was not anticipated.

**How to avoid:**
1. Create a dedicated `collaborationStore` (new Zustand store) with its own:
   - Streaming state (per active collaboration chain)
   - Conversation history (collaboration-specific, not mixed with user chats)
   - Error handling (collaboration errors do not surface in the chat panel)
   - AbortController lifecycle (separate from user chat)
2. The `sendStreamingMessage()` function in `stream.ts` must NOT be shared between user and collaboration paths. Create `sendCollaborationMessage()` that uses `buildCollaborationContext()` and writes to `collaborationStore`.
3. Background collaboration results surface as a notification/summary when complete -- they do NOT inject into the user's active conversation or update the chat panel mid-stream.
4. When the user switches deals, ALL in-progress collaboration chains for the old deal must be aborted. Add deal-switch cleanup to `collaborationStore`.
5. Agent status indicators must distinguish between user-initiated thinking and collaboration-initiated thinking. Proposal: `thinking` (user), `collaborating` (background). Render differently on canvas (e.g., different colored dots).

**Warning signs:**
- User's chat shows collaboration response content (store pollution)
- Canceling user's message also cancels background collaboration
- Chat panel shows wrong agent name above streaming content
- Agent shows "thinking" status when they are collaborating in background (confusing when user did not ask them anything)
- Switching deals does not stop in-progress collaboration

**Phase to address:**
Phase 4 (Agent Collaboration) -- this is an architecture change, not a feature addition. Must be designed correctly from the start because retrofitting store separation is HIGH cost.

---

### Pitfall 8: Auto Deal Creation from Agent Collaboration Output

**What goes wrong:**
The current `builder.ts` (Layer 5.5) injects a deal creation capability prompt into agent system prompts. If this same prompt is present in collaboration contexts, agents will autonomously emit `<create-deal .../>` tags. The `parseDealAction()` regex (`parseDealAction.ts`) will parse them, and if the UI auto-creates deals from parsed tags, you get phantom deals created without user intent.

Example chain: User asks Patrik to review a contract. Patrik collaborates with Marcos (lawyer). Marcos's response includes "we should set up a deal for this contract" and emits a `<create-deal name="Contract Review" .../>` tag. The system creates the deal automatically, even though the user just wanted a review, not a new deal.

**Why it happens:**
The deal creation prompt is a blanket addition to all agent contexts with an active deal. It does not distinguish between user-facing and collaboration contexts. Agents are instructed to emit the tag "when the user asks" but in collaboration mode, the "user" is another agent -- the instruction becomes ambiguous.

**How to avoid:**
1. NEVER include Layer 5.5 (deal creation capability) in collaboration contexts. The `buildCollaborationContext()` function must omit this layer entirely.
2. Add a `source` field to parsed deal actions: `'user'` or `'collaboration'`. Only `'user'`-sourced deal actions auto-create.
3. All deals created from any agent output should enter a `'pending'` state requiring explicit user confirmation via a dialog.
4. Deduplicate: before creating a deal, check if a deal with a similar name already exists in the current deal list.
5. Rate limit: maximum 1 deal creation per agent response, ignore subsequent tags.

**Warning signs:**
- Duplicate deals appearing in the deal sidebar
- Deals created with names the user never requested
- Deal sidebar fills with speculative/draft deals during collaboration chains
- Deals created while user is in a different room (no visible context for why)

**Phase to address:**
Phase 4 (Agent Collaboration) -- deal creation guardrails tighten alongside autonomous agent features.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded `CHAR_SPRITE_W=24, CHAR_SPRITE_H=32` | Fast v1.0 development | Every sprite size change touches 6+ files | Never in v2.0 -- abstract to config |
| Module-level mutable state (`isGathering`, `knockTimers` in `characters.ts`) | Avoids store overhead per frame | Untestable, no reset between scenarios, single-instance assumption | Acceptable for now, but idle behaviors need to coordinate with this state -- document the contract |
| Singleton `streaming` in chatStore | Simple API for 1:1 chat | Cannot support concurrent user + background collaboration streams | Must fix in Phase 4 |
| Furniture as visual-only data | Fast v1.0 delivery | Retrofitting collision requires careful seat-tile exemptions | Must fix in Phase 2 |
| `renderHeight` dead field on `FurnitureItem` | Declared in v1.0 | Confusing API, never used by `depthSort.ts` | Remove or implement in Phase 1 (art integration cleanup) |
| Sentinel tags via regex for deal actions | Quick v1.0 deal creation | Fragile with non-deterministic LLM output; dangerous for autonomous agent actions | Harden or replace with JSON structured output in Phase 4 |
| Single `environment.png` sprite sheet | Simple loader, one Image object | Cannot accommodate LimeZu's multi-file tile organization | Must refactor to multi-sheet in Phase 1 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LimeZu character sheets | Assuming same column layout as custom sprites (idle/walk4/work3/talk2) | Audit actual LimeZu frame arrangement first; build configurable state-to-frame mapping per character |
| LimeZu environment tiles | Assuming single-file tileset | LimeZu ships as categorized PNGs; build multi-sheet atlas loader |
| LimeZu tile spacing | Assuming tiles are packed edge-to-edge | Check for 1px padding between tiles (common in Tiled-compatible packs); adjust source rects |
| Furniture collision + BFS | Marking furniture tiles as WALL in base tile map | Runtime collision overlay that unions tile map + furniture, with explicit walkable-tile exemptions for seats |
| Anthropic API for collaboration | Passing full `buildContext()` output between agents | Separate `buildCollaborationContext()` with lean handoff messages and token budgets |
| Collaboration + user chat concurrency | Using existing `streaming` singleton in chatStore | Dedicated `collaborationStore` with independent streaming state, error handling, and abort lifecycle |
| Idle behavior scheduling | setTimeout-based random scheduling | Centralized scheduler that checks agent status, respects priorities, and coordinates shared destinations (only one agent at water cooler at a time) |
| Deal creation in collaboration | Same deal creation prompt in all contexts | Strip Layer 5.5 from collaboration contexts; require user confirmation for all agent-created deals |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Multiple concurrent Anthropic API streams | Browser 6-connection-per-domain limit, API rate limits | Serialize collaboration hops; total concurrent streams: max 6 (1 user + 5 War Room). Collaboration runs sequentially by design. | If collaboration + user chat + War Room all fire simultaneously |
| Sprite cache with 10x more tile varieties | Memory grows from LimeZu's larger tile vocabulary | Keep quantized zoom cache but cap total entries; consider LRU eviction on the per-zoom-level tile cache | Gradual memory growth during long sessions with frequent zoom changes |
| Collision overlay recalculation | Pathfinding slowdown if collision map recomputed per-call | Precompute collision overlay ONCE at startup (furniture is static); rebuild only if layout changes | Not a risk unless dynamic furniture is added |
| Idle behavior pathfinding frequency | BFS called for 5 agents every 10-30 seconds | BFS on 32x30 grid (~960 nodes) is fast. LOW risk. Cache common paths if needed. | Only problematic if grid grows 10x or idle cycle drops under 1 second |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Collaboration chain leaks cross-deal data | Agent A on Deal X includes context from Deal Y if collaboration context builder has wrong deal scoping | `buildCollaborationContext()` must explicitly scope to `activeDealId`; assert deal ID matches at each hop |
| Agent-created deals bypass name sanitization | Malformed deal names from LLM output (HTML injection into React, excessively long strings) | Sanitize deal name/description: strip HTML, enforce 100-char max, validate UTF-8 |
| Collaboration chain logs expose full agent prompts | If chain execution is logged for debugging, system prompts with business context are persisted | Log chain metadata (agent IDs, timestamps, token counts) but NOT full prompts or responses in production |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Agent absent from office during idle walk | User enters room, sees empty office, confusion: "Where is Patrik?" | Interrupt idle walk on room entry; path agent back to seat. Or display "Patrik stepped out, returning..." overlay |
| Every collaboration hop requires approval dialog | 5 dialogs in a row disrupts user flow; user starts clicking "approve" reflexively | Show chain plan upfront ("Patrik -> Marcos -> Sandra"). Offer "approve all" with cost estimate. |
| No visual feedback during background collaboration | User does not know agents are working in background | Canvas indicators: subtle connecting line between collaborating agents, or small "meeting" icon. Collaboration progress bar in sidebar. |
| Art style breaks during incremental migration | Some rooms have LimeZu tiles, others still have programmatic art | Ship art swap atomically per visual domain (all floors at once, all furniture at once). Never deploy mixed states. |
| Furniture collision changes BILLY's walking path | BILLY takes a longer route around desks; user thinks pathfinding is broken | Optional: show path preview on click (dotted line). At minimum, paths should look natural even if longer. |
| Idle behaviors feel random/meaningless | Agents wander aimlessly, no personality | Tie idle behaviors to agent personality: Patrik checks financial charts, Sandra reviews schedule board, Wendy tends plants. Behaviors should feel intentional. |

## "Looks Done But Isn't" Checklist

- [ ] **LimeZu character swap:** Verify drop shadows align with new sprite foot positions (shadow ellipse cx/cy in `renderer.ts:660-661`)
- [ ] **LimeZu character swap:** Verify thinking dots and speech bubbles appear above sprite heads, not inside them (overlay Y offset in `renderer.ts:744,777`)
- [ ] **LimeZu character swap:** Verify camera follow centers correctly on new sprite dimensions (`gameLoop.ts:179`)
- [ ] **LimeZu environment swap:** Verify NO tile bleeding at all zoom levels (check zoom 1.0, 1.5, 2.0, 3.0)
- [ ] **Furniture collision:** Verify BILLY can reach every agent's `billyStandTile` with collision active (7 rooms)
- [ ] **Furniture collision:** Verify all 5 agents + BILLY can reach all War Room seats with collision active
- [ ] **Furniture collision:** Verify agents can return from War Room to their office seats with collision active
- [ ] **Idle behaviors:** Verify agent resumes `work` animation (not just `idle`) when API response streams after idle walk
- [ ] **Idle behaviors:** Verify BILLY entering room interrupts agent's idle walk and agent returns to seat
- [ ] **Idle behaviors:** Verify idle behavior does NOT start while agent status is `thinking`
- [ ] **Agent collaboration:** Verify collaboration API calls use separate token tracking from user conversations
- [ ] **Agent collaboration:** Verify switching deals cancels in-progress collaboration chains
- [ ] **Agent collaboration:** Verify collaboration does NOT include deal creation capability prompt (Layer 5.5)
- [ ] **Agent collaboration:** Verify circular chain detection works (A -> B -> A terminates)
- [ ] **Agent collaboration:** Verify user chat works normally WHILE background collaboration runs
- [ ] **Auto deal creation:** Verify deals from agent output require user confirmation (pending state)
- [ ] **Auto deal creation:** Verify duplicate deal names are detected and handled

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sprite size mismatch breaks rendering | LOW | Revert to 24x32 constants and old sprites. No data loss. Rendering is purely visual. |
| Tile bleeding / art seams | LOW | Adjust source rectangles by 0.5px insets, or add 1px extrusion in asset pipeline. No code architecture change. |
| Furniture collision blocks all paths | MEDIUM | Remove collision overlay, revert to visual-only furniture. Must re-test all paths. No data loss but feature removed. |
| Agent stuck during idle walk on user visit | LOW | Force-reset agent to seat position when BILLY enters room. Immediate hotfix, no architecture change. |
| Token explosion in collaboration chain | MEDIUM | Add token budget check before each hop; abort chain if exceeded. Partial results shown. Requires context builder change. |
| Runaway collaboration loop | LOW | Kill chain via AbortController. Add chain-length limit. No data corruption. |
| Concurrent chat/collaboration state corruption | HIGH | Requires store architecture refactor (separate collaboration store). Cannot hotfix if stores are entangled. Must be designed correctly from start. |
| Phantom deals from collaboration | LOW | Delete spurious deals, add pending state + confirmation dialog. Small code change. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LimeZu sprite size mismatch (P1) | Phase 1: Art Integration | All 6 characters render at all zoom levels; shadows, overlays, camera follow all correct |
| LimeZu tile layout mismatch (P2) | Phase 1: Art Integration | All environment tiles render without seams; multi-sheet atlas loads correctly |
| Furniture collision breaks pathing (P3) | Phase 2: Collision System | Automated test: BILLY and all agents can path to all required positions |
| Idle vs user action conflicts (P4) | Phase 3: Idle Behaviors | Manual test: visit room during agent idle walk; verify interrupt + return + correct status |
| Context window explosion (P5) | Phase 4: Collaboration | Log total tokens per chain; verify 3-agent chain stays under 30K tokens total |
| Runaway chains (P6) | Phase 4: Collaboration | Automated test: circular reference terminates; chain >5 hops terminates |
| Store architecture concurrency (P7) | Phase 4: Collaboration | User chats with agent A while B-C collaboration runs; no state cross-contamination |
| Auto deal creation (P8) | Phase 4: Collaboration | Collaboration contexts lack deal creation prompt; deals require confirmation |

## Sources

- **Direct codebase analysis** (HIGH confidence): `renderer.ts`, `characters.ts`, `tileMap.ts`, `depthSort.ts`, `officeLayout.ts`, `spriteAtlas.ts`, `spriteSheet.ts`, `types.ts`, `gameLoop.ts`, `stream.ts`, `builder.ts`, `summarizer.ts`, `tokenCounter.ts`, `parseDealAction.ts`, `chatStore.ts`, `officeStore.ts`
- **PROJECT.md** v2.0 milestone specification and known issues
- **LimeZu Modern Interiors** asset pack conventions (MEDIUM confidence -- based on common itch.io pixel art pack organization; actual layout must be verified against purchased assets)
- **Anthropic API** token/pricing behavior (HIGH confidence -- documented in API docs, verified against existing `tokenCounter.ts` implementation)
- **Canvas 2D** rendering and collision patterns (HIGH confidence -- established game development practices)

---
*Pitfalls research for: Lemon Command Center v2.0 feature additions*
*Researched: 2026-03-15*

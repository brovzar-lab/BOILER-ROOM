# Phase 9: Compact Layout - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the office tile map from the v1.0 hub-and-spoke layout (42x34 with hallways) to a compact grid (~28x24) matching the War Room mockup. 6 offices (5 agents + BILLY) arranged in a 2-top / War-Room-center / 4-bottom grid with narrow dark corridors. All existing features must survive (pathfinding, file icons, decorations, status indicators, agent animations).

**Delivers:** New officeLayout.ts tile map, updated room definitions, furniture positions, War Room seating, corridor pathfinding, room labels, keyboard navigation shortcuts.

**Does NOT deliver:** JRPG 3/4 perspective (Phase 10-11), smooth zoom (Phase 12), new sprites or art (Phase 11), UI refinements (Phase 13). This phase uses existing flat top-down tiles in the new positions.

</domain>

<decisions>
## Implementation Decisions

### Room Arrangement
- **Grid layout:** 2 offices top row, War Room center, 4 offices bottom row (2 left, 2 right)
- **Top-left:** BILLY's office (CEO home base)
- **Top-right:** Sasha (Deals) — closest to CEO
- **Bottom 4:** Diana, Marcos, Roberto, Valentina — Claude arranges based on workflow adjacency
- **No BILLY's corner office from v1.0** — BILLY has an office same size as agents, distinguished by CEO-style decoration
- BILLY is visible at his desk when in his office (not just an overview panel trigger)
- Enhanced overview panel shows in chat area when BILLY is at his desk (deal summary, quick stats, activity timeline — beyond v1.0's simple agent cards)
- Room labels show agent name + role ("Diana — CFO", "Marcos — Counsel", etc.)

### Room Sizing
- All 6 offices: **5x5 interior** (7x7 including walls)
- War Room: **~2x width of an office** (~10-12 tiles wide interior), big enough for rectangular table with 6 seats
- Corridors: **2 tiles wide**, walkable, dark and empty (no decoration)
- Dark void border: 1-2 tiles of VOID around the entire office perimeter
- Doors: placed on the wall closest to the connecting corridor (varies per room)
- All offices same size — BILLY's office distinguished by decoration, not dimensions

### Navigation
- Click to walk preserved — compact layout makes walks ~1-2 seconds naturally
- Walk speed: Claude tunes to feel good in compact layout
- **Keyboard shortcuts:** First letter of agent name (D=Diana, M=Marcos, S=Sasha, R=Roberto, V=Valentina, W=War Room, B=BILLY's office)
- Keyboard shortcut triggers **speed walk** at 3-4x normal speed (not teleport) — preserves spatial awareness
- Clicking agent sprites also triggers walking to that room (not just room floor tiles)
- Knock animation preserved at doorways (KNOCK_DURATION = 0.5s)
- Escape key returns BILLY to his office (same as v1.0)

### War Room
- Rectangular conference table (not oval) — easier to render on tile grid
- 6 seats: BILLY at head (top/north), 5 agents around sides and bottom
- BILLY sits at the table during War Room broadcasts (not standing nearby)
- Laptops/monitors on the table at each seat — looks like a real meeting
- Darker/cooler floor tone than offices — distinguished from warm office palette (matches v1.0 warm/cool separation)
- Agent gathering: walk to seats (fix the v1.0 triggering bug), not instant appear
- Agent dispersal: walk back to offices when BILLY leaves War Room

### Claude's Discretion
- Exact bottom-row agent arrangement (Diana, Marcos, Roberto, Valentina placement)
- Walk speed tuning for compact layout
- Exact grid dimensions (estimated ~28x24 but may adjust for clean fit)
- Door placement per room (wherever corridor connects)
- Enhanced overview panel content beyond "deal summary, quick stats, activity"

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/officeLayout.ts`: Room/FurnitureItem types, buildTileMap(), ROOMS array, FURNITURE array, OFFICE_TILE_MAP export, getRoomAtTile() — ALL need updating but same interfaces
- `src/engine/characters.ts`: WAR_ROOM_SEATS, gatherAgentsToWarRoom(), disperseAgentsToOffices(), startWalk(), KNOCK_DURATION — seats need new coords, gathering bug needs fix
- `src/engine/tileMap.ts`: findPath() BFS pathfinding — works on any TileType[][] grid, no changes needed
- `src/engine/types.ts`: Room interface (tileRect, doorTile, seatTile, billyStandTile), FurnitureItem, TileType enum — interfaces stay same
- `src/engine/input.ts`: Click-to-walk handler, room click detection — needs update for agent sprite clicking
- `src/engine/camera.ts`: computeAutoFitZoom() uses OFFICE_TILE_MAP dimensions — auto-adapts to new grid size

### Established Patterns
- All room positions flow from officeLayout.ts — other files import ROOMS, FURNITURE, OFFICE_TILE_MAP
- Characters reference WAR_ROOM_SEATS by agent ID — just update coordinates
- Renderer reads FURNITURE array for decoration positions — update coordinates, same rendering code
- Game loop imports OFFICE_TILE_MAP for pathfinding — auto-adapts to new grid

### Integration Points
- `officeLayout.ts` is THE source of truth for all positions — change here propagates everywhere
- `characters.ts` WAR_ROOM_SEATS hardcoded coordinates must match new War Room interior
- `renderer.ts` DECORATION_ATLAS references room positions — must match new layout
- `input.ts` getRoomAtTile() click detection — auto-adapts if ROOMS array is correct
- Camera auto-fit recalculates from OFFICE_TILE_MAP dimensions — auto-adapts

### Files That Need Coordinate Updates (from pitfalls research)
1. `src/engine/officeLayout.ts` — tile map, rooms, furniture (PRIMARY)
2. `src/engine/characters.ts` — WAR_ROOM_SEATS, billyStandTile references
3. `src/engine/renderer.ts` — DECORATION_ATLAS positions
4. `src/engine/__tests__/*.test.ts` — test assertions with hardcoded positions
5. `src/engine/gameLoop.ts` — any hardcoded references to room coordinates

</code_context>

<specifics>
## Specific Ideas

- The mockup image (`app_topdown_warroom_mockup_1773456547213.png`) is THE visual reference for room arrangement, spacing, and proportions
- Dark corridors with no decoration — stark contrast between warm lit rooms and dark transit space
- BILLY's office at top-left = "corner office" feel without being physically bigger
- War Room is the centerpiece — larger than offices, cooler tone, professional meeting space with laptops on table

</specifics>

<deferred>
## Deferred Ideas

- Enhanced overview panel content design — capture requirements but detailed design deferred to Phase 13 (UI)
- Room labels with agent name + role are a Phase 13 UI requirement (UI-05) — layout phase just needs the spatial arrangement

</deferred>

---

*Phase: 09-compact-layout*
*Context gathered: 2026-03-14*

# Phase 2: Canvas Engine - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a top-down pixel art office rendered on HTML5 Canvas 2D at 60fps. BILLY (user avatar) walks between 7 rooms via BFS pathfinding. Agent placeholder sprites display idle/working animations at their desks. The Canvas engine runs independently of React via requestAnimationFrame. This phase does NOT wire Canvas navigation to the chat system — that's Phase 3.

**Delivers:** Canvas rendering, tile map, room layout, BILLY sprite + movement, agent placeholder sprites with idle animations, camera system with zoom, room click navigation, HiDPI support.

**Does NOT deliver:** Chat panel integration (Phase 3), agent status syncing (Phase 3), War Room agent gathering (Phase 4), file icons on desks (Phase 6), polished sprites (Phase 8), sound (Phase 8).

**IMPORTANT — Perspective change:** The original spec and roadmap say "isometric." User explicitly chose **top-down** perspective (like pixel-agents reference). All implementation should use top-down rendering, not isometric projection. Roadmap text is outdated on this point.

</domain>

<decisions>
## Implementation Decisions

### Office Layout
- Sleek corporate floor aesthetic — modern office, not retro or whimsical
- Central War Room with agent offices arranged around it (hub-and-spoke)
- Solid walls between rooms, open doorways (no doors to open/close)
- BILLY's corner office at top-center of the floor plan (boss position)
- Medium floor scale — 4-6 second walks between rooms (not cramped, not tedious)
- Decorated hallways with environmental props: plants, artwork, water cooler
- Basic personality per office — 1-2 unique items per agent (full decoration polish in Phase 8)
- War Room has a big central conference table

### Art Style
- Modern pixel art style (~32x32 tiles), Stardew Valley quality tier
- **Top-down perspective** — NOT isometric (major change from original spec)
- Mixed warm/cool color palette: warm tones in offices, cool tones in hallways and War Room
- Source sprites from free packs (itch.io, OpenGameArt) and customize to match
- Static environment tiles — no animated environment elements (water, fire, etc.)
- Only characters are animated (walk cycles, idle loops)
- Primary visual reference: pixel-agents (top-down office with character sprites)

### Camera & Zoom
- Two zoom levels: overview (whole floor visible) and follow (camera tracks BILLY)
- Pixel-perfect integer zoom — no fractional scaling, no anti-aliasing
- HiDPI/Retina support via canvas scaling (devicePixelRatio)

### Screen Composition
- Chat panel overlays the canvas (slides over it), not side-by-side split
- Canvas remains interactive behind the chat overlay
- Chat panel is resizable via drag handle
- Brief pause + knock animation when BILLY arrives at an agent's room
- Room name label displayed when BILLY is in a room (no minimap)

### Navigation & Interaction
- Click a room on the canvas to make BILLY walk there (BFS pathfinding)
- BILLY walks through hallways — camera follows him between rooms
- No teleporting — BILLY always walks the computed path

### Character Movement
- 4-direction walk animation (up, down, left, right)
- Walk speed increases for long-distance traversals (speed ramps up)
- Expressive idle animations: 3-4 frame loops with variation (not just a single static frame)
- Agents have ambient "working" animations when BILLY isn't visiting (typing, reading papers, sipping coffee)
- Agents look up / turn to face BILLY when he enters their room

### BILLY's Appearance
- Casual creative executive look — blazer, no tie
- Pixel character at same scale as agent sprites (~32x32)
- BILLY stands (not sits) when chatting in an agent's room

### Overview Indicators
- Visual marker on the overview zoom level showing which room BILLY is currently in (glow or icon)

### Claude's Discretion
- Chat panel slide direction (left, right, bottom — pick what feels best)
- Whether to add an optional room list sidebar for quick navigation
- Exact tile dimensions within the ~32x32 range (could be 16x16 or 32x32 depending on art assets)
- Hallway decoration specifics (which props, exact placement)
- Zoom level transition animation (instant snap vs smooth interpolation)
- Game loop architecture details (ECS vs simple update/render split)
- Pathfinding grid resolution (tile-based vs pixel-based)
- Exact walk speed values and acceleration curve

</decisions>

<specifics>
## Specific Ideas

- **pixel-agents** is the primary visual reference — top-down office with character sprites working at desks
- Stardew Valley is the quality benchmark for pixel art fidelity (~32x32 tiles, clean readable sprites)
- "Sleek corporate floor" — think modern tech office, not a dungeon or fantasy RPG map
- BILLY is the CEO (Billy Rovzar) — his corner office should feel like a boss's office, top-center position
- The War Room is the central gathering space — big conference table, slightly cooler lighting
- Agent offices ring the War Room — each agent has a desk, chair, and 1-2 personality items
- Walking between rooms should feel purposeful (4-6 seconds) — not instant, not boring
- Hallways should have life (plants, art on walls, water cooler) even though they're just transit
- Knock animation when arriving at a room adds a human touch — brief pause before "entering"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `officeStore` (Zustand): Already scaffolded with `activeRoomId: string | null` — ready to be expanded with room definitions, BILLY position, zoom level, and movement state
- `App.tsx`: Shell with `<Header />` and `<ChatPanel />` — Canvas component slots in alongside ChatPanel
- Dark theme CSS variables: Already defined in the app — Canvas UI elements should use the same palette tokens

### Established Patterns
- **Zustand stores**: Flat, independent stores with no cross-store imports. officeStore should follow the same pattern as chatStore (actions as store methods, no external side effects)
- **Three-world architecture**: Canvas engine (game loop), React DOM (chat/UI), framework-agnostic services (TypeScript). Connected ONLY through Zustand stores. Canvas reads officeStore; React reads officeStore. Neither imports the other directly.
- **No router**: The app is a single view — the Canvas IS the navigation. No React Router needed.
- **TypeScript strict**: All existing code is fully typed with no `any` casts. Canvas engine types should follow the same discipline.

### Integration Points
- `officeStore.activeRoomId` → Canvas reads this to know BILLY's current/target room, React reads it for room label display
- `App.tsx` → Canvas component mounts here alongside ChatPanel. Canvas should be a `<canvas>` element managed outside React's render cycle (useRef + useEffect for setup, requestAnimationFrame for updates)
- Phase 3 will wire `officeStore.activeRoomId` changes to open/close the chat panel — Phase 2 just needs to update the store value when BILLY arrives

</code_context>

<deferred>
## Deferred Ideas

- Chat panel integration (opening chat when BILLY enters a room) — Phase 3
- Agent status indicators synced to API streaming — Phase 3
- War Room agent gathering animation (all agents walk to table) — Phase 4
- File document icons on agent desks — Phase 6
- Full personality decorations per office (Sasha's whiteboard, Roberto's minimal desk, Valentina's Post-its) — Phase 8
- Polished production sprites replacing placeholder art — Phase 8
- Ambient sound (office hum, keyboard clicks) — Phase 8
- Responsive Canvas sizing for different screen widths — Phase 8

</deferred>

---

*Phase: 02-canvas-engine*
*Context gathered: 2026-03-12 via discuss-phase*

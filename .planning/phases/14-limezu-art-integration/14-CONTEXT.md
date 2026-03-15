# Phase 14: LimeZu Art Integration - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace every programmatic placeholder sprite with professional LimeZu Modern Interiors pixel art. Characters switch from 24x32 to 32x32. Environment tiles, walls, furniture, and decorations all come from the purchased LimeZu pack. Multi-sheet atlas loader replaces the single environment.png approach. UI overlays use LimeZu emote and interface elements.

**Delivers:** 32x32 character sprites, 16x16 environment tiles (floors, walls, furniture, decorations), LimeZu 3D walls, Conference Hall War Room assets, Film Studio props for Isaac/BILLY, LimeZu UI emotes/speech bubbles, multi-sheet atlas loader.

**Does NOT deliver:** Furniture collision (Phase 15), idle behaviors (Phase 16), agent collaboration (Phase 17), animated environment elements (v2.1).

</domain>

<decisions>
## Implementation Decisions

### Character Assignments
- BILLY (CEO): Premade Character #13
- Patrik (CFO): Premade Character #05
- Marcos (Lawyer): Premade Character #09
- Sandra (Producer): Premade Character #08
- Isaac (Head of Dev): Premade Character #03
- Wendy (Coach): Premade Character #10
- All characters use 32x32 sprites from `2_Characters/Character_Generator/0_Premade_Characters/32x32/`
- LimeZu sheet layout is different from our 10x4 grid — atlas remapping required

### Floor Style
- Agent offices: light tile/marble — uniform across all offices (no per-agent variation)
- War Room: darker/premium floor — distinct from offices, boardroom gravitas
- Hallways/corridors: dark floor (grey/charcoal) — strong contrast with rooms
- Rec area: warmer floor (wood or carpet) — break room feel, distinct from workspaces
- All floors from `Room_Builder_Floors_16x16.png`

### Wall Style
- Offices: Claude picks wall color that works with light tile floor and dark UI theme
- Replace Phase 10 cream wall strips with LimeZu 3D wall system (proper perspective depth, baseboards)
- All walls from `Room_Builder_Walls_16x16.png` and `Room_Builder_3d_walls_16x16.png`

### Furniture
- Modern wood desks across all offices (warm brown, professional)
- Wendy's coaching room: non-standard layout — couch + plants focused, secondary desk (matches Phase 11 decision)
- War Room: LimeZu Conference Hall table + office chairs from `13_Conference_Hall_16x16.png`
- Film Studio props (`23_Television_and_Film_Studio.png`) used in Isaac's and/or BILLY's office — clapboards, cameras, film reels matching the film/TV domain
- All other furniture from `1_Generic_16x16.png`

### Decorations
- Match Phase 11 personality roles using LimeZu equivalents:
  - Patrik: financial charts, filing cabinet
  - Marcos: bookshelves, law books
  - Sandra: whiteboard, production schedules
  - Isaac: corkboard, scripts + Film Studio props
  - Wendy: plants, motivational art, cushions
  - BILLY: CEO decor + Film Studio props

### UI Elements
- LimeZu thinking emotes (`UI_thinking_emotes_animation_16x16.png`) for agent status indicators
- LimeZu UI elements (`UI_16x16.png`) for speech bubbles and overlays
- Static only — no animated objects for now (deferred to v2.1)

### Claude's Discretion
- Exact wall color selection (must work with light tile + dark theme)
- Exact tile variant selection within each floor category
- LimeZu sheet frame layout audit and atlas coordinate mapping
- Multi-sheet atlas loader architecture
- How Film Studio props are distributed between Isaac and BILLY
- Rec area furniture selection from LimeZu generic/living room sheets
- Drop shadow adjustment for 32x32 characters

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/spriteAtlas.ts`: SPRT-04 asset swap contract — designed for PNG replacement. Needs atlas remapping for LimeZu layout.
- `src/engine/types.ts`: `CHAR_SPRITE_W=24, CHAR_SPRITE_H=32` — change to 32x32
- `src/engine/spriteSheet.ts`: `loadAllAssets()` loads from `/sprites/{id}.png` — needs multi-sheet support
- `src/engine/renderer.ts`: 6-layer pipeline with setTransform — dimension-agnostic via constants
- `src/engine/depthSort.ts`: Y-sort by foot position — needs anchor update for 32x32

### Established Patterns
- Individual character PNGs in `/public/sprites/` loaded by ID
- Environment atlas uses coordinate maps (`ENVIRONMENT_ATLAS`, `DECORATION_ATLAS`)
- Renderer draws at world coords via `ctx.setTransform(zoom, 0, 0, zoom, tx, ty)`
- Foot-center anchoring: `drawX = x - (CHAR_SPRITE_W - TILE_SIZE) / 2`

### Integration Points
- `types.ts`: CHAR_SPRITE_W/H constants (touched by 6+ files)
- `spriteAtlas.ts`: CHARACTER_FRAMES needs complete remapping to LimeZu sheet layout
- `spriteSheet.ts`: Multi-sheet loader for multiple LimeZu source PNGs
- `renderer.ts`: Character draw offsets, shadow ellipse, status overlay Y-offset
- `officeLayout.ts`: FURNITURE/DECORATIONS arrays — asset keys map to new atlas
- `generateSprites.ts`: Remove or repurpose (no longer generating programmatic sprites)

</code_context>

<specifics>
## Specific Ideas

- LimeZu premade character sheets have ~20 animation rows (much richer than our 4-state system). We only need: idle, walk (4-dir), sit, phone (for "work" state), and potentially "run" for walk animation.
- The multi-sheet atlas should reference LimeZu PNGs by their original filenames (e.g., `1_Generic_16x16.png`) rather than combining into one mega-sheet.
- Film Studio sheet has clapboards, cameras, film reels, director chairs — perfect domain-specific props for a Mexican film production company.
- LimeZu 3D walls give proper perspective depth that replaces the hand-coded 2-3px strips from Phase 10.

</specifics>

<deferred>
## Deferred Ideas

- Animated environment elements (fan rotation, screen flicker) — v2.1 ART-03
- Custom characters from Character Generator parts (body + outfit + hair + eyes) — v2.1 ART-04
- LimeZu animated sprite sheets for objects — v2.1

</deferred>

---

*Phase: 14-limezu-art-integration*
*Context gathered: 2026-03-15*

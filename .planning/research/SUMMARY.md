# Project Research Summary

**Project:** Lemon Command Center v1.1 Visual Overhaul
**Domain:** JRPG 3/4 perspective pixel art, Canvas 2D tile engine, smooth zoom
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

The v1.1 visual overhaul converts the existing flat top-down office simulation into a JRPG 3/4 perspective experience in the style of Pokemon FireRed and Stardew Valley. This is not a framework migration or engine rewrite — the existing Canvas 2D architecture, React shell, Zustand store, and BFS pathfinding all survive intact. The changes are surgical: new sprite dimensions (24x32 characters, 16x24 environment tiles), a compact room layout (~28x24 tiles replacing the current 42x34 sprawl), float-based camera zoom replacing integer snapping, and a unified Y-sorted render pass replacing the separate furniture/character draw layers. Zero new npm dependencies are needed. The only recommended addition is Aseprite ($20 desktop app) as the pixel art authoring tool.

The recommended build order from all four research files converges on the same sequence: (1) compact layout first because every subsequent coordinate depends on it, (2) rendering pipeline refactor to unify Y-sort and switch to `ctx.setTransform()` zoom, (3) JRPG sprite integration once the pipeline is correct, (4) smooth pinch-to-zoom which requires the transform-based render foundation, and (5) a polish pass for glow effects and animated details. This order is not arbitrary — it is dictated by the dependency chain: layout coordinates must be final before rendering math, rendering math must be correct before sprite art can be verified, and sprite art must be in place before zoom quality can be validated.

The dominant risk is coordinate coupling: five separate files hardcode positions from the 42x34 layout. Changing the layout without systematic audit causes characters to pathfind into void, furniture to render outside rooms, and cascading test failures. The mitigation is to centralize all coordinates into `officeLayout.ts` data structures, write a layout validation function asserting BFS connectivity and walkability, and update tests before touching implementation code. The sprite cache explosion risk (fractional zoom creating unbounded `HTMLCanvasElement` entries) is equally important and solved by quantizing the cache key to nearest 0.5 before smooth zoom is added.

## Key Findings

### Recommended Stack

The existing stack (React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand 5, Canvas 2D, node-canvas) requires zero new runtime npm packages. Every v1.1 capability is achievable with Canvas 2D APIs already present. All code-level changes are modifications to existing engine files, not new dependencies.

**Core technologies:**
- **Canvas 2D with `ctx.setTransform()`**: Zoom rendering — replaces manual float multiplication, eliminates 1-pixel tile-gap artifacts at fractional zoom; already in the codebase, just not used for zoom
- **`globalCompositeOperation: 'lighter'`**: Additive glow blending for monitor and lamp halos — native, hardware-accelerated, no dependency
- **`wheel` event with `ctrlKey` detection**: Trackpad pinch-to-zoom on macOS — fires as `wheel` + `ctrlKey=true`, consistent across Chrome/Safari/Firefox, ~15-line handler; must be non-passive for `preventDefault()`
- **Zoom-quantized sprite cache (nearest 0.5)**: Limits cache tiers to ~8 levels (0.5 to 4.0) vs. unbounded — prevents memory explosion during pinch gestures
- **Aseprite 1.3.x (dev tool, not npm)**: Pixel art authoring — indexed palette enforces consistency across 6 characters x 40 frames; native sprite sheet export with JSON atlas; $20 one-time

### Expected Features

**Must have — v1.1 core (all P1):**
- Compact grid room layout (2-top, War Room center, 4-bottom, ~28x24 tiles) — foundation all other features build on; do first
- 3/4 perspective tile rendering (flat floors, visible north wall faces, Y-sort depth) — defines the visual identity
- 24x32 character sprites with 4-direction animations (idle, walk, work, talk) — primary visual focal point; largest art deliverable at 240 frames total
- Y-sorted depth rendering interleaving characters and furniture — without this, the depth illusion is broken regardless of art quality
- Drop shadows under characters — 5 lines of code per character, critical for 3/4 groundedness
- 3/4 perspective furniture sprites (desks, chairs, bookshelves redesigned for the new view) — largest single art production task
- Smooth trackpad pinch-to-zoom (float zoom 0.5–5.0, not integer snap) — explicit user requirement

**Should have — v1.1 polish pass (P2):**
- Ambient glow effects on monitors and desk lamps (radial gradients, additive blend) — Stardew Valley atmosphere
- Area rugs and floor accents per room — low effort, high visual room identity impact
- Animated environment details (monitor flicker, plant sway, 2-3 frame cycles) — office feels alive
- Rich personality decorations per agent in 3/4 perspective art — agent room character

**Defer — v1.2+:**
- Day/night cycle lighting — atmosphere feature, scope creep for v1.1
- Weather effects (rain on windows) — requires window tile variants and particle effects
- Character emotion expressions — additional sprite frames beyond current 4 states

**Anti-features (do not build):** Full isometric rendering (complete engine rewrite, diamond grid breaks all pathfinding), WebGL upgrade (zero user-visible benefit at this scale), parallax scrolling (wrong for indoor office), tile map editor (7 rooms, one-time layout), Spine skeletal animation (pixel art demands frame-by-frame art)

### Architecture Approach

The existing engine cleanly separates concerns across ~10 files in `src/engine/`. The v1.1 changes modify internals without changing file boundaries. The game loop structure, Zustand bridge, React integration, BFS pathfinding (`tileMap.ts`), audio system, and character state machine are all completely untouched. Two new small modules are recommended: `depthSort.ts` (Y-sort comparator for the unified Renderable list) and `tileLayer.ts` (ground vs. wall/object layer tile type definitions).

**Major components and v1.1 change level:**
1. **`officeLayout.ts`** (HIGH) — Complete data rewrite to compact grid; same Room/FurnitureItem interfaces, different data; all hardcoded tile coordinates must migrate here from other files
2. **`renderer.ts`** (HIGH) — New 6-layer draw order: ground tiles, north wall faces, Y-sorted renderables (characters + furniture merged), overlay glow, UI pass
3. **`camera.ts`** (MEDIUM) — Float zoom, remove Math.round snapping, add ZOOM_MIN/MAX/SPEED constants, update follow anchor to foot-center
4. **`spriteAtlas.ts`** (MEDIUM) — New frame dimensions (24x32 characters, 16x24 environment tiles), expanded environment tile set
5. **`input.ts`** (MEDIUM) — Replace toggleZoom() with handleWheel(), non-passive wheel listener required for preventDefault()
6. **`spriteSheet.ts`** (LOW) — Cache key quantized to nearest 0.5 zoom; getCachedSprite API unchanged
7. **`types.ts`** (LOW) — Add CHAR_SPRITE_W=24 / CHAR_SPRITE_H=32 constants; keep TILE_SIZE=16 unchanged
8. **`officeStore.ts`** (LOW) — Remove Math.round from setZoomLevel
9. **`gameLoop.ts`** (LOW) — Replace zoom===1 check with ZOOM_OVERVIEW_THRESHOLD comparison

### Critical Pitfalls

1. **Sprite cache explosion at fractional zoom** — The existing integer-keyed `Map<number, Map<string, HTMLCanvasElement>>` cache creates one tier per unique zoom value. A 2-second pinch gesture generates 1,800+ off-screen canvases and GC thrash (100MB+ in seconds, tab kill on constrained devices). Prevent by quantizing cache key to nearest 0.5 (`Math.round(zoom * 2) / 2`). Change the cache strategy before implementing smooth zoom, not after.

2. **Math.round/Math.floor rounding creates tile gaps at fractional zoom** — Every coordinate in `renderer.ts` uses `Math.floor(col * tileSize + offsetX)`. At fractional zoom, this produces 1-pixel seams between tiles and 1-pixel character shimmer. Prevent by switching to `ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY)` and drawing at world coordinates. Also ensures `screenToTile` hit detection matches rendering exactly.

3. **Compact layout breaks all hardcoded tile coordinates** — Five files contain literal tile coordinates from the 42x34 layout: `officeLayout.ts` (tile map, ROOMS[], FURNITURE[]), `characters.ts` (WAR_ROOM_SEATS), `renderer.ts` (renderDecorations hardcoded col/row), `camera.ts` (computeAutoFitZoom uses grid dimensions). Prevent by centralizing all coordinates into `officeLayout.ts` data structures, writing a layout validation function, and updating tests before changing implementation.

4. **24x32 sprites on 16x16 grid break positioning if anchored at top-left** — The existing renderer draws characters at their top-left corner (`Math.floor(ch.x * zoom + offsetX)`). 24x32 sprites must be anchored at bottom-center (feet): `drawX = ch.x - (CHAR_W - TILE_SIZE)/2`, `drawY = ch.y - (CHAR_H - TILE_SIZE)`. Y-sort must use foot row (ch.tileRow), not sprite top. Camera follow must target foot-center, not sprite top-left. Cannot swap sprites without fixing all three simultaneously.

5. **3/4 perspective requires interleaved Y-sort, not separate furniture/character layers** — Current draw order (all furniture, then all characters) is wrong for 3/4 view — characters always appear above all furniture. Prevent by creating a unified `Renderable[]` array merging furniture and characters, sorting by `baseRow` (foot/base tile row), drawing in order. Wall decorations (charts, whiteboards on north walls) are floor-layer objects, not Y-sorted.

## Implications for Roadmap

Based on research, the pitfall dependency chain, and the architecture build order — all four research files converge on the same five-phase structure:

### Phase 1: Compact Layout Foundation
**Rationale:** Every downstream coordinate depends on room positions. The compact layout must be final before any rendering, sprite, or zoom work. The north wall space issue (Pitfall 9 in PITFALLS.md) must be designed into the grid here — it cannot be retrofitted after other work is complete.
**Delivers:** Working office with the new ~28x24 compact grid (2-top, War Room center, 4-bottom), shared walls, 1-tile connectors, validated BFS paths between all rooms. Visually still looks top-down with old sprites — correct.
**Addresses:** Compact grid room layout (P1 feature), foundation for all other visual features, shorter walk distances
**Avoids:** Pitfall 4 (coordinate explosion), Pitfall 9 (no space for north wall faces if layout doesn't account for them)
**Key actions:** Centralize all coordinates in `officeLayout.ts`, add decorations[] to Room interface, write layout validation function (walkability + BFS connectivity), update all test expectations before changing code, plan 2-tile headroom above north walls

### Phase 2: Rendering Pipeline Refactor
**Rationale:** The rendering pipeline must be correct before adding new art. Switching to `ctx.setTransform()` and the unified Y-sorted Renderable list are foundational to both smooth zoom (Phase 4) and 3/4 perspective. Doing this with old sprites still in place isolates rendering bugs from art bugs.
**Delivers:** A renderer with the correct 6-layer draw order, furniture and characters in proper depth order, north wall face rendering, correct `screenToTile` inverse transform. Visually still uses old sprite art — but depth ordering and zoom math are correct.
**Addresses:** Y-sorted depth rendering (P1), 3/4 perspective rendering foundation, wall face sprites
**Avoids:** Pitfall 2 (rounding artifacts), Pitfall 5 (wrong layer order), Pitfall 6 (click-to-walk breaks at float zoom)
**Key actions:** Switch to `ctx.setTransform()` for world rendering, implement `Renderable[]` unified Y-sort, 6-layer draw order, update `screenToTile` to use inverse transform, create `depthSort.ts` and `tileLayer.ts`

### Phase 3: JRPG Sprite Integration
**Rationale:** With the correct layout and rendering pipeline in place, swap in the new sprite dimensions. This phase is primarily art production and anchor-point positioning math. Having the pipeline correct means rendering bugs from Phase 2 are already fixed and won't mask sprite positioning bugs.
**Delivers:** 24x32 character sprites with foot-center anchoring, 16x24 environment tiles with visible north wall faces, 3/4 perspective furniture sprites, drop shadows, updated sprite atlas constants, corrected status overlay offsets (speech bubbles, thinking dots), camera follow targeting foot-center.
**Addresses:** 24x32 character sprites (P1), 3/4 furniture sprites (P1), drop shadows (P1), floor/wall tile variants (P1)
**Avoids:** Pitfall 3 (sprite positioning), Pitfall 13 (status overlays at wrong height), Pitfall 10 (camera follow anchor wrong)
**Key actions:** Add CHAR_SPRITE_W=24/CHAR_SPRITE_H=32 constants in types.ts, foot-center anchor in renderCharacter, update spriteAtlas.ts frame dimensions, fix status overlay Y offsets, update camera follow target, add renderHeight to FurnitureItem for Y-sort

### Phase 4: Smooth Pinch-to-Zoom
**Rationale:** Smooth zoom depends on the transform-based rendering pipeline (Phase 2) and real sprite content (Phase 3) to validate pixel art quality at fractional zoom levels. Adding it last means all visual output is correct first, so zoom quality issues are easy to isolate.
**Delivers:** Trackpad pinch-to-zoom working on macOS Chrome/Safari/Firefox, zoom-toward-cursor behavior, snap-to-half-integer at rest for pixel art quality, quantized sprite cache preventing memory explosion, zoom range 0.5–5.0, non-passive wheel listener preventing browser zoom conflict.
**Addresses:** Smooth trackpad pinch-to-zoom (P1 explicit user requirement)
**Avoids:** Pitfall 1 (cache explosion), Pitfall 7 (browser zoom conflict), Pitfall 8 (pixel art quality degradation at fractional zoom)
**Key actions:** Non-passive wheel listener with `ctrlKey` detection, zoom-toward-cursor offset math, 0.5-quantized cache key, snap-to-half-integer on gesture end, remove Math.round from `officeStore.setZoomLevel`, update zoom overview threshold from `=== 1` to `<= 1.5`

### Phase 5: Polish Pass (Glow, Rugs, Animation)
**Rationale:** All P2 features that enhance atmosphere once core art is working. Independent of each other. Deferring to a dedicated phase prevents scope creep in Phases 1-4.
**Delivers:** Ambient glow on monitors and desk lamps (`globalCompositeOperation: 'lighter'` radial gradients), area rugs per room (floor-layer sprites before furniture), monitor flicker and plant sway (2-3 frame animation cycles), rich personality decorations in 3/4 perspective art.
**Addresses:** All P2 FEATURES (ambient glow, area rugs, animated environment, personality decorations)
**Avoids:** Pitfall 12 (shadow/glow parameters must scale with zoom; `shadowBlur` is in screen pixels, not world pixels, even inside `setTransform`)

### Phase Ordering Rationale

- Layout before rendering before sprites before zoom is the exact dependency chain identified independently by ARCHITECTURE.md, FEATURES.md, and PITFALLS.md — all three converge on this order without coordination.
- Separating rendering pipeline (Phase 2) from sprite art (Phase 3) isolates two different bug categories: math bugs vs. art bugs. Combining them makes debugging exponentially harder.
- Smooth zoom last because it requires both the transform-based pipeline (Phase 2) and real sprite content (Phase 3) to validate quality. Testing zoom with placeholder rectangles misses real rendering artifacts.
- The north wall space issue (Pitfall 9) must be designed into Phase 1 — it cannot be retrofitted after layout is finalized. This is the strongest argument for layout being strictly first.

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Layout):** Standard tile map construction, well-understood. BFS pathfinding tested with existing suite. Pattern: validate walkability and connectivity after every layout change.
- **Phase 2 (Renderer):** `ctx.setTransform()` and Y-sort are established Canvas 2D patterns. ARCHITECTURE.md provides complete implementation code for all three new patterns (Renderable interface, anchor-point drawing, quantized cache).
- **Phase 4 (Zoom):** Wheel event + ctrlKey pinch handling is well-documented. STACK.md provides exact implementation code for all 6 required changes.
- **Phase 5 (Polish):** Radial gradients and `globalCompositeOperation` are stable Canvas 2D APIs with standard usage patterns.

Phases that may benefit from targeted research during planning:
- **Phase 3 (JRPG Sprites):** The Aseprite JSON atlas integration may need a small build-time conversion script. If the artist uses a different export format or the JSON-to-SpriteFrame approach needs a Vite plugin, this should be scoped before committing to the art pipeline.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies confirmed by direct codebase analysis; all Canvas 2D APIs are stable, long-established, and version-compatible with current browsers |
| Features | HIGH | JRPG 3/4 perspective conventions have decades of reference games; feature list derived from explicit user requirements and existing engine capabilities |
| Architecture | HIGH | Based on direct analysis of all 10 engine source files with specific line references; change levels verified against actual code; interfaces confirmed compatible |
| Pitfalls | HIGH | All critical pitfalls grounded in specific file:line references in existing codebase; standard Canvas 2D game dev patterns confirmed across multiple reference implementations |

**Overall confidence:** HIGH

### Gaps to Address

- **Sprite atlas import path:** Research assumes Aseprite JSON atlas or manual `spriteAtlas.ts` constants. If a build-time JSON conversion script is chosen, it needs design during Phase 3 planning.
- **Room interior size validation:** Research recommends 4x4 interior (6x6 with walls) as minimum for agent offices to fit desk + chair + bookshelf. Verify by attempting furniture layout in target dimensions before finalizing the compact grid spec.
- **War Room seating overlap with 24x32 sprites:** Agents seated around the conference table will visually overlap at 24x32. Accepted as JRPG convention (Stardew Valley does the same), but specific seat spacing in the compact War Room needs design validation during Phase 3.
- **Pixel art quality at 0.5x zoom (overview):** At very low zoom, 24x32 characters become ~12x16 screen pixels. Cannot validate without actual sprite art. Flag for Phase 4 QA review.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** — Direct analysis of `engine/renderer.ts` (727 lines), `engine/camera.ts` (109 lines), `engine/spriteSheet.ts` (138 lines), `engine/spriteAtlas.ts` (123 lines), `engine/input.ts` (337 lines), `engine/gameLoop.ts` (179 lines), `engine/types.ts` (110 lines), `engine/officeLayout.ts` (303 lines), `engine/characters.ts`, `scripts/generateSprites.ts` (673 lines)
- **Canvas 2D API** — `imageSmoothingEnabled`, `shadowBlur`, `globalCompositeOperation`, `wheel` event, `ctx.setTransform()`, `ctx.ellipse()`, `createRadialGradient` — stable, long-established browser APIs
- **macOS trackpad behavior** — `wheel` event with `ctrlKey === true` for pinch-to-zoom is documented, consistent behavior across macOS Chrome/Safari/Firefox
- **JRPG 3/4 perspective conventions** — Pokemon FireRed/LeafGreen (GBA, 2004), Zelda: Minish Cap (GBA, 2004), Stardew Valley (2016) — well-established pixel art tile rendering standards used as direct reference

### Secondary (MEDIUM confidence)
- **Aseprite 1.3.x sprite sheet JSON format** — Standard indie game dev tooling; JSON+PNG export format documented and widely used; specific build-time integration approach needs validation during Phase 3

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*

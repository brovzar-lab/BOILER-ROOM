# Phase 10: Rendering Pipeline - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor the renderer from manual coordinate multiplication to ctx.setTransform()-based zoom, implement unified Y-sorted depth rendering merging furniture and characters, and add 3/4 perspective wall rendering. This phase enables fractional zoom support and correct depth occlusion — the structural foundation for Phase 11's JRPG sprites and Phase 12's smooth zoom.

**Delivers:** setTransform-based rendering, unified Y-sort depth list, 3/4 north + side wall strips with shadows, fractional zoom math support, corrected click targeting for any zoom level, height-aware occlusion.

**Does NOT deliver:** JRPG sprites (Phase 11), smooth trackpad zoom input (Phase 12), glow effects (Phase 13), UI changes (Phase 13). This phase is structural — placeholder sprites still used.

</domain>

<decisions>
## Implementation Decisions

### North Wall Appearance
- 2-3 pixel tall subtle strips at top of rooms — barely visible, hinting at depth
- Wall color: Claude's discretion (pick what looks best against floor and dark corridors)
- War Room walls: darker tone than office walls (slate gray vs cream) — reinforces cooler War Room vibe
- North AND east/west walls get 3/4 treatment (not just north)
- Corridor walls also get 3/4 treatment — not just room walls
- Subtle shadow (1-2px darker strip) on floor just below north walls for depth cue

### Depth Occlusion
- Full occlusion — characters walking behind furniture are fully hidden (classic JRPG style, no silhouette)
- Height-aware: tall furniture (bookshelves, whiteboards 2+ tiles) occludes fully, short furniture (chairs, plants 1 tile) barely occludes
- Agents fully participate in Y-sort with furniture — agent behind their desk is partially hidden by desk
- North/side walls participate in Y-sort — characters near room top pass behind wall strips
- Status overlays (thinking dots, needs-attention bubbles, file icons) ALWAYS render on top — not depth sorted (functional UI beats visual realism)
- Sharp pixel-perfect edge between room floor and dark corridor — no gradients or outlines

### Visual Feel / Transition
- Structural only — don't try to polish placeholder sprites, just get rendering pipeline right
- Colored rectangles will depth-sort correctly and walls appear, but visual upgrade waits for Phase 11
- setTransform zoom supports fractional values NOW (not waiting for Phase 12) — Phase 12 just adds trackpad input
- Click-to-walk targeting updated to inverse-transform screen coords to world coords — works at any zoom level
- Camera follows BILLY at zoom >= 1.5 (overview below that, follow above)

### Claude's Discretion
- Exact wall color values (cream/beige for offices, slate for War Room)
- Shadow intensity and exact pixel height
- Y-sort tie-breaking strategy when items share the same Y coordinate
- Sprite cache quantization strategy for fractional zoom levels

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/renderer.ts`: Current renderer with manual `* zoom` coordinate math — needs full refactor to setTransform
- `src/engine/camera.ts`: Camera system with integer zoom, computeAutoFitZoom() — needs fractional support
- `src/engine/spriteSheet.ts`: getCachedSprite() with per-zoom-level cache — needs quantized keys for fractional zoom
- `src/engine/gameLoop.ts`: Game loop calling render(), camera update — zoom threshold change
- `src/engine/input.ts`: Click handler with `/ zoom` coordinate math — needs inverse transform
- `src/engine/types.ts`: Camera type with integer zoom field — needs float support

### Established Patterns
- Renderer currently draws: background → tiles → furniture → decorations → characters → overlays (separate passes)
- Y-sort must MERGE furniture + decorations + characters into one sorted list
- Overlays (status indicators, room labels) stay as a separate post-Y-sort pass
- Canvas 2D `ctx.setTransform(zoom, 0, 0, zoom, -offsetX, -offsetY)` replaces manual math

### Integration Points
- `renderer.ts` render() is the main entry — refactored to use setTransform + Y-sort
- `camera.ts` Camera.zoom changes from int to float
- `spriteSheet.ts` cache key changes from integer to quantized float
- `input.ts` click handler uses `ctx.getTransform()` inverse or manual inverse math
- `officeLayout.ts` OFFICE_TILE_MAP used to identify wall tiles for 3/4 rendering
- `types.ts` TileType enum may need WALL_NORTH variant or wall rendering can use tile position detection

</code_context>

<specifics>
## Specific Ideas

- JRPG 3/4 wall rendering: detect wall tiles that have floor tiles south of them — those are "north walls" that get the cream strip
- East/west walls: detect wall tiles that have floor tiles east/west of them — get thinner side strips
- Y-sort key: use the BOTTOM edge of each renderable (footY) for sorting — taller items sort by their feet, not their top
- Fractional zoom support in Phase 10 means Phase 12 (Smooth Zoom) is purely about input handling and cache optimization

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-rendering-pipeline*
*Context gathered: 2026-03-14*

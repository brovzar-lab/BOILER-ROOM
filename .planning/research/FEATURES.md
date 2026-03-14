# Feature Research

**Domain:** JRPG 3/4 perspective visual overhaul for Canvas 2D pixel art office
**Researched:** 2026-03-13
**Confidence:** HIGH (well-established art style with decades of reference material; existing engine architecture fully analyzed)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that define "JRPG 3/4 perspective" -- without these it will look wrong or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3/4 perspective tile rendering (flat floors, north walls visible, south walls hidden) | This IS the visual style. Floors render top-down, walls have a visible front face (typically 8-16px tall above the 16px tile). Every GBA-era RPG does this. | MEDIUM | Requires splitting wall tiles into "wall-top" (visible cap) and "wall-front" (visible south face). Current engine only uses `wall-top`. Need new tile types or composite rendering where south-facing walls get a front-face sprite drawn below the wall-top tile. |
| Y-sorted depth rendering for characters and furniture | Characters walking behind a desk must be occluded. Standard in every JRPG. Current engine already Y-sorts characters (renderer.ts line 109) but furniture renders in a flat layer below ALL characters. | MEDIUM | Furniture and characters must be interleaved in a single Y-sorted draw pass. Furniture items need a `sortY` (typically bottom edge of their bounding box). Existing `renderFurniture` must merge into the character render pass. |
| Character sprites taller than one tile (24x32 for 16px tile grid) | 16x16 characters are tiny blobs. JRPG characters are always taller than the tile grid -- typically 1.5-2x tile height. 24x32 on a 16px grid is the FireRed/Emerald standard. | MEDIUM | Current sprite system uses `TILE_SIZE` (16x16) for character frames via `makeFrame()`. Must update `SpriteFrame` sizes to 24x32 in the atlas, adjust `renderCharacter` positioning (anchor at feet, not top-left), and handle the wider-than-tile sprite during Y-sort occlusion. |
| Drop shadows under characters | Every JRPG character has an elliptical shadow beneath them. Without it, characters look like they float. | LOW | Render a semi-transparent dark ellipse at foot position before drawing the character sprite. ~5 lines of code per character in `renderCharacter`. |
| Directional character facing (down = toward viewer, up = away) | In 3/4 view, "down" means facing the camera (south). Characters should default to facing down when idle in their offices. | LOW | Already implemented -- current sprite sheets have down/left/right/up rows. Just ensure idle agents face "down" (toward camera) per convention. |
| Distinct floor tile variations per room type | Office floors, hallway floors, War Room floors should look different. Wood grain for offices, carpet or stone for War Room, neutral for hallways. | MEDIUM | Current engine has 3 floor tile types (`floor-office`, `floor-hallway`, `floor-warroom`). Need richer sprites: wood grain with visible plank direction, darker tile for War Room with subtle pattern. Want 2-4 variants per type to break repetition, selected by `hash(col, row)` for deterministic variety without storing per-tile variant data. |
| Wall variation (window tiles, corner pieces) | Bare uniform walls look like placeholders. At minimum: wall segments, corner pieces, and window tiles on outer walls. | MEDIUM | Current atlas has `wall-top`, `wall-side`, `wall-window` but layout only uses `wall-top`. Need wall autotiling or manual placement. The 3/4 perspective means south-facing wall face is visible, east/west walls are visible edges, north walls are behind the camera. |
| Furniture with visible depth/height | Desks, bookshelves, tables must look like 3D objects viewed from above-and-south. A bookshelf should show its front face with book spines, a desk should show its top surface and front panel. | HIGH | Every furniture sprite needs redesigning for 3/4 perspective. Bookshelves especially -- current sprites are flat top-down icons. This is the single largest art production task. |
| Smooth camera follow with lerp | Camera should smoothly track Billy, not snap. | LOW | Current system has `targetX/targetY` and `followTarget` in Camera type -- lerp likely already implemented. Verify it works with fractional zoom values for smooth zoom compatibility. |

### Differentiators (Competitive Advantage)

Features that elevate from "functional JRPG style" to "polished, atmospheric workspace."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Ambient glow effects on monitors and desk lamps | Stardew Valley-quality atmosphere. Glowing monitors cast soft colored light halos on surrounding tiles. Desk lamps create warm pools of light. Sets this apart from flat pixel art. | MEDIUM | Canvas 2D supports `globalCompositeOperation = 'lighter'` or `'screen'` for additive blending. Render radial gradients at light source positions as a post-processing overlay layer. Performance: only render for visible light sources (viewport cull). ~30-50 lights max across all rooms is trivial. |
| Animated environment details | Subtle animations bring the office to life: monitor screens flicker, plants sway gently, water cooler bubbles. Most JRPG environments are static -- animation is a differentiator. | MEDIUM | Add frame-based animation to select environment sprites. Monitor: 2-3 frame cycle. Plant: 2 frame sway. Water cooler: occasional bubble. Use a slow timer (0.5-1s per frame). Requires environment sprites to have animation frames in the atlas. |
| Rich personality decorations per agent room | Each agent's office tells their story: Diana's financial charts, Marcos's law library, Sasha's chaotic whiteboard, Roberto's filing cabinet fortress, Valentina's creative post-it wall. | MEDIUM | Already architecturally supported via `DECORATION_ATLAS`. Need new 3/4 perspective art assets for each decoration. Multi-tile decorations (2x2 whiteboard) already exist. |
| Area rugs and floor accents | Visual room identity beyond wall color. A dark leather rug under Diana's desk, a colorful woven rug in Valentina's space. Breaks up floor tile monotony. | LOW | Render rug sprites on the floor layer after base floor tiles but before furniture. Define rug placement in room data. Simple overlay -- no engine changes needed. |
| Smooth trackpad pinch-to-zoom (continuous, not integer snap) | Modern UX expectation for trackpad users (Mac-heavy audience). Current system uses integer zoom (1x-4x) which feels jarring. Smooth zoom with momentum feels native. | HIGH | **Major engine change.** Current sprite cache keys on integer zoom (`spriteCache.get(zoom)`). Continuous zoom = infinite possible zoom values = cannot pre-cache every level. Recommended approach: snap internal rendering to nearest 0.5x increment for sprite cache, apply CSS transform for smooth visual interpolation between snap points. This preserves pixel-perfect rendering at cache levels while feeling smooth. Requires: `wheel` event handler with `ctrlKey` detection (trackpad pinch sends wheel events with ctrlKey=true), zoom bounds (0.5x-6x), and momentum/deceleration. |
| Compact grid room layout (2-top, 1-center, 4-bottom) | Current 42x34 hub-and-spoke with hallways wastes screen space. Compact grid puts rooms adjacent with minimal hallways, fitting more detail on screen at any zoom level. Matches the user's mockup. | HIGH | **Major layout rewrite.** Current `officeLayout.ts` hardcodes a specific 42x34 tile map via `buildTileMap()`. New layout needs: smaller grid (~28x24), rooms sharing walls instead of long hallways, Billy's office + one other on top row, War Room center, 4 offices on bottom row. ALL room coordinates, furniture positions, pathfinding doors, and decoration positions change. Must be done atomically. |
| Character outfit detail and expressive faces | 24x32 sprites with enough pixels to show clothing, hair, skin tone, and facial features. At Stardew Valley quality, each character is immediately recognizable. | HIGH | Pure art production. 24x32 gives 768 pixels per frame -- enough for 2-3 colors of clothing, hair, and a 4-6 pixel face area. Each character needs 4 directions x 10 frames = 40 frames. 6 characters x 40 = 240 character frames total. Largest single art deliverable. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full isometric (45-degree) rendering | "Looks more 3D and polished" | Isometric requires diamond-shaped tiles, complex coordinate transforms, and much harder sprite creation. Every asset needs isometric perspective. Pathfinding on diamond grids is non-trivial. Would require complete engine rewrite -- current tile grid, BFS pathfinding, and click-to-tile conversion all break. | Stick with 3/4 orthogonal perspective. Achieves the "JRPG feel" with standard rectangular tiles. All existing engine code (pathfinding, input, camera) works unchanged. |
| Parallax scrolling / multi-layer backgrounds | "Adds depth like real JRPGs" | JRPGs use parallax for outdoor overworld scenes, not indoor office spaces. Adding parallax layers to small rooms would look wrong and add rendering complexity for no visual benefit. | Use ambient glow layer and floor/rug accents for visual depth instead. Rooms are small enough that parallax would be imperceptible. |
| WebGL rendering upgrade | "Better performance, GPU acceleration" | Current Canvas 2D handles the rendering easily (small tile map + ~20 furniture items + 6 characters). WebGL adds massive complexity (shaders, buffer management, texture atlases) for zero user-visible benefit at this scale. The project explicitly chose Canvas 2D and validated it as "Good." | Keep Canvas 2D. Optimize with viewport culling (already done), sprite caching (already done), and dirty-rect rendering if ever needed. |
| Tile map editor / level editor | "Make it easy to redesign rooms" | Over-engineering for a 7-room office with fixed layout. A tile editor is a project unto itself. Layout will be set once during v1.1 and rarely changed. | Hardcode the new compact layout in `officeLayout.ts` just like the current one. Use comments and helper functions for readability. Manual tile placement is faster for a one-time layout. |
| Real-time lighting with raycasting / dynamic shadows | "More atmospheric than static glow" | Canvas 2D has no native shadow-casting. Implementing raycasting for shadow volumes in 2D is expensive and complex. Dynamic lighting for a pixel art office is overkill. | Pre-baked glow halos (radial gradients) at known light source positions. Static light effects look great in pixel art and cost almost nothing to render. |
| Spine/skeletal character animation | "Smoother animations, fewer sprites" | Adds heavy dependency (Spine runtime), requires completely different art pipeline, and pixel art sprite sheets already handle the needed animation states well. The existing 4-state system (idle/walk/work/talk) covers all interactions. | Keep frame-based sprite sheet animation. 24x32 sprites with 4-frame walk cycles look great in JRPG style. |
| Per-pixel collision detection | "More accurate movement around furniture" | Current BFS tile-based pathfinding works perfectly for grid-aligned movement. Per-pixel collision adds enormous complexity for negligible UX improvement in a click-to-move office. | Keep tile-based pathfinding. Mark furniture tiles as unwalkable in the tile map. The grid is the correct abstraction for this movement style. |

## Feature Dependencies

```
[3/4 Perspective Tile Rendering]
    |-- requires --> [Wall Tile Variants (south-face, corners)]
    |-- requires --> [Floor Tile Variants (wood, carpet, stone)]
    |-- enables  --> [Area Rugs & Floor Accents]

[Y-Sorted Depth Rendering]
    |-- requires --> [Furniture Sprites with sortY anchors]
    |-- requires --> [24x32 Character Sprites (anchor at feet)]
    |-- enables  --> [Characters walking behind furniture]

[24x32 Character Sprites]
    |-- requires --> [Updated SpriteFrame dimensions in spriteAtlas.ts]
    |-- requires --> [Updated renderCharacter anchor positioning]
    |-- enables  --> [Character Outfit Detail & Expressive Faces]
    |-- enables  --> [Drop Shadows]

[Compact Grid Room Layout]
    |-- requires --> [New officeLayout.ts tile map]
    |-- requires --> [Updated ROOMS array with new coordinates]
    |-- requires --> [Updated FURNITURE array with new positions]
    |-- requires --> [Updated decoration positions in renderer.ts]
    |-- conflicts --> [Current hub-and-spoke 42x34 layout]

[Smooth Pinch-to-Zoom]
    |-- requires --> [Camera type change: zoom from integer to float]
    |-- requires --> [Sprite cache strategy change (fractional zoom support)]
    |-- requires --> [Wheel event handler for trackpad gestures]
    |-- conflicts --> [Integer-only sprite cache keying in spriteSheet.ts]

[Ambient Glow Effects]
    |-- requires --> [3/4 Perspective Tile Rendering] (looks wrong on flat tiles)
    |-- requires --> [Light source positions defined per room]
    |-- enhances --> [Furniture Sprites] (monitor glow, lamp glow)

[Animated Environment Details]
    |-- requires --> [Environment sprite atlas expansion (animation frames)]
    |-- enhances --> [Ambient Glow Effects] (flickering monitor glow)
```

### Dependency Notes

- **Y-Sorted Depth requires 24x32 Sprites:** Combining characters and furniture in one sorted pass only matters visually when characters are taller than tiles. With 16x16 characters everything fits in tile bounds anyway, so there is no occlusion to sort.
- **Smooth Zoom conflicts with Integer Cache:** The current `getCachedSprite` in `spriteSheet.ts` caches per exact zoom value. Continuous zoom would create unbounded cache entries. Must redesign cache strategy before implementing smooth zoom.
- **Compact Layout conflicts with Current Layout:** This is a full replacement, not incremental. All hardcoded positions in `officeLayout.ts`, `renderer.ts` (decoration positions at specific col/row values like `drawDeco(ctx, sheet, 'diana-chart', 5, 13, ...)`), and furniture in `FURNITURE` array must change simultaneously.
- **Ambient Glow enhances but does not require other art features:** Glow can be added as a post-processing layer independent of sprite quality, but it looks best with 3/4 perspective furniture that has clear light source geometry (monitors, lamps).

## MVP Definition

### Launch With (v1.1 Core)

The minimum set to deliver the visual overhaul promise:

- [ ] **Compact grid room layout** -- Foundation that everything else renders onto. Do first because all tile coordinates change.
- [ ] **3/4 perspective floor and wall tiles** -- Wood grain floors, visible south-facing wall caps, door tiles. The visual identity shift.
- [ ] **24x32 character sprites with 4-direction animations** -- Characters are the focal point. Must have idle, walk, work, talk states. Faces readable at 2x zoom.
- [ ] **Y-sorted depth rendering** -- Characters and furniture in one sorted pass. Without this, the 3/4 perspective is broken (characters render on top of desks they should be behind).
- [ ] **Drop shadows under characters** -- Tiny effort, massive polish. Non-negotiable for 3/4 perspective.
- [ ] **3/4 perspective furniture sprites** -- Desks, chairs, bookshelves, conference table, plants redesigned for the new perspective.
- [ ] **Smooth trackpad pinch-to-zoom** -- Explicit user requirement. Replaces integer snap zoom.

### Add After Core Art (v1.1 Polish)

Features to add once the core perspective and layout work:

- [ ] **Ambient glow effects** -- Trigger: core art looks flat without atmosphere. Add radial gradient overlays at monitor/lamp positions.
- [ ] **Area rugs and floor accents** -- Trigger: rooms feel same-y despite different furniture. Low effort, high visual impact.
- [ ] **Animated environment details** -- Trigger: office feels lifeless despite good art. Start with monitor flicker (2 frames) and plant sway (2 frames).
- [ ] **Rich personality decorations (3/4 art)** -- Trigger: agent rooms lack character. Upgrade existing decorations with 3/4 perspective art.

### Future Consideration (v1.2+)

- [ ] **Day/night cycle lighting** -- Defer: atmosphere feature, not functional. Fun but scope creep for v1.1.
- [ ] **Weather effects (rain on windows)** -- Defer: eye candy that requires window tile variants and particle effects.
- [ ] **Character emotion expressions** -- Defer: requires additional sprite frames per emotion state. Current talk/work states suffice for v1.1.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Compact grid room layout | HIGH | HIGH | P1 |
| 3/4 perspective tiles (floor + walls) | HIGH | MEDIUM | P1 |
| 24x32 character sprites | HIGH | HIGH | P1 |
| Y-sorted depth rendering | HIGH | MEDIUM | P1 |
| Drop shadows | MEDIUM | LOW | P1 |
| 3/4 furniture sprites | HIGH | HIGH | P1 |
| Smooth pinch-to-zoom | HIGH | HIGH | P1 |
| Ambient glow effects | MEDIUM | MEDIUM | P2 |
| Area rugs | MEDIUM | LOW | P2 |
| Personality decorations (3/4) | MEDIUM | MEDIUM | P2 |
| Animated environment | LOW | MEDIUM | P2 |
| Day/night cycle | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 launch -- explicitly requested by user or structurally required
- P2: Should have, add during polish pass after core art is working
- P3: Nice to have, defer to future milestone

## Reference Analysis: How JRPGs Implement This

| Feature | Pokemon FireRed/LeafGreen | Stardew Valley | Zelda: Minish Cap | Our Approach |
|---------|--------------------------|----------------|-------------------|--------------|
| Tile size | 16x16 | 16x16 (rendered at various scales) | 16x16 | Keep 16x16 native tile size |
| Character size | 16x32 (1 tile wide, 2 tall) | 16x32 | 16x24 | 24x32 -- wider for outfit detail in small office |
| Perspective | 3/4 orthogonal, north walls visible | 3/4 orthogonal, objects face south | 3/4 orthogonal | 3/4 orthogonal -- same as references |
| Depth sorting | Row-based, characters behind objects if higher row | Y-position sorting | Layer + row-based | Y-sort everything (characters + furniture) by foot/bottom position |
| Wall rendering | Wall-top cap (2-4px) + wall-front face (12-14px) | Wall is full tile with perspective face | Similar to Pokemon | Wall-top sprite on wall tiles + south-face rendered below |
| Floor detail | Simple repeating tiles, slight color variation | Rich wood/stone/dirt with 4+ variants | Pattern tiles | 2-4 variants per floor type, selected by hash(col, row) for deterministic variety |
| Lighting | None (GBA hardware limitation) | Time-of-day with overlay tinting | None | Additive-blend radial gradients at light sources (P2) |
| Environment animation | Characters only, static environments | Rich environment animation (crops, water) | Minimal environment anim | Selective: monitors, plants only (P2) |

## Sources

- Existing codebase analysis: `src/engine/renderer.ts`, `src/engine/officeLayout.ts`, `src/engine/spriteSheet.ts`, `src/engine/spriteAtlas.ts`, `src/engine/types.ts`, `src/components/canvas/OfficeCanvas.tsx`
- JRPG art conventions: Pokemon FireRed/LeafGreen (GBA, 2004), Stardew Valley (2016), Zelda: Minish Cap (GBA, 2004) -- well-established pixel art standards
- Canvas 2D compositing: `globalCompositeOperation` modes for glow effects (MDN Web Docs, stable API)
- Trackpad zoom: `wheel` event with `ctrlKey` detection for pinch gesture (Web API standard)

---
*Feature research for: JRPG 3/4 perspective office rendering*
*Researched: 2026-03-13*

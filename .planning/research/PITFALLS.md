# Domain Pitfalls: v1.1 Visual Overhaul

**Domain:** Retrofitting JRPG 3/4 perspective, smooth zoom, compact layout into existing Canvas 2D tile engine
**Project:** Lemon Command Center v1.1
**Researched:** 2026-03-13
**Overall confidence:** HIGH (well-established Canvas 2D and pixel art game development patterns; verified against existing codebase)

**Scope:** This document covers pitfalls specific to the v1.1 milestone changes being applied to the existing engine. See the v1.0 PITFALLS.md in git history for foundational pitfalls (React+Canvas integration, streaming, IndexedDB, etc.) which remain valid.

---

## Critical Pitfalls

Mistakes that cause rewrites, broken rendering, or cascading regressions across the existing system.

---

### Pitfall 1: Sprite Cache Explosion from Fractional Zoom Levels

**What goes wrong:** The existing `getCachedSprite()` in `spriteSheet.ts` creates a pre-scaled `HTMLCanvasElement` keyed by integer zoom level. With smooth pinch-to-zoom, zoom becomes a float (e.g., 1.37, 2.814). Every unique zoom value creates an entirely new cache tier. During a single pinch gesture, the zoom value changes 30-60 times per second, each generating a new set of cached sprites. With ~30 unique sprite frames (environment + characters), a 2-second pinch gesture creates 60 zoom tiers x 30 frames = 1,800 off-screen canvases, consuming hundreds of MB of memory. The browser starts GC thrashing, frame rate collapses, and on mobile Safari the tab gets killed.

**Why it happens:** The existing cache design (`spriteCache = Map<number, Map<string, HTMLCanvasElement>>`) assumes zoom is one of 2-3 integer values. This is a perfectly correct design for integer zoom but catastrophically wrong for continuous zoom. Developers often "just make zoom a float" without realizing the downstream cache implications.

**Existing code at risk:**
- `spriteSheet.ts:getCachedSprite()` -- cache keyed by exact zoom number
- `spriteSheet.ts:clearSpriteCache()` -- clears all, but is only called on zoom change (which is now continuous)
- `renderer.ts` -- calls `getCachedSprite()` for every tile and furniture item every frame

**Consequences:**
- Memory usage grows unboundedly during zoom gestures (100MB+ in seconds)
- GC pauses cause visible frame drops (stuttering during pinch)
- Tab crash on memory-constrained devices
- If `clearSpriteCache()` is called every frame to prevent buildup, you lose all caching benefit -- sprites are re-created from scratch 60 times per second

**Prevention:**
1. **Quantize zoom for sprite caching.** Round zoom to the nearest 0.5 or nearest integer for cache key purposes. Render sprites at the quantized zoom level and let Canvas `drawImage` handle the remaining fractional scaling. This limits cache tiers to 6-8 levels (zoom 0.5 through 4.0) instead of infinite.
   ```typescript
   function getCacheZoom(zoom: number): number {
     return Math.round(zoom * 2) / 2; // Quantize to 0.5 increments
   }
   ```
2. **LRU eviction.** Replace the `Map<number, ...>` with a cache that evicts least-recently-used zoom tiers. Keep at most 3-4 zoom tiers cached simultaneously.
3. **Do NOT pre-scale during pinch.** During active pinch gestures, render directly from the source sprite sheet using `ctx.drawImage()` with destination sizing. Only populate the pre-scaled cache when the gesture ends and zoom settles. The browser's `drawImage` scaling with `imageSmoothingEnabled = false` is fast enough for transient states.
4. **Debounce cache population.** After zoom changes stop (gesture end), wait 100ms, then pre-scale sprites at the final zoom level for optimal rendering quality.

**Detection:**
- Memory profiler shows hundreds of `HTMLCanvasElement` objects
- Frame rate drops specifically during pinch-to-zoom gestures
- `performance.memory.usedJSHeapSize` grows monotonically during zoom

**Phase mapping:** Must be addressed before smooth zoom is implemented. Change the cache strategy first, then add smooth zoom.

**Confidence:** HIGH -- direct analysis of existing `spriteSheet.ts` code.

---

### Pitfall 2: `Math.round`/`Math.floor` Everywhere Breaks Fractional Zoom Rendering

**What goes wrong:** The existing renderer uses `Math.floor()` and `Math.round()` on every coordinate calculation to achieve pixel-perfect integer alignment. This is correct for integer zoom (zoom=2 means every source pixel maps to exactly 4 screen pixels). With fractional zoom, aggressive rounding causes visible artifacts: tile gaps (1-pixel seams between adjacent tiles), tile overlaps (tiles drawn 1 pixel too wide), and jittering (sprites oscillate between two pixel positions as zoom changes smoothly).

**Existing code at risk (every line with `Math.floor`/`Math.round` in the render path):**
- `renderer.ts:53-61` -- map offset calculation uses `Math.floor` on centering and `Math.round` on camera position
- `renderer.ts:83-84` -- tile position: `Math.floor(col * tileSize + offsetX)`
- `renderer.ts:177-178` -- furniture position: `Math.floor(item.col * tileSize + offsetX)`
- `renderer.ts:559-560` -- character position: `Math.floor(ch.x * zoom + offsetX)`
- `camera.ts:52-53` -- camera snap: `camera.x = Math.round(camera.x)`
- `camera.ts:75-76` -- screenToTile: `Math.floor((canvasWidth - mapW) / 2)`

**Consequences:**
- 1-pixel gaps appear between tiles at certain zoom levels (e.g., zoom=1.5 where 16*1.5=24 but floor/ceil of adjacent tiles differ)
- Characters appear to "vibrate" by 1 pixel as smooth zoom animates through fractional values
- Tile edges flicker as zoom crosses integer+0.5 boundaries
- Click-to-tile conversion (`screenToTile`) returns wrong tile at fractional zoom because the rounding in rendering doesn't match the rounding in hit detection

**Prevention:**
1. **Use `ctx.setTransform()` for zoom instead of manual multiplication.** Apply zoom as a canvas transform. Draw everything at native (unzoomed) coordinates. The canvas transform handles sub-pixel positioning without rounding artifacts.
   ```typescript
   ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
   // Now draw at world coordinates -- no manual zoom multiplication needed
   ctx.drawImage(sprite, col * TILE_SIZE, row * TILE_SIZE);
   ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset for UI overlays
   ```
2. **Separate world rendering from UI rendering.** Apply the zoom transform for world content (tiles, furniture, characters). Reset to identity transform for UI overlays (room labels, tooltips, speech bubbles) which should be rendered at screen resolution.
3. **Keep `screenToTile` in sync.** The inverse transform must match the forward transform exactly. If using `ctx.setTransform`, use the inverse matrix for coordinate conversion:
   ```typescript
   const worldX = (screenX - offsetX) / zoom;
   const worldY = (screenY - offsetY) / zoom;
   const col = Math.floor(worldX / TILE_SIZE);
   const row = Math.floor(worldY / TILE_SIZE);
   ```
4. **Accept sub-pixel rendering during zoom transitions.** Pixel-perfect alignment only at "resting" zoom levels (integers or specific snap points). During smooth zoom, allow the canvas to do bilinear filtering -- the motion hides the imperfection.
5. **Keep `imageSmoothingEnabled = false`.** Even with `setTransform` zoom, disable smoothing so pixel art retains its crisp edges. The browser will use nearest-neighbor scaling, which preserves pixel art style at fractional zoom better than bilinear.

**Detection:**
- Visible gaps between tiles (dark lines in the floor)
- Tiles "shimmer" or flicker during zoom animation
- Click on a tile highlights the wrong tile

**Phase mapping:** Must be solved as part of the smooth zoom implementation. Cannot be deferred.

**Confidence:** HIGH -- this is the most common Canvas 2D pixel art scaling bug.

---

### Pitfall 3: 24x32 Sprites on 16x16 Grid Breaks Character Positioning and Collision

**What goes wrong:** The existing system assumes characters occupy exactly one 16x16 tile. Character position is stored as `tileCol`/`tileRow` with pixel position derived as `ch.x = ch.tileCol * TILE_SIZE`. The renderer draws characters at this exact position. Switching to 24x32 sprites means characters are 1.5 tiles wide and 2 tiles tall. If you just swap the sprite without adjusting the positioning math, characters are anchored at their top-left corner and appear offset from their logical tile position. Their visual bounds extend into adjacent tiles, creating visual overlaps with furniture and walls. The existing Y-sort depth ordering (`sort by a.y - b.y`) breaks because a 2-tile-tall character's visual top starts one tile above its logical position.

**Existing code at risk:**
- `characters.ts:139` -- `ch.x = ch.tileCol * TILE_SIZE; ch.y = ch.tileRow * TILE_SIZE` (assumes sprite size = tile size)
- `characters.ts:148-150` -- interpolation between tiles uses TILE_SIZE as the unit
- `renderer.ts:559-560` -- character draw position: `Math.floor(ch.x * zoom + offsetX)` (top-left anchor)
- `renderer.ts:109` -- Y-sort: `characters.sort((a, b) => a.y - b.y)` (uses top-left Y)
- `spriteAtlas.ts:31` -- `makeFrame` uses `T = TILE_SIZE` for frame dimensions
- `renderer.ts:585` -- fallback character size: `Math.floor(TILE_SIZE * zoom * 0.8)` (16px based)
- `camera.ts` -- camera follow targets character position (top-left corner)

**Consequences:**
- Characters appear offset from their logical grid position (feet don't align with floor tile)
- Characters overlap walls and furniture because their visual bounds exceed the single-tile assumption
- Y-sort produces wrong depth ordering (character behind a desk appears in front)
- Camera follow targets the wrong point (character's head instead of feet)
- War Room seating looks wrong (agents overlap the conference table)
- Pathfinding collision works on 1-tile granularity but character visuals extend beyond

**Prevention:**
1. **Anchor sprites at foot-center, not top-left.** Define a character anchor point at the bottom-center of the sprite (x=12, y=32 for a 24x32 sprite). Draw characters by subtracting the anchor offset:
   ```typescript
   const drawX = ch.x * zoom + offsetX - (CHAR_WIDTH / 2) * zoom;
   const drawY = ch.y * zoom + offsetY - (CHAR_HEIGHT - TILE_SIZE) * zoom;
   ```
   This keeps the character's "feet" aligned with their tile position while the upper body extends above.
2. **Y-sort by foot position, not sprite top.** Sort by `ch.y + TILE_SIZE` (the bottom of the logical tile) or `ch.tileRow` directly. This ensures characters behind desks sort correctly.
3. **Separate logical size from visual size.** Characters still occupy 1 tile for pathfinding and collision. Their visual sprite simply extends above that tile. Do NOT change the pathfinding grid or walkability checks.
4. **Update the sprite atlas.** `spriteAtlas.ts` hardcodes `T = TILE_SIZE (16)` for frame dimensions. The new character frames need `{ w: 24, h: 32 }`. Create a separate `CHAR_TILE_W = 24, CHAR_TILE_H = 32` constant. Keep `TILE_SIZE = 16` for the grid.
5. **Camera follow should target the foot position.** Update `updateCamera` to center on `ch.y + TILE_SIZE/2` (foot midpoint) rather than `ch.y` (head).
6. **War Room seats: verify visual overlap.** With 24x32 sprites, agents seated around the conference table will visually overlap. Adjust seat tile positions to add spacing, or accept the overlap as the JRPG style (RPG characters commonly overlap tables).

**Detection:**
- Characters appear to "float" above or below their intended position
- Characters clip into walls or furniture
- Agents in the War Room overlap each other's sprites
- Clicking near a character navigates to the wrong room

**Phase mapping:** Must be solved together with the sprite art change. Cannot swap sprites without adjusting the positioning system.

**Confidence:** HIGH -- direct analysis of existing coordinate math in `characters.ts` and `renderer.ts`.

---

### Pitfall 4: Compact Layout Breaks All Hardcoded Tile Coordinates

**What goes wrong:** The existing codebase has tile coordinates hardcoded in at least 5 files. The 42x34 hub-and-spoke layout with specific room positions (Billy at col 16-25 row 2-8, Diana at col 4-13 row 11-20, etc.) is embedded in `officeLayout.ts` as the tile map, room definitions, and furniture placements. It's also referenced in `characters.ts` (War Room seat coordinates), `renderer.ts` (decoration positions at hardcoded col/row), and likely in tests. Switching to a compact grid layout requires changing ALL of these simultaneously. Missing even one reference causes characters to walk into void, furniture to render outside rooms, or decorations to appear in hallways.

**Existing hardcoded coordinates (audit):**
- `officeLayout.ts:162` -- `OFFICE_TILE_MAP` (42x34 grid built procedurally)
- `officeLayout.ts:166-223` -- `ROOMS` array with 7 rooms, each specifying `tileRect`, `doorTile`, `seatTile`, `billyStandTile`
- `officeLayout.ts:241-281` -- `FURNITURE` array with 21 items, each at specific `col`/`row`
- `characters.ts:41-47` -- `WAR_ROOM_SEATS` with 5 hardcoded seat coordinates
- `renderer.ts:281-304` -- `renderDecorations()` with 11 hardcoded `col`/`row` positions for personality items
- `camera.ts:15-16` -- `computeAutoFitZoom` uses `OFFICE_TILE_MAP[0].length` (42) and `.length` (34)

**Consequences:**
- Characters pathfind to coordinates that are now VOID tiles (crash or infinite loop)
- Furniture renders outside room boundaries
- War Room seats overlap or fall inside walls
- Decorations appear in wrong rooms
- Auto-fit zoom calculates wrong because map dimensions changed
- BFS pathfinding finds no path (rooms disconnected in new layout)
- Tests fail with incorrect tile assertions

**Prevention:**
1. **Centralize ALL coordinates in `officeLayout.ts`.** Move War Room seats and decoration positions into the room/furniture data structure. No other file should contain literal tile coordinates. Renderer reads decoration placements from data, not hardcoded positions.
   ```typescript
   // Add to Room interface:
   decorations: { key: string; col: number; row: number }[];
   // Add to ROOMS data:
   { id: 'diana', ..., decorations: [{ key: 'diana-chart', col: 5, row: 13 }] }
   ```
2. **Define the new layout dimensions first, then derive everything.** Start with the compact grid dimensions (e.g., 20x18). Build the tile map. Place rooms. Derive all coordinates from room definitions. Do not manually specify coordinates that could be computed from room positions.
3. **Write a layout validation function.** After building the tile map, verify:
   - Every room's `seatTile` and `billyStandTile` are walkable tiles
   - Every room's `doorTile` is a DOOR tile
   - Every furniture item is within its room's bounds
   - Every War Room seat is within the War Room
   - BFS can find a path from Billy's office to every other room
4. **Update tests first.** The existing tests in `__tests__/officeLayout.test.ts` and `__tests__/tileMap.test.ts` define the expected layout. Update them to the new layout before changing the implementation (TDD approach prevents coordinate drift).
5. **Keep the old layout available during development.** Use a flag or env variable to toggle between old and new layout. This allows A/B comparison and gradual migration.

**Detection:**
- Characters get "stuck" (pathfinding returns empty path)
- Furniture visible outside room walls
- Clicking a room navigates to wrong location
- Test failures with coordinate assertions

**Phase mapping:** This should be one of the first changes -- the new layout affects every other visual feature.

**Confidence:** HIGH -- direct audit of all coordinate references in the codebase.

---

### Pitfall 5: 3/4 Perspective Rendering Order Requires Layer Refactoring

**What goes wrong:** The existing renderer uses a simple layer order: floor -> furniture -> characters (Y-sorted). In pure top-down view, this works because everything is flat -- you never see the "front" of furniture. In 3/4 perspective, objects have visible front faces and height. A character walking behind a desk should be partially occluded by the desk. A character in front of a desk should be drawn on top of it. This requires per-object depth sorting that interleaves furniture and characters, not separate layers for each.

**Existing rendering order (from `renderer.ts`):**
```
Layer 2: Floor tiles (all)
Layer 3: Furniture (all)  <-- ALL furniture drawn before ANY character
Layer 4: Characters (Y-sorted among themselves)
```

In 3/4 perspective, the correct order is:
```
Layer 2: Floor tiles
Layer 3+4: Furniture AND characters, interleaved by Y-position (foot/base row)
```

**Why it happens:** The flat top-down perspective makes it look correct to draw all furniture first because furniture has no height -- it's just a pattern on the floor. In 3/4, a desk is visually 2-3 tiles tall, and a character behind it must be drawn first (partially hidden), while a character in front must be drawn after (on top of desk front face).

**Consequences:**
- Characters always appear in front of all furniture (breaking spatial illusion)
- OR characters always appear behind all furniture (can't see them at desks)
- Furniture with visible height (bookshelves, filing cabinets) doesn't occlude characters correctly
- Wall decorations (charts, whiteboards) layer incorrectly with characters near walls

**Prevention:**
1. **Merge furniture and characters into a single sorted draw list.** Create a unified array of "drawable" objects, each with a `sortY` value (their foot/base row). Sort this array and draw in order.
   ```typescript
   interface Drawable {
     sortY: number;  // foot/base row for depth sorting
     draw: (ctx: CanvasRenderingContext2D) => void;
   }
   const drawables: Drawable[] = [
     ...furniture.map(f => ({ sortY: f.row + f.height, draw: () => renderFurniture(f) })),
     ...characters.map(c => ({ sortY: c.tileRow, draw: () => renderCharacter(c) })),
   ];
   drawables.sort((a, b) => a.sortY - b.sortY);
   drawables.forEach(d => d.draw(ctx));
   ```
2. **Separate floor-level furniture from tall furniture.** Area rugs, floor mats, desk surfaces (top-down face) are "floor layer" objects drawn before everything. Desk fronts, chair backs, bookshelf faces are "tall" objects that participate in Y-sort with characters.
3. **Wall decorations are always behind characters.** Charts, whiteboards, and monitors on north walls are drawn as part of the wall/floor layer, not the Y-sorted layer. They're visually behind everything in the room.
4. **Accept some visual limitations.** Perfect per-pixel occlusion (e.g., character partially hidden behind a desk edge) requires either sprite-level depth buffers or manual sprite slicing. For this project's scope, simple row-based Y-sorting with furniture is sufficient and matches the JRPG style (Stardew Valley uses the same approach).

**Detection:**
- Characters visually "pop" in front of or behind furniture when they shouldn't
- Walking behind a desk doesn't partially hide the character
- Bookshelves don't occlude characters standing behind them

**Phase mapping:** Must be implemented alongside the 3/4 perspective art. The art is pointless without correct depth sorting.

**Confidence:** HIGH -- standard 2D game development depth sorting pattern.

---

## Moderate Pitfalls

Mistakes that cause significant visual/functional bugs but are fixable without architectural rewrites.

---

### Pitfall 6: Smooth Zoom Breaks Click-to-Walk Navigation

**What goes wrong:** The `screenToTile()` function in `camera.ts` converts mouse click coordinates to tile coordinates using the current zoom level. With integer zoom, this is exact: `tileSize = TILE_SIZE * zoom` always produces an integer, so `Math.floor(position / tileSize)` always gives the correct tile. With fractional zoom, `tileSize` is fractional (e.g., 16 * 1.75 = 28), and accumulated floating-point error across 20+ columns means the last few columns on the right side of the map can be off by one tile.

**Existing code at risk:**
- `camera.ts:screenToTile()` -- all coordinate math assumes integer-clean division
- `input.ts:handleClick()` -- relies on screenToTile for room detection
- `input.ts:handleDragOver()` -- relies on screenToTile for drop zone detection
- `input.ts:handleDrop()` -- relies on screenToTile for file routing

**Prevention:**
1. **If using `ctx.setTransform()` for rendering (Pitfall 2 prevention), use the inverse transform for hit testing.** This ensures rendering and hit detection use exactly the same math.
2. **Alternatively, snap zoom to the quantized cache level (Pitfall 1) for hit testing.** Use the same quantized zoom for both rendering offsets and click conversion.
3. **Add a "tile hover highlight" debug mode** that renders the currently-detected tile under the cursor. This makes misalignment immediately visible during development.
4. **Test click accuracy at zoom extremes** (minimum zoom showing entire map, maximum zoom on a single room).

**Detection:**
- Clicking near room edges navigates to the wrong room
- File drag-and-drop highlights the wrong agent's desk
- Tile hover indicator doesn't match cursor position at high zoom

**Phase mapping:** Solve together with smooth zoom (same phase as Pitfall 2).

**Confidence:** HIGH -- follows directly from Pitfall 2 analysis.

---

### Pitfall 7: Pinch-to-Zoom Gesture Conflicts with Browser Zoom and Scroll

**What goes wrong:** Trackpad pinch-to-zoom is the same gesture the browser uses for page zoom. The canvas `wheel` event with `ctrlKey` (pinch gesture on trackpad) must be intercepted with `preventDefault()` to prevent the browser from zooming the entire page. But `preventDefault()` on wheel events only works if the event listener is registered as non-passive. Modern browsers default wheel listeners to passive for scroll performance. If the listener is passive, `preventDefault()` is silently ignored and the browser zooms the page while the canvas zooms its content -- double zoom.

**Additionally:** On macOS Safari, the pinch gesture triggers `gesturestart`/`gesturechange`/`gestureend` events (Safari-specific, not standard). On Chrome/Firefox, it arrives as `wheel` events with `ctrlKey: true`. Supporting both requires dual event handling.

**Consequences:**
- Browser page zooms simultaneously with canvas zoom (double zoom effect)
- On Safari, pinch gesture doesn't work at all (only wheel events handled)
- Scroll events consumed by zoom handler prevent page scrolling when canvas is embedded
- Zoom speed differs wildly between trackpad and mouse wheel

**Prevention:**
1. **Register wheel listener as non-passive explicitly:**
   ```typescript
   canvas.addEventListener('wheel', handleWheel, { passive: false });
   ```
2. **Detect pinch vs. scroll:** Check `e.ctrlKey` on wheel events. If `ctrlKey` is true, it's a pinch gesture -- handle as zoom and call `preventDefault()`. If false, it's a regular scroll -- let it propagate or use for canvas panning.
3. **Safari gesture events:** Also handle `gesturestart`/`gesturechange` for Safari:
   ```typescript
   canvas.addEventListener('gesturechange', (e: any) => {
     e.preventDefault();
     const newZoom = currentZoom * e.scale;
     // Apply zoom...
   });
   ```
4. **Normalize zoom delta:** Mouse wheel `deltaY` values differ between browsers and input devices. Normalize to a consistent zoom factor:
   ```typescript
   const delta = -e.deltaY;
   const factor = e.ctrlKey
     ? 1 + delta * 0.01   // Pinch: fine-grained
     : 1 + delta * 0.001; // Scroll wheel: coarser
   ```
5. **Zoom around cursor position, not center.** When the user pinches, they expect the point under their fingers to stay fixed. Calculate the zoom focal point from the mouse/touch position, not the canvas center:
   ```typescript
   // Before zoom: world point under cursor
   const worldX = (cursorX - camera.offsetX) / camera.zoom;
   const worldY = (cursorY - camera.offsetY) / camera.zoom;
   // Apply new zoom
   camera.zoom = newZoom;
   // After zoom: adjust offset so same world point is under cursor
   camera.offsetX = cursorX - worldX * camera.zoom;
   camera.offsetY = cursorY - worldY * camera.zoom;
   ```
6. **Clamp zoom range.** Set min/max zoom (e.g., 0.5 to 4.0) to prevent unusable extremes.

**Detection:**
- Browser page zooms when pinching on canvas
- Pinch zoom doesn't work on Safari
- Zoom jumps in large increments (delta normalization wrong)
- Zooming shifts the view unexpectedly (not zooming around cursor)

**Phase mapping:** Core smooth zoom implementation phase.

**Confidence:** HIGH -- well-documented cross-browser pinch-zoom handling pattern.

---

### Pitfall 8: Pixel Art Quality Degrades at Non-Integer Zoom

**What goes wrong:** Pixel art is designed to be displayed at integer multiples (1x, 2x, 3x). At fractional zoom (e.g., 1.7x), each source pixel maps to 1.7 screen pixels. With `imageSmoothingEnabled = false` (nearest-neighbor), some source pixels become 2 screen pixels wide and others become 1 pixel wide, creating uneven pixel sizes. Vertical lines in sprites become alternately thick and thin. Faces become asymmetric. The carefully crafted pixel art looks "wrong" in a way that's hard to articulate but immediately noticeable.

**This is particularly problematic for 24x32 character sprites** where facial features (eyes, mouths) are 1-2 pixels. At 1.5x zoom, one eye is 2px and the other is 1px -- the character looks deformed.

**Consequences:**
- Pixel art looks "wobbly" at fractional zoom levels
- Character faces lose symmetry (critical for Stardew Valley-quality sprites)
- Floor tile patterns develop visible banding
- The high-quality art investment is undermined by rendering artifacts

**Prevention:**
1. **Snap to integer zoom at rest.** Allow fractional zoom during pinch gestures (smooth feel) but ease toward the nearest integer (or half-integer) when the gesture ends. The transition can be animated (200ms ease-out).
   ```typescript
   function snapZoom(rawZoom: number): number {
     return Math.round(rawZoom * 2) / 2; // Snap to 0.5 increments
   }
   ```
2. **Consider rendering at the next integer zoom and CSS-scaling down.** Render the canvas at `Math.ceil(zoom)` integer zoom, then use CSS transform or canvas sizing to display at the actual fractional zoom. This keeps pixels uniform at the cost of slight softness during transitions.
3. **Test sprite art at every snap point.** Before committing to zoom snap increments, render all character sprites at each level and verify faces/features look acceptable. Some sprites may need variant versions for specific zoom levels.
4. **For the zoom overview mode (showing entire office), accept the quality trade-off.** At zoom 0.5-0.75 (overview), individual pixel detail is not visible anyway. Quality only matters at zoom 1.5+.

**Detection:**
- Asymmetric character faces at certain zoom levels
- Floor tile patterns have visible "beating" or moire effects
- Art director/designer flags quality issues at specific zoom levels

**Phase mapping:** Must be validated with actual sprite art. Design the zoom snap behavior before the art is finalized.

**Confidence:** HIGH -- fundamental pixel art rendering limitation.

---

### Pitfall 9: 3/4 Perspective North Walls Need Tile Map Rethinking

**What goes wrong:** In the existing flat top-down view, walls are 1-tile-thick borders around rooms. In 3/4 perspective, the north wall of a room is visible as a vertical surface (you see its "face" because the camera looks down at an angle). This north wall needs to be taller than 1 tile visually (typically 2-3 tiles tall to create the room depth illusion). But the existing tile map has rooms immediately adjacent to hallways above them. There's no space for a tall north wall to render without overlapping the hallway or the room above.

**Existing layout conflict:**
```
Row 9-10:  Hallway (FLOOR tiles)
Row 11:    Wall row (WALL tiles) -- this is the north wall of Diana/War Room/Marcos
Row 12-19: Room interior (FLOOR tiles)
```
The north wall at row 11 is a single tile. In 3/4 perspective, its visual representation needs to extend upward 1-2 tiles into rows 9-10 (the hallway). But the hallway also needs to render there.

**Consequences:**
- North walls are visually too short (rooms look flat, not like 3D spaces)
- Tall north wall sprites overlap hallway floor rendering
- Rooms feel like open pens rather than enclosed offices
- The 3/4 depth illusion fails -- looks like top-down with angled furniture

**Prevention:**
1. **The compact layout redesign is the fix.** The new layout must account for visual wall height. Add 2-3 empty rows above each room's north wall for the wall face to render into. These tiles can be `VOID` (not walkable, not rendered as floor).
2. **Multi-layer tile rendering.** Render the floor layer (flat tiles only), then render wall faces as sprites that overlap into the rows above. This is the standard JRPG approach:
   - Floor layer: flat tiles, drawn first
   - Wall layer: tall sprites anchored at the wall's base row, drawn in Y-sort order with characters
3. **Design rooms bottom-up.** In 3/4 perspective, room interiors are typically 1-2 rows shorter than they appear because the north wall "eats into" the room visually. Plan room sizes accordingly.
4. **Study reference games.** Pokemon FireRed rooms have a 2-tile-tall north wall face. Stardew Valley has 1.5-tile-tall walls. Choose a consistent wall height and build the layout grid around it.

**Detection:**
- Rooms look flat despite 3/4 art style
- You can see "over" the north wall into the void above
- Hallway floor tiles visible behind what should be solid walls

**Phase mapping:** Must be designed into the compact layout from the start. Cannot be retrofitted after the layout is finalized.

**Confidence:** HIGH -- fundamental JRPG tilemap design pattern.

---

### Pitfall 10: Camera Follow Math Assumes Square Tiles and Top-Left Anchor

**What goes wrong:** The existing `updateCamera` in `camera.ts` targets BILLY's position (`ch.x`, `ch.y`) for follow mode. This position is the top-left corner of a 16x16 sprite. With 24x32 sprites, the visual center of the character is at `(ch.x + 12, ch.y + 16)`, not `(ch.x, ch.y)`. The camera will track 12 pixels left and 16 pixels above the character's visual center. Additionally, if the compact layout changes the map aspect ratio significantly, the `computeAutoFitZoom` function needs updating.

**Prevention:**
1. Update camera follow to target the character's visual center:
   ```typescript
   camera.targetX = (ch.x + CHAR_WIDTH / 2) * zoom - canvasWidth / 2;
   camera.targetY = (ch.y + CHAR_HEIGHT - TILE_SIZE / 2) * zoom - canvasHeight / 2;
   ```
2. Update `computeAutoFitZoom` to use the new map dimensions.
3. Add zoom bounds clamping in the camera update (don't zoom past min/max during smooth transitions).

**Detection:**
- Character appears off-center when camera follows
- Overview zoom is wrong scale for the new layout

**Phase mapping:** After sprite size change and layout redesign.

**Confidence:** HIGH -- direct from code analysis.

---

### Pitfall 11: Existing Tests Hardcode Layout Assumptions

**What goes wrong:** The test files (`__tests__/officeLayout.test.ts`, `__tests__/tileMap.test.ts`, `__tests__/characters.test.ts`, `__tests__/warRoom.test.ts`, `__tests__/renderer.test.ts`) likely contain assertions based on the 42x34 layout, specific room positions, and 16x16 tile assumptions. Changing the layout, tile sizes, or sprite dimensions will cause mass test failures. Developers sometimes disable tests to "unblock" progress, then forget to re-enable them, losing test coverage for critical pathfinding and rendering logic.

**Prevention:**
1. **Update tests first (TDD).** Write the new layout tests before changing the code. This forces you to think through the new coordinates and validates the design before implementation.
2. **Make tests parameterized where possible.** Instead of hardcoding `expect(mapCols).toBe(42)`, test invariants like "all room seatTiles are walkable" and "BFS finds a path between every pair of rooms."
3. **Never disable tests.** If a test needs to change, change it. If it's temporarily broken during a refactor, mark it with `test.todo()` or `test.skip()` with a comment explaining why and when it will be fixed.
4. **Add visual regression testing.** Capture reference screenshots at key zoom levels after the redesign. Compare against these references to catch rendering regressions automatically.

**Detection:**
- Test suite has `.skip` or commented-out tests after the layout change
- Tests pass but cover the wrong assertions (stale expectations)

**Phase mapping:** Before any code changes. Update test expectations as the first step.

**Confidence:** HIGH -- standard software engineering practice.

---

## Minor Pitfalls

Issues that cause friction but are straightforward to fix.

---

### Pitfall 12: Drop Shadow and Glow Effects Interact Poorly with Zoom

**What goes wrong:** The v1.1 spec calls for "drop shadows" on characters and "ambient halos" on desk lamps. These effects are typically implemented with `ctx.shadowBlur`, `ctx.globalAlpha`, or custom gradient radials. At integer zoom, these look fine. At fractional zoom, shadow blur radius needs to scale with zoom but `shadowBlur` values are in screen pixels (not world pixels). A shadow that looks good at zoom 2 looks too large at zoom 1 and invisible at zoom 3.

**Prevention:**
1. Scale shadow/glow parameters with zoom: `ctx.shadowBlur = baseShadowBlur * zoom`.
2. For ambient halos, use radial gradients with zoom-scaled radii.
3. If using `ctx.setTransform()` for zoom (Pitfall 2), note that `shadowBlur` is NOT affected by the transform -- it's always in output pixels. You must manually scale it.

**Detection:**
- Shadows look enormous at low zoom
- Shadows invisible at high zoom
- Glow effects flicker at fractional zoom

**Phase mapping:** When implementing glow/shadow effects on the new art.

**Confidence:** HIGH -- documented Canvas 2D shadow behavior.

---

### Pitfall 13: Status Overlays (Speech Bubbles, Thinking Dots) Position Wrong with New Sprites

**What goes wrong:** The `renderStatusOverlays` function in `renderer.ts` positions speech bubbles relative to character position using hardcoded offsets like `ch.y * zoom + offsetY - 4 * zoom`. These offsets assume a 16x16 character sprite. With 24x32 sprites, the bubbles will appear inside the character's head instead of above it, and thinking dots will be at the character's waist.

**Existing code at risk:**
- `renderer.ts:642-643` -- bubble position: `ch.y * zoom + offsetY - 4 * zoom` (4 pixels above 16px sprite top)
- `renderer.ts:673` -- dots position: `ch.y * zoom + offsetY - 2 * zoom`

**Prevention:**
1. Define overlay offsets relative to character sprite dimensions, not hardcoded pixel values:
   ```typescript
   const bubbleY = (ch.y - CHAR_HEIGHT + TILE_SIZE) * zoom + offsetY - 4 * zoom;
   ```
2. Better: store overlay anchor points in the character or sprite configuration. Different characters might need slightly different bubble positions based on their specific sprite art.

**Detection:**
- Speech bubbles appear inside character sprites
- Thinking dots at wrong height

**Phase mapping:** After sprite size change.

**Confidence:** HIGH -- trivial code fix once the sprite size constants are updated.

---

### Pitfall 14: File Icons on Desks Assume 16px Desk Geometry

**What goes wrong:** The `renderFileIcons` function calculates icon placement relative to desk position using `tileSize * 0.35` for icon width and hardcoded scatter offsets. With 3/4 perspective, desks have visible front faces and a different visual footprint. File icons need to appear "on top of" the desk surface, which is visually the upper portion of the desk tile in 3/4 view, not the full tile area.

**Prevention:**
1. Define a "desk surface rect" for each desk in the furniture data (the visual area where items can be placed).
2. Adjust file icon rendering to place icons within this surface rect, accounting for 3/4 perspective foreshortening.

**Detection:**
- File icons appear to float in front of the desk instead of sitting on it
- Icons overlap the desk's front face

**Phase mapping:** After furniture art is finalized.

**Confidence:** MEDIUM -- depends on specific desk sprite design.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Compact layout redesign | All hardcoded coordinates break (P4), north wall space (P9) | Centralize coordinates, add validation function, TDD | CRITICAL |
| Smooth zoom implementation | Sprite cache explosion (P1), rounding artifacts (P2), click-to-walk breaks (P6) | Quantize cache zoom, use ctx.setTransform, sync hit testing | CRITICAL |
| 24x32 sprite integration | Character positioning breaks (P3), overlay positions wrong (P13) | Foot-center anchoring, relative overlay offsets | CRITICAL |
| 3/4 perspective rendering | Depth sorting wrong (P5), north walls (P9) | Merge furniture+character Y-sort, multi-layer tiles | CRITICAL |
| Pinch-to-zoom input | Browser zoom conflict (P7), zoom-around-cursor math | Non-passive wheel listener, Safari gesture events | MODERATE |
| Pixel art quality | Non-integer zoom artifacts (P8), shadow scaling (P12) | Snap-to-integer at rest, scale effects with zoom | MODERATE |
| Camera system | Follow anchor wrong (P10), auto-fit zoom wrong | Target foot-center, update map dimensions | MODERATE |
| Test updates | Stale tests (P11) | Update tests before code, invariant-based assertions | MODERATE |
| Desk/file UI | File icon placement (P14) | Define desk surface rects | MINOR |

---

## Recommended Phase Order Based on Pitfall Dependencies

The pitfalls reveal a clear dependency chain for the implementation order:

1. **Layout first** (P4, P9) -- Everything depends on room positions. Compact layout with wall height planning must be finalized before any rendering work.
2. **Rendering pipeline second** (P2, P5) -- Switch to `ctx.setTransform()` zoom and unified Y-sort draw list. This is the foundation for both smooth zoom and 3/4 perspective.
3. **Sprite integration third** (P3, P13, P14) -- With the rendering pipeline correct, swap in 24x32 sprites with foot-center anchoring.
4. **Smooth zoom fourth** (P1, P6, P7, P8) -- Add pinch-to-zoom input, cache quantization, and zoom snapping. This depends on the rendering pipeline being transform-based.
5. **Camera and polish last** (P10, P12) -- Update camera follow, add shadows/glows, final quality pass.

Doing these out of order (e.g., adding smooth zoom before fixing the rendering pipeline) compounds the pitfalls and makes debugging much harder.

---

## Sources and Confidence Notes

All findings are based on:
- **Direct analysis of existing codebase** (`camera.ts`, `renderer.ts`, `spriteSheet.ts`, `characters.ts`, `officeLayout.ts`, `input.ts`, `spriteAtlas.ts`, `types.ts`) -- HIGH confidence
- **Canvas 2D rendering patterns** (established game development practices for tile-based engines) -- HIGH confidence
- **JRPG tilemap conventions** (Pokemon, Stardew Valley, Zelda-style rendering approaches) -- HIGH confidence
- **Browser pinch-to-zoom event handling** (MDN documentation, cross-browser compatibility patterns) -- HIGH confidence
- **Pixel art rendering at fractional scales** (well-documented in pixel art game development community) -- HIGH confidence

No web verification was performed for this session. All critical pitfalls are validated against the actual codebase structure and would apply regardless of framework version or library updates.

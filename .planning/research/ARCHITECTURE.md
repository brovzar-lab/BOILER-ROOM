# Architecture Patterns: v1.1 Visual Overhaul Integration

**Domain:** JRPG 3/4 perspective, smooth zoom, compact layout integration into existing Canvas 2D engine
**Researched:** 2026-03-13
**Overall Confidence:** HIGH (based on direct codebase analysis of all engine files)

## Executive Summary

The v1.1 visual overhaul touches three orthogonal concerns: (1) JRPG 3/4 perspective art requiring new sprite dimensions and a multi-layer tile renderer, (2) smooth trackpad zoom replacing integer-snap zoom, and (3) a compact room layout replacing the sprawling hub-and-spoke tile map. Each concern has clear boundaries in the existing code. The architecture is well-structured for these changes -- most modifications are isolated to specific files rather than requiring systemic rewrites.

**Key insight:** The existing engine already separates concerns cleanly (camera.ts, renderer.ts, officeLayout.ts, spriteAtlas.ts, characters.ts). The v1.1 changes modify internals of these files but do not change the boundaries between them. The Zustand bridge, game loop structure, and React integration remain untouched.

---

## Current Architecture (What Exists)

```
React Shell (OfficeCanvas.tsx)
  |
  v
Game Loop (gameLoop.ts) -- requestAnimationFrame
  |-- reads officeStore.getState() non-reactively
  |-- updateAllCharacters(dt, tileMap)
  |-- updateCamera(camera, dt, w, h)
  |-- renderFrame(ctx, camera, characters, activeRoom, w, h, statuses)
  |
  +-- camera.ts:        integer zoom, Math.round snapping, screenToTile/tileToScreen
  +-- renderer.ts:      layered draw (clear > floor > furniture > characters > overlays)
  +-- officeLayout.ts:  42x34 tile map, ROOMS[], FURNITURE[], hub-and-spoke
  +-- spriteAtlas.ts:   16x16 frame coordinates for characters (10col x 4row sheets)
  +-- spriteSheet.ts:   PNG loading, zoom-keyed sprite cache (getCachedSprite)
  +-- characters.ts:    BFS walk, state machine (idle/walk/work), pixel interpolation
  +-- tileMap.ts:       walkability checks, BFS pathfinding
  +-- input.ts:         click-to-tile, zoom toggle, drag-drop, keyboard shortcuts
  +-- types.ts:         TILE_SIZE=16, Camera, Character, SpriteFrame, Room interfaces
  |
  v
officeStore (Zustand) -- bridge to React
  |-- camera, characters, activeRoomId, zoomLevel, agentStatuses
  |-- setZoomLevel: Math.round(level) -- forces integer zoom
```

### Critical Dimensions

| Constant | Current Value | Used By |
|----------|---------------|---------|
| `TILE_SIZE` | 16px | Everything -- camera, renderer, characters, pathfinding |
| Grid | 42 cols x 34 rows | officeLayout.ts, camera.ts (map centering) |
| Character sprites | 16x16 per frame | spriteAtlas.ts (10col x 4row layout) |
| Zoom | Integer (1 or 2) | camera.ts, renderer.ts, spriteSheet.ts cache |
| Character position | `x = tileCol * TILE_SIZE` | characters.ts, renderer.ts |

---

## Integration Architecture: What Changes vs What Stays

### UNCHANGED (Do Not Touch)

| Component | Why It Survives |
|-----------|----------------|
| **Game loop structure** (gameLoop.ts) | rAF loop, dt capping, state reads -- all generic |
| **Zustand store pattern** | officeStore shape unchanged; camera/characters/rooms still same concepts |
| **React integration** | OfficeCanvas mount/unmount, chatStore, dealStore -- completely decoupled |
| **BFS pathfinding** (tileMap.ts) | Pure grid-based; works identically on any grid size |
| **Character state machine** | idle/walk/work states, path following, speed ramping -- grid-agnostic |
| **Audio system** (audioManager.ts) | No visual dependencies |
| **Input handlers** (input.ts) | Click-to-tile, keyboard shortcuts -- only need screenToTile update |

### MODIFIED (Change Internals, Keep Interface)

| Component | What Changes | Interface Impact |
|-----------|-------------|-----------------|
| **camera.ts** | Float zoom, remove Math.round snapping, add zoom min/max/speed | Camera.zoom becomes float; screenToTile/tileToScreen use float math |
| **renderer.ts** | Multi-layer JRPG rendering (ground, walls, objects-below, characters, objects-above) | Same renderFrame signature, new internal draw order |
| **officeLayout.ts** | New compact grid (~24x20), new ROOMS[] coords, new FURNITURE[] | Same interfaces (Room, FurnitureItem), different data |
| **spriteAtlas.ts** | New frame dimensions (24x32 characters, multi-tile furniture) | CHARACTER_FRAMES layout changes, ENVIRONMENT_ATLAS grows |
| **spriteSheet.ts** | Cache key includes float zoom, possibly atlas-based character sheets | getCachedSprite API unchanged, internal cache strategy changes |
| **types.ts** | TILE_SIZE stays 16, add CHARACTER_WIDTH/HEIGHT constants | New constants, Camera.zoom comment updated |
| **officeStore.ts** | setZoomLevel removes Math.round, stores float | Minor change |

### NEW (Add These)

| Component | Purpose |
|-----------|---------|
| **depthSort.ts** | Y-sort comparator for JRPG depth ordering (characters + furniture mixed) |
| **tileLayer.ts** | Ground layer vs wall/object layer tile definitions for 3/4 perspective |

---

## Change 1: JRPG 3/4 Perspective

### What "3/4 Perspective" Means for the Engine

In JRPG 3/4 view (Pokemon FireRed, Zelda: Link to the Past):
- **Floors** are drawn flat (top-down, occupying their tile exactly)
- **Walls** on the north edge of rooms are visible as 1-2 tile tall faces
- **Furniture/objects** are drawn "standing up" -- taller than their footprint, anchored at their base tile
- **Characters** are taller than 1 tile (typically 1 tile wide x 2 tiles tall), anchored at feet
- **Depth ordering** is critical: everything is Y-sorted by its base row so objects in front occlude objects behind

### Impact on Existing Renderer

The current renderer draws in fixed layers:
```
Layer 2: ALL floor tiles
Layer 3: ALL furniture
Layer 4: ALL characters (Y-sorted)
Layer 5: UI overlays
```

For JRPG 3/4, furniture and characters must be **interleaved** in the Y-sort, not drawn in separate passes. A character walking behind a desk must be occluded by the desk; a character in front must occlude it.

**New draw order:**
```
Layer 1: Clear canvas
Layer 2: Ground tiles (floors, ground-level decorations like rugs)
Layer 3: North wall faces (the visible wall "height" in 3/4 view)
Layer 4: Y-sorted renderables (characters + furniture + desk items, sorted by base row)
Layer 5: Overlay-layer objects (ceiling decorations, glow effects -- drawn after everything)
Layer 6: UI overlays (room labels, status bubbles, drop zones, file icons)
```

### Character Sprite Changes

**Current:** 16x16 per frame, 10 columns x 4 rows per sheet, `ch.x = tileCol * TILE_SIZE`, drawn at exact tile position.

**New:** 24x32 per frame (1.5 tiles wide x 2 tiles tall). Characters occupy 1 tile on the walkability grid but render larger. The sprite is anchored at the bottom-center so the feet align with the tile position.

```typescript
// Current (types.ts)
export const TILE_SIZE = 16;

// New additions
export const CHAR_SPRITE_W = 24;  // Character frame width
export const CHAR_SPRITE_H = 32;  // Character frame height
```

**Rendering anchor change in renderer.ts:**
```typescript
// Current: draw at tile position directly
const x = Math.floor(ch.x * zoom + offsetX);
const y = Math.floor(ch.y * zoom + offsetY);

// New: anchor at bottom-center of character sprite
// ch.x/ch.y still represent the tile position (feet)
const drawX = Math.floor(ch.x * zoom + offsetX - (CHAR_SPRITE_W - TILE_SIZE) * zoom / 2);
const drawY = Math.floor(ch.y * zoom + offsetY - (CHAR_SPRITE_H - TILE_SIZE) * zoom);
```

**spriteAtlas.ts changes:** The CHARACTER_FRAMES builder must use `CHAR_SPRITE_W` and `CHAR_SPRITE_H` instead of `TILE_SIZE` for frame dimensions. The sheet layout (10 cols x 4 rows) can stay the same, just with larger frames:
```
Sheet size: 240x128 (10 * 24 wide, 4 * 32 tall)
vs current: 160x64 (10 * 16 wide, 4 * 16 tall)
```

### Wall Rendering in 3/4 View

Current walls are single tiles (`TileType.WALL = 2`) drawn the same as floors -- just a different color/sprite. In 3/4 perspective, the north wall of a room has a visible "face" extending downward.

**Approach: Wall tile types expansion.** Instead of a single `WALL` type, add `WALL_TOP` (the ceiling-line, drawn in ground layer) and render the wall face as a taller sprite anchored at that position, drawn in the Y-sorted layer.

Alternatively (simpler): Keep `TileType.WALL` as-is in the walkability grid. During rendering, detect north-edge walls (wall tile with floor tile directly below) and draw them with a taller sprite that extends down. This avoids changing tileMap.ts or pathfinding logic.

**Recommended approach:** Detect wall orientation during rendering (not in tile data). The tile map remains a pure walkability grid. The renderer checks neighbors to determine wall sprite variant:
- Wall with floor below = north-facing wall face (draw tall)
- Wall with floor to the right = west wall edge
- Wall with no adjacent floor = corner/interior wall (draw as ceiling line)

### Furniture as Y-Sorted Renderables

Current furniture is drawn in a flat layer before characters. In 3/4 view, furniture sprites are taller (e.g., a desk is 2x1 tiles footprint but renders as 2x2 tiles visually with the front face visible).

**Data model change:** Add `renderHeight` to FurnitureItem:
```typescript
export interface FurnitureItem {
  roomId: string;
  type: string;
  col: number;
  row: number;
  width: number;   // footprint tiles
  height: number;  // footprint tiles
  renderHeight?: number;  // visual height in tiles (for 3/4 sprites)
  depthRow?: number;  // override Y-sort position (default: row + height - 1)
}
```

### Depth Sort Implementation

Create a unified "renderable" concept for Y-sorting:

```typescript
interface Renderable {
  type: 'character' | 'furniture' | 'decoration';
  baseRow: number;  // Y-sort key (bottom edge of the object)
  render: (ctx: CanvasRenderingContext2D, tileSize: number, offsetX: number, offsetY: number, zoom: number) => void;
}
```

Each frame, collect all characters and furniture into a `Renderable[]`, sort by `baseRow`, and draw in order. This replaces the current separate furniture pass + character pass.

### Drop Shadows

JRPG characters typically have small elliptical shadows at their feet. Add a shadow pass before drawing the character sprite:

```typescript
// Draw shadow ellipse at character feet
ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
ctx.beginPath();
ctx.ellipse(
  drawX + CHAR_SPRITE_W * zoom / 2,
  drawY + CHAR_SPRITE_H * zoom - 2 * zoom,
  6 * zoom, 3 * zoom,
  0, 0, Math.PI * 2
);
ctx.fill();
```

---

## Change 2: Smooth Trackpad Zoom

### Current Integer Zoom System

The existing system is deeply committed to integer zoom:

1. **camera.ts** `computeAutoFitZoom`: returns `Math.floor(...)` -- integer only
2. **camera.ts** `updateCamera`: `camera.x = Math.round(camera.x)` -- pixel snapping
3. **camera.ts** `screenToTile`: uses `TILE_SIZE * camera.zoom` -- works with any number
4. **officeStore.ts** `setZoomLevel`: `Math.round(level)` -- forces integer
5. **gameLoop.ts**: compares `state.camera.zoom === 1` for overview mode
6. **spriteSheet.ts** `getCachedSprite`: cache keyed by zoom -- works but generates many entries for float zoom
7. **renderer.ts**: uses `tileSize = TILE_SIZE * zoom` everywhere -- actually works with floats
8. **input.ts** `toggleZoom`: toggles between 1 and 2

### What Must Change

**camera.ts:**
- `computeAutoFitZoom` returns float instead of Math.floor
- `updateCamera` removes `Math.round` snapping (or uses sub-pixel rendering). For smooth zoom, positions must be float. Pixel-perfect crispness comes from `imageSmoothingEnabled = false` at integer zoom; at fractional zoom, slight softness is acceptable and expected.
- Add `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_SPEED` constants
- Add `handleWheel(deltaY, camera)` function for pinch-to-zoom

**officeStore.ts:**
- `setZoomLevel` removes `Math.round(level)`, stores raw float
- Consider adding `setZoomSmooth(delta: number)` that clamps to min/max

**gameLoop.ts:**
- Replace `state.camera.zoom === 1` check with `state.camera.zoom <= ZOOM_THRESHOLD_OVERVIEW` for overview mode detection
- Camera follow behavior scales smoothly with zoom level

**input.ts:**
- Replace `toggleZoom()` (1 <-> 2 toggle) with `handleWheel` for pinch zoom
- Add `wheel` event listener to canvas
- Optionally keep double-click as zoom-to-fit / zoom-to-follow toggle

**spriteSheet.ts:**
- The sprite cache keyed by exact zoom value will create many cache entries at fractional zoom levels. Two options:
  1. **Quantize cache key** to nearest 0.25 or 0.5 (reduces cache entries, slight visual imprecision)
  2. **Use ctx.drawImage scaling** directly instead of pre-cached canvases (slower per frame but no cache bloat)

  **Recommendation:** Quantize to nearest 0.5 for cache key. At smooth zoom levels, the 0.5 resolution is imperceptible. This means max ~8 cache entries per sprite (zoom 1.0 to 5.0 in 0.5 steps) instead of potentially hundreds.

```typescript
// Quantize zoom for cache key
const cacheZoom = Math.round(zoom * 2) / 2;  // Rounds to nearest 0.5
```

### Pinch-to-Zoom Implementation

Trackpad pinch on macOS fires `wheel` events with `ctrlKey: true` and fractional `deltaY`. Standard scroll-wheel fires `wheel` events without `ctrlKey`.

```typescript
function handleWheel(e: WheelEvent): void {
  e.preventDefault();

  const state = useOfficeStore.getState();
  const zoomDelta = -e.deltaY * ZOOM_SPEED;  // deltaY is negative for zoom-in
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.camera.zoom + zoomDelta));

  // Zoom toward cursor position (not center)
  // This requires adjusting camera.targetX/targetY to keep the point under cursor stable
  const rect = canvas.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  // Calculate world position under cursor before zoom
  const worldX = (cursorX - offsetX) / state.camera.zoom;
  const worldY = (cursorY - offsetY) / state.camera.zoom;

  // After zoom, adjust camera so same world position is under cursor
  state.camera.zoom = newZoom;
  // ... recalculate offsets

  state.setZoomLevel(newZoom);
}
```

**Zoom-toward-cursor** is essential for trackpad UX. Without it, pinch zoom feels wrong because the area of interest slides away from the pinch point.

### Recommended Zoom Constants

```typescript
export const ZOOM_MIN = 1.0;    // Full map visible
export const ZOOM_MAX = 5.0;    // Close-up detail
export const ZOOM_SPEED = 0.005; // Per deltaY unit
export const ZOOM_OVERVIEW_THRESHOLD = 1.5;  // Below this, treat as overview mode
```

---

## Change 3: Compact Room Layout

### Current Layout Analysis

The current 42x34 grid is spacious with wide hallways:
```
Row 0-1:   VOID / top border
Row 2-8:   BILLY's office (10 wide, 7 tall)
Row 9-10:  Hallway (2 rows tall, 34 wide)
Row 11-20: Diana (10x10) | War Room (10x10) | Marcos (10x10) -- with gaps
Row 21-22: Hallway (2 rows tall, 34 wide)
Row 23-32: Sasha (10x10) | Valentina (10x10) | Roberto (10x10)
Row 32-33: Border / VOID
```

Each room is 10x10 tiles (8x8 interior). Hallways are 2 tiles wide, spanning the full width. This creates a lot of empty traversal space.

### Target Layout: Compact Grid

The mockup calls for "2 top, War Room center, 4 bottom" with no sprawling hallways. Targeting approximately **24 cols x 20 rows**:

```
+--+--------+--+--------+--+
|  | Diana  |  | Marcos |  |
|  | (6x6)  |  | (6x6)  |  |
+--+---DD---+--+---DD---+--+
|       Hallway (1 row)      |
+--+---DD---+--+---DD---+--+
|  |  War   Room  (8x6) |  |
|  |   (center)         |  |
+--+---DD---+--+---DD---+--+
|       Hallway (1 row)      |
+--DD--+--DD--+--DD--+--DD--+
|Sasha |Valen |Rober |Billy |
|(5x5) |tina  |to    |(5x5) |
|      |(5x5) |(5x5) |      |
+------+------+------+------+
```

**Key changes:**
- Rooms shrink from 10x10 to 6x6 or 5x5 (4x4 or 3x3 interior)
- Hallways shrink from 2 tiles to 1 tile wide
- BILLY's office moves to bottom row (equal status with agents, not special top-center)
- War Room stays center but smaller
- Total grid: ~24x20 instead of 42x34

### What This Affects

**officeLayout.ts (complete rewrite of data, same interfaces):**
- `buildTileMap()` produces a smaller grid
- `ROOMS[]` array has new coordinates for every room
- `FURNITURE[]` array has new coordinates
- `getRoomAtTile()` works unchanged (just iterates ROOMS)

**camera.ts:**
- `computeAutoFitZoom()` reads `OFFICE_TILE_MAP` dimensions -- auto-adapts
- `screenToTile()` and `tileToScreen()` read map dimensions -- auto-adapt

**characters.ts:**
- `WAR_ROOM_SEATS` coordinates change to match new War Room position
- `startWalk()` uses new room coordinates from ROOMS -- auto-adapts via ROOMS lookup
- Walk distances are shorter, so `SPEED_RAMP_TILES` threshold (8) may need adjustment (down to 4-5)

**renderer.ts:**
- Decoration positions hardcoded in `renderDecorations()` must update to new coordinates
- Viewport culling math auto-adapts (reads mapCols/mapRows from tile map)

**gameLoop.ts:**
- Camera follow targeting auto-adapts

**Pathfinding (tileMap.ts):**
- No changes needed -- BFS operates on whatever grid it receives
- With 1-tile-wide hallways, all paths still work (4-connected grid)
- Shorter paths = faster walk times = snappier navigation feel

### Room Size Considerations

Shrinking rooms from 8x8 interior to 3x3 or 4x4 interior means:
- **Furniture must fit in fewer tiles.** A desk + chair + bookshelf in 3x3 is tight. Consider 4x4 interior (6x6 room with walls) as minimum for agent offices.
- **billyStandTile must be adjacent to the agent's seat** within the smaller room. With 4x4 interior, this is always possible.
- **War Room needs enough space for 5 seats around a table.** Minimum 6x4 interior (8x6 room with walls).

---

## Component Boundaries (Modified Architecture)

| Component | Responsibility | Communicates With | v1.1 Change Level |
|-----------|---------------|-------------------|-------------------|
| **types.ts** | Constants, interfaces | All engine files | LOW -- add CHAR_SPRITE_W/H, zoom constants |
| **officeLayout.ts** | Grid data, room coords, furniture | renderer, camera, characters, input | HIGH -- complete data rewrite, same interfaces |
| **tileMap.ts** | Walkability, BFS pathfinding | characters.ts | NONE |
| **camera.ts** | Zoom, pan, coordinate conversion | gameLoop, input, renderer | MEDIUM -- float zoom, remove rounding |
| **renderer.ts** | All drawing to canvas | gameLoop (called each frame) | HIGH -- new draw order, depth sort, wall faces |
| **spriteAtlas.ts** | Sprite frame coordinates | renderer, spriteSheet | MEDIUM -- new frame sizes, more environment tiles |
| **spriteSheet.ts** | Asset loading, sprite cache | renderer | LOW -- cache key quantization |
| **characters.ts** | Movement, animation, room logic | gameLoop, officeStore | LOW -- update WAR_ROOM_SEATS coords |
| **input.ts** | User interaction | canvas events, officeStore | MEDIUM -- add wheel zoom handler |
| **gameLoop.ts** | Frame loop orchestration | All engine modules | LOW -- overview threshold check |
| **officeStore.ts** | Zustand state bridge | React, engine | LOW -- remove Math.round from setZoomLevel |

---

## Data Flow Changes

### Current Flow (Zoom)
```
User double-clicks -> input.ts toggleZoom() -> officeStore.setZoomLevel(1 or 2)
  -> Math.round(level) stored
  -> gameLoop detects store zoom != camera zoom -> sets camera.zoom = integer
  -> renderer uses tileSize = TILE_SIZE * integer_zoom
  -> spriteSheet caches at integer zoom
```

### New Flow (Smooth Zoom)
```
User pinch/scroll -> input.ts handleWheel(e) -> compute new float zoom, clamp to [MIN, MAX]
  -> officeStore.setZoomLevel(float)
  -> gameLoop detects change -> sets camera.zoom = float
  -> camera.ts lerps zoom smoothly (optional: animate to target zoom)
  -> renderer uses tileSize = TILE_SIZE * float_zoom
  -> spriteSheet caches at quantized zoom (nearest 0.5)
  -> screenToTile uses float math (works as-is)
```

### Current Flow (Rendering)
```
renderFrame():
  1. Clear canvas
  2. For each visible tile: draw floor sprite (or color)
  3. For each furniture: draw furniture sprite
  4. Sort characters by Y -> draw each
  5. Draw status overlays
  6. Draw UI overlays
```

### New Flow (JRPG Rendering)
```
renderFrame():
  1. Clear canvas
  2. GROUND PASS: For each visible tile: draw floor/ground sprite
  3. WALL PASS: For north-edge walls, draw wall face sprites
  4. DEPTH-SORTED PASS:
     a. Collect all renderables (characters + furniture + decorations)
     b. Sort by baseRow (Y-sort)
     c. Draw each in order (behind-to-front)
  5. OVERLAY PASS: Glow effects, ceiling items
  6. UI PASS: Labels, bubbles, drop zones, file icons
```

---

## Patterns to Follow

### Pattern 1: Renderable Interface for Depth Sorting

**What:** Unify characters and furniture under a common interface for Y-sort rendering.
**When:** Any time objects at different Y positions must correctly overlap.

```typescript
interface Renderable {
  /** Y-sort key: the bottom tile row of this object's footprint */
  baseRow: number;
  /** Secondary sort: furniture renders before characters at same row */
  priority: number;  // 0 = furniture, 1 = character
  /** Draw this object */
  draw(ctx: CanvasRenderingContext2D, zoom: number, offsetX: number, offsetY: number): void;
}

function buildRenderables(characters: Character[], furniture: FurnitureItem[]): Renderable[] {
  const list: Renderable[] = [];

  for (const item of furniture) {
    list.push({
      baseRow: item.depthRow ?? (item.row + item.height - 1),
      priority: 0,
      draw: (ctx, zoom, ox, oy) => renderFurnitureItem(ctx, item, zoom, ox, oy),
    });
  }

  for (const ch of characters) {
    list.push({
      baseRow: ch.tileRow + ch.moveProgress * (/* next row delta */),
      priority: 1,
      draw: (ctx, zoom, ox, oy) => renderCharacterJRPG(ctx, ch, zoom, ox, oy),
    });
  }

  list.sort((a, b) => a.baseRow - b.baseRow || a.priority - b.priority);
  return list;
}
```

### Pattern 2: Anchor-Point Sprite Drawing

**What:** Draw sprites anchored at bottom-center (feet) rather than top-left (tile origin).
**When:** Any sprite taller than TILE_SIZE (characters, furniture).

```typescript
function drawAnchored(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  footTileCol: number,
  footTileRow: number,
  spriteW: number,  // source pixel width
  spriteH: number,  // source pixel height
  zoom: number,
  offsetX: number,
  offsetY: number,
): void {
  const tileSize = TILE_SIZE * zoom;
  // Foot position (bottom-center of the tile the object stands on)
  const footX = footTileCol * tileSize + offsetX + tileSize / 2;
  const footY = (footTileRow + 1) * tileSize + offsetY;  // bottom edge of tile

  // Draw sprite with bottom-center at foot position
  const drawW = spriteW * zoom;
  const drawH = spriteH * zoom;
  ctx.drawImage(sprite, footX - drawW / 2, footY - drawH, drawW, drawH);
}
```

### Pattern 3: Zoom-Quantized Sprite Cache

**What:** Round zoom to nearest 0.5 for cache keys to prevent unbounded cache growth.
**When:** Smooth zoom with pre-scaled sprite caching.

```typescript
function getQuantizedZoom(zoom: number): number {
  return Math.round(zoom * 2) / 2;  // 1.0, 1.5, 2.0, 2.5, ...
}

export function getCachedSprite(
  sheet: HTMLImageElement,
  frame: SpriteFrame,
  zoom: number,
): HTMLCanvasElement {
  const cacheZoom = getQuantizedZoom(zoom);
  // ... rest of cache logic uses cacheZoom for key, zoom for draw size
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Isometric Projection
**What:** Using isometric (diamond-shaped) tile projection instead of orthographic 3/4 view.
**Why bad:** The milestone explicitly calls for JRPG 3/4 perspective (Pokemon/Zelda style), which is orthographic top-down with "tall" sprites. Isometric would require rewriting coordinate conversion, pathfinding visualization, click detection, and all sprites. It is a fundamentally different projection.
**Instead:** Keep orthographic grid. Tiles are still axis-aligned rectangles. The "3/4" effect comes entirely from sprite art (drawn at an angle) and depth sorting.

### Anti-Pattern 2: Changing TILE_SIZE for Character Sprites
**What:** Changing `TILE_SIZE = 16` to 24 or 32 to match new character dimensions.
**Why bad:** TILE_SIZE is the grid cell size, not the character size. Characters in JRPG are taller than a grid cell. Changing TILE_SIZE would break the entire coordinate system, pathfinding, camera math, and require recalculating every position in the codebase.
**Instead:** Add `CHAR_SPRITE_W` and `CHAR_SPRITE_H` as separate constants. Characters occupy 1 tile in the grid but render larger.

### Anti-Pattern 3: Rebuilding Sprite Cache on Every Zoom Change
**What:** Calling `clearSpriteCache()` when zoom changes, forcing all sprites to re-render.
**Why bad:** With smooth zoom, zoom changes every frame during a pinch gesture. Clearing cache every frame destroys performance.
**Instead:** Let cache accumulate entries at quantized zoom levels. Cache entries at zoom 2.0 remain valid even when current zoom is 2.3. The quantized key (2.5 in this case) means the drawn sprite is slightly scaled from the cached version, which is imperceptible.

### Anti-Pattern 4: Splitting Tile Map into Multiple Layers in Data
**What:** Having separate 2D arrays for ground tiles, wall tiles, object tiles.
**Why bad:** Adds complexity to pathfinding (must merge layers for walkability), room detection, and coordinate conversion. The walkability grid is orthogonal to the visual representation.
**Instead:** Keep one tile map for walkability/room logic. Handle visual layers in the renderer only.

---

## Suggested Build Order

The three changes have dependencies that dictate build order:

```
1. Compact Layout (officeLayout.ts)
   |-- No visual dependencies, purely data
   |-- All other changes reference room/tile positions
   |-- Can test with existing renderer (just looks different)
   |
   v
2. Smooth Zoom (camera.ts, input.ts, officeStore.ts, spriteSheet.ts, gameLoop.ts)
   |-- Independent of art style
   |-- Needed before JRPG art (float zoom + 3/4 art = full visual)
   |-- Can test with existing sprites (squares zoom smoothly)
   |
   v
3. JRPG Renderer (renderer.ts, spriteAtlas.ts, types.ts)
   |-- Depends on layout (needs correct coordinates)
   |-- Benefits from smooth zoom (art looks better at non-integer zoom)
   |-- Largest change, highest risk -- do last
   |
   v
4. Character Sprites (spriteAtlas.ts, spriteSheet.ts, new PNG assets)
   |-- Depends on JRPG renderer (anchor-point drawing)
   |-- New 24x32 sprites replace 16x16
   |-- Can be incremental (one character at a time, fallback rectangles)
```

### Why This Order

1. **Layout first** because every coordinate in every test depends on room positions. Changing layout later would invalidate all tests and positions set up during other changes.

2. **Zoom second** because it is mechanically independent of art style. You can test smooth zoom with the existing colored rectangles and 16x16 sprites. It touches fewer files and has clear pass/fail criteria (pinch works, zoom is smooth, no visual bugs).

3. **JRPG renderer third** because it is the largest and most visually complex change. Having the correct layout and working zoom in place means you can focus purely on draw order, depth sorting, and wall rendering without worrying about coordinate bugs.

4. **Character sprites last** because they are the most art-dependent component. The renderer must support 24x32 drawing before new sprites can be loaded and tested. The existing fallback (colored rectangles) means the app works at every stage.

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Sprite cache memory bloat at float zoom | Medium | Medium | Quantize cache keys to 0.5 intervals |
| Sub-pixel rendering artifacts (shimmer/jitter) | Low | High | Accept slight softness at fractional zoom; snap to nearest integer when zoom is within 0.05 of integer |
| Y-sort visual glitches (character pops in front/behind furniture) | Medium | Medium | Use fractional baseRow (tileRow + moveProgress * dirDelta) for smooth transitions |
| Compact layout pathfinding dead ends (1-tile hallways) | Low | Low | BFS handles 1-tile-wide paths fine; test all room-to-room paths |
| Performance regression from interleaved Y-sort (was separate passes) | Low | Low | Building renderable list is O(n), sort is O(n log n) where n < 30. Negligible. |

---

## Sources

- Direct codebase analysis of `/Users/quantumcode/CODE/BOILER-ROOM/src/engine/` (all 10 engine files)
- Project spec in `.planning/PROJECT.md`
- JRPG rendering patterns from training data on Canvas 2D game engines (MEDIUM confidence -- standard, well-established patterns)
- Trackpad wheel event behavior on macOS (HIGH confidence -- well-documented Web API)

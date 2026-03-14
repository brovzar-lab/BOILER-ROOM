# Stack Research: v1.1 Visual Overhaul

**Domain:** JRPG 3/4 perspective rendering, smooth zoom, pixel art sprite pipeline
**Researched:** 2026-03-13
**Confidence:** HIGH (Canvas 2D APIs are stable; techniques are well-established game dev patterns; all integration points verified against existing codebase)

## Context

This research covers ONLY the new capabilities needed for v1.1. The existing stack (React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand 5, Canvas 2D, node-canvas) is validated and unchanged.

## Recommended Stack Additions

### Zero New Runtime Dependencies

The v1.1 visual overhaul requires **no new npm packages**. Every capability is achievable with existing Canvas 2D APIs and code-level changes to the engine. This is intentional -- the existing stack handles everything needed.

### What Changes (Code-Level, Not Package-Level)

| Change | Affected Files | Why Needed |
|--------|---------------|------------|
| Float zoom support | `engine/types.ts`, `engine/camera.ts`, `engine/spriteSheet.ts`, `store/officeStore.ts` | Smooth pinch-to-zoom needs continuous 0.5-5.0 range instead of integer snap |
| Wheel event handler | `engine/input.ts` | Trackpad pinch fires as `wheel` + `ctrlKey=true` on macOS |
| 3/4 perspective tile geometry | `engine/types.ts`, `engine/renderer.ts`, `engine/spriteAtlas.ts` | Taller tiles (16x24 env, 24x32 chars) for north wall visibility |
| Compact grid layout | `engine/officeLayout.ts` | Replace 42x34 sprawling layout with tight ~28x24 grid |
| Sprite sheet regeneration | `scripts/generateSprites.ts` | New frame sizes and 3/4 perspective art |
| Glow/lighting effects | `engine/renderer.ts` | Canvas 2D `shadowBlur` and composite operations for ambient light |

### Dev Tooling Addition

| Tool | Purpose | Why Recommended | Cost |
|------|---------|-----------------|------|
| Aseprite 1.3.x | Pixel art sprite creation and sprite sheet export | Industry standard for pixel art. Native sprite sheet export with JSON atlas data. Indexed color mode enforces palette discipline. Onion skinning for walk cycle animation. | $20 one-time or build from source (MIT-licensed) |

Aseprite is the only recommended addition, and it is a desktop app for the artist, not an npm dependency. The existing `node-canvas` in devDependencies continues to serve as the programmatic fallback for generating placeholder sprites.

## Detailed Implementation: Smooth Pinch-to-Zoom

### Current State

The zoom system is integer-only. Key enforcement points found in the codebase:

1. **`engine/types.ts` line 91**: Camera.zoom typed as `number` but documented as "Integer zoom level"
2. **`store/officeStore.ts` line 88-89**: `setZoomLevel` calls `Math.round(level)` on both `zoomLevel` and `camera.zoom`
3. **`engine/spriteSheet.ts` line 100**: Sprite cache keyed by `zoom` (integer) -- works because only values 1 and 2 exist
4. **`engine/camera.ts` line 20**: `computeAutoFitZoom` returns `Math.floor(...)` (integer)
5. **`engine/input.ts` line 295-299**: `toggleZoom()` snaps between 1 and 2
6. **`engine/gameLoop.ts` line 146**: Camera follow activates at `zoom >= 2`
7. **`engine/renderer.ts` line 49**: `imageSmoothingEnabled = false` every frame

### Required Changes

**1. Remove Math.round enforcement in officeStore:**
```typescript
// Before (line 88-89):
zoomLevel: Math.round(level),
camera: { ...state.camera, zoom: Math.round(level) },

// After:
zoomLevel: Math.max(0.5, Math.min(5.0, level)),
camera: { ...state.camera, zoom: Math.max(0.5, Math.min(5.0, level)) },
```

**2. Quantized sprite cache in spriteSheet.ts:**

The current cache keys by exact zoom. With float zoom, the cache would explode (infinite unique keys). Solution: quantize to nearest 0.25 for cache lookup while rendering at exact zoom.

```typescript
// In getCachedSprite(), change zoom parameter usage:
const cacheZoom = Math.round(zoom * 4) / 4; // Quantize: 1.0, 1.25, 1.5, 1.75, 2.0...
// Use cacheZoom for cache key and pre-scaled canvas dimensions
// Max 19 cache entries per sprite (0.5 to 5.0 in 0.25 steps) -- bounded
```

Pre-scale sprites to the quantized zoom with `imageSmoothingEnabled = false` in the offscreen cache canvas. This maintains crisp pixel art at any zoom because the actual drawing is always from a pre-scaled, nearest-neighbor-filtered canvas at 1:1.

**3. Add wheel event handler in input.ts:**

```typescript
function handleWheel(e: WheelEvent): void {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault(); // Prevent browser zoom
    const state = useOfficeStore.getState();
    const delta = -e.deltaY * 0.01; // Invert: scroll-up = zoom-in
    const newZoom = Math.max(0.5, Math.min(5.0, state.camera.zoom + delta));
    state.setZoomLevel(newZoom);
  }
}
// CRITICAL: { passive: false } required for preventDefault() on wheel events
canvas.addEventListener('wheel', handleWheel, { passive: false });
```

**Why `ctrlKey`:** On macOS, trackpad pinch-to-zoom fires as `wheel` events with `ctrlKey === true` and `deltaY` as the zoom delta. This is consistent across Chrome, Safari, and Firefox on macOS. No touch event handling needed since this is a desktop-only app.

**4. Update camera follow threshold in gameLoop.ts:**

```typescript
// Before (line 146):
if (billy && state.camera.followTarget === 'billy' && state.camera.zoom >= 2) {
// After:
if (billy && state.camera.followTarget === 'billy' && state.camera.zoom >= 1.2) {
```

**5. Remove integer snap from computeAutoFitZoom in camera.ts:**

```typescript
// Before:
return Math.max(1, Math.floor(Math.min(...)));
// After:
return Math.max(0.5, Math.min(...)); // Exact fit, not snapped to integer
```

**6. Smooth zoom animation:**

The existing `updateCamera` lerp (`camera.x += (target - camera.x) * 0.1`) provides smooth movement. Apply the same lerp to zoom transitions:

```typescript
// In updateCamera or gameLoop:
camera.zoom += (targetZoom - camera.zoom) * 0.15;
```

This makes zoom changes feel smooth rather than instant.

### Performance Note

The sprite cache with 0.25 quantization means at most ~19 zoom levels cached per sprite. With ~50 unique sprite frames across all sheets, that is ~950 cached canvases max (~4MB RAM at 32x48 average). Well within budget.

## Detailed Implementation: JRPG 3/4 Perspective

### What "3/4 Perspective" Means

In games like Pokemon FireRed, Zelda: A Link to the Past, and Stardew Valley, the world is drawn as if viewed from slightly above and to the south. Key characteristics:

- **Floors render flat** (top-down, same as current)
- **North walls are visible** as a front face (you see the wall's surface, not just its top edge)
- **Characters face south** toward the camera, showing their face
- **Furniture has visible front faces** (you see the front of desks, bookshelves)
- **Y-sorting provides depth** (things further south draw on top)

This is NOT isometric. The grid remains rectangular (no diamond projection). The only change from pure top-down is that tiles are taller to show north-facing surfaces.

### Tile Geometry Changes

| Element | Current | New | Notes |
|---------|---------|-----|-------|
| Grid cell (pathfinding) | 16x16 | 16x16 | Grid logic unchanged |
| Environment tile (rendered) | 16x16 | 16x24 | Extra 8px is north wall face |
| Character frame | 16x16 | 24x32 | Room for face detail, hair, outfit |
| `TILE_SIZE` constant | 16 | 16 | Keep for grid math |
| New `TILE_RENDER_H` | N/A | 24 | Tile draw height for environment |
| New `CHAR_W` / `CHAR_H` | N/A | 24 / 32 | Character sprite dimensions |

### Rendering Adjustments

**Floor tiles:** Each 16x24 tile image contains:
- Top 8px: north wall face (brick/wood texture, or transparent for interior tiles)
- Bottom 16px: floor surface (wood planks, carpet)

Draw at `(col * TILE_SIZE * zoom, row * TILE_SIZE * zoom - 8 * zoom)` -- the tile extends 8px above its grid row to show the wall face. This means tiles naturally overlap the row above, which is correct for the 3/4 look.

**Characters:** Currently drawn at character pixel position `(ch.x, ch.y)`. With 24x32 sprites on a 16x16 grid, center horizontally: `drawX = ch.x * zoom + offsetX - 4 * zoom` (offset by half the width difference). The taller sprite extends upward from the grid position.

**Y-sort unification:** Currently, only characters are Y-sorted (renderer.ts line 109). For proper 3/4 depth, furniture and characters must be sorted together. Create a unified "drawable" list:

```typescript
interface Drawable {
  y: number;        // Grid Y position (for sort)
  zIndex?: number;  // Tiebreaker
  draw: (ctx: CanvasRenderingContext2D) => void;
}
// Merge characters + furniture into one array, sort by y, draw in order
```

**Drop shadows:** Draw a dark semi-transparent ellipse beneath each character for grounding:

```typescript
ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
ctx.beginPath();
ctx.ellipse(charCenterX, charFootY, 5 * zoom, 2 * zoom, 0, 0, Math.PI * 2);
ctx.fill();
```

### Sprite Sheet Layout Changes

**Character sheets (each character):**

| | Current | New |
|---|---------|-----|
| Frame size | 16x16 | 24x32 |
| Layout | 10 cols x 4 rows | 10 cols x 4 rows (same structure) |
| Sheet dimensions | 160x64 | 240x128 |
| Cols | 0:idle, 1-4:walk, 5-7:work, 8-9:talk | Same mapping |
| Rows | 0:down, 1:left, 2:right, 3:up | Same mapping |

The `SpriteFrame` interface (`engine/types.ts`) already supports arbitrary `w` and `h`, so no type changes needed. Only the atlas coordinate constants in `spriteAtlas.ts` change.

**Environment sheet:**

| | Current | New |
|---|---------|-----|
| Frame size | 16x16 | 16x24 |
| Layout | 16 cols x 8 rows | 16 cols x 8 rows |
| Sheet dimensions | 256x128 | 256x192 |

### What Stays The Same

- `TileType` enum (VOID, FLOOR, WALL, DOOR) -- unchanged
- `TileCoord` interface -- unchanged
- BFS pathfinding -- operates on grid, unaware of render height
- `screenToTile` -- needs adjustment for tile render height offset but same structure
- Room click detection -- uses grid coordinates, not render coordinates
- Camera follow logic -- follows grid position, not render position

## Detailed Implementation: Compact Grid Layout

### Current Layout Problems

The current `officeLayout.ts` creates a 42x34 tile map (1428 tiles). Rooms are spread across 3 tiers with 2-tile-wide corridors between them. There is significant VOID space. Walking between rooms takes many steps.

### Target Layout

From PROJECT.md: "2 top, War Room center, 4 bottom." Rooms share walls. Minimal hallway. Estimated ~28x24 tile map.

```
  [Diana  6x6] [Marcos  6x6]
  [     War Room    10x6    ]
  [Sasha][Valen][Rober][Billy]
   6x6    6x6    6x6    6x6
```

All rooms are ~6x6 interior (8x8 including walls). Rooms share walls (adjacent rooms use a single wall tile between them, not two). Doors open to a 1-tile connector row between tiers instead of long hallways.

### Layout Math

```
Cols: 4 rooms across at 7 tiles each (6 interior + 1 shared wall) = 28 cols
Rows:
  Top tier:    1 wall + 6 interior + 1 shared wall = 8
  War Room:    6 interior + 1 shared wall = 7
  Bottom tier: 6 interior + 1 wall = 7
  Connectors:  2 rows (1 between each tier)
  Total: ~24 rows
```

Map shrinks from 42x34 (1428 tiles) to ~28x24 (672 tiles) -- 53% reduction. BILLY's walking distances drop proportionally, making navigation feel snappy.

### BFS Impact

Shorter paths between all rooms. Maximum path length drops from ~40 tiles to ~20. BFS completes faster (smaller grid). Character speed constants may need reduction to avoid BILLY zipping across the tiny map.

## Detailed Implementation: Glow & Lighting Effects

Canvas 2D provides three mechanisms, all native:

**1. `shadowBlur` for soft halos (desk lamps, ambient glow):**
```typescript
ctx.shadowColor = 'rgba(255, 200, 100, 0.4)';
ctx.shadowBlur = 16 * zoom;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;
// Draw the light-emitting sprite
ctx.drawImage(lampSprite, x, y);
// MUST reset
ctx.shadowBlur = 0;
```
Performance cost: moderate. `shadowBlur` triggers Gaussian blur per draw call. Use sparingly -- only on ~5-10 light-emitting objects (desk lamps, monitors). Not every frame needs recalculation; cache the glow on an offscreen canvas if FPS drops.

**2. `globalCompositeOperation = 'lighter'` for additive blending (monitor screen glow):**
```typescript
ctx.globalCompositeOperation = 'lighter';
ctx.fillStyle = 'rgba(50, 200, 100, 0.15)';
ctx.fillRect(monitorX - 8, monitorY - 4, 32, 24); // Soft green glow area
ctx.globalCompositeOperation = 'source-over'; // Reset
```
Low performance cost. Good for subtle colored light spillage.

**3. Radial gradients for area lighting:**
```typescript
const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * zoom);
gradient.addColorStop(0, 'rgba(255, 200, 100, 0.2)');
gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
ctx.fillStyle = gradient;
ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
```
Medium performance cost. Best for large area effects like overhead lighting.

**Recommendation:** Use `globalCompositeOperation = 'lighter'` for most effects (cheap). Reserve `shadowBlur` for the 2-3 most prominent light sources. Draw all lighting in a separate pass after characters for correct layering.

## Pixel Art Sprite Pipeline

### Recommended Workflow

```
1. Create art in Aseprite at native resolution
   - Characters: 24x32 per frame, 10 frames x 4 directions
   - Environment: 16x24 per tile
   - Use indexed color mode with a shared 32-64 color palette

2. Export from Aseprite: File > Export Sprite Sheet
   - Output: PNG sprite sheet + JSON atlas
   - Layout: rows by animation state, same as current atlas convention

3. Place exported PNGs in public/sprites/ (replacing generated ones)

4. Either:
   a. Import Aseprite JSON atlas and convert to SpriteFrame records at build time
   b. Or update spriteAtlas.ts constants manually (7 sheets, simple coordinates)

5. Fallback: scripts/generateSprites.ts updated for 24x32 / 16x24 dimensions
   - Used when hand-drawn art isn't ready
   - Same node-canvas approach, just bigger frames with more detail
```

### Why Aseprite Over Alternatives

| Criterion | Aseprite | Piskel (free/web) | Photoshop | GIMP |
|-----------|----------|-------------------|-----------|------|
| Indexed color palette | Yes (enforces consistency) | No | No | Partial |
| Sprite sheet export with JSON | Native, one-click | Basic PNG grid only | Manual | No |
| Onion skinning for animation | Yes | Basic | Clunky | No |
| Tile/tilemap mode | Yes | No | No | No |
| Pixel-level workflow | Purpose-built | Good | Overkill | Awkward |
| Community pixel art resources | Extensive | Moderate | Few | Few |

### Aseprite JSON Format Integration

Aseprite exports JSON like:
```json
{
  "frames": {
    "billy-idle-down-0.aseprite": {
      "frame": { "x": 0, "y": 0, "w": 24, "h": 32 }
    }
  }
}
```

A small build-time script (or Vite plugin) can convert this to the existing `Record<string, SpriteFrame>` format. Alternatively, since there are only 7 sprite sheets with predictable layouts, hardcoding the atlas coordinates in `spriteAtlas.ts` (as done today) remains viable and simpler.

### Palette Recommendation

For Stardew Valley / Pokemon FireRed quality, use a curated 32-color palette:
- 4-5 skin tones (warm, for the Mexican character designs)
- 6-8 environment colors (wood browns, stone grays, carpet tones)
- 5-6 per-agent accent colors (purple Diana, blue Marcos, green Sasha, red Roberto, orange Valentina, gold Billy)
- 3-4 lighting colors (warm lamp glow, cool monitor light, shadow)
- 2 UI colors (white highlights, near-black outlines)

Indexed color mode in Aseprite enforces this palette across all sprites, ensuring visual consistency.

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| WebGL / PixiJS / Three.js | Massive overkill. 3/4 perspective is standard 2D tile rendering with taller tiles and Y-sorting. Would require rewriting the entire ~500 LOC renderer. | Canvas 2D (existing) |
| Phaser / Kaboom.js | Game framework lock-in. Current custom engine is lean and fits perfectly. Frameworks add 200KB+ for features not needed. | Custom engine (existing) |
| hammerjs / use-gesture | Trackpad pinch fires as native `wheel` events. No touch events needed (desktop app). A gesture library adds complexity for a 15-line handler. | Native `wheel` event |
| GSAP / anime.js | Zoom animation is a single lerp in the existing camera system. One line of code. | Existing `updateCamera` lerp |
| Tiled map editor | The tile map is ~50 lines of code for 7 rooms. A visual editor adds workflow complexity without proportional value at this scale. | Hand-coded `officeLayout.ts` |
| Spine / DragonBones | Skeletal animation for smooth character motion. Pixel art at 24x32 looks best with hand-crafted frame animation, not interpolated bones. The 3/4 perspective style specifically demands frame-by-frame art. | Frame-based sprite sheets |
| sharp / imagemagick | Image processing for sprites. node-canvas already handles PNG generation. | node-canvas (existing) |
| react-zoom-pan-pinch | React wrapper for zoom/pan. The Canvas is rendered outside React's cycle. A React zoom library would fight the game loop. | Native wheel event + camera system |

## Version Compatibility

| Technology | Compatibility Notes |
|------------|-------------------|
| `wheel` event | All modern browsers. `ctrlKey` for trackpad pinch consistent on macOS Chrome/Safari/Firefox. |
| `{ passive: false }` | Required for `preventDefault()` on wheel. Chrome warns without explicit setting. |
| `shadowBlur` | All modern browsers. Performance varies -- faster in Chrome than Safari. |
| `globalCompositeOperation: 'lighter'` | All modern browsers. Hardware-accelerated in all major engines. |
| `ctx.ellipse()` | All modern browsers (Chrome 31+, Safari 9+, Firefox 48+). |
| `createRadialGradient` | Universal Canvas 2D support. |
| Canvas `roundRect()` | Already used in production (renderer.ts). Chrome 99+, Safari 15.4+, Firefox 112+. |

## Sources

- **Existing codebase** (HIGH confidence): Full analysis of `engine/renderer.ts` (727 lines), `engine/camera.ts` (109 lines), `engine/spriteSheet.ts` (138 lines), `engine/spriteAtlas.ts` (123 lines), `engine/input.ts` (337 lines), `engine/gameLoop.ts` (179 lines), `engine/types.ts` (110 lines), `engine/officeLayout.ts` (303 lines), `scripts/generateSprites.ts` (673 lines)
- **Canvas 2D API** (HIGH confidence): `imageSmoothingEnabled`, `shadowBlur`, `globalCompositeOperation`, `wheel` event, `ellipse()` are stable, long-established browser APIs
- **macOS trackpad behavior** (HIGH confidence): `wheel` event with `ctrlKey === true` for pinch-to-zoom is the documented, consistent pattern across all macOS browsers
- **JRPG 3/4 perspective techniques** (HIGH confidence): Well-established in game development (Pokemon, Zelda, Stardew Valley lineage). Standard approach: taller tiles, Y-sorting, no projection math changes from top-down
- **Aseprite sprite sheet export** (HIGH confidence): Standard tooling in indie game dev, JSON+PNG export format is well-documented

---
*Stack research for: Lemon Command Center v1.1 Visual Overhaul*
*Researched: 2026-03-13*

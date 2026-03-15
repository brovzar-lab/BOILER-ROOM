# Phase 14: LimeZu Art Integration - Research

**Researched:** 2026-03-15
**Domain:** 2D pixel art sprite sheet integration (LimeZu Modern Interiors), Canvas 2D rendering, multi-sheet atlas management
**Confidence:** HIGH

## Summary

Phase 14 replaces every programmatic placeholder in the canvas renderer with professional LimeZu Modern Interiors pixel art. The project already owns the paid LimeZu asset pack (located at `public/sprites/modern-interiors-paid/`), and the existing rendering pipeline was designed for PNG replacement via the SPRT-04 asset swap contract. The primary challenges are: (1) remapping the character sprite atlas from the current 10-column x 4-row layout to LimeZu's much richer ~56-column x 41-row layout, (2) building a multi-sheet environment atlas loader that references multiple LimeZu PNG source files instead of the single `environment.png`, and (3) updating all dimension constants and anchor math from 24x32 to 32x32 characters.

The LimeZu asset pack is well-organized with three resolution tiers (16x16, 32x32, 48x48). The project uses 16x16 tiles and 32x32 characters. Environment assets are split across categorized theme sheets (Generic, Conference Hall, Film Studio, etc.) and Room Builder subfiles (floors, walls, 3D walls, baseboards). Character premade sheets contain ~20+ animation rows with far more animations than the project needs -- only idle, walk, sit, phone/work, and possibly talk rows will be used.

**Primary recommendation:** Build a multi-sheet atlas registry (`limeZuAtlas.ts`) that maps semantic asset keys to `{sheetPath, frame}` tuples, load all referenced LimeZu PNGs in parallel at startup, and update `spriteAtlas.ts` character frame mapping to match the LimeZu premade character sheet layout.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- BILLY (CEO): Premade Character #13
- Patrik (CFO): Premade Character #05
- Marcos (Lawyer): Premade Character #09
- Sandra (Producer): Premade Character #08
- Isaac (Head of Dev): Premade Character #03
- Wendy (Coach): Premade Character #10
- All characters use 32x32 sprites from `2_Characters/Character_Generator/0_Premade_Characters/32x32/`
- LimeZu sheet layout is different from our 10x4 grid -- atlas remapping required
- Agent offices: light tile/marble floor -- uniform across all offices
- War Room: darker/premium floor -- distinct from offices
- Hallways/corridors: dark floor (grey/charcoal)
- Rec area: warmer floor (wood or carpet)
- All floors from `Room_Builder_Floors_16x16.png`
- Replace Phase 10 cream wall strips with LimeZu 3D wall system
- All walls from `Room_Builder_Walls_16x16.png` and `Room_Builder_3d_walls_16x16.png`
- Modern wood desks across all offices
- Wendy's coaching room: couch + plants focused, secondary desk
- War Room: LimeZu Conference Hall table + office chairs from `13_Conference_Hall_16x16.png`
- Film Studio props from `23_Television_and_Film_Studio.png` for Isaac and/or BILLY
- All other furniture from `1_Generic_16x16.png`
- Decorations match Phase 11 personality roles using LimeZu equivalents
- LimeZu thinking emotes (`UI_thinking_emotes_animation_16x16.png`) for agent status
- LimeZu UI elements (`UI_16x16.png`) for speech bubbles
- Static only -- no animated objects (deferred to v2.1)

### Claude's Discretion
- Exact wall color selection (must work with light tile + dark theme)
- Exact tile variant selection within each floor category
- LimeZu sheet frame layout audit and atlas coordinate mapping
- Multi-sheet atlas loader architecture
- How Film Studio props are distributed between Isaac and BILLY
- Rec area furniture selection from LimeZu generic/living room sheets
- Drop shadow adjustment for 32x32 characters

### Deferred Ideas (OUT OF SCOPE)
- Animated environment elements (fan rotation, screen flicker) -- v2.1 ART-03
- Custom characters from Character Generator parts (body + outfit + hair + eyes) -- v2.1 ART-04
- LimeZu animated sprite sheets for objects -- v2.1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAR-01 | Characters render as 32x32 LimeZu sprites replacing 24x32 placeholders | Character sheet layout audit, dimension constant update plan, CHARACTER_FRAMES remapping |
| CHAR-02 | Each of 6 characters has distinct LimeZu character with walk, idle, sit animations | Premade character assignments verified, animation row mapping documented |
| CHAR-03 | Foot-center anchoring updated for 32x32 on 16x16 grid | Anchor math change documented (characters now 2x2 tiles), affected files identified |
| CHAR-04 | Drop shadows and depth sorting work with 32x32 sprites | Shadow ellipse and depthSort baseRow adjustment documented |
| ENV-08 | Floor tiles replaced with LimeZu Room Builder tiles | Floor sheet layout (240x640, 15 cols x 40 rows), tile variant recommendations |
| ENV-09 | Walls replaced with LimeZu 3D wall system | 3D wall sheet layout (384x944), wall rendering replacement strategy |
| ENV-10 | All furniture replaced with LimeZu sprites | Generic sheet (256x1248), multi-tile furniture coordinate mapping |
| ENV-11 | War Room uses Conference Hall assets | Conference Hall sheet (256x192) layout with table, chairs, whiteboard |
| ENV-12 | Rec area furniture replaced with LimeZu assets | Living Room sheet (256x720) for couches, Generic for water cooler |
| ENV-13 | Personality decorations per office use LimeZu sprites | Decoration mapping from Generic, Classroom/Library, Film Studio sheets |
| ENV-14 | Multi-sheet atlas loader supports categorized tile organization | Multi-sheet architecture design, loader pattern, cache integration |
| UI-06 | LimeZu thinking emotes as agent status indicators | UI emotes sheet (160x160, 10x10 grid of 16x16), emote type mapping |
| UI-07 | LimeZu UI elements for speech bubbles | UI sheet (288x256, 18x16 grid of 16x16), speech bubble sprite locations |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | native | All rendering | Already used, no WebGL needed |
| TypeScript | ^5.7 | Type-safe atlas definitions | Already in project |
| Vite | ^6 | Static asset serving from `/public/sprites/` | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.0 | Unit tests for atlas mapping, anchor math | Already configured with canvas mock |
| canvas (npm) | ^3.2.1 | Node Canvas for test environment | Already in devDependencies |
| vitest-canvas-mock | ^1.1.3 | Canvas API mocking | Already in devDependencies |

### No New Dependencies Needed
This phase is purely about data mapping and rendering logic changes. All LimeZu PNGs are loaded via the browser's native `Image()` API (already used in `spriteSheet.ts`). No new npm packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/engine/
  limeZuAtlas.ts          # NEW: Multi-sheet atlas registry (sheet paths + frame coordinates)
  limeZuCharFrames.ts     # NEW: Character frame mapping for LimeZu premade sheet layout
  spriteAtlas.ts           # MODIFIED: Imports from limeZuAtlas, removes old hardcoded coords
  spriteSheet.ts           # MODIFIED: Multi-sheet loader (Map<string, HTMLImageElement>)
  types.ts                 # MODIFIED: CHAR_SPRITE_W=32, CHAR_SPRITE_H=32
  renderer.ts              # MODIFIED: Updated anchoring, wall rendering, status overlays
  depthSort.ts             # MODIFIED: Updated baseRow calc for 32x32
  officeLayout.ts          # MODIFIED: Updated FURNITURE/DECORATIONS with LimeZu asset keys
public/sprites/
  modern-interiors-paid/   # Source LimeZu assets (already present, not modified)
```

### Pattern 1: Multi-Sheet Atlas Registry
**What:** A central registry mapping semantic keys (e.g., `'desk-wood-2wide'`) to `{sheetId, frame}` tuples, where `sheetId` references a loaded PNG and `frame` is a `SpriteFrame`.
**When to use:** Every environment and decoration draw call.
**Example:**
```typescript
// src/engine/limeZuAtlas.ts

import type { SpriteFrame } from './types';
import { TILE_SIZE } from './types';

const T = TILE_SIZE; // 16

/** Sheet IDs referencing paths under /sprites/modern-interiors-paid/ */
export const SHEET_PATHS: Record<string, string> = {
  'generic':        '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/1_Generic_16x16.png',
  'living-room':    '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/2_LivingRoom_16x16.png',
  'classroom':      '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/5_Classroom_and_library_16x16.png',
  'conference':     '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/13_Conference_Hall_16x16.png',
  'film-studio':    '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/23_Television_and_Film_Studio.png',
  'floors':         '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Floors_16x16.png',
  'walls':          '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Walls_16x16.png',
  '3d-walls':       '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_3d_walls_16x16.png',
  'baseboards':     '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Baseboards_16x16.png',
  'floor-shadows':  '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Floor_Shadows_16x16.png',
  'ui':             '/sprites/modern-interiors-paid/4_User_Interface_Elements/UI_16x16.png',
  'ui-emotes':      '/sprites/modern-interiors-paid/4_User_Interface_Elements/UI_thinking_emotes_animation_16x16.png',
};

export interface SheetFrame {
  sheetId: string;
  frame: SpriteFrame;
}

function sf(sheetId: string, col: number, row: number, w = 1, h = 1): SheetFrame {
  return {
    sheetId,
    frame: { x: col * T, y: row * T, w: w * T, h: h * T },
  };
}

export const LIMEZU_ATLAS: Record<string, SheetFrame> = {
  // Floors (from Room_Builder_Floors_16x16.png -- 240x640, 15 cols x 40 rows)
  // Each floor type occupies a 3x2 block (top-left, top, top-right, bottom-left, etc.)
  'floor-office': sf('floors', /* col */, /* row */),  // Light tile/marble variant
  'floor-warroom': sf('floors', /* col */, /* row */), // Dark premium
  'floor-hallway': sf('floors', /* col */, /* row */), // Grey/charcoal
  'floor-rec': sf('floors', /* col */, /* row */),     // Warm wood/carpet
  // ... exact coords determined during implementation by visual inspection
};
```

### Pattern 2: Character Frame Remapping
**What:** Map the LimeZu premade character sheet layout to the game's `CharacterState` and `Direction` types.
**When to use:** Replace `buildCharacterFrames()` in `spriteAtlas.ts`.

**LimeZu 32x32 Premade Character Sheet Layout** (1792x1312 = 56 cols x 41 rows):
Based on visual analysis of the animation guide and sheet:

| Row | Animation | Frames | Directions | Notes |
|-----|-----------|--------|------------|-------|
| 0 | Idle (preview) | 4 frames | down, left, right, up | Small preview set |
| 1 | Idle | ~18 frames | down | Full idle loop |
| 2 | Walk | ~18 frames | down | Walk cycle |
| 3 | Sleep + bed sprites | varies | down | Not needed |
| 4 | Sit | ~9 frames | down, left, right, up | Sitting animation |
| 5 | Sit (variant) | ~9 frames | down, left, right, up | Alt sit |
| 6 | Phone | 4-9 loop | down (implied) | Use for "work" state |
| 7 | Working at desk | 1-6 loop | down | Desk work animation (future) |
| 8+ | Push cart, pick up, gift, lift, throw, hit, punch, stab, etc. | varies | 4 directions | Not needed for Phase 14 |

**Critical finding:** The LimeZu character sheets do NOT use the same simple 4-row-by-direction layout as the current system. Instead, animations are organized by animation type with directions packed within each row. The idle/walk animations appear to have all 4 directions sequentially within single rows (each direction getting a group of frames).

**Recommended approach:**
```typescript
// src/engine/limeZuCharFrames.ts
// Map LimeZu premade sheet layout to our CharacterState system

import type { SpriteFrame } from './types';
import type { CharacterState, Direction } from './types';

const W = 32; // Character sprite width
const H = 32; // Character sprite height

function frame(col: number, row: number): SpriteFrame {
  return { x: col * W, y: row * H, w: W, h: H };
}

// Row 0: 4-frame idle preview -- down(0), left(1), right(2), up(3)
// Row 1: Full idle with all directions packed
// Row 2: Walk with all directions packed
// Row 4-5: Sit
// Row 6: Phone (use for "work" state)

// ACTUAL MAPPING: Must be audited per-sheet during implementation.
// The guide image shows labeled rows. Exact frame counts and
// direction boundaries need pixel-level verification.
```

### Pattern 3: Floor Tile Rendering with Room Builder Tiles
**What:** LimeZu Room Builder floor tiles use a pattern system where each floor style occupies a region of the sheet. For a simple uniform fill (which this project uses), you pick the "center" tile of each floor style.
**When to use:** `renderer.ts` floor layer.

**Floor sheet layout (240x640):** 15 columns x 40 rows of 16x16 tiles. Each floor type uses roughly a 3x2 tile block for edge/corner variations. For uniform room fills, use the center tile from each block.

### Pattern 4: 3D Wall System Replacement
**What:** Replace hand-coded 2-3px wall strips with LimeZu 3D wall tiles.
**When to use:** `renderer.ts` wall rendering.

**3D wall sheet (384x944):** 24 cols x 59 rows of 16x16 tiles. Contains perspective wall tiles with proper depth, baseboards, window variants, and color options. Each wall color variant occupies a horizontal band. The 3D walls are designed to sit on the top-wall tile row and create a visual depth effect.

**Key insight:** The current `renderWalls()` function draws 2-3px colored strips. The LimeZu 3D walls are full 16x16 tiles that replace the wall tile itself (not overlays). The wall rendering approach changes from "draw strips on top of wall tiles" to "draw 3D wall tiles instead of flat wall tiles."

### Anti-Patterns to Avoid
- **Mega-sheet combination:** Do NOT combine all LimeZu sheets into one mega-spritesheet. The sheets are already categorized and sized for direct use. Combining would waste memory and make coordinate mapping harder.
- **Hardcoded pixel coordinates:** Do NOT use raw pixel numbers. Always express coordinates as `col * TILE_SIZE, row * TILE_SIZE` (or `col * W, row * H` for characters) so the system self-documents.
- **Modifying LimeZu PNGs:** Do NOT edit or re-export the original LimeZu PNG files. Reference them as-is from their original paths.
- **Loading all sheets eagerly:** Only load sheets that are actually referenced. The pack has 26+ theme sheets; the project only needs ~8-10 of them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Floor tile edge detection | Auto-tiling with neighbor checks | Single "center" tile per floor type (uniform fill) | Project uses uniform room fills, not terrain transitions |
| Sprite sheet packing | Build tool to combine sheets | Reference original LimeZu PNGs directly | Already organized, direct reference is simpler |
| Character animation state machine | Complex animation controller | Map LimeZu rows to existing CharacterState enum | Only need idle/walk/sit/work -- 4 states |
| Image format conversion | PNG optimization pipeline | Serve original PNGs as-is via Vite `/public/` | Browser handles PNG decoding natively |

**Key insight:** The complexity in this phase is data mapping (coordinates), not algorithmic. The rendering pipeline already works -- it just needs different source coordinates and sheet references.

## Common Pitfalls

### Pitfall 1: Character Sheet Layout Assumption
**What goes wrong:** Assuming LimeZu sheets use a simple grid like the current 10x4 layout, then getting wrong frames at runtime.
**Why it happens:** LimeZu premade character sheets pack multiple directions within single rows, with varying frame counts per animation.
**How to avoid:** Visually audit each premade character sheet by loading it in a viewer and counting frame boundaries. Create the coordinate map from actual pixel measurements, not assumptions.
**Warning signs:** Characters show wrong body parts, clipped sprites, or wrong animation direction.

### Pitfall 2: Floor Tile Edge Mismatch
**What goes wrong:** Using a random tile from the floor sheet and getting visible seams between tiles.
**Why it happens:** LimeZu floor tiles use a repeating pattern system. Some tiles are edges/corners, not centers.
**How to avoid:** For uniform fills, use only the "center" tile(s) from each floor pattern group. Each floor style typically has a 3x2 arrangement: pick the middle tiles.
**Warning signs:** Visible borders between floor tiles that shouldn't be there.

### Pitfall 3: 3D Wall Alignment
**What goes wrong:** 3D wall tiles don't align with the floor/room boundaries, creating visual gaps or overlaps.
**Why it happens:** The 3D wall system has specific tiles for north-facing, east-facing, and corner walls. Using the wrong tile type for a wall position creates misalignment.
**How to avoid:** Map wall tiles based on neighbor analysis (same as current renderWalls does). North walls use one set of 3D tiles, side walls use another.
**Warning signs:** Walls look broken at corners, gaps between wall and floor.

### Pitfall 4: Character Anchor Drift
**What goes wrong:** Characters appear to float or sink after changing from 24x32 to 32x32.
**Why it happens:** The foot-center anchor formula `drawX = x - (CHAR_SPRITE_W - TILE_SIZE) / 2` changes from `x - 4` to `x - 8` with 32x32 sprites. The vertical offset changes from `y - 16` to `y - 16` (same, since height stays 32). BUT characters are now 2 tiles wide visually, which may look different.
**How to avoid:** Update CHAR_SPRITE_W from 24 to 32. The horizontal centering formula produces `x - 8` (centered 32px sprite on 16px tile). Verify at multiple zoom levels.
**Warning signs:** Characters offset from their tile positions, feet not aligned with floor.

### Pitfall 5: Sprite Cache Invalidation
**What goes wrong:** Old cached sprites persist after switching to LimeZu assets, showing ghost images.
**Why it happens:** `spriteSheet.ts` caches pre-scaled sprites keyed by `sheet.src + frame coords`. If the same coordinates are used with different sheets, stale cache entries appear.
**How to avoid:** The existing cache key includes `sheet.src`, so different sheets won't collide. But ensure `clearSpriteCache()` is called when switching sheets, and verify cache keys are unique across the new multi-sheet system.

### Pitfall 6: Loading Performance
**What goes wrong:** App startup becomes noticeably slower loading 8-10 PNG sheets instead of 7.
**Why it happens:** The larger LimeZu sheets (Generic is 256x1248, 3D Walls is 384x944) are bigger than the current sheets.
**How to avoid:** Load all sheets in parallel with `Promise.all()` (already the pattern in `loadAllAssets()`). The total payload is ~1-2MB of PNGs -- acceptable for a desktop web app.

## Code Examples

### Dimension Constant Update (types.ts)
```typescript
// BEFORE:
export const CHAR_SPRITE_W = 24;
export const CHAR_SPRITE_H = 32;

// AFTER:
export const CHAR_SPRITE_W = 32;
export const CHAR_SPRITE_H = 32;
```

### Foot-Center Anchor Math (renderer.ts)
```typescript
// BEFORE (24x32): drawX = x - (24 - 16) / 2 = x - 4
// AFTER  (32x32): drawX = x - (32 - 16) / 2 = x - 8
// The formula stays the same, just uses the updated constant.
const drawX = x - (CHAR_SPRITE_W - TILE_SIZE) / 2;  // now x - 8
const drawY = y - (CHAR_SPRITE_H - TILE_SIZE);       // still y - 16
```

### Multi-Sheet Loader Pattern
```typescript
// In spriteSheet.ts -- replace single environmentSheet with a Map
const environmentSheets: Map<string, HTMLImageElement> = new Map();

export async function loadAllAssets(): Promise<void> {
  const promises: Promise<void>[] = [];

  // Character sheets (6 premade characters from LimeZu)
  const charMapping: Record<string, string> = {
    'billy':  '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_13.png',
    'patrik': '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_05.png',
    'marcos': '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_09.png',
    'sandra': '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_08.png',
    'isaac':  '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_03.png',
    'wendy':  '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_10.png',
  };

  for (const [id, path] of Object.entries(charMapping)) {
    promises.push(
      loadSpriteSheet(path).then((img) => characterSheets.set(id, img))
    );
  }

  // Environment sheets (from SHEET_PATHS registry)
  for (const [sheetId, path] of Object.entries(SHEET_PATHS)) {
    promises.push(
      loadSpriteSheet(path).then((img) => environmentSheets.set(sheetId, img))
    );
  }

  await Promise.all(promises);
}

export function getEnvironmentSheetById(sheetId: string): HTMLImageElement | null {
  return environmentSheets.get(sheetId) ?? null;
}
```

### Shadow Ellipse Adjustment for 32x32
```typescript
// BEFORE: shadow centered on tile, sized for 24-wide sprite
const shadowCx = x + TILE_SIZE / 2;
const shadowRx = TILE_SIZE * 0.4;

// AFTER: shadow still centered on tile (feet are on tile),
// but slightly wider to match the wider 32x32 sprite
const shadowCx = x + TILE_SIZE / 2;
const shadowRx = TILE_SIZE * 0.5;  // slightly wider for 32x32
```

### Status Overlay Y-Offset Update
```typescript
// BEFORE: visual top at ch.y - (32 - 16) = ch.y - 16
const charScreen = worldToScreen(ch.x + TILE_SIZE / 2, ch.y - (CHAR_SPRITE_H - TILE_SIZE));

// AFTER: same formula, same result (32 - 16 = 16), but character is wider
// so center X might need adjustment if sprites are off-center
const charScreen = worldToScreen(ch.x + TILE_SIZE / 2, ch.y - (CHAR_SPRITE_H - TILE_SIZE));
```

## LimeZu Asset Audit

### Character Sheets (32x32 Premade)
| Property | Value |
|----------|-------|
| Sheet dimensions | 1792 x 1312 pixels |
| Grid | 56 cols x 41 rows of 32x32 frames |
| Frame size | 32 x 32 pixels |
| Path pattern | `2_Characters/Character_Generator/0_Premade_Characters/32x32/Premade_Character_32x32_{NN}.png` |
| Available characters | 20 premade (01-20) |
| Used characters | #03, #05, #08, #09, #10, #13 |

**Animation rows (from guide analysis):**
- Row 0: Idle preview (4 frames, 4 directions packed)
- Row 1: Idle full loop (all directions sequential within row)
- Row 2: Walk full loop (all directions sequential within row)
- Row 3: Sleep/bed variants
- Rows 4-5: Sit (two variants, directional)
- Row 6: Phone animation (4-9 loop) -- use for "work" state
- Row 7: Working at desk with equipment sprites (1-6 loop)
- Rows 8+: Action animations (push cart, pick up, lift, throw, hit, punch, stab, grab gun, shoot, hurt)

**Needed for Phase 14:** Rows 0-2 (idle, walk), Rows 4-5 (sit), Row 6 (phone/work). Others can be added later.

### Environment Sheets (16x16)
| Sheet | Dimensions | Grid (16px) | Content |
|-------|-----------|-------------|---------|
| Room_Builder_Floors_16x16.png | 240x640 | 15 x 40 | All floor tile patterns (20+ styles) |
| Room_Builder_Walls_16x16.png | 512x640 | 32 x 40 | Flat wall tiles with color variants |
| Room_Builder_3d_walls_16x16.png | 384x944 | 24 x 59 | 3D perspective walls, baseboards, windows |
| Room_Builder_Baseboards_16x16.png | 96x96 | 6 x 6 | Baseboard trim tiles |
| Room_Builder_Floor_Shadows_16x16.png | 256x80 | 16 x 5 | Wall shadow overlays |
| 1_Generic_16x16.png | 256x1248 | 16 x 78 | Desks, chairs, monitors, bookshelves, plants, filing cabinets |
| 2_LivingRoom_16x16.png | 256x720 | 16 x 45 | Couches, coffee tables, TV, armchairs, plants |
| 5_Classroom_and_library_16x16.png | 256x544 | 16 x 34 | Bookshelves, whiteboards, desks |
| 13_Conference_Hall_16x16.png | 256x192 | 16 x 12 | Conference table, office chairs, whiteboard, projector |
| 23_Television_and_Film_Studio.png | 256x224 | 16 x 14 | Cameras, clapboards, lights, director chairs, film reels |

### UI Sheets (16x16)
| Sheet | Dimensions | Grid | Content |
|-------|-----------|------|---------|
| UI_16x16.png | 288x256 | 18 x 16 | Speech bubbles, arrows, button frames, icons |
| UI_thinking_emotes_animation_16x16.png | 160x160 | 10 x 10 | Thinking emote sprites (exclamation, question, heart, music note, etc.) |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 24x32 character sprites | 32x32 LimeZu sprites | Phase 14 | All anchor math, shadow sizes, depth sort |
| Single environment.png (256x192) | Multi-sheet atlas (~8-10 LimeZu PNGs) | Phase 14 | spriteSheet.ts, renderer.ts, officeLayout.ts |
| 10-col x 4-row character frame grid | ~56-col x 41-row LimeZu layout | Phase 14 | Complete CHARACTER_FRAMES rebuild |
| Hand-coded 2-3px wall strips | LimeZu 3D wall tiles (full 16x16) | Phase 14 | renderWalls() rewrite |
| Programmatic placeholder colors | LimeZu pixel art sprites | Phase 14 | PLACEHOLDER_COLORS become truly fallback-only |

## Open Questions

1. **Exact character frame boundaries per row**
   - What we know: Animation guide labels rows (idle, walk, sit, phone). Sheet is 56 cols x 41 rows.
   - What's unclear: Exact number of frames per direction within each row, and whether directions are packed left-to-right (down, left, right, up) or some other order.
   - Recommendation: During implementation, load each premade character PNG in a viewer and document exact frame boundaries. Start with Premade_Character_32x32_03.png (Isaac) as the reference since it's used in the guide screenshots. The first row (row 0) appears to have 4 frames: down-idle, left-idle, right-idle, up-idle based on the guide.

2. **3D Wall Tile Selection**
   - What we know: 3D walls sheet has 24 cols x 59 rows with many color variants and tile types (north face, east face, corner, window, etc.).
   - What's unclear: Exact coordinates for each wall variant and how to pick the right tile for each wall position.
   - Recommendation: Select one wall color band that works with light tile floors and dark UI theme. Map wall tiles by wall position (north-facing vs side-facing) using the existing neighbor detection in `renderWalls()`.

3. **Multi-tile Furniture Rendering**
   - What we know: LimeZu furniture (desks, tables, bookshelves) often spans 2x1, 3x1, or 2x2 tiles. The current system already handles multi-tile furniture via width/height properties.
   - What's unclear: Whether LimeZu furniture sprites are stored as single multi-tile images or as individual 16x16 tiles that assemble.
   - Recommendation: From visual inspection, LimeZu stores furniture as full multi-tile sprites (e.g., a desk is one 48x16 sprite, not three 16x16 tiles). The renderer should extract the full sprite frame and draw it at the furniture's tile position, scaled to `width * TILE_SIZE x height * TILE_SIZE`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAR-01 | CHAR_SPRITE_W=32, CHAR_SPRITE_H=32 | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -x` | Needs update |
| CHAR-02 | CHARACTER_FRAMES maps idle/walk/sit for all 6 characters | unit | `npx vitest run src/engine/__tests__/spriteAtlas.test.ts -x` | Wave 0 |
| CHAR-03 | Foot-center anchor produces correct drawX/drawY for 32x32 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -x` | Needs update |
| CHAR-04 | depthSort baseRow calc correct for 32x32 | unit | `npx vitest run src/engine/__tests__/depthSort.test.ts -x` | Wave 0 |
| ENV-08 | Floor atlas maps room type to correct sheet+frame | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-09 | Wall tiles resolve to 3D wall sheet frames | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-10 | Furniture atlas keys resolve to Generic sheet frames | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-11 | Conference Hall assets have valid sheet frames | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-12 | Rec area furniture keys resolve to LimeZu frames | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-13 | Decoration keys resolve to correct sheet frames | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| ENV-14 | Multi-sheet loader loads all registered sheets | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -x` | Needs update |
| UI-06 | Emote atlas maps status to correct UI emote frame | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |
| UI-07 | Speech bubble atlas maps to correct UI sheet frame | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/engine/__tests__/limeZuAtlas.test.ts` -- covers ENV-08 through ENV-13, UI-06, UI-07 (atlas key resolution)
- [ ] `src/engine/__tests__/spriteAtlas.test.ts` -- covers CHAR-02 (character frame mapping)
- [ ] `src/engine/__tests__/depthSort.test.ts` -- covers CHAR-04 (32x32 baseRow calculation)
- [ ] Update `src/engine/__tests__/spriteSheet.test.ts` -- covers ENV-14 (multi-sheet loading)
- [ ] Update `src/engine/__tests__/renderer.test.ts` -- covers CHAR-03 (anchor math for 32x32)

## Files Affected

### Must Modify
| File | Changes | Impact |
|------|---------|--------|
| `src/engine/types.ts` | `CHAR_SPRITE_W = 32` (was 24) | Propagates to 3 files via import |
| `src/engine/spriteAtlas.ts` | Replace CHARACTER_FRAMES builder, update ENVIRONMENT_ATLAS + DECORATION_ATLAS to use multi-sheet refs | Core atlas data |
| `src/engine/spriteSheet.ts` | Multi-sheet loader, new character paths, `getEnvironmentSheetById()` | Asset loading |
| `src/engine/renderer.ts` | Update `renderWalls()` for 3D wall tiles, update shadow sizing, update status overlay positioning, update furniture/decoration rendering to use multi-sheet | Main render pipeline |
| `src/engine/depthSort.ts` | Review baseRow for 32x32 (may be fine since it uses `ch.y / TILE_SIZE`) | Depth ordering |
| `src/engine/officeLayout.ts` | Update FURNITURE types and DECORATIONS keys to match LimeZu atlas keys | Layout data |

### Must Create
| File | Purpose |
|------|---------|
| `src/engine/limeZuAtlas.ts` | Multi-sheet atlas registry (sheet paths + all frame coordinates) |

### May Remove or Gut
| File | Reason |
|------|--------|
| `src/engine/generateSprites.ts` | No longer needed (was generating programmatic sprites). Check if still referenced. |

## Sources

### Primary (HIGH confidence)
- Direct visual inspection of LimeZu Modern Interiors paid asset pack (locally available at `public/sprites/modern-interiors-paid/`)
- `sips` dimension measurements of all relevant PNG sheets
- Visual analysis of `Spritesheet_animations_GUIDE.png` and `Premade_Characters_LIST.png`
- Direct code inspection of `spriteAtlas.ts`, `spriteSheet.ts`, `renderer.ts`, `depthSort.ts`, `officeLayout.ts`, `types.ts`

### Secondary (MEDIUM confidence)
- Character sheet frame layout interpretation from guide image (exact frame counts need per-sheet pixel verification during implementation)

### Tertiary (LOW confidence)
- 3D wall tile coordinate mapping (sheet is complex, 384x944 with many variants -- needs careful visual audit during implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, existing Canvas 2D pipeline
- Architecture: HIGH - multi-sheet pattern is straightforward extension of existing single-sheet loader
- Character frame mapping: MEDIUM - guide shows row labels but exact frame boundaries need pixel-level audit
- Environment tile coordinates: MEDIUM - sheets are visually confirmed but exact tile coordinates need per-sheet audit
- 3D wall system: MEDIUM - complex sheet with many variants, needs careful selection during implementation
- Pitfalls: HIGH - identified from direct code analysis of existing anchor math, cache system, and rendering pipeline

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- LimeZu asset pack is a purchased fixed artifact, not changing)

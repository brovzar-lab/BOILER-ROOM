# Phase 2: Canvas Engine - Research

**Researched:** 2026-03-12
**Domain:** HTML5 Canvas 2D tile-based top-down game engine, sprite rendering, BFS pathfinding
**Confidence:** HIGH

## Summary

This phase implements a top-down pixel art office rendered on HTML5 Canvas 2D at 60fps. The reference implementation (pixel-agents by pablodelucca) proves this architecture works: Canvas 2D with requestAnimationFrame, BFS pathfinding on a tile grid, character state machines (idle/walk/type), and pixel-perfect integer zoom. The pixel-agents codebase uses 16x16 tiles with React + Vite + TypeScript -- identical to our stack.

The core architecture separates the game engine (pure TypeScript, runs on requestAnimationFrame) from React (manages DOM UI, reads Zustand store). The canvas element is mounted via React useRef/useEffect but all rendering happens outside React's render cycle. Zustand acts as the bridge: the game engine writes to officeStore (BILLY position, active room), React reads from officeStore (room labels, UI state). This three-world pattern (Canvas engine / React DOM / Zustand bridge) is already established in Phase 1.

**Primary recommendation:** Build a custom lightweight Canvas 2D engine following pixel-agents patterns (renderer.ts, gameLoop.ts, characters.ts, tileMap.ts). Do NOT use Phaser or melonJS -- they add massive dependency weight for features we do not need (physics, audio, scene management). Our requirements are narrow: tile rendering, sprite animation, BFS pathfinding, and camera control. A ~500-line engine handles all of this.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sleek corporate floor aesthetic -- modern office, not retro or whimsical
- Central War Room with agent offices arranged around it (hub-and-spoke)
- Solid walls between rooms, open doorways (no doors to open/close)
- BILLY's corner office at top-center of the floor plan (boss position)
- Medium floor scale -- 4-6 second walks between rooms (not cramped, not tedious)
- Decorated hallways with environmental props: plants, artwork, water cooler
- Basic personality per office -- 1-2 unique items per agent (full decoration polish in Phase 8)
- War Room has a big central conference table
- Modern pixel art style (~32x32 tiles), Stardew Valley quality tier
- **Top-down perspective** -- NOT isometric (major change from original spec)
- Mixed warm/cool color palette: warm tones in offices, cool tones in hallways and War Room
- Source sprites from free packs (itch.io, OpenGameArt) and customize to match
- Static environment tiles -- no animated environment elements
- Only characters are animated (walk cycles, idle loops)
- Primary visual reference: pixel-agents (top-down office with character sprites)
- Two zoom levels: overview (whole floor visible) and follow (camera tracks BILLY)
- Pixel-perfect integer zoom -- no fractional scaling, no anti-aliasing
- HiDPI/Retina support via canvas scaling (devicePixelRatio)
- Chat panel overlays the canvas (slides over it), not side-by-side split
- Canvas remains interactive behind the chat overlay
- Chat panel is resizable via drag handle
- Brief pause + knock animation when BILLY arrives at an agent's room
- Room name label displayed when BILLY is in a room (no minimap)
- Click a room on the canvas to make BILLY walk there (BFS pathfinding)
- BILLY walks through hallways -- camera follows him between rooms
- No teleporting -- BILLY always walks the computed path
- 4-direction walk animation (up, down, left, right)
- Walk speed increases for long-distance traversals (speed ramps up)
- Expressive idle animations: 3-4 frame loops with variation
- Agents have ambient "working" animations when BILLY isn't visiting
- Agents look up / turn to face BILLY when he enters their room
- Casual creative executive look for BILLY -- blazer, no tie
- BILLY stands (not sits) when chatting in an agent's room
- Visual marker on overview zoom level showing which room BILLY is currently in

### Claude's Discretion
- Chat panel slide direction (left, right, bottom -- pick what feels best)
- Whether to add an optional room list sidebar for quick navigation
- Exact tile dimensions within the ~32x32 range (could be 16x16 or 32x32 depending on art assets)
- Hallway decoration specifics (which props, exact placement)
- Zoom level transition animation (instant snap vs smooth interpolation)
- Game loop architecture details (ECS vs simple update/render split)
- Pathfinding grid resolution (tile-based vs pixel-based)
- Exact walk speed values and acceleration curve

### Deferred Ideas (OUT OF SCOPE)
- Chat panel integration (opening chat when BILLY enters a room) -- Phase 3
- Agent status indicators synced to API streaming -- Phase 3
- War Room agent gathering animation (all agents walk to table) -- Phase 4
- File document icons on agent desks -- Phase 6
- Full personality decorations per office -- Phase 8
- Polished production sprites replacing placeholder art -- Phase 8
- Ambient sound (office hum, keyboard clicks) -- Phase 8
- Responsive Canvas sizing for different screen widths -- Phase 8
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENGN-01 | Top-down pixel art office renders on HTML5 Canvas 2D at 60fps | Game loop with requestAnimationFrame, delta time capping, imageSmoothingEnabled=false, layered tile+sprite renderer |
| ENGN-02 | Office contains 7 distinct rooms: 5 agent offices, 1 War Room, 1 BILLY corner office | TileMap 2D array with TileType enum (WALL/FLOOR/VOID), hub-and-spoke layout with hallway connections |
| ENGN-03 | Rooms have furniture and decoration appropriate to each agent's personality | PlacedFurniture system with catalog entries, sprite overlays at tile positions, 1-2 items per room |
| ENGN-04 | Canvas supports integer zoom levels with pixel-perfect rendering | imageSmoothingEnabled=false, CSS image-rendering:pixelated, sprite cache per zoom level, integer-only scale factors |
| ENGN-05 | Canvas renders correctly on HiDPI displays (Retina) | devicePixelRatio scaling: canvas internal size * DPR, ctx.scale(DPR, DPR), CSS size at logical dimensions |
| ENGN-06 | Game loop runs independently of React render cycle | useRef for canvas, useEffect for setup, startGameLoop returns cleanup function, Zustand getState() for non-reactive reads |
| NAV-01 | BILLY walks between rooms using BFS pathfinding | BFS on 4-connected tile grid, walkability checks (bounds + tile type + furniture blocking), path as array of {col, row} |
| NAV-02 | Clicking a room causes BILLY to walk there (not instant teleport) | Click hit detection on canvas, room-to-tile mapping for destination, linear interpolation along BFS path |
| NAV-04 | Agent characters have idle animations at their desks (typing, reading, coffee) | Character state machine (IDLE/WORK), frame cycling at configurable intervals, direction-aware sprite selection |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | (browser native) | All rendering | pixel-agents uses it, proven for pixel art, no dependencies, imageSmoothingEnabled control |
| requestAnimationFrame | (browser native) | Game loop timing | Standard for 60fps browser rendering, supports delta time |
| Zustand | ^5 (already installed) | State bridge between Canvas engine and React | Already in project, supports non-reactive getState() for game loop reads |
| React 19 | ^19 (already installed) | Canvas mount point and UI overlays | Already in project, useRef/useEffect for canvas lifecycle |
| TypeScript | ^5.7 (already installed) | Type safety for engine code | Already in project, strict mode enforced |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3 | Unit testing for engine logic | Test pathfinding, tile map operations, state machine transitions |
| vitest-canvas-mock | ^0.3 | Mock Canvas 2D context in tests | Test rendering pipeline without real DOM |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Canvas 2D engine | Phaser 3 | Phaser adds ~1MB+ bundle for physics/audio/scenes we don't need. Custom engine is ~500 lines. |
| Custom Canvas 2D engine | melonJS | Same over-engineering concern. Our needs are narrow: tiles, sprites, BFS. |
| Custom Canvas 2D engine | PixiJS | WebGL-focused, overkill for pixel art tiles. Adds GPU context management complexity. |
| BFS pathfinding (custom) | PathFinding.js | Library is 15KB+ for one function we can write in ~40 lines. BFS is trivial for our grid sizes. |

**Installation:**
```bash
npm install -D vitest vitest-canvas-mock @vitest/coverage-v8
```

No new runtime dependencies needed. The entire engine is built on browser-native APIs + existing Zustand store.

## Architecture Patterns

### Recommended Project Structure
```
src/
  engine/                    # Pure TypeScript -- NO React imports
    types.ts                 # TileType, Character, Direction, CharacterState, Room, etc.
    tileMap.ts               # 2D tile grid, walkability checks, BFS pathfinding
    officeLayout.ts          # Room definitions, furniture placement, office floor plan data
    renderer.ts              # Canvas draw pipeline: clear -> tiles -> furniture -> characters -> UI
    gameLoop.ts              # startGameLoop(canvas, callbacks) -> stopFn
    characters.ts            # Character state machine, movement, animation frame cycling
    camera.ts                # Viewport offset, zoom levels, follow target, pan
    spriteSheet.ts           # Sprite sheet loading, frame extraction, zoom-level caching
    sprites/                 # Sprite data (inline hex arrays or loaded PNGs)
      billy.ts               # BILLY sprite frames
      agents.ts              # Agent sprite frames (5 agents)
      tiles.ts               # Floor, wall, furniture tile sprites
  components/
    canvas/
      OfficeCanvas.tsx        # React wrapper: useRef + useEffect for engine lifecycle
      RoomLabel.tsx           # Overlay showing current room name
      ZoomControls.tsx        # +/- zoom buttons overlay
  store/
    officeStore.ts            # Expanded: rooms, BILLY position, zoom, activeRoomId, characters
```

### Pattern 1: Three-World Architecture (Established in Phase 1)
**What:** Canvas engine (pure TS), React DOM (components), Zustand store (bridge). No direct imports between Canvas and React.
**When to use:** Always. This is the project's core architectural pattern.
**Example:**
```typescript
// engine/gameLoop.ts -- pure TypeScript, no React
import { useOfficeStore } from '@/store/officeStore';

export function startGameLoop(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  let lastTime = 0;
  let stopped = false;

  function frame(time: number) {
    if (stopped) return;
    const dt = Math.min((time - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = time;

    // Read state non-reactively (no re-renders)
    const state = useOfficeStore.getState();
    update(dt, state);
    render(ctx, state);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return () => { stopped = true; };
}
```

### Pattern 2: React Canvas Mount
**What:** React component owns the canvas DOM element via useRef, starts/stops engine via useEffect.
**When to use:** Mounting the canvas in the React app shell.
**Example:**
```typescript
// components/canvas/OfficeCanvas.tsx
import { useRef, useEffect } from 'react';
import { startGameLoop } from '@/engine/gameLoop';

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // HiDPI setup
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const stop = startGameLoop(canvas);
    return stop; // cleanup on unmount
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
```

### Pattern 3: Character State Machine
**What:** Finite state machine for character behavior: IDLE, WALK, WORK (typing/reading/coffee).
**When to use:** All character animation and movement logic.
**Example:**
```typescript
// engine/characters.ts
type CharacterState = 'idle' | 'walk' | 'work';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Character {
  id: string;
  x: number;            // pixel position (for interpolation)
  y: number;
  tileCol: number;      // grid position
  tileRow: number;
  state: CharacterState;
  direction: Direction;
  frame: number;         // current animation frame
  frameTimer: number;    // seconds since last frame change
  path: { col: number; row: number }[];  // BFS result
  moveProgress: number;  // 0..1 lerp between current and next tile
}

function updateCharacter(ch: Character, dt: number): void {
  switch (ch.state) {
    case 'walk': {
      ch.moveProgress += (WALK_SPEED / TILE_SIZE) * dt;
      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        const next = ch.path.shift()!;
        ch.tileCol = next.col;
        ch.tileRow = next.row;
        ch.moveProgress = 0;
        if (ch.path.length === 0) {
          ch.state = 'idle';
        }
      }
      // Animate walk cycle
      ch.frameTimer += dt;
      if (ch.frameTimer >= WALK_FRAME_DURATION) {
        ch.frame = (ch.frame + 1) % 4;
        ch.frameTimer = 0;
      }
      // Interpolate pixel position
      const fromX = ch.tileCol * TILE_SIZE;
      const fromY = ch.tileRow * TILE_SIZE;
      const toX = ch.path[0]?.col ?? ch.tileCol;
      const toY = ch.path[0]?.row ?? ch.tileRow;
      ch.x = fromX + (toX * TILE_SIZE - fromX) * ch.moveProgress;
      ch.y = fromY + (toY * TILE_SIZE - fromY) * ch.moveProgress;
      break;
    }
    case 'work': {
      // Cycle between 2-3 work animation frames
      ch.frameTimer += dt;
      if (ch.frameTimer >= WORK_FRAME_DURATION) {
        ch.frame = (ch.frame + 1) % 3;
        ch.frameTimer = 0;
      }
      break;
    }
    case 'idle': {
      // Static pose, occasional direction change
      break;
    }
  }
}
```

### Pattern 4: BFS Pathfinding on Tile Grid
**What:** Breadth-first search on 4-connected grid (no diagonals) respecting walls and furniture.
**When to use:** When BILLY clicks a room and needs to walk there.
**Example:**
```typescript
// engine/tileMap.ts
function isWalkable(col: number, row: number, tileMap: TileType[][]): boolean {
  if (row < 0 || row >= tileMap.length) return false;
  if (col < 0 || col >= tileMap[0]!.length) return false;
  const tile = tileMap[row]![col]!;
  return tile !== TileType.WALL && tile !== TileType.VOID;
}

function findPath(
  startCol: number, startRow: number,
  endCol: number, endRow: number,
  tileMap: TileType[][]
): { col: number; row: number }[] {
  if (!isWalkable(endCol, endRow, tileMap)) return [];

  const key = (c: number, r: number) => `${c},${r}`;
  const visited = new Set<string>([key(startCol, startRow)]);
  const parent = new Map<string, string>();
  const queue: [number, number][] = [[startCol, startRow]];
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // up, down, left, right

  while (queue.length > 0) {
    const [col, row] = queue.shift()!;
    if (col === endCol && row === endRow) {
      // Reconstruct path
      const path: { col: number; row: number }[] = [];
      let k = key(endCol, endRow);
      while (k !== key(startCol, startRow)) {
        const [c, r] = k.split(',').map(Number) as [number, number];
        path.unshift({ col: c, row: r });
        k = parent.get(k)!;
      }
      return path;
    }
    for (const [dc, dr] of dirs) {
      const nc = col + dc!;
      const nr = row + dr!;
      const nk = key(nc, nr);
      if (!visited.has(nk) && isWalkable(nc, nr, tileMap)) {
        visited.add(nk);
        parent.set(nk, key(col, row));
        queue.push([nc, nr]);
      }
    }
  }
  return []; // No path found
}
```

### Pattern 5: Layered Rendering Pipeline
**What:** Draw in strict layer order: background -> floors -> walls -> furniture -> characters (z-sorted) -> UI overlays.
**When to use:** Every render frame.
**Example:**
```typescript
// engine/renderer.ts
function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: OfficeState,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const { tileMap, furniture, characters, camera } = state;
  const zoom = camera.zoom;
  const tileSize = TILE_SIZE * zoom;

  // Calculate viewport offset (center map + apply camera pan)
  const mapW = tileMap[0]!.length * tileSize;
  const mapH = tileMap.length * tileSize;
  const offsetX = Math.floor((canvasWidth - mapW) / 2) + Math.round(camera.panX);
  const offsetY = Math.floor((canvasHeight - mapH) / 2) + Math.round(camera.panY);

  // Layer 1: Clear
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Layer 2: Floor tiles
  for (let row = 0; row < tileMap.length; row++) {
    for (let col = 0; col < tileMap[row]!.length; col++) {
      const tile = tileMap[row]![col]!;
      if (tile === TileType.VOID) continue;
      drawTile(ctx, tile, col * tileSize + offsetX, row * tileSize + offsetY, tileSize);
    }
  }

  // Layer 3: Furniture (sorted by Y for overlap)
  // Layer 4: Characters (sorted by Y for depth)
  // Layer 5: UI overlays (room labels, selection highlights)
}
```

### Pattern 6: Sprite Sheet Loading and Caching
**What:** Load PNG sprite sheets, extract frames by grid position, cache scaled versions per zoom level.
**When to use:** All sprite rendering.
**Example:**
```typescript
// engine/spriteSheet.ts
interface SpriteFrame {
  x: number;      // source X in sheet
  y: number;      // source Y in sheet
  w: number;      // frame width
  h: number;      // frame height
}

const spriteCache = new Map<number, Map<string, HTMLCanvasElement>>();

function getCachedSprite(
  sheet: HTMLImageElement,
  frame: SpriteFrame,
  zoom: number,
): HTMLCanvasElement {
  let zoomCache = spriteCache.get(zoom);
  if (!zoomCache) {
    zoomCache = new Map();
    spriteCache.set(zoom, zoomCache);
  }
  const key = `${frame.x},${frame.y},${frame.w},${frame.h}`;
  let cached = zoomCache.get(key);
  if (!cached) {
    cached = document.createElement('canvas');
    cached.width = frame.w * zoom;
    cached.height = frame.h * zoom;
    const cctx = cached.getContext('2d')!;
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, 0, 0, cached.width, cached.height);
    zoomCache.set(key, cached);
  }
  return cached;
}
```

### Anti-Patterns to Avoid
- **Rendering in React state:** Never store per-frame animation data in React state. Use plain objects in the engine and write to Zustand only for data React needs (activeRoomId, zoom level).
- **Re-renders from game loop:** Never call Zustand setState() every frame. Only update store when meaningful state changes (BILLY arrives at room, zoom changed).
- **Fractional zoom:** Never use non-integer zoom factors. Fractional scaling causes sub-pixel blurring that destroys pixel art.
- **ctx.drawImage with scaling every frame:** Always use pre-cached scaled canvases. Drawing + scaling per frame kills performance.
- **Using ctx.translate/rotate for camera:** Use offset math (integer pixel offsets) instead. Transform stack is error-prone and can accumulate floating-point drift.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Floor plan design | JSON level editor | Hard-coded TypeScript data | Only one floor plan needed, data is static, no user editing |
| Sprite creation | Drawing pixel art from scratch | Free asset packs from itch.io + recoloring | Quality pixel art takes weeks; free packs (LimeZu Modern Office 16x16, Cainos 32x32) are proven |
| Complex pathfinding | A* with weighted costs, diagonal movement | Simple BFS on 4-connected grid | Office is small (~40x30 tiles), BFS finds shortest path in <1ms, no terrain costs needed |
| Physics engine | Collision detection, bounce, gravity | Tile-based walkability only | Characters snap to tiles, no free-form physics needed |
| Scene graph / ECS | Entity component system | Simple arrays of typed objects | Only ~10 entities total (BILLY + 5 agents + furniture), ECS is massive over-engineering |
| Sound system | Audio engine | Nothing (Phase 8) | Sound is explicitly deferred to Phase 8 |

**Key insight:** This is a visualization, not a game. The "engine" is a glorified animated tile viewer. Every line of game-engine infrastructure (ECS, physics, scene graphs) is wasted complexity for our use case.

## Common Pitfalls

### Pitfall 1: Canvas Blurry on Retina/HiDPI
**What goes wrong:** Canvas renders at CSS pixel resolution (e.g., 800x600) but display needs 1600x1200 physical pixels on a 2x Retina screen. Result: blurry upscaling.
**Why it happens:** Canvas internal resolution defaults to CSS size unless explicitly set.
**How to avoid:** Set canvas.width/height to CSS dimensions * devicePixelRatio, then ctx.scale(dpr, dpr) to normalize coordinates.
**Warning signs:** Everything looks fuzzy or doubled on MacBook screens.

### Pitfall 2: Pixel Art Anti-Aliasing
**What goes wrong:** Sprite edges get smoothed/blurred when drawn at non-native sizes.
**Why it happens:** Browser default is to anti-alias canvas drawImage operations.
**How to avoid:** Set ctx.imageSmoothingEnabled = false on EVERY context creation (including cached sprite canvases). Also set CSS image-rendering: pixelated on the canvas element.
**Warning signs:** Sprites have blurry edges or look "soft."

### Pitfall 3: Game Loop Runs During Tab Background
**What goes wrong:** When user switches tabs, requestAnimationFrame pauses. On return, delta time is huge (e.g., 30 seconds), causing characters to teleport.
**Why it happens:** requestAnimationFrame automatically pauses in background tabs, but the timestamp keeps advancing.
**How to avoid:** Cap delta time: Math.min((time - lastTime) / 1000, 0.1). The 0.1s (100ms) cap prevents jumps.
**Warning signs:** Characters teleport or animations skip when switching back to the tab.

### Pitfall 4: Zustand Re-renders from Game Loop
**What goes wrong:** Calling setState() every frame (60fps) from the game loop causes React to re-render 60 times per second.
**Why it happens:** Developer stores per-frame data (BILLY pixel position) in Zustand.
**How to avoid:** Only write to Zustand on meaningful state transitions: BILLY arrives at room (update activeRoomId), zoom level changes, room click target changes. Keep per-frame data (animation frames, interpolation progress) in the engine's own objects.
**Warning signs:** React DevTools shows constant re-renders, UI elements flicker.

### Pitfall 5: Click Position Miscalculation
**What goes wrong:** Mouse clicks map to wrong tiles because zoom, offset, and DPR are not accounted for.
**Why it happens:** canvas.getBoundingClientRect() gives CSS coordinates, but canvas internals use DPR-scaled coordinates. Zoom and camera offset add more transforms.
**How to avoid:** Convert click: (1) get CSS position relative to canvas, (2) multiply by DPR, (3) subtract camera offset, (4) divide by (tileSize * zoom), (5) floor to get tile coordinates.
**Warning signs:** Clicking near room boundaries selects wrong room, or clicks are offset by a fixed amount.

### Pitfall 6: Sprite Sheet Loading Race Condition
**What goes wrong:** Game loop starts before sprite images finish loading, resulting in blank frames or errors.
**Why it happens:** Image loading is async (new Image() + onload), but game loop starts synchronously.
**How to avoid:** Load all sprite sheets in a Promise.all() before starting the game loop. Show a loading indicator until all assets are ready.
**Warning signs:** First few frames show blank canvas, or console errors about null/undefined image sources.

### Pitfall 7: Floor Plan Too Large or Too Small
**What goes wrong:** Walking between rooms takes too long (boring) or too short (feels cramped, no sense of space).
**Why it happens:** Tile dimensions not calibrated to walk speed and room count.
**How to avoid:** Target 4-6 second walks between distant rooms (user requirement). With ~3 pixels/frame walk speed at 16px tiles, that's roughly 25-40 tiles of hallway. Total map around 40-50 tiles wide, 30-40 tiles tall.
**Warning signs:** Users feel the walk is tedious or instantaneous.

## Code Examples

### HiDPI Canvas Setup (Verified Pattern)
```typescript
// Source: MDN Web Docs, web.dev/articles/canvas-hidipi, pixel-agents reference
function setupHiDPICanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Internal resolution = CSS size * DPR
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);

  // CSS size stays the same
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;

  return ctx;
}
```

### Game Loop with Delta Time Capping
```typescript
// Source: pixel-agents gameLoop.ts pattern, MDN Anatomy of a video game
interface GameCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

function startGameLoop(canvas: HTMLCanvasElement, callbacks: GameCallbacks): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  let lastTime = 0;
  let stopped = false;
  let rafId = 0;

  function frame(time: number) {
    if (stopped) return;
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    callbacks.update(dt);
    callbacks.render(ctx);

    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
```

### Zustand Store Bridge (Non-Reactive Reads)
```typescript
// Source: Zustand docs - reading outside React
import { create } from 'zustand';

interface OfficeState {
  activeRoomId: string | null;
  billyTileCol: number;
  billyTileRow: number;
  zoomLevel: number;      // 1 = overview, 2 = follow (integer only)
  targetRoomId: string | null;
  rooms: Room[];
  setActiveRoom: (roomId: string | null) => void;
  setBillyPosition: (col: number, row: number) => void;
  setZoomLevel: (level: number) => void;
  setTargetRoom: (roomId: string | null) => void;
}

// In game loop (non-reactive read):
const { activeRoomId, zoomLevel } = useOfficeStore.getState();

// In game loop (write only on meaningful change):
if (billyArrivedAtRoom) {
  useOfficeStore.getState().setActiveRoom(roomId);
}
```

### Canvas Click to Tile Coordinate
```typescript
// Source: Standard canvas coordinate math
function canvasClickToTile(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  camera: { panX: number; panY: number; zoom: number },
  mapCols: number,
  mapRows: number,
  tileSize: number,
): { col: number; row: number } | null {
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;

  const scaledTileSize = tileSize * camera.zoom;
  const mapW = mapCols * scaledTileSize;
  const mapH = mapRows * scaledTileSize;
  const offsetX = Math.floor((rect.width - mapW) / 2) + camera.panX;
  const offsetY = Math.floor((rect.height - mapH) / 2) + camera.panY;

  const col = Math.floor((cssX - offsetX) / scaledTileSize);
  const row = Math.floor((cssY - offsetY) / scaledTileSize);

  if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return null;
  return { col, row };
}
```

## Claude's Discretion Recommendations

Based on research findings, here are recommendations for areas left to Claude's discretion:

### Tile Size: Use 16x16
**Recommendation:** 16x16 tiles, matching pixel-agents reference exactly.
**Rationale:** pixel-agents (our primary reference) uses 16x16. LimeZu Modern Office (best office tileset available) is 16x16 native with 32x and 48x sprite variants included. At 2x zoom, 16x16 tiles display as 32x32 -- giving the "~32x32" visual the user requested while keeping the native tile data small and fast. At overview zoom (1x), more of the office fits on screen.

### Game Loop Architecture: Simple Update/Render Split
**Recommendation:** Simple update(dt) + render(ctx) callback pattern, NOT ECS.
**Rationale:** Only ~10 entities (BILLY + 5 agents + furniture). ECS adds abstraction layers (components, systems, entity managers) that slow down development for zero benefit at this scale. pixel-agents uses the simple split pattern and it works perfectly.

### Pathfinding Grid: Tile-Based
**Recommendation:** Pathfinding operates at tile resolution, not sub-tile pixels.
**Rationale:** Characters move tile-to-tile with smooth interpolation between tiles. This is simpler, matches pixel-agents, and avoids sub-pixel alignment issues. BFS returns a list of tile coordinates; movement lerps between them.

### Chat Panel Slide Direction: Right Side
**Recommendation:** Chat panel slides in from the right edge.
**Rationale:** BILLY's corner office is at top-center. Agents are arranged around the War Room. A right-side panel keeps the left/center of the canvas (where most rooms are) visible. This also matches common chat/sidebar UX conventions (Slack, Discord, VS Code panels).

### Zoom Transition: Instant Snap
**Recommendation:** Instant zoom level change, no smooth interpolation.
**Rationale:** Only 2 zoom levels (overview and follow). Smooth zoom between integer levels would briefly pass through non-integer scales, breaking pixel-perfect rendering. Instant snap preserves crispness and is simpler to implement.

### Walk Speed and Acceleration
**Recommendation:** Base speed of 64 px/sec (~4 tiles/sec at 16px tiles). For long paths (>8 tiles), ramp to 128 px/sec after 1 second of walking.
**Rationale:** At 64 px/sec, crossing 20 tiles (one side of the office) takes ~5 seconds -- within the 4-6 second target. Speed ramp for long traversals prevents tedium while keeping short walks feel natural. pixel-agents uses a constant speed of ~3 tiles/sec as reference.

## Sprite Asset Strategy

### Phase 2 (Now): Placeholder Sprites
Use colored rectangles or simple hand-drawn pixel sprites for initial development:
- Floors: Solid color fills (warm for offices, cool for hallways)
- Walls: Dark gray rectangles
- Characters: 16x16 colored rectangles with directional indicator (arrow or dot)
- Furniture: Simple geometric shapes (rectangle for desk, small square for chair)

This lets us build the entire engine, pathfinding, and animation system without waiting for art assets.

### Phase 8 (Later): Production Sprites
Replace placeholders with sourced/customized assets:
- **LimeZu Modern Office** ($2.50 on itch.io) - 16x16 office tiles with desks, chairs, walls, floors
- **JIK-A-4 Metro City character pack** - Used by pixel-agents for top-down characters
- **Cainos Pixel Art Top Down Basic** (free) - 32x32 general tiles if 16x16 proves too small

### Sprite Sheet Format
Use horizontal strip sprite sheets (standard format):
- Walk cycle: 4 frames per direction, 4 directions = 16 frames total (4 rows x 4 cols)
- Idle: 1-4 frames (single row)
- Work animations: 2-3 frames per activity type

Frame extraction formula:
```
col = frameIndex % framesPerRow
row = Math.floor(frameIndex / framesPerRow)
sourceX = col * frameWidth
sourceY = row * frameHeight
```

## Office Floor Plan Design

### Layout Specification (Hub-and-Spoke)
```
                    +--[BILLY]--+
                    |           |
         +--[Diana]--+-[Hall]--+-[Marcos]--+
         |           |         |           |
         +-[Hall]----+-[WAR]---+-[Hall]----+
         |           | ROOM    |           |
         +--[Sasha]--+-[Hall]--+-[Roberto]-+
                    |           |
                    +-[Valentina]+
```

### Estimated Dimensions
- Each room: ~6x6 tiles interior (96x96 pixels at 16px)
- Hallways: 2-3 tiles wide
- Total map: ~42x34 tiles (672x544 pixels at 16px)
- At 2x zoom on 1080p display: fits comfortably with room for UI overlays
- Overview zoom (1x): entire floor visible with margins

### Room Data Structure
```typescript
interface Room {
  id: string;             // 'diana' | 'marcos' | 'sasha' | 'roberto' | 'valentina' | 'war-room' | 'billy'
  name: string;           // Display name
  tileRect: {             // Bounding rectangle in tile coordinates
    col: number;
    row: number;
    width: number;
    height: number;
  };
  doorTile: {             // Hallway tile adjacent to room entrance
    col: number;
    row: number;
  };
  seatTile: {             // Where the agent sits
    col: number;
    row: number;
  };
  billyStandTile: {       // Where BILLY stands when visiting
    col: number;
    row: number;
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Game frameworks (Phaser/melonJS) for all 2D browser games | Lightweight custom Canvas 2D for simple visualizations | 2023-2024 | Smaller bundles, less API surface to learn, faster development for narrow use cases |
| ctx.getImageData/putImageData for pixel manipulation | Pre-cached HTMLCanvasElement sprites at zoom levels | Established practice | Orders of magnitude faster rendering |
| Variable timestep game loops | Fixed or capped delta time | Always best practice | Prevents physics bugs and animation glitches |
| CSS pixel scaling for HiDPI | Canvas dimension * DPR + ctx.scale(DPR) | ~2015 (still the standard) | Crisp rendering on all displays |
| ECS (Entity Component System) for all games | Simple typed objects for small entity counts | Ongoing debate | ECS overhead only pays off at >100 entities |

**Deprecated/outdated:**
- `ctx.mozImageSmoothingEnabled` / `ctx.webkitImageSmoothingEnabled` / `ctx.msImageSmoothingEnabled`: Vendor prefixes no longer needed. Standard `imageSmoothingEnabled` has universal support since 2018+.
- `canvas.toDataURL()` for sprite caching: Use offscreen `document.createElement('canvas')` instead for better performance.

## Open Questions

1. **Exact sprite assets to use in Phase 2 vs Phase 8**
   - What we know: Placeholder sprites (colored rectangles) for Phase 2, production assets for Phase 8
   - What's unclear: Whether to invest time in minimally styled placeholders (e.g., simple pixel faces) or go full geometric
   - Recommendation: Use colored rectangles with a single-pixel directional indicator. Fast to implement, clearly distinguishable, easy to replace later.

2. **Optimal map dimensions**
   - What we know: ~42x34 tiles fits the hub-and-spoke layout with 4-6 second walk times
   - What's unclear: Exact dimensions depend on how many hallway tiles feel right and furniture placement
   - Recommendation: Start with 42x34 and iterate. The floor plan is hard-coded data, easy to adjust.

3. **Camera follow behavior during BILLY movement**
   - What we know: Camera tracks BILLY in follow mode, shows whole floor in overview
   - What's unclear: How to handle camera during walk animation (smooth follow vs snap to BILLY position)
   - Recommendation: Smooth follow with lerp toward BILLY's current interpolated position. Update camera offset each frame as: cameraX = lerp(cameraX, billyX, 0.1).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3 (not yet installed) |
| Config file | None -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENGN-01 | 60fps rendering on Canvas 2D | manual-only | Visual inspection in browser | N/A |
| ENGN-02 | 7 distinct rooms in tile map | unit | `npx vitest run src/engine/__tests__/tileMap.test.ts -t "rooms"` | Wave 0 |
| ENGN-03 | Room furniture placement | unit | `npx vitest run src/engine/__tests__/officeLayout.test.ts -t "furniture"` | Wave 0 |
| ENGN-04 | Integer zoom pixel-perfect | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "zoom"` | Wave 0 |
| ENGN-05 | HiDPI canvas scaling | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "hidpi"` | Wave 0 |
| ENGN-06 | Game loop independent of React | unit | `npx vitest run src/engine/__tests__/gameLoop.test.ts` | Wave 0 |
| NAV-01 | BFS pathfinding finds shortest path | unit | `npx vitest run src/engine/__tests__/tileMap.test.ts -t "pathfinding"` | Wave 0 |
| NAV-02 | Click-to-walk movement | integration | `npx vitest run src/engine/__tests__/characters.test.ts -t "walk"` | Wave 0 |
| NAV-04 | Agent idle animations cycle frames | unit | `npx vitest run src/engine/__tests__/characters.test.ts -t "idle"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install vitest + vitest-canvas-mock: `npm install -D vitest vitest-canvas-mock @vitest/coverage-v8`
- [ ] Create `vitest.config.ts` with jsdom environment and canvas mock setup
- [ ] `src/engine/__tests__/tileMap.test.ts` -- covers ENGN-02, NAV-01
- [ ] `src/engine/__tests__/officeLayout.test.ts` -- covers ENGN-03
- [ ] `src/engine/__tests__/renderer.test.ts` -- covers ENGN-04, ENGN-05
- [ ] `src/engine/__tests__/gameLoop.test.ts` -- covers ENGN-06
- [ ] `src/engine/__tests__/characters.test.ts` -- covers NAV-02, NAV-04

## Sources

### Primary (HIGH confidence)
- [pixel-agents GitHub](https://github.com/pablodelucca/pixel-agents) - Full source code study: renderer.ts, gameLoop.ts, characters.ts, tileMap.ts, types.ts, officeState.ts, spriteCache.ts. Identical tech stack (React + Vite + TS + Canvas 2D). 16x16 tiles, BFS pathfinding, character state machine.
- [DeepWiki pixel-agents analysis](https://deepwiki.com/pablodelucca/pixel-agents) - Architecture overview, sprite data format, tile map structure, Z-sorting
- [MDN Canvas HiDPI](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) - devicePixelRatio documentation
- [MDN imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled) - Canvas smoothing control
- [MDN Tilemaps overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) - Tile-based game techniques
- [web.dev High DPI Canvas](https://web.dev/articles/canvas-hidipi) - HiDPI rendering patterns

### Secondary (MEDIUM confidence)
- [LimeZu Modern Office tileset](https://limezu.itch.io/modernoffice) - 16x16 office tileset, $2.50, verified features and license
- [Cainos Pixel Art Top Down Basic](https://cainos.itch.io/pixel-art-top-down-basic) - Free 32x32 tileset, name-your-price
- [vitest-canvas-mock](https://github.com/wobsoriano/vitest-canvas-mock) - Canvas mocking for Vitest, 343K weekly downloads
- [Spicy Yoghurt game loop tutorial](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe) - Fixed timestep pattern
- [Kirupa Canvas sprite animations](https://www.kirupa.com/canvas/sprite_animations_canvas.htm) - Sprite sheet frame extraction
- [Excalibur.js autotiling guide](https://excaliburjs.com/blog/Autotiling%20Technique/) - Bitmask auto-tiling for walls (16-tile variant)

### Tertiary (LOW confidence)
- [Agent Office](https://github.com/harishkotra/agent-office) - Phaser-based alternative (decided NOT to use Phaser, but confirmed pixel-agents Canvas 2D is the better reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pixel-agents proves Canvas 2D + React + Zustand + TypeScript works for this exact use case. No new runtime dependencies needed.
- Architecture: HIGH - Direct source code study of pixel-agents renderer, game loop, characters, pathfinding. Patterns verified and adapted.
- Pitfalls: HIGH - HiDPI, anti-aliasing, and game loop timing are well-documented problems with well-documented solutions. Multiple authoritative sources agree.
- Sprite strategy: MEDIUM - Placeholder approach for Phase 2 is sound, but exact production asset sourcing (Phase 8) needs validation when we get there.
- Floor plan dimensions: MEDIUM - 42x34 estimate based on room count and walk time math. Will need iteration during implementation.

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain -- Canvas 2D, BFS, and sprite rendering haven't changed meaningfully in years)

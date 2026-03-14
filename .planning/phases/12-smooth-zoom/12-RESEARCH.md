# Phase 12: Smooth Zoom - Research

**Researched:** 2026-03-14
**Domain:** Canvas 2D zoom interaction, wheel/pinch input handling, zoom animation
**Confidence:** HIGH

## Summary

Phase 12 adds smooth pinch-to-zoom interaction to an existing Canvas 2D game engine that already supports fractional zoom via `ctx.setTransform()`, quantized sprite caching at 0.5 increments, and auto-fit zoom on load. The core work is: (1) adding a `wheel` event listener that converts scroll/pinch deltas into exponential zoom changes centered on the cursor, (2) building a zoom animation system with inertia and snap-to-half-integer at rest, (3) updating the camera to reconcile cursor-centered zoom with BILLY follow mode, and (4) simplifying the ZoomControls React component.

No new npm dependencies are needed. All zoom math, inertia, and animation can be implemented with standard `requestAnimationFrame` patterns already established in the codebase. The sprite cache quantization (ZOOM-04) and auto-fit on load (ZOOM-05) are already implemented from Phase 10 -- this phase needs to preserve them while wiring up the new input and animation systems.

**Primary recommendation:** Create a new `src/engine/zoomController.ts` module that owns all zoom animation state (velocity, target, idle timer, snap state) and exposes a `tickZoom(dt)` function called each frame from the game loop. Keep the wheel handler in `input.ts` but have it call into zoomController to set velocity/target.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Maximum zoom: 4x, minimum zoom: dynamic auto-fit (varies by screen)
- Zoom scaling: exponential (each scroll tick multiplies by a factor, e.g. 1.1x)
- Both scroll wheel and trackpad pinch trigger zoom (not pinch-only)
- Zoom has inertia/momentum after fast pinch gestures -- zoom continues briefly then decelerates
- No visible zoom level indicator
- Disable zoom during file drag-and-drop to prevent accidental zoom mid-drag
- Double-click behavior unchanged: toggles between auto-fit and 2x
- `0` key resets to auto-fit zoom (when not in text field)
- `+`/`=` and `-` keys zoom in/out by 0.5 steps (when not in text field)
- `Z` key toggle unchanged: switches between auto-fit and 2x
- After inertia ends, ~150ms idle delay, then animated ease-out snap to nearest 0.5 over ~200-300ms
- No "notch" or resistance at snap points during continuous zoom -- fully smooth during gesture
- Skip snap animation if zoom is already within ~0.05 of target snap point
- Camera position also snaps to pixel boundaries at rest
- Overview/follow threshold stays at 1.5x
- +/- button clicks animate to target zoom (not instant jump)
- +/- buttons step by 0.5x per click
- Mode label ("Overview"/"Follow") removed entirely
- Auto-fit button removed (0 key handles this)
- Buttons shrunk to ~24px (from 32px), ~30-40% opacity, full opacity on hover
- Tooltips on hover showing keyboard shortcuts
- Position stays bottom-right
- Camera keeps following BILLY during zoom (no pause of follow mode)
- Zoom always centers on cursor/pinch point, even in overview mode (< 1.5x)
- Mode switch (overview <-> follow) happens immediately when zoom crosses 1.5x threshold
- Smooth lerp transition when camera switches between map-center target (overview) and BILLY target (follow)

### Claude's Discretion
- Exact exponential zoom factor per scroll tick
- Inertia deceleration curve and duration
- Exact snap animation easing function
- Pixel alignment rounding strategy for camera position
- How cursor-centered zoom interacts with BILLY follow (both want to influence camera target)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZOOM-01 | User can pinch-to-zoom smoothly on trackpad with continuous (non-integer) zoom levels | Wheel event handler with exponential scaling + zoomController animation system |
| ZOOM-02 | Zoom centers on cursor/pinch point (not screen center) | Cursor-centered zoom math pattern (adjust camera offset based on cursor world position and zoom delta) |
| ZOOM-03 | Zoom snaps to nearest half-integer at rest for pixel clarity | Idle timer + ease-out snap animation in zoomController; pixel-align camera at snap completion |
| ZOOM-04 | Sprite cache uses quantized zoom keys to prevent memory bloat | Already implemented in spriteSheet.ts getQuantizedZoom() -- preserve existing behavior |
| ZOOM-05 | Auto-fit zoom still works as default on initial load | Already implemented in gameLoop.ts first-frame logic -- preserve and wire 0-key shortcut |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D | native | All rendering via ctx.setTransform() | Already in use, no WebGL needed |
| Zustand | existing | officeStore for zoomLevel state | Already the state management solution |
| requestAnimationFrame | native | Game loop tick for zoom animation | Already the frame loop pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | Zero new dependencies per project decision |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom inertia | d3-zoom or hammer.js | Massive overkill for this scope; project mandates zero new deps |
| CSS transforms | Canvas setTransform | CSS transforms would fight the existing Canvas 2D pipeline |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/engine/
  zoomController.ts    # NEW: zoom animation state machine (velocity, snap, idle timer)
  input.ts             # MODIFIED: add wheel handler, keyboard zoom shortcuts
  camera.ts            # MODIFIED: cursor-centered zoom helper
  gameLoop.ts          # MODIFIED: call tickZoom() each frame
  types.ts             # MODIFIED: add ZoomState interface
src/components/canvas/
  ZoomControls.tsx     # MODIFIED: simplified +/- only, new styling
src/store/
  officeStore.ts       # MINIMAL CHANGES: zoomLevel remains the single source of truth
```

### Pattern 1: Zoom State Machine (zoomController.ts)
**What:** A standalone module that manages zoom animation state: current velocity, idle timer, snap target, and animation phase. The game loop calls `tickZoom(dt)` each frame and the module updates `camera.zoom` and writes to the store when the quantized level changes.
**When to use:** Always -- this is the core pattern for the phase.
**Example:**
```typescript
// src/engine/zoomController.ts

interface ZoomAnimState {
  velocity: number;          // Current zoom velocity (log-space units/sec)
  idleTimer: number;         // Time since last input (seconds)
  snapTarget: number | null; // Target half-integer when snapping
  snapProgress: number;      // 0..1 ease-out progress
  phase: 'idle' | 'input' | 'inertia' | 'settling' | 'snapping';
}

const ZOOM_FACTOR = 1.002;       // Per pixel of deltaY (exponential base)
const FRICTION = 0.92;           // Per-frame velocity decay during inertia
const IDLE_DELAY = 0.15;         // Seconds before snap begins
const SNAP_DURATION = 0.25;      // Snap animation duration (seconds)
const SNAP_THRESHOLD = 0.05;     // Skip snap if already this close
const MIN_ZOOM_VELOCITY = 0.001; // Velocity below this = stopped

export function tickZoom(
  state: ZoomAnimState,
  camera: Camera,
  dt: number,
  cursorWorldX: number,
  cursorWorldY: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // Phase transitions and zoom updates per frame
}
```

### Pattern 2: Cursor-Centered Zoom Math
**What:** When zoom changes, adjust camera offset so the world point under the cursor stays under the cursor. This is the standard "zoom toward point" formula used in every map/design tool.
**When to use:** Every zoom change (wheel input, inertia tick, button click animation).
**Example:**
```typescript
// The world point under the cursor before zoom:
//   worldX = (cursorScreenX - tx) / oldZoom
//   worldY = (cursorScreenY - ty) / oldZoom
//
// After zoom changes from oldZoom to newZoom, we need:
//   cursorScreenX = worldX * newZoom + tx_new
//   cursorScreenY = worldY * newZoom + ty_new
//
// So camera offset adjustment:
//   camera.x += worldX * (newZoom - oldZoom)
//   camera.y += worldY * (newZoom - oldZoom)
//
// Where worldX/Y is relative to map center (since camera.x/y is offset from center).

function applyCursorCenteredZoom(
  camera: Camera,
  oldZoom: number,
  newZoom: number,
  cursorScreenX: number,
  cursorScreenY: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // World coords of cursor before zoom change
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  const mapRows = OFFICE_TILE_MAP.length;
  const mapWorldW = mapCols * TILE_SIZE;
  const mapWorldH = mapRows * TILE_SIZE;

  // tx/ty are the screen-space origin of world (0,0)
  const oldTx = (canvasWidth - mapWorldW * oldZoom) / 2 - camera.x;
  const oldTy = (canvasHeight - mapWorldH * oldZoom) / 2 - camera.y;

  const worldX = (cursorScreenX - oldTx) / oldZoom;
  const worldY = (cursorScreenY - oldTy) / oldZoom;

  // New tx/ty should place same world point at same screen point
  // newTx = cursorScreenX - worldX * newZoom
  // But newTx = (canvasWidth - mapWorldW * newZoom) / 2 - camera.x_new
  // So: camera.x_new = (canvasWidth - mapWorldW * newZoom) / 2 - (cursorScreenX - worldX * newZoom)

  camera.x = (canvasWidth - mapWorldW * newZoom) / 2 - (cursorScreenX - worldX * newZoom);
  camera.y = (canvasHeight - mapWorldH * newZoom) / 2 - (cursorScreenY - worldY * newZoom);

  // Also update targets so the lerp doesn't fight the zoom adjustment
  camera.targetX = camera.x;
  camera.targetY = camera.y;
}
```

### Pattern 3: Wheel Event for Trackpad Pinch
**What:** Modern trackpads synthesize `wheel` events with `ctrlKey=true` for pinch gestures. Both regular scroll-wheel and pinch produce `wheel` events, just with different `deltaY` magnitudes and the `ctrlKey` flag.
**When to use:** The single `wheel` event handler handles both scroll wheel and trackpad pinch.
**Example:**
```typescript
function handleWheel(e: WheelEvent): void {
  e.preventDefault(); // CRITICAL: prevents browser zoom on Ctrl+scroll

  // Trackpad pinch sends ctrlKey=true with smaller deltaY
  // Mouse wheel sends ctrlKey=false with larger deltaY
  // Both are handled identically with exponential scaling
  const delta = -e.deltaY; // Positive = zoom in
  const factor = Math.pow(ZOOM_FACTOR, delta);
  const newZoom = clamp(camera.zoom * factor, minZoom, MAX_ZOOM);

  // Feed into zoom controller
  zoomController.onZoomInput(newZoom, cursorX, cursorY);
}
```
**Important:** The `wheel` listener MUST use `{ passive: false }` to allow `preventDefault()`. Without this, the browser intercepts Ctrl+scroll as page zoom.

### Pattern 4: Camera Target Reconciliation (Cursor vs Follow)
**What:** During zoom, two systems want to influence camera position: cursor-centered zoom (keeps world point under cursor) and BILLY follow (keeps BILLY centered). These must be reconciled.
**When to use:** Every frame when zoom >= 1.5x and zoom is actively changing.
**Recommended approach:**
- During active zoom input/inertia: cursor-centered zoom wins. Set camera.x/y directly (not via targetX/targetY lerp).
- When zoom settles (snap complete): resume normal follow lerp by just setting targetX/targetY to BILLY's position. The existing 0.1 lerp factor will smoothly transition the camera back.
- During overview mode (< 1.5x): cursor-centered zoom still applies, but the follow target is map-center (0,0), so after zoom settles the camera lerps back to center naturally.

### Anti-Patterns to Avoid
- **Fighting the game loop lerp during zoom:** If you only set `camera.targetX/Y` during zoom, the 0.1 lerp will lag behind and feel sluggish. During active zoom, set `camera.x/y` directly AND set `targetX/Y = x/y` to prevent the lerp from pulling the camera back.
- **Using deltaMode without normalization:** `WheelEvent.deltaMode` can be 0 (pixels), 1 (lines), or 2 (pages). Always normalize to pixels. In practice, all modern browsers/trackpads use mode 0, but defensive coding matters.
- **Snapping during continuous gesture:** The snap system should only activate after the idle delay. Never apply snap forces while the user is actively scrolling -- this causes a "fighting" feel.
- **Writing to officeStore every frame:** The store triggers React re-renders. Only update `setZoomLevel()` when the quantized zoom level changes (i.e., when `getQuantizedZoom(oldZoom) !== getQuantizedZoom(newZoom)`). During smooth animation, `camera.zoom` updates directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pinch gesture detection | Custom touch event tracking | `wheel` event (browsers synthesize pinch as wheel+ctrlKey) | Cross-browser standard, handles all trackpads correctly |
| Exponential zoom | Linear zoom increments | `Math.pow(base, delta)` scaling | Linear zoom feels wrong -- small deltas at high zoom are invisible, large at low zoom are jarring |
| Ease-out curve | Custom bezier math | `1 - Math.pow(1 - t, 3)` (cubic ease-out) | Simple, proven, one-liner |

**Key insight:** The `wheel` event is the correct and only API needed for trackpad pinch zoom on desktop. Do not use Touch events or Pointer events -- those are for mobile. Desktop trackpad pinch is synthesized as wheel events by the OS/browser.

## Common Pitfalls

### Pitfall 1: Browser Zoom Hijacking
**What goes wrong:** Ctrl+scroll (which is what trackpad pinch produces) triggers browser page zoom instead of canvas zoom.
**Why it happens:** `wheel` events with `ctrlKey=true` are the browser's native zoom gesture.
**How to avoid:** Call `e.preventDefault()` in the wheel handler. The listener MUST be registered with `{ passive: false }` -- passive listeners cannot call preventDefault.
**Warning signs:** The entire page zooms instead of the canvas; console warnings about passive event listeners.

### Pitfall 2: Store Update Frequency
**What goes wrong:** Calling `setZoomLevel()` on every frame during smooth zoom causes React re-renders at 60fps, tanking performance.
**Why it happens:** Zustand subscriptions trigger component re-renders.
**How to avoid:** Only call `setZoomLevel()` when the quantized zoom (nearest 0.5) changes. During animation, mutate `camera.zoom` directly (it's read non-reactively by the game loop). After snap completes, do one final store sync.
**Warning signs:** React DevTools showing ZoomControls re-rendering every frame; frame drops during zoom.

### Pitfall 3: Camera Lerp Fighting Zoom
**What goes wrong:** After cursor-centered zoom adjusts `camera.x/y`, the lerp toward `targetX/Y` (which is set for BILLY follow) pulls the camera away from where the zoom just placed it.
**Why it happens:** The follow system sets `camera.targetX/Y` to BILLY's position each frame, and `updateCamera()` lerps toward it. If cursor-centered zoom only adjusts `camera.x/y` but not `targetX/Y`, the lerp immediately starts pulling.
**How to avoid:** During active zoom, set both `camera.x = camera.targetX = ...` and `camera.y = camera.targetY = ...`. This pauses the lerp effectively. When zoom stops (snap completes), let the follow system resume setting targetX/Y normally.
**Warning signs:** Canvas "wobbles" or drifts during pinch zoom; the view slides toward BILLY instead of staying cursor-centered.

### Pitfall 4: Auto-fit Minimum Zoom
**What goes wrong:** `computeAutoFitZoom()` is clamped to minimum 1.0, but the user decision says minimum zoom should be dynamic auto-fit (which could be less than 1.0 on large screens).
**Why it happens:** The current `Math.max(1, ...)` in `computeAutoFitZoom()` prevents sub-1.0 zoom.
**How to avoid:** Remove the `Math.max(1, ...)` clamp or adjust it so the auto-fit value IS the minimum. The zoom controller should use the auto-fit value as the lower bound, not a hardcoded 1.0.
**Warning signs:** On a very large monitor, pinch-out stops at 1x even though the office doesn't fill the screen.

### Pitfall 5: Drag-and-Drop Zoom Conflict
**What goes wrong:** User accidentally zooms while dragging a file over the canvas.
**Why it happens:** Scroll/wheel events can fire during drag operations.
**How to avoid:** Check a `isDragging` flag in the wheel handler. The existing `dragOverRoomId` module variable in input.ts can serve as the signal -- if it's non-null, ignore wheel events.
**Warning signs:** Zoom level changes unexpectedly when dragging files onto agents.

## Code Examples

### Wheel Event Registration (CRITICAL: passive: false)
```typescript
// In setupInputHandlers, the wheel listener MUST be non-passive:
canvas.addEventListener('wheel', handleWheel, { passive: false });

// Cleanup must match:
canvas.removeEventListener('wheel', handleWheel);
```

### Exponential Zoom Factor
```typescript
// Recommended: ~1.002 per pixel of deltaY
// Trackpad pinch typically sends deltaY in range [-5, 5] per event
// Mouse wheel typically sends deltaY in range [-100, 100] per event
// With 1.002^100 ~= 1.22x per wheel notch, and 1.002^5 ~= 1.01x per pinch tick
// This naturally handles the sensitivity difference without special-casing
const ZOOM_FACTOR = 1.002;
const factor = Math.pow(ZOOM_FACTOR, -e.deltaY);
```

### Snap-to-Half-Integer
```typescript
function nearestHalf(zoom: number): number {
  return Math.round(zoom * 2) / 2;
}

// In tickZoom, after inertia stops:
if (state.phase === 'settling') {
  state.idleTimer += dt;
  if (state.idleTimer >= IDLE_DELAY) {
    const target = nearestHalf(camera.zoom);
    if (Math.abs(camera.zoom - target) < SNAP_THRESHOLD) {
      // Already close enough -- snap instantly
      camera.zoom = target;
      state.phase = 'idle';
    } else {
      state.snapTarget = target;
      state.snapProgress = 0;
      state.phase = 'snapping';
    }
  }
}

// Snap animation:
if (state.phase === 'snapping') {
  state.snapProgress = Math.min(1, state.snapProgress + dt / SNAP_DURATION);
  const eased = 1 - Math.pow(1 - state.snapProgress, 3); // cubic ease-out
  const startZoom = camera.zoom; // captured at snap start
  camera.zoom = startZoom + (state.snapTarget! - startZoom) * eased;
  if (state.snapProgress >= 1) {
    camera.zoom = state.snapTarget!;
    state.phase = 'idle';
  }
}
```

### Pixel-Aligned Camera at Rest
```typescript
// After snap completes, round camera position so tiles align to pixel boundaries:
function pixelAlignCamera(camera: Camera, zoom: number): void {
  // Round to nearest pixel at current zoom
  // This makes tile edges land on exact device pixels
  camera.x = Math.round(camera.x);
  camera.y = Math.round(camera.y);
  camera.targetX = camera.x;
  camera.targetY = camera.y;
}
```

### Animated Button Zoom
```typescript
// When +/- button clicked, animate to target instead of instant jump:
function startButtonZoom(targetZoom: number, camera: Camera): void {
  // Use the snap animation system with the target zoom
  zoomState.snapTarget = targetZoom;
  zoomState.snapProgress = 0;
  zoomState.snapStartZoom = camera.zoom;
  zoomState.phase = 'snapping';
  // Cursor center is screen center for button-triggered zoom
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Integer zoom only | Float zoom + setTransform | Phase 10 | Foundation for smooth zoom |
| Per-zoom-level cache | Quantized 0.5 cache keys | Phase 10 | Memory bounded during zoom |
| Manual coord multiplication | ctx.setTransform(zoom, ...) | Phase 10 | No tile gaps at any zoom |

**Already implemented (preserve, don't rebuild):**
- `getQuantizedZoom()` and `getCachedSprite()` in spriteSheet.ts (ZOOM-04)
- `computeAutoFitZoom()` and first-frame auto-fit in gameLoop.ts (ZOOM-05)
- `setTransform`-based rendering in renderer.ts (RNDR-01)

## Open Questions

1. **Snap animation and cursor-centered zoom interaction**
   - What we know: Snap animation changes zoom, which should be cursor-centered. But the cursor may have moved since the last input.
   - What's unclear: Should snap animation zoom toward last-known cursor position, or toward screen center?
   - Recommendation: Use last-known cursor position for snap animation. If mouse has moved significantly (e.g., to UI), fall back to screen center. Store cursor position on last wheel event.

2. **computeAutoFitZoom minimum clamp**
   - What we know: Currently clamped to `Math.max(1, ...)`. User wants dynamic minimum.
   - What's unclear: Should auto-fit ever produce zoom < 1.0? On a 4K monitor the office might need sub-1.0 zoom to fit.
   - Recommendation: Remove the `Math.max(1, ...)` clamp. Let auto-fit return whatever value fits the map. Use this value as MIN_ZOOM dynamically.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/engine/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ZOOM-01 | Wheel input produces smooth continuous zoom | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "wheel input"` | No - Wave 0 |
| ZOOM-02 | Zoom centers on cursor position (world point invariant) | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "cursor centered"` | No - Wave 0 |
| ZOOM-03 | Snap to nearest 0.5 after idle delay | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "snap"` | No - Wave 0 |
| ZOOM-04 | Sprite cache uses quantized keys | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -t "quantized"` | No - Wave 0 |
| ZOOM-05 | Auto-fit on initial load | unit | `npx vitest run src/engine/__tests__/gameLoop.test.ts -t "auto-fit"` | Partial (gameLoop.test.ts exists) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/engine/__tests__/zoomController.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/engine/__tests__/zoomController.test.ts` -- covers ZOOM-01, ZOOM-02, ZOOM-03 (exponential zoom math, cursor-centered invariant, snap timing/easing)
- [ ] `src/engine/__tests__/spriteSheet.test.ts` -- covers ZOOM-04 (quantized zoom key tests; spriteSheet.ts exists but no test file)

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of camera.ts, input.ts, gameLoop.ts, spriteSheet.ts, ZoomControls.tsx, officeStore.ts, types.ts, renderer.ts
- WheelEvent API: standard DOM Level 3 Events, well-documented behavior for trackpad pinch (ctrlKey flag)

### Secondary (MEDIUM confidence)
- Cursor-centered zoom formula: standard map rendering technique (verified against the existing renderer.ts transform math)
- Exponential zoom factor 1.002: common value in canvas zoom implementations; may need tuning during implementation

### Tertiary (LOW confidence)
- Exact inertia friction value (0.92): starting point, will need manual feel-testing
- SNAP_DURATION 250ms: within the 200-300ms range specified by user, but exact value needs feel-testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new dependencies, all patterns already in codebase
- Architecture: HIGH - clear separation of concerns, single new module (zoomController.ts)
- Pitfalls: HIGH - browser zoom hijacking and passive listener trap are well-documented; store update frequency is a known Zustand pattern
- Zoom math: HIGH - cursor-centered zoom is textbook; verified against existing renderer.ts transform

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, no fast-moving dependencies)

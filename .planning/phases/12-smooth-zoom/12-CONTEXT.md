# Phase 12: Smooth Zoom - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Trackpad pinch-to-zoom with cursor-centered scaling, smooth inertia, snap-to-half-integer at rest, and pixel-aligned camera settling. Phase 10 already delivered setTransform-based fractional zoom, quantized sprite cache, and auto-fit — this phase adds the input handling, zoom animation system, and UX polish.

**Delivers:** Wheel/pinch zoom input, cursor-centered zoom math, zoom inertia, half-integer snap with ease-out, pixel-aligned camera settling, updated zoom controls UI, keyboard zoom shortcuts (+/-, 0 reset).

**Does NOT deliver:** New rendering features (Phase 13), glow effects (Phase 13), UI panel changes (Phase 13). This phase is zoom interaction only.

</domain>

<decisions>
## Implementation Decisions

### Zoom range & limits
- Maximum zoom: 4x (unchanged)
- Minimum zoom: dynamic auto-fit (whatever fits the entire office in viewport, varies by screen)
- Zoom scaling: exponential (each scroll tick multiplies by a factor, e.g. 1.1x)
- Both scroll wheel and trackpad pinch trigger zoom (not pinch-only)
- Zoom has inertia/momentum after fast pinch gestures — zoom continues briefly then decelerates
- No visible zoom level indicator — user feels the zoom visually
- Disable zoom during file drag-and-drop to prevent accidental zoom mid-drag
- Double-click behavior unchanged: toggles between auto-fit and 2x

### Keyboard shortcuts
- `0` key resets to auto-fit zoom (new shortcut, when not in text field)
- `+`/`=` and `-` keys zoom in/out by 0.5 steps (new shortcut, when not in text field)
- `Z` key toggle unchanged: switches between auto-fit and 2x
- No tooltip hints for keyboard shortcuts in the UI (discoverable via button hover)

### Snap & settle behavior
- After inertia ends, ~150ms idle delay, then animated ease-out snap to nearest 0.5 over ~200-300ms
- No "notch" or resistance at snap points during continuous zoom — fully smooth during gesture
- Skip snap animation if zoom is already within ~0.05 of target snap point
- Camera position also snaps to pixel boundaries at rest (tiles align to exact pixels for crispness)
- Overview/follow threshold stays at 1.5x
- +/- button clicks animate to target zoom (not instant jump) — consistent with pinch snap feel

### Zoom controls UI
- +/- buttons step by 0.5x per click (not integer steps)
- Mode label ("Overview"/"Follow") removed entirely
- Auto-fit button removed (0 key handles this)
- Buttons shrunk to ~24px (from 32px)
- Buttons at ~30-40% opacity, full opacity on hover
- Tooltips on hover showing keyboard shortcuts (e.g., "Zoom in (+/=)")
- Position stays bottom-right

### Camera behavior during zoom
- Camera keeps following BILLY during zoom (no pause of follow mode)
- Zoom always centers on cursor/pinch point, even in overview mode (< 1.5x)
- Mode switch (overview ↔ follow) happens immediately when zoom crosses 1.5x threshold
- Smooth lerp transition when camera switches between map-center target (overview) and BILLY target (follow)

### Claude's Discretion
- Exact exponential zoom factor per scroll tick
- Inertia deceleration curve and duration
- Exact snap animation easing function
- Pixel alignment rounding strategy for camera position
- How cursor-centered zoom interacts with BILLY follow (both want to influence camera target)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/camera.ts`: Already supports float zoom, smooth lerp (0.1 factor), computeAutoFitZoom(), screenToTile(), tileToScreen()
- `src/engine/spriteSheet.ts`: getQuantizedZoom() rounds to nearest 0.5, getCachedSprite() uses quantized zoom keys — ZOOM-04 already satisfied
- `src/engine/gameLoop.ts`: Auto-fit zoom on first frame + resize with manual override detection — ZOOM-05 already satisfied
- `src/engine/input.ts`: setupInputHandlers() attaches click/dblclick/keydown/mousemove/drag events — wheel event needs to be added here
- `src/components/canvas/ZoomControls.tsx`: React component with +/- and auto-fit buttons, reads/writes officeStore.zoomLevel
- `src/store/officeStore.ts`: zoomLevel state + setZoomLevel action, camera object with zoom field

### Established Patterns
- Game loop reads officeStore.getState() non-reactively each frame, syncs camera.zoom from zoomLevel
- Input handlers are pure JS (not React), attached to canvas element, return cleanup function
- Camera lerp: `camera.x += (targetX - camera.x) * 0.1` per frame — new zoom animation can use similar lerp pattern
- Zoom override detection: gameLoop compares store.zoomLevel vs camera.zoom to detect manual changes
- Global flag pattern: `__boiler_reset_autofit` on globalThis used for cross-module signaling (auto-fit button)

### Integration Points
- `input.ts setupInputHandlers()`: Add 'wheel' event listener for scroll/pinch zoom input
- `gameLoop.ts frame()`: Add zoom animation tick (inertia decay, snap easing) alongside camera update
- `officeStore.ts`: May need zoom animation state (target zoom, velocity) or this can live in engine module
- `camera.ts`: Cursor-centered zoom math — adjust camera.targetX/Y based on cursor position and zoom delta
- `ZoomControls.tsx`: Simplify to just +/- with new styling, remove mode label and auto-fit button

</code_context>

<specifics>
## Specific Ideas

- Zoom should feel like iOS Maps: smooth pinch, momentum after fast gesture, gentle snap to rest
- Cursor-centered zoom means: the world point under the cursor stays under the cursor as zoom changes (standard map/design tool behavior)
- The ~150ms idle delay before snap prevents fighting with slow, deliberate pinch gestures
- Pixel alignment at rest: round camera offset so (offset % (TILE_SIZE * snapZoom)) === 0

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-smooth-zoom*
*Context gathered: 2026-03-14*

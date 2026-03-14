# Phase 13: Polish and UI - Research

**Researched:** 2026-03-14
**Domain:** Canvas 2D glow effects, day/night theming, React UI redesign (chat panel + deals sidebar)
**Confidence:** HIGH

## Summary

Phase 13 is the final v1.1 phase, combining two distinct work streams: (1) Canvas 2D ambient effects (glow, lighting, decorations, rugs, room labels) rendered in the existing 6-layer pipeline, and (2) React UI redesign of the chat panel and deals sidebar. Both streams are well-constrained by existing patterns -- the renderer already uses `globalAlpha` compositing for drop shadows and wall shadows, and the React components use Tailwind CSS v4 with CSS custom properties.

The canvas glow effects (ENV-03, ENV-04) are best implemented as a dedicated render layer using Canvas 2D `createRadialGradient()` with `globalCompositeOperation = 'lighter'` for additive blending. This avoids sprite sheet expansion and gives fine-grained control over glow radius, color, and pulse animation. Environment details (ENV-05, ENV-06, ENV-07) extend the existing DECORATIONS/FURNITURE arrays and sprite atlas. The day/night system (from CONTEXT.md) is a simple time-of-day multiplier applied to glow intensity and floor tint. The UI redesign (UI-01 through UI-05) refactors existing ChatPanel.tsx and DealSidebar.tsx components with new layout patterns.

**Primary recommendation:** Split into 3 plans: (1) Canvas glow + day/night effects, (2) Environment detail sprites + decorations, (3) Chat panel + deals sidebar + room labels UI redesign.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Monitor glow: subtle blue halo radiating ~1-2 tiles onto desk and floor
- All monitors glow the same blue (not signature-colored)
- Desk lamps: complementary warm amber circle (~2 tile radius) on floor beside desk
- All offices + BILLY's office get both monitor and lamp glow
- War Room: cooler/darker ambient, no desk lamps -- monitor glow from conference area only
- Hallways: subtle glow spill from adjacent office doors
- Rec area: warm ambient glow around water cooler/furniture
- Glow animation: subtle slow pulse (~4s cycle) on monitor glow -- barely noticeable breathing effect
- Lamp glow: static (no pulse)
- Day/night based on system clock via `new Date().getHours()`
- Night: 7pm-7am -- glows prominent, floor tiles darker
- Day: 7am-7pm -- glows dimmer (barely visible), floor tiles have warm daylight tint
- Gradual transition over ~1 hour at dawn (6-7am) and dusk (6-7pm)
- No manual override -- always follows system clock
- Implementation: palette multiplier applied to glow intensity and floor tile tint
- Area rugs: simple colored rectangles with 1px border pattern (woven edge suggestion)
- Rug colors: muted signature color per agent
- Personality decorations: use Phase 11 definitions (existing DECORATIONS array)
- Extra items: add 1-2 personal touches per office (coffee mugs, small photo frames, desk plants, pen holders)
- War Room conference table: scattered papers and water glasses on dark wood surface
- Chat panel: Claude designs layout (modern chat app patterns)
- Agent identity: accent color bar (thin vertical or top) + agent name in signature color
- Attach and Memory buttons: moved to input area (like Slack's + or ChatGPT attachment icon)
- File count: small pill badge on Attach button showing file count
- Token counter: hidden by default, appears as progress bar when context > ~60%
- Thinking state: typing indicator in messages + subtle pulse on agent's color bar
- War Room messages: color-coded by agent (polish existing implementation)
- Deals sidebar: always visible by default, collapsible to thin strip (~40px)
- Active deal name: large bold text at top with colored accent
- Per-agent activity: message count per agent + "Last active: Xh ago" per deal
- Room labels: small pill labels at top edge of each room (existing Layer 6 pattern)
- Shows "Patrik -- CFO", "War Room", etc.
- Visible at 1.5x+ zoom

### Claude's Discretion
- Exact glow rendering approach (gradients vs sprites)
- Plant detail level (single vs multi-tile)
- Chat panel layout details and spacing
- Collapsed sidebar strip design
- Color bar orientation (vertical left edge vs horizontal top)
- Pulse animation easing curve
- Day/night interpolation curve
- Extra personal touch items per office

### Deferred Ideas (OUT OF SCOPE)
- Animated environment elements (fan rotation, screen flicker, plant sway) -- v2 ART-02
- Professional pixel art sprites -- v2 ART-01
- Particle effects (dust motes, steam from coffee) -- v2 ADV-02
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENV-03 | Monitor screens glow with blue halo radiating onto desk and floor | Canvas 2D radial gradients with additive compositing in new Layer 3.5 |
| ENV-04 | Desk lamps emit warm amber glow circles onto surrounding floor | Same gradient layer, static (no pulse), amber color |
| ENV-05 | Area rugs visible under desks with woven geometric patterns | New rug rectangles drawn in Layer 2 (floor) with 1px border pattern |
| ENV-06 | Plants render with detailed leaf fronds from above-and-front angle | Extend environment sprite sheet row 6+, single-tile sprites |
| ENV-07 | Personality decorations per office | Extend existing DECORATIONS array + sprite atlas with new items |
| UI-01 | Chat panel matches mockup -- agent name/role, file count badge, inline Attach/Memory | Redesign ChatPanel.tsx header and move buttons to input area |
| UI-02 | Deals sidebar always visible on left (not hidden behind toggle) | Rework DealSidebar props, remove isOpen/onClose, add collapsible strip |
| UI-03 | Deal switcher shows per-agent activity summary | Extend DealCard with message counts + "Last active" per agent |
| UI-04 | Active deal name prominently displayed | Add large bold header section at top of DealSidebar |
| UI-05 | Room labels visible on canvas matching mockup style | Render all room labels in Layer 6 (not just active room), show "Name -- Title" |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | N/A (browser native) | Glow effects, gradients, compositing | Already used for entire renderer, zero dependencies |
| React 18 | existing | Chat panel, deals sidebar, room labels | Already the UI framework |
| Tailwind CSS v4 | existing | UI component styling | Already used throughout components |
| Zustand | existing | State management (officeStore, dealStore, chatStore) | Already used for all state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS custom properties | N/A | Day/night theming, color tokens | Already used via --color-* variables |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas gradients for glow | Pre-drawn sprite overlays | Sprites need atlas expansion; gradients are more flexible for radius/color tuning |
| Canvas floor tint for day/night | CSS filter on canvas element | CSS filter affects entire canvas uniformly; canvas tint allows per-tile control |

**Installation:**
```bash
# No new dependencies needed -- zero new npm packages (v1.1 decision)
```

## Architecture Patterns

### Recommended Renderer Layer Additions
```
Existing pipeline:
  Layer 1: Clear canvas
  Layer 2: Floor tiles (+ rugs drawn here, before furniture)
  Layer 3: Wall strips + shadows
  Layer 3b: Drop zone highlight
  Layer 4: Y-sorted renderables (furniture + decorations + characters)

NEW additions:
  Layer 4.5: Glow effects (additive compositing over scene)

  Layer 5: Status overlays (existing)
  Layer 5b: File icons (existing)
  Layer 6: Room labels (CHANGED: render ALL rooms, not just activeRoomId)
```

### Pattern 1: Radial Gradient Glow (recommended for ENV-03/ENV-04)
**What:** Use `ctx.createRadialGradient()` with `globalCompositeOperation = 'lighter'` for additive glow blending.
**When to use:** For all glow effects (monitor blue, lamp amber, hallway spill).
**Why over sprites:** Gradients can be parameterized (radius, intensity, color) without atlas expansion. Pulse animation simply modulates the alpha. Day/night multiplier scales intensity.
**Example:**
```typescript
// Glow rendered after Layer 4 (Y-sorted items) in world transform
function renderGlowEffects(
  ctx: CanvasRenderingContext2D,
  timeOfDay: number, // 0.0=night, 1.0=day
  elapsedTime: number, // total seconds for pulse
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Monitor glow: blue halo with pulse
  const pulseAlpha = 0.85 + 0.15 * Math.sin(elapsedTime * Math.PI / 2); // ~4s cycle
  const nightMultiplier = 1.0 - timeOfDay * 0.8; // glows dimmer in day

  for (const glowSource of MONITOR_GLOW_SOURCES) {
    const gradient = ctx.createRadialGradient(
      glowSource.x, glowSource.y, 0,
      glowSource.x, glowSource.y, TILE_SIZE * 2, // 2-tile radius
    );
    const alpha = pulseAlpha * nightMultiplier;
    gradient.addColorStop(0, `rgba(100, 149, 237, ${alpha * 0.3})`); // cornflower blue center
    gradient.addColorStop(1, `rgba(100, 149, 237, 0)`);              // fade to transparent
    ctx.fillStyle = gradient;
    ctx.fillRect(
      glowSource.x - TILE_SIZE * 2,
      glowSource.y - TILE_SIZE * 2,
      TILE_SIZE * 4,
      TILE_SIZE * 4,
    );
  }

  ctx.restore();
}
```

### Pattern 2: Time-of-Day Factor Computation
**What:** Compute a 0.0-1.0 factor from system clock, used as multiplier for glow intensity and floor tint.
**When to use:** Every frame in the game loop, passed to renderer.
**Example:**
```typescript
function computeTimeOfDay(): number {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const h = hour + minute / 60;

  // Dawn transition: 6:00-7:00 (0.0 -> 1.0)
  if (h >= 6 && h < 7) return (h - 6);
  // Full day: 7:00-18:00
  if (h >= 7 && h < 18) return 1.0;
  // Dusk transition: 18:00-19:00 (1.0 -> 0.0)
  if (h >= 18 && h < 19) return 1.0 - (h - 18);
  // Night: 19:00-6:00
  return 0.0;
}
```

### Pattern 3: Area Rug Rendering (ENV-05)
**What:** Draw colored rectangles with border pattern on the floor layer, before furniture.
**When to use:** In Layer 2, after floor tiles but before walls.
**Example:**
```typescript
// Per-room rug definitions
const ROOM_RUGS: Array<{ roomId: string; col: number; row: number; w: number; h: number; color: string }> = [
  { roomId: 'patrik', col: 19, row: 5, w: 3, h: 2, color: 'rgba(139, 92, 246, 0.15)' }, // muted purple
  { roomId: 'sandra', col: 3, row: 14, w: 3, h: 2, color: 'rgba(16, 185, 129, 0.15)' }, // muted green
  // ... etc
];

function renderRugs(ctx: CanvasRenderingContext2D): void {
  for (const rug of ROOM_RUGS) {
    const x = rug.col * TILE_SIZE;
    const y = rug.row * TILE_SIZE;
    const w = rug.w * TILE_SIZE;
    const h = rug.h * TILE_SIZE;
    // Fill
    ctx.fillStyle = rug.color;
    ctx.fillRect(x, y, w, h);
    // 1px border (woven edge)
    ctx.strokeStyle = rug.color.replace('0.15', '0.35');
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}
```

### Pattern 4: Always-Visible Deals Sidebar with Collapsible Strip
**What:** DealSidebar renders in two modes: expanded (240px) and collapsed (40px thin strip).
**When to use:** Replace current isOpen boolean toggle with expand/collapse that keeps sidebar always rendered.
**Example:**
```typescript
// DealSidebar always rendered, manages its own collapsed state
function DealSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="w-10 h-full bg-[--color-surface-bg] border-r border-[--color-border]
        flex flex-col items-center py-2 cursor-pointer"
        onClick={() => setCollapsed(false)}
      >
        {/* Active deal name truncated vertically or as icon */}
        <span className="writing-mode-vertical text-xs text-[--color-text-muted] truncate">
          {activeDealName}
        </span>
      </div>
    );
  }

  return (
    <div className="w-60 h-full ...">
      {/* Active deal prominent header */}
      {/* Deal list with per-agent activity */}
      {/* Collapse button */}
    </div>
  );
}
```

### Pattern 5: Chat Panel Input Area Buttons
**What:** Move Attach and Memory buttons from the header to the input area, matching Slack/ChatGPT patterns.
**When to use:** ChatPanel redesign (UI-01).
**Example:**
```typescript
// Input area with inline action buttons
<div className="border-t border-[--color-surface-border] bg-[--color-surface-card] p-3">
  <div className="flex items-end gap-2">
    {/* Left-side action buttons */}
    <div className="flex gap-1 pb-2">
      <button className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 relative">
        {/* Paperclip icon */}
        <PaperclipIcon />
        {/* File count pill badge */}
        {fileCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px]
            rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {fileCount}
          </span>
        )}
      </button>
      <button className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200">
        {/* Brain icon for Memory */}
        <BrainIcon />
      </button>
    </div>
    {/* Textarea */}
    <textarea ... />
    {/* Send/Stop button */}
    <button ... />
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Drawing glow in Layer 2 (floor):** Glow must be drawn AFTER furniture and characters to look natural -- it's a light overlay, not a floor texture.
- **Using `globalAlpha` instead of gradient alpha:** `globalAlpha` affects all subsequent draws; gradient alpha is self-contained per glow source.
- **Recalculating time-of-day every draw call:** Cache the value and update it once per second (system clock changes slowly).
- **Expanding sprite sheet for glows:** Radial gradients are more flexible and avoid atlas coordinate management.
- **Using CSS transitions for day/night on canvas:** The canvas is re-rendered every frame; CSS transitions on the canvas element would conflict.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Radial glow falloff | Custom pixel-by-pixel alpha math | `ctx.createRadialGradient()` | Native gradient engine is hardware-accelerated, handles anti-aliasing |
| Additive light blending | Manual color addition per pixel | `globalCompositeOperation = 'lighter'` | Browser compositing is vastly faster than per-pixel math |
| Time interpolation curves | Custom easing functions | `Math.sin()` for pulse, linear for day/night | Sine wave gives natural breathing; linear is correct for 1-hour transition |
| Sidebar collapse animation | Custom JS animation | Tailwind `transition-all duration-200` | Already used elsewhere in the app, consistent UX |

**Key insight:** Canvas 2D's built-in gradient and compositing APIs handle all glow effects without any new dependencies or manual pixel manipulation.

## Common Pitfalls

### Pitfall 1: Glow Layer Draw Order
**What goes wrong:** Glow drawn before furniture looks like colored floor patches, not light emanation.
**Why it happens:** Natural instinct is to draw glow with other floor-level effects in Layer 2.
**How to avoid:** Draw glow as Layer 4.5 (after Y-sorted items, before UI overlays) with `globalCompositeOperation = 'lighter'`.
**Warning signs:** Glow looks "painted on the floor" instead of illuminating the scene.

### Pitfall 2: Additive Blending Not Restored
**What goes wrong:** `globalCompositeOperation = 'lighter'` leaks into subsequent layers, causing everything to render additively.
**Why it happens:** Forgetting to `ctx.restore()` or reset compositing mode after glow pass.
**How to avoid:** Always `ctx.save()` before glow pass, `ctx.restore()` after. Verify by checking Layer 5 renders normally.
**Warning signs:** UI overlays look washed out or overly bright.

### Pitfall 3: Gradient Performance with Many Sources
**What goes wrong:** Creating 20+ gradients per frame tanks performance.
**Why it happens:** Each office has monitor + lamp = 14+ glow sources total.
**How to avoid:** Glow sources are static positions -- compute gradient objects once, store them, reuse per frame. Only update the alpha multiplier.
**Warning signs:** FPS drops below 30 when all rooms are visible at overview zoom.

### Pitfall 4: DealSidebar Always-Visible Breaks Layout
**What goes wrong:** Sidebar takes up space even when user wants full canvas view.
**Why it happens:** Changing from `w-0` collapsed to always-rendered changes the flex layout.
**How to avoid:** Collapsed mode uses `w-10` (40px) thin strip, not `w-0`. The canvas area adjusts via flexbox naturally.
**Warning signs:** Canvas area doesn't resize when sidebar changes state.

### Pitfall 5: Room Labels Rendering at All Zoom Levels
**What goes wrong:** Room labels clutter the view at overview zoom (sub-1.5x).
**Why it happens:** Adding labels for all rooms without zoom gating.
**How to avoid:** Per CONTEXT.md: labels visible at 1.5x+ zoom. Use existing `ZOOM_OVERVIEW_THRESHOLD = 1.5` constant to gate rendering.
**Warning signs:** Text is unreadably tiny at low zoom, or overlapping labels obscure the map.

### Pitfall 6: Time-of-Day Causing Visible Jumps
**What goes wrong:** Floor tint snaps between day and night rather than transitioning.
**Why it happens:** Using `Math.floor(hour)` thresholds instead of smooth interpolation.
**How to avoid:** Use fractional hours (hour + minute/60) for smooth 1-hour transitions at dawn/dusk.
**Warning signs:** Visible color jump at exactly 7:00 or 19:00.

## Code Examples

### Glow Source Data Structure
```typescript
// Centralized glow source definitions derived from room/furniture positions
interface GlowSource {
  x: number;          // world pixel X (center of glow)
  y: number;          // world pixel Y
  radius: number;     // glow radius in world pixels
  color: string;      // rgb string (no alpha)
  type: 'monitor' | 'lamp' | 'ambient';
  pulse: boolean;     // true for monitors, false for lamps
}

// Built once from ROOMS + FURNITURE data
const GLOW_SOURCES: GlowSource[] = buildGlowSources();
```

### Room Label with Agent Title Format
```typescript
// Room labels show "Name -- Title" for agent offices
function getRoomLabelText(room: Room): string {
  const agentTitles: Record<string, string> = {
    'patrik': 'Patrik -- CFO',
    'sandra': 'Sandra -- Producer',
    'marcos': 'Marcos -- Lawyer',
    'isaac': 'Isaac -- Development',
    'wendy': 'Wendy -- Coach',
    'billy': "BILLY's Office",
    'war-room': 'War Room',
  };
  return agentTitles[room.id] ?? room.name;
}
```

### Token Counter as Progress Bar (Hidden by Default)
```typescript
// Only appears when context > 60%, shown as thin progress bar
function TokenCounter({ tokenCount, limit }: Props) {
  const percentage = (tokenCount / limit) * 100;
  if (percentage < 60) return null; // hidden by default

  const barColor = percentage > 80 ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="h-1 w-full bg-neutral-800">
      <div className={`h-full ${barColor} transition-all`} style={{ width: `${percentage}%` }} />
    </div>
  );
}
```

### Floor Tint for Day/Night
```typescript
// Apply warm daylight tint or darker night tone to floor tiles
function applyFloorTint(ctx: CanvasRenderingContext2D, timeOfDay: number, bounds: Rect): void {
  if (timeOfDay > 0.5) {
    // Day: warm amber tint overlay
    ctx.save();
    ctx.globalAlpha = (timeOfDay - 0.5) * 0.06; // max 3% alpha
    ctx.fillStyle = '#ffd700'; // warm gold
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  } else {
    // Night: darken floor
    ctx.save();
    ctx.globalAlpha = (0.5 - timeOfDay) * 0.15; // max 7.5% darker
    ctx.fillStyle = '#000020'; // deep blue-black
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Room label only for active room | All rooms labeled on canvas | Phase 13 | Players can identify rooms at a glance |
| DealSidebar hidden behind toggle | Always visible, collapsible to 40px strip | Phase 13 | Users always see active deal context |
| Attach/Memory in header bar | Inline in input area (Slack pattern) | Phase 13 | Cleaner header, more natural interaction |
| Token counter always visible | Hidden until >60%, shown as progress bar | Phase 13 | Less visual noise in normal use |
| Flat rendered floors | Day/night ambient lighting with glow effects | Phase 13 | Office feels alive and immersive |

**Deprecated/outdated:**
- DealSidebar `isOpen`/`onClose` props pattern: replaced by internal `collapsed` state
- Token counter as text display: replaced by progress bar pattern
- Single active room label: replaced by all-rooms rendering with zoom gating

## Open Questions

1. **Glow source positions for each room**
   - What we know: FURNITURE array has all desk/monitor positions; DECORATIONS has monitor keys
   - What's unclear: Exact world-pixel offset from furniture position to glow center (monitor center vs desk center)
   - Recommendation: Derive glow center from desk position + offset (monitor sits on desk, glow radiates from monitor center)

2. **Hallway glow spill implementation**
   - What we know: CONTEXT.md says "subtle glow spill from adjacent office doors"
   - What's unclear: Whether this is a separate glow source at each door or just the radius of office glow reaching into hallways
   - Recommendation: Use office monitor/lamp glow radius large enough to spill through doors naturally (no extra sources)

3. **New sprite tiles needed for extra decorations**
   - What we know: Environment sheet is 256x192 (16x12 tiles), rows 0-5 used
   - What's unclear: Exact tiles needed for coffee mugs, photo frames, pen holders, water glasses, scattered papers
   - Recommendation: Add new decoration sprites in rows 6-7 of environment sheet (rows 6-11 available = 96 slots)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/engine/__tests__/renderer.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENV-03 | Monitor glow renders with blue radial gradient | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "glow"` | Wave 0 |
| ENV-04 | Desk lamp amber glow renders as static gradient | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "lamp"` | Wave 0 |
| ENV-05 | Rugs render as colored rectangles on floor layer | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "rug"` | Wave 0 |
| ENV-06 | Plant sprites render from atlas | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "plant"` | Existing (partial) |
| ENV-07 | New decorations appear in DECORATIONS array | unit | `npx vitest run src/engine/__tests__/officeLayout.test.ts -t "decoration"` | Wave 0 |
| UI-01 | Chat panel renders with inline Attach/Memory buttons | smoke | Manual visual verification | manual-only |
| UI-02 | DealSidebar always visible, collapses to 40px strip | smoke | Manual visual verification | manual-only |
| UI-03 | DealCard shows per-agent activity counts | unit | `npx vitest run src/components/__tests__/DealCard.test.tsx -t "activity"` | Wave 0 |
| UI-04 | Active deal name rendered prominently | smoke | Manual visual verification | manual-only |
| UI-05 | Room labels render for all rooms at 1.5x+ zoom | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "room label"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/engine/__tests__/renderer.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] Add glow effect test cases to `src/engine/__tests__/renderer.test.ts` -- covers ENV-03, ENV-04
- [ ] Add rug rendering test to `src/engine/__tests__/renderer.test.ts` -- covers ENV-05
- [ ] Add decoration count/key assertions to `src/engine/__tests__/officeLayout.test.ts` -- covers ENV-07
- [ ] Add room label all-rooms test to `src/engine/__tests__/renderer.test.ts` -- covers UI-05

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/engine/renderer.ts` -- existing 6-layer pipeline, compositing patterns, world transform
- Project codebase: `src/engine/officeLayout.ts` -- ROOMS, FURNITURE, DECORATIONS arrays with exact positions
- Project codebase: `src/engine/spriteAtlas.ts` -- environment atlas layout (rows 0-5 used, 6-11 available)
- Project codebase: `src/components/chat/ChatPanel.tsx` -- current chat panel layout and agent header
- Project codebase: `src/components/deal/DealSidebar.tsx` -- current sidebar with isOpen/onClose pattern
- Project codebase: `src/engine/gameLoop.ts` -- frame loop with dt, zoom tick, camera update
- Project codebase: `src/App.tsx` -- layout composition (sidebar + canvas + chat)
- Canvas 2D API: `createRadialGradient()`, `globalCompositeOperation` -- browser-native, well-documented
- CONTEXT.md: all locked decisions and discretion areas

### Secondary (MEDIUM confidence)
- Canvas 2D `globalCompositeOperation = 'lighter'` for additive blending -- standard technique, widely used in 2D game dev

### Tertiary (LOW confidence)
- None -- all findings verified against project code and browser APIs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new dependencies, all existing tools
- Architecture: HIGH - extends established 6-layer renderer pattern and existing React components
- Pitfalls: HIGH - derived from direct analysis of existing renderer code and compositing behavior
- Glow performance: MEDIUM - depends on number of glow sources; gradient reuse mitigates but needs profiling

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no external dependencies to change)

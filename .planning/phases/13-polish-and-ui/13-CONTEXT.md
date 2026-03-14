# Phase 13: Polish and UI - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ambient glow effects, environment detail, personality decorations, day/night theming, and chat/deal UI refinements. This is the final v1.1 phase — everything should feel polished and alive.

**Delivers:** Monitor glow + desk lamp halos, area rugs, detailed plants, personality decorations, personal touches per office, War Room table detail, day/night palette based on system clock, chat panel redesign, always-visible deals sidebar, per-agent activity summary, room labels on canvas.

**Does NOT deliver:** New AI capabilities, new agents, animated environment elements (fan rotation, screen flicker — v2), professional pixel art (v2).

</domain>

<decisions>
## Implementation Decisions

### Ambient Glow & Lighting
- Monitor glow: subtle blue halo radiating ~1-2 tiles onto desk and floor
- All monitors glow the same blue (not signature-colored)
- Desk lamps: complementary warm amber circle (~2 tile radius) on floor beside desk
- All offices + BILLY's office get both monitor and lamp glow
- War Room: cooler/darker ambient, no desk lamps — monitor glow from conference area only
- Hallways: subtle glow spill from adjacent office doors
- Rec area: warm ambient glow around water cooler/furniture
- Glow animation: subtle slow pulse (~4s cycle) on monitor glow — barely noticeable breathing effect
- Lamp glow: static (no pulse)
- Render approach: Claude's discretion (Canvas 2D radial gradients or pre-drawn sprite overlays)

### Day/Night Theming
- Based on system clock via `new Date().getHours()`
- Night: 7pm-7am — glows prominent, floor tiles darker
- Day: 7am-7pm — glows dimmer (barely visible), floor tiles have warm daylight tint
- Gradual transition over ~1 hour at dawn (6-7am) and dusk (6-7pm)
- No manual override — always follows system clock
- Implementation: palette multiplier applied to glow intensity and floor tile tint

### Environment Detail
- Area rugs: simple colored rectangles with 1px border pattern (woven edge suggestion)
- Rug colors: muted signature color per agent (Patrik: muted purple, Sandra: muted green, etc.)
- Plants: Claude's discretion on single-tile vs multi-tile
- Personality decorations: use Phase 11 definitions (Patrik: charts/filing, Sandra: schedule/whiteboard, Marcos: lawbooks, Isaac: scripts/corkboard, Wendy: motivational/cushion)
- Decorations: noticeable at 2x zoom, blend in at overview
- Extra items: add 1-2 personal touches per office (coffee mugs, small photo frames, desk plants, pen holders)
- War Room conference table: scattered papers and water glasses on dark wood surface

### Chat Panel Redesign
- Claude designs the full panel layout (modern chat app patterns — Linear/Slack/ChatGPT style)
- Agent identity: accent color bar (thin vertical or top) + agent name in signature color
- Attach and Memory buttons: moved to input area (like Slack's + or ChatGPT attachment icon)
- File count: small pill badge on Attach button showing file count
- Token counter: hidden by default, appears as progress bar when context > ~60%
- Thinking state: typing indicator in messages + subtle pulse on agent's color bar
- War Room messages: color-coded by agent (polish existing v1.0 implementation)

### Deals Sidebar
- Always visible by default, collapsible to thin strip (~40px) showing just active deal name
- Active deal name: large bold text at top of sidebar with colored accent
- Per-agent activity: message count per agent + "Last active: Xh ago" per deal
- Deal list sorted by updatedAt descending (keep existing behavior)

### Room Labels
- Small pill labels at top edge of each room (existing Layer 6 renderer pattern)
- Shows "Patrik — CFO", "War Room", etc.
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/renderer.ts`: 6-layer pipeline already has drop shadows (globalAlpha=0.3), wall shadows, Layer 6 room labels — glow effects fit naturally as a new sub-layer
- `src/engine/officeLayout.ts`: DECORATIONS array per room with atlas keys already defined (lines 371-399)
- `src/engine/spriteAtlas.ts`: Environment atlas rows 0-5 with floor/furniture/decoration tiles
- `src/components/chat/ChatPanel.tsx`: Has agent color bar, Attach/Memory buttons, message list, token counter
- `src/components/deal/DealSidebar.tsx`: 240px collapsible sidebar with deal list, agent activity counts

### Established Patterns
- Canvas effects use `globalAlpha` + `fillStyle` with semi-transparent colors (drop shadows, wall shadows)
- Sprite rendering via `getCachedSprite()` with quantized zoom cache
- Y-sort renderables merge furniture + characters (depthSort.ts)
- React components use Tailwind CSS v4 with CSS custom properties for theming
- Zustand stores connect canvas engine to React UI

### Integration Points
- Glow effects: add as Layer 3.5 (after walls, before Y-sorted renderables) or as additive overlay after Layer 4
- Day/night: compute time-of-day factor in game loop, pass to renderer as ambient multiplier
- Chat panel: `src/components/chat/ChatPanel.tsx` is the main file to redesign
- Deals sidebar: `src/components/deal/DealSidebar.tsx` needs visibility rework
- Room labels: existing `renderRoomLabel()` in renderer.ts + RoomLabel.tsx DOM component (dual rendering)
- New decoration sprites: add to environment sprite sheet + spriteAtlas.ts

</code_context>

<specifics>
## Specific Ideas

- Day/night is a simple palette multiplier: compute `timeOfDay` factor (0.0 = full night, 1.0 = full day) from system hours, interpolate glow intensity and floor tint
- Monitor pulse: use `Math.sin(time * Math.PI / 2)` scaled to ~0.85-1.0 range for barely perceptible breathing
- Collapsed sidebar strip: just the active deal name rotated 90 degrees or truncated horizontally
- Chat panel input area buttons: paper clip icon for Attach, brain icon for Memory, matching existing dark theme

</specifics>

<deferred>
## Deferred Ideas

- Animated environment elements (fan rotation, screen flicker, plant sway) — v2 ART-02
- Professional pixel art sprites — v2 ART-01
- Particle effects (dust motes, steam from coffee) — v2 ADV-02

</deferred>

---

*Phase: 13-polish-and-ui*
*Context gathered: 2026-03-14*

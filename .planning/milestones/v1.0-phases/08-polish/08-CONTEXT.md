# Phase 8: Polish - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-quality visual and audio experience with polished pixel art sprites replacing colored rectangle placeholders, personality-driven animations for all 6 characters, ambient sound with contextual event audio, and responsive layout from 1280px to ultrawide. This phase does NOT add new features — it elevates the existing experience.

**Delivers:** Polished sprite sheets (characters + environment), personality office decorations, animation states (idle/walk/work/talk), ambient + event audio system, responsive canvas/chat layout, auto-fit zoom.

**Does NOT deliver:** New gameplay mechanics, new agents, new UI panels, or new features.

</domain>

<decisions>
## Implementation Decisions

### Sprite Art Sourcing
- Source from free packs (itch.io, OpenGameArt) and customize to match project aesthetic
- Claude scouts and shortlists suitable packs during research phase
- Full environment + character upgrade — replace ALL colored rectangles (floors, walls, desks, props, characters)
- Stardew Valley quality tier — charming, clean, readable at small sizes
- Corporate modern office style — clean lines, standing desks, plants, glass partitions (matches Phase 2 "sleek corporate floor")
- 32x32 tile size (established in Phase 2)
- Individual sprite sheets per character + one for environment tiles (easier to swap/update)
- Assets stored in /public/sprites/ directory, loaded at runtime via existing loadSpriteSheet()
- BILLY gets a distinct boss/executive look — suit jacket or distinctive styling to stand out from agents

### Character Animation
- 4 animation states per character: idle, walking (4-directional), working (at desk), talking (in conversation)
- 4 frames per animation cycle — matches existing WALK_FRAMES/WORK_FRAMES constants in characters.ts
- 4 directional sprites (up/down/left/right) for walking — already supported by Direction type
- Idle: subtle variation per agent (lean, fidget) — not identical across characters
- Working: typing at desk motion (arms move, screen glow)
- Talking: subtle head/body bob facing BILLY — different from idle but not distracting
- BILLY knock animation: 2-3 frame knock gesture at doorway (matches KNOCK_DURATION = 0.5s)
- War Room: agents walk to seats, show seated/facing-table sprite
- No room transition effects — BILLY walks through open doorways smoothly

### Office Personality Decorations
- Static decoration tiles per office (not animated behaviors)
- Follow roadmap examples: Sasha = whiteboard, Roberto = minimal/sparse desk, Valentina = Post-its everywhere
- Diana & Marcos: Claude's discretion based on agent personas

### Claude's Discretion
- Agent color palette approach (signature colors vs realistic with accents) — pick what looks best with chosen sprite pack
- Diana's and Marcos's specific office decorations — design based on their personas
- Exact idle animation variation per agent

### Sound Design
- Subtle ambient background + event-triggered sounds
- Context-aware ambient: slight volume/tone shift between rooms (War Room more energetic, offices quieter)
- Event sounds: BILLY footsteps, knock on arrival, paper shuffle on file drop, subtle completion chime when agent finishes responding
- NO keyboard typing sounds, NO special War Room audio
- Source from free sound packs (freesound.org, OpenGameArt audio)
- Separate mute toggles for ambient and SFX in the UI
- Start muted by default (browser autoplay policy)
- Lazy-load audio files on first trigger (not eager)

### Responsive Layout
- Minimum supported width: 1280px (desktop productivity app, no tablet/phone)
- Side-by-side layout: canvas and chat panel sit next to each other
- At narrow widths (near 1280px): chat collapses to an icon and can be expanded
- On ultrawide (2560px+): canvas fills available space, chat panel has fixed max-width (~500px)
- Auto-fit zoom: canvas auto-calculates zoom to show whole office by default, user can still zoom in/out manually via existing ZoomControls
- This is a CHANGE from Phase 2's "chat overlays canvas" — now side-by-side with collapse

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/spriteSheet.ts`: Sprite loading, caching, and placeholder colors — has loadSpriteSheet(), getCachedSprite(), loadAllAssets() ready for Phase 8 upgrade
- `src/engine/characters.ts`: Character state machine with WALK_FRAMES=4, WORK_FRAMES=3, KNOCK_DURATION=0.5, Direction type, WAR_ROOM_SEATS — all animation constants already defined
- `src/engine/types.ts`: SpriteFrame type, TILE_SIZE, WALK_SPEED constants
- `src/engine/camera.ts`: Camera system with integer zoom, HiDPI support
- `src/components/canvas/ZoomControls.tsx`: Existing zoom UI component
- `src/components/canvas/OfficeCanvas.tsx`: Canvas React wrapper
- `src/engine/officeLayout.ts`: Room layout and tile map definitions

### Established Patterns
- Canvas engine runs independently of React via requestAnimationFrame — audio system should follow same pattern
- Zustand stores connect React and engine worlds — audio state (muted, volume) should use a store
- PLACEHOLDER_COLORS map in spriteSheet.ts defines current character-to-color mapping — sprites need to replace these references

### Integration Points
- `spriteSheet.ts` loadAllAssets() is the entry point for loading sprite sheets — currently a no-op
- `characters.ts` state machine already handles animation state transitions — needs to reference sprite frames instead of colors
- Renderer (gameLoop/renderer) currently draws colored rectangles — needs sprite rendering path
- `src/components/ui/Header.tsx` — audio mute controls should be added here
- Chat panel overlay behavior needs to change to side-by-side layout (affects App.tsx composition)

</code_context>

<specifics>
## Specific Ideas

- Stardew Valley is the primary visual reference for pixel art quality
- pixel-agents (top-down office with character sprites) is the gameplay reference (established in Phase 2)
- Layout change: moving from "chat overlays canvas" to "side-by-side with collapse" — this is a deliberate departure from Phase 2's decision based on production experience

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-polish*
*Context gathered: 2026-03-13*

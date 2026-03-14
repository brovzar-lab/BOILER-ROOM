# Requirements: Lemon Command Center

**Defined:** 2026-03-14
**Core Value:** Multi-perspective, context-aware AI advisory for complex production deals

## v1.1 Requirements

Requirements for v1.1 Visual Overhaul. Each maps to roadmap phases.

### Layout

- [ ] **LAYOUT-01**: Office renders as compact grid (2 offices top, War Room center, 4 offices bottom) matching mockup
- [ ] **LAYOUT-02**: Room dimensions accommodate JRPG 3/4 furniture and 24x32 characters with correct spacing
- [ ] **LAYOUT-03**: War Room conference table and seating positions work in compact layout
- [ ] **LAYOUT-04**: BFS pathfinding works correctly on redesigned compact grid
- [ ] **LAYOUT-05**: All existing features (file icons on desks, decorations, status indicators) work in new layout

### Renderer

- [ ] **RNDR-01**: Renderer uses ctx.setTransform() for zoom instead of manual coordinate multiplication
- [ ] **RNDR-02**: Unified Y-sorted depth rendering — characters correctly occlude behind/in front of furniture
- [ ] **RNDR-03**: North walls render as visible cream strips in 3/4 perspective
- [ ] **RNDR-04**: No tile gaps or seams at any zoom level (fractional or integer)

### Zoom

- [ ] **ZOOM-01**: User can pinch-to-zoom smoothly on trackpad with continuous (non-integer) zoom levels
- [ ] **ZOOM-02**: Zoom centers on cursor/pinch point (not screen center)
- [ ] **ZOOM-03**: Zoom snaps to nearest half-integer at rest for pixel clarity
- [ ] **ZOOM-04**: Sprite cache uses quantized zoom keys to prevent memory bloat
- [ ] **ZOOM-05**: Auto-fit zoom still works as default on initial load

### Sprites

- [ ] **SPRT-01**: Characters render as 24x32 JRPG 3/4 sprites with foot-center anchoring on 16x16 grid
- [ ] **SPRT-02**: Each character has 4 animation states (idle, walk, work, talk) with 4 directional walk sprites
- [ ] **SPRT-03**: Characters have expressive faces, detailed outfit textures, hair detail, drop shadows
- [ ] **SPRT-04**: Sprite pipeline supports easy asset swapping (drop in new PNGs without code changes)

### Environment

- [ ] **ENV-01**: Floor tiles render as warm parquet with wood grain in 3/4 perspective
- [ ] **ENV-02**: Furniture renders with visible front face and depth (desks with drawer panels, bookshelves with spines)
- [ ] **ENV-03**: Monitor screens glow with blue halo radiating onto desk and floor
- [ ] **ENV-04**: Desk lamps emit warm amber glow circles onto surrounding floor
- [ ] **ENV-05**: Area rugs visible under desks with woven geometric patterns
- [ ] **ENV-06**: Plants render with detailed leaf fronds from above-and-front angle
- [ ] **ENV-07**: Personality decorations per office (Sasha whiteboard, Roberto minimal, Valentina Post-its, etc.)

### UI

- [ ] **UI-01**: Chat panel matches mockup style — agent name/role, file count badge, inline Attach/Memory buttons
- [ ] **UI-02**: Deals sidebar always visible on left (not hidden behind toggle)
- [ ] **UI-03**: Deal switcher shows per-agent activity summary (DEAL-05 from v1.0)
- [ ] **UI-04**: Active deal name prominently displayed (DEAL-06 from v1.0)
- [ ] **UI-05**: Room labels ("Agent Office", "War Room") visible on canvas matching mockup style

## v2 Requirements

Deferred to future release.

### Art Pipeline

- **ART-01**: Professional pixel art sprites from Aseprite or commissioned artist replacing programmatic placeholders
- **ART-02**: Animated environment elements (ceiling fan rotation, screen flicker, plant sway)

### Advanced Rendering

- **ADV-01**: Dynamic lighting system (time-of-day changes, per-room mood lighting)
- **ADV-02**: Particle effects (dust motes, steam from coffee)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Isometric projection | JRPG 3/4 is NOT isometric — strictly top-down with depth on objects |
| WebGL upgrade | Canvas 2D handles all required effects (glow, shadows, transforms) |
| Skeletal animation | Frame-based sprite sheets are standard for pixel art, simpler |
| Per-pixel collision | Tile-based collision is sufficient for office navigation |
| Mobile/touch support | Desktop-only, trackpad zoom is the target interaction |
| New agents or features | v1.1 is visual overhaul only — no new AI capabilities |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | TBD | Pending |
| LAYOUT-02 | TBD | Pending |
| LAYOUT-03 | TBD | Pending |
| LAYOUT-04 | TBD | Pending |
| LAYOUT-05 | TBD | Pending |
| RNDR-01 | TBD | Pending |
| RNDR-02 | TBD | Pending |
| RNDR-03 | TBD | Pending |
| RNDR-04 | TBD | Pending |
| ZOOM-01 | TBD | Pending |
| ZOOM-02 | TBD | Pending |
| ZOOM-03 | TBD | Pending |
| ZOOM-04 | TBD | Pending |
| ZOOM-05 | TBD | Pending |
| SPRT-01 | TBD | Pending |
| SPRT-02 | TBD | Pending |
| SPRT-03 | TBD | Pending |
| SPRT-04 | TBD | Pending |
| ENV-01 | TBD | Pending |
| ENV-02 | TBD | Pending |
| ENV-03 | TBD | Pending |
| ENV-04 | TBD | Pending |
| ENV-05 | TBD | Pending |
| ENV-06 | TBD | Pending |
| ENV-07 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |
| UI-05 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition*

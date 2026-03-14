# Roadmap: Lemon Command Center

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-14)
- **v1.1 Visual Overhaul** — Phases 9-13 (in progress)

<details>
<summary>v1.0 MVP (Phases 1-8) — SHIPPED 2026-03-14</summary>

- [x] Phase 1: Foundation + Single-Agent Chat (3/3 plans) — completed 2026-03-12
- [x] Phase 2: Canvas Engine (3/3 plans) — completed 2026-03-13
- [x] Phase 3: Integration + All Agents (3/3 plans) — completed 2026-03-13
- [x] Phase 4: War Room (3/3 plans) — completed 2026-03-13
- [x] Phase 5: Deal Rooms (2/2 plans) — completed 2026-03-13
- [x] Phase 6: File Handling (3/3 plans) — completed 2026-03-13
- [x] Phase 7: Agent Memory (4/4 plans) — completed 2026-03-13
- [x] Phase 8: Polish (3/3 plans) — completed 2026-03-14

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Visual Overhaul

**Milestone Goal:** Transform the flat top-down office into a rich JRPG 3/4 perspective with Stardew Valley-quality 16-bit pixel art, compact room layout, smooth trackpad zoom, and refined UI matching the War Room mockup.

## Phases

- [x] **Phase 9: Compact Layout** - Redesign office grid from 42x34 sprawl to ~28x24 compact grid with validated pathfinding (completed 2026-03-14)
- [x] **Phase 10: Rendering Pipeline** - Refactor renderer to ctx.setTransform() zoom, unified Y-sorted depth, and 3/4 wall rendering (completed 2026-03-14)
- [x] **Phase 11: JRPG Sprite Integration** - 24x32 character sprites and 3/4 perspective environment tiles with correct anchoring (completed 2026-03-14)
- [x] **Phase 12: Smooth Zoom** - Trackpad pinch-to-zoom with cursor-centered scaling, snap-to-half-integer, and quantized sprite cache (completed 2026-03-14)
- [ ] **Phase 13: Polish and UI** - Ambient glow effects, environment detail, personality decorations, and chat/deal UI refinements

## Phase Details

### Phase 9: Compact Layout
**Goal**: Users see a tight, navigable office where rooms are close together and BILLY walks short distances between agents
**Depends on**: Phase 8 (v1.0 complete)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. Office renders as compact grid (2 offices top, War Room center, 4 offices bottom) with no sprawling hallways
  2. BILLY can walk to any agent office and the War Room via click-to-move pathfinding on the new grid
  3. War Room conference table seats all 5 agents with correct spacing in the compact layout
  4. All existing features (file icons, decorations, status indicators, agent animations) work in the new layout without regression
**Plans:** 3/3 plans complete
Plans:
- [ ] 09-01-PLAN.md — Compact grid data + centralized coordinates in officeLayout.ts
- [ ] 09-02-PLAN.md — Update coupled files (characters.ts, renderer.ts) to use centralized data
- [ ] 09-03-PLAN.md — Navigation enhancements (keyboard shortcuts, sprite clicking) + visual verification

### Phase 10: Rendering Pipeline
**Goal**: The renderer correctly handles depth ordering and zoom math so characters appear behind tall furniture and tiles render without gaps
**Depends on**: Phase 9
**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04
**Success Criteria** (what must be TRUE):
  1. Characters walking behind a desk or bookshelf are partially occluded (Y-sorted depth rendering works)
  2. North walls of rooms render as visible cream-colored strips giving 3/4 perspective depth
  3. No tile gaps or seams appear at any zoom level (integer or fractional)
  4. Click-to-walk targeting still works correctly after the setTransform refactor
**Plans:** 2/2 plans complete
Plans:
- [x] 10-01-PLAN.md — setTransform zoom refactor + float zoom infrastructure + click targeting
- [x] 10-02-PLAN.md — Unified Y-sorted depth rendering + 3/4 wall strips

### Phase 11: JRPG Sprite Integration
**Goal**: Characters and environment tiles look like a JRPG game with 3/4 perspective art, expressive faces, and detailed furniture
**Depends on**: Phase 10
**Requirements**: SPRT-01, SPRT-02, SPRT-03, SPRT-04, ENV-01, ENV-02
**Success Criteria** (what must be TRUE):
  1. Characters render as 24x32 sprites with visible face detail and outfit textures, standing correctly on the 16x16 tile grid
  2. Each character has working idle, walk, work, and talk animations with 4-directional walk sprites
  3. Floor tiles show warm parquet wood grain and furniture has visible front-face depth (drawer panels, bookshelf spines)
  4. Drop shadows appear under all characters grounding them in the scene
  5. New sprite PNGs can be swapped in without code changes (asset pipeline supports easy replacement)
**Plans:** 3/3 plans complete
Plans:
- [x] 11-01-PLAN.md — Agent rename (patrik/sandra/isaac/wendy) + persona prompts + office layout updates
- [x] 11-02-PLAN.md — Sprite pipeline rewrite (24x32 characters + 3/4 environment tiles) + atlas update
- [ ] 11-03-PLAN.md — Renderer foot-center anchoring + drop shadows + depth sort update

### Phase 12: Smooth Zoom
**Goal**: Users can smoothly pinch-to-zoom on their trackpad with pixel-crisp rendering at rest
**Depends on**: Phase 10
**Requirements**: ZOOM-01, ZOOM-02, ZOOM-03, ZOOM-04, ZOOM-05
**Success Criteria** (what must be TRUE):
  1. User can pinch on trackpad and zoom scales smoothly (no integer snapping or jitter)
  2. Zoom centers on the cursor/pinch point so the user's focus stays in place
  3. When the user stops zooming, the view snaps to nearest half-integer for pixel-crisp rendering
  4. Memory usage stays stable during rapid zoom gestures (no sprite cache explosion)
  5. On initial page load, the office auto-fits to the viewport at an appropriate zoom level
**Plans:** 2/2 plans complete
Plans:
- [ ] 12-01-PLAN.md — Zoom controller state machine + cursor-centered math + wheel handler
- [ ] 12-02-PLAN.md — Game loop integration + ZoomControls UI redesign + visual verification

### Phase 13: Polish and UI
**Goal**: The office feels alive with ambient lighting and the chat/deal UI matches the production mockup
**Depends on**: Phase 11, Phase 12
**Requirements**: ENV-03, ENV-04, ENV-05, ENV-06, ENV-07, UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Monitor screens glow with blue halos and desk lamps emit warm amber circles onto surrounding surfaces
  2. Area rugs, detailed plants, and personality decorations (Patrik's charts, Sandra's whiteboard, Marcos's lawbooks, Isaac's corkboard, Wendy's motivational art) are visible in each office
  3. Room labels ("Patrik -- CFO", "War Room") appear on the canvas matching the mockup style
  4. Chat panel shows agent name/role, file count badge, and inline Attach/Memory buttons matching the mockup
  5. Deals sidebar is always visible on the left with per-agent activity summary and prominent active deal name
**Plans:** 1/4 plans executed
Plans:
- [ ] 13-00-PLAN.md — Wave 0 test stubs for Nyquist compliance
- [ ] 13-01-PLAN.md — Canvas glow effects + day/night theming + all-room labels
- [ ] 13-02-PLAN.md — Area rugs + personality decorations + personal touches per office
- [ ] 13-03-PLAN.md — Chat panel redesign + always-visible deals sidebar + per-agent activity

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Single-Agent Chat | v1.0 | 3/3 | Complete | 2026-03-12 |
| 2. Canvas Engine | v1.0 | 3/3 | Complete | 2026-03-13 |
| 3. Integration + All Agents | v1.0 | 3/3 | Complete | 2026-03-13 |
| 4. War Room | v1.0 | 3/3 | Complete | 2026-03-13 |
| 5. Deal Rooms | v1.0 | 2/2 | Complete | 2026-03-13 |
| 6. File Handling | v1.0 | 3/3 | Complete | 2026-03-13 |
| 7. Agent Memory | v1.0 | 4/4 | Complete | 2026-03-13 |
| 8. Polish | v1.0 | 3/3 | Complete | 2026-03-14 |
| 9. Compact Layout | 3/3 | Complete   | 2026-03-14 | - |
| 10. Rendering Pipeline | v1.1 | Complete    | 2026-03-14 | 2026-03-14 |
| 11. JRPG Sprite Integration | 3/3 | Complete    | 2026-03-14 | - |
| 12. Smooth Zoom | 2/2 | Complete    | 2026-03-14 | - |
| 13. Polish and UI | 1/4 | In Progress|  | - |

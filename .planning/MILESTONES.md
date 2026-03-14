# Milestones

## v1.1 Visual Overhaul (Shipped: 2026-03-14)

**Phases completed:** 5 phases, 14 plans
**Timeline:** 1 day (2026-03-14)
**Codebase:** 15,474 LOC TypeScript/TSX, 104 source files, 28 commits

**Key accomplishments:**
- Compact 31x28 grid layout replacing sprawling 42x34 office with short walk distances
- setTransform-based renderer with Y-sorted depth occlusion and 3/4 perspective wall strips
- 24x32 JRPG character sprites with 4-directional walk, drop shadows, and foot-center anchoring
- Smooth pinch-to-zoom with cursor-centered scaling, inertia, snap-to-half-integer, and drag-to-pan
- Ambient glow effects (monitor blue halos, desk lamp amber) with day/night theming from system clock
- Redesigned chat panel with inline Attach/Memory buttons, accent color bar, conditional token counter
- Always-visible deals sidebar with collapsible strip, per-agent activity summary, prominent deal name
- Agent rename and persona refresh: Patrik (CFO), Sandra (Producer), Isaac (Dev), Wendy (Coach), Marcos (Lawyer)
- Area rugs in muted signature colors, 15 personality decorations, War Room table detail

**Tech debt accepted:**
- renderHeight dead field on FurnitureItem (unused by depthSort)
- Sprite cache bypassed by renderer (intentional — draws via setTransform)
- ZoomControls minZoom uses window dimensions instead of canvas rect (cosmetic)

**v1.0 gaps resolved:**
- DEAL-05: Per-agent activity summary now in DealCard
- DEAL-06: Active deal name prominently displayed at sidebar top

---

## v1.0 MVP (Shipped: 2026-03-14)

**Phases completed:** 8 phases, 24 plans
**Timeline:** 2 days (2026-03-12 → 2026-03-14)
**Codebase:** 13,450 LOC TypeScript/TSX, 190 files

**Key accomplishments:**
- Streaming multi-agent chat with 5 AI advisory agents (Diana CFO, Marcos Legal, Sasha Creative, Roberto Ops, Valentina Marketing)
- Top-down pixel art office canvas with character sprites, BFS pathfinding, room navigation, personality decorations
- War Room broadcast with parallel streaming to all agents, rate-limit-aware concurrency
- Deal rooms with named deal entities and per-deal conversation/file/memory scoping
- File handling with drag-and-drop PDF/Excel/image parsing, context injection, file viewer
- Agent memory with structured fact extraction, memory panel, cross-agent knowledge sharing
- Audio system with ambient office sounds, contextual SFX, separate mute controls
- Responsive side-by-side layout with collapsible chat panel and auto-fit zoom

**Known Gaps:**
- DEAL-05: Deal switcher UI lacks per-agent activity summary
- DEAL-06: Active deal name display could be more prominent

---


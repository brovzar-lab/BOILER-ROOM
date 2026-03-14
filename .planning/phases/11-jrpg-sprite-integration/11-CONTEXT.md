# Phase 11: JRPG Sprite Integration - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace placeholder colored rectangles with JRPG 3/4 perspective sprites: 24x32 character sprites with foot-center anchoring, 3/4 environment tiles (floors, furniture), and updated persona prompts for the entirely new agent team. This phase also renames and re-roles all 5 agents.

**Delivers:** 24x32 character sprite sheets (6 characters), 3/4 environment tile sprites, updated generateSprites.ts, spriteAtlas.ts updates, persona prompt rewrites for all 5 agents, agent registry updates, keyboard shortcut updates, signature color changes, personality office decorations.

**Does NOT deliver:** Smooth zoom input (Phase 12), glow/lighting effects (Phase 13), UI refinements (Phase 13). Sprites are programmatic placeholders at correct dimensions — real art swapped later.

</domain>

<decisions>
## Implementation Decisions

### New Agent Roster (MAJOR CHANGE)
Old team completely replaced:
- **BILLY** (M) — CEO, user avatar. Inspired by Billy Rovzar: dark hair, Mexican features, creative executive (blazer over casual shirt, no tie, slightly tousled hair)
- **Patrik** (M) — CFO. Replaces Diana. Financial analysis, P&L, fund economics, cash flow
- **Marcos** (M) — Lawyer. Same name, role refined from "Counsel" to "Lawyer". Entertainment law, contracts, EFICINE, cross-border structures
- **Sandra** (F) — Line Producer. Replaces Sasha. Production budgets, scheduling, crew management, below-the-line costs, locations
- **Isaac** (M) — Head of Development. Replaces Roberto. Film/TV development: script evaluation, IP scouting, talent packaging, development slate
- **Wendy** (F) — Performance Coach. Replaces Valentina. Personal development, decision-making frameworks, work-life balance, strategic thinking, CEO coaching

Gender split: 4M (BILLY, Patrik, Marcos, Isaac) + 2F (Sandra, Wendy)
Bilingual: Yes, Spanish terms of art in Mexican entertainment industry context

### Character Appearance
- Distinct & culturally grounded — varied skin tones, hair styles, Mexican professional context
- Claude designs all 5 agent appearances based on their roles and personalities
- Claude designs distinct personalities matching each role
- New signature colors for all agents (Claude picks colors that work well together)
- BILLY: inspired by Billy Rovzar — dark hair, Mexican, creative exec look

### Room Assignments
- Claude assigns agents to rooms based on workflow adjacency
- BILLY stays top-left (CEO office)
- Top-right: closest advisor (Claude picks)
- Middle-left, middle-right, bottom-left, bottom-right: remaining 4 agents

### Keyboard Shortcuts
- Agent keys: P (Patrik), M (Marcos), S (Sandra), I (Isaac), W (Wendy)
- War Room: number key (0 or 6) — resolves W conflict with Wendy
- B = BILLY's office, Escape = home (unchanged)

### Wendy's Office
- Different from standard offices: comfortable chair/couch instead of standard desk setup
- Plants, warm feel — consultation room vibe, not corporate desk
- Still has a desk but it's secondary to the coaching area

### Office Decorations (role-appropriate)
- Patrik: financial charts, calculator
- Marcos: law books, legal documents
- Sandra: production schedules, clipboard, call sheets
- Isaac: script stacks, corkboard with project notes
- Wendy: motivational elements, plants, cozy items
- BILLY: CEO decor (Claude designs)
- Claude designs specific items for each

### Furniture & Environment Style
- Mixed materials: some wood, some metal/glass. Standing desks with metal frames possible. More tech-office than pure dark walnut
- Floor style: Claude's discretion — pick what looks best at 16x16 pixel art scale
- Monitors show role-specific screen hints (Patrik's numbers/charts, Marcos's documents, etc.)
- Same base furniture per office (desk + chair + monitor) with personality items on top
- Conference table: dark wood, more premium than office desks. Boardroom gravitas
- Rec area items: Claude picks what fits the space (keep water cooler, ping pong, couch as base, add if it makes sense)
- Rec area is decoration only — agents don't visit it

### Sprite Specifications
- Characters: 24x32 pixels, JRPG 3/4 facing south toward viewer
- 4 animation states: idle, walk (4 directional), work (at desk), talk (facing BILLY)
- Foot-center anchoring on 16x16 tile grid
- Individual sprite sheets per character (/public/sprites/)
- Drop shadows: small dark semi-transparent ellipse beneath feet (characters only, not furniture)
- Environment tiles: 16x16 for floors, furniture sprites at natural 3/4 dimensions
- Programmatic generation via updated generateSprites.ts — real art swapped later

### Claude's Discretion
- All 5 agent visual appearances (hair, skin, outfit details)
- Agent personalities and communication styles
- Signature colors for each agent
- Room assignments based on workflow
- Floor material/style
- Rec area furniture selection
- Office decoration specifics per agent

</decisions>

<code_context>
## Existing Code Insights

### Files Requiring Agent Rename
- `src/config/agents.ts` or agent registry — IDs change from diana/sasha/roberto/valentina to patrik/sandra/isaac/wendy
- `src/config/prompts/` — persona prompt files need complete rewrite
- `src/engine/officeLayout.ts` — room IDs, room names, DECORATIONS, WAR_ROOM_SEATS keys
- `src/engine/characters.ts` — AGENT_IDS array
- `src/engine/input.ts` — KEY_TO_ROOM mapping
- `src/store/chatStore.ts` — agent ID references
- `src/components/` — any hardcoded agent names/colors

### Sprite Pipeline
- `scripts/generateSprites.ts` — rewrite for 24x32 characters + 3/4 environment
- `src/engine/spriteAtlas.ts` — update CHARACTER_FRAMES for 24x32 dimensions, add environment atlas
- `src/engine/spriteSheet.ts` — loadAllAssets() loads new sprite sheets
- `src/engine/renderer.ts` — already uses Y-sort + setTransform, needs 24x32 anchor math
- `src/engine/depthSort.ts` — Renderable interface may need sprite height field

### Established Patterns
- Individual PNGs per character in /public/sprites/
- spriteAtlas.ts defines frame coordinates
- renderer.ts draws at world coords via setTransform (Phase 10)
- Y-sort by footY (depthSort.ts)

</code_context>

<specifics>
## Specific Ideas

- The agent rename is a cross-cutting concern touching ~10+ files — plan it as a coordinated single task
- Persona prompts should follow the established bilingual style from Phase 3 but with new domain expertise
- Wendy's office breaks the standard desk+chair pattern — needs special furniture layout in officeLayout.ts
- The generateSprites.ts rewrite is the biggest single task — new dimensions, new characters, new environment tiles

</specifics>

<deferred>
## Deferred Ideas

- Agents visiting the rec area (animation/pathfinding) — future enhancement
- Professional pixel art replacing programmatic sprites — post-v1.1 or commissioned separately
- Animated environment elements (fan rotation, screen flicker) — Phase 13 or v2

</deferred>

---

*Phase: 11-jrpg-sprite-integration*
*Context gathered: 2026-03-14*

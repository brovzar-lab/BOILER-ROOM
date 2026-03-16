# Lemon Command Center — Backlog

> Consolidated list of features, improvements, and fixes inspired by pixel-agents and project evolution.
> Updated: 2026-03-16

---

## What We Took From pixel-agents (Already Built)

These patterns were studied from [pixel-agents](https://github.com/pablodelucca/pixel-agents) and adapted into Lemon Command Center during v1.0 and v1.1:

| Feature | pixel-agents Pattern | Our Implementation |
|---------|---------------------|-------------------|
| Canvas 2D game loop | requestAnimationFrame with delta time | `gameLoop.ts` — 60fps with dt capping at 0.1s |
| BFS pathfinding | 4-connected tile grid, shortest path | `tileMap.ts` — BFS on walkable tiles, no diagonals |
| Character state machines | idle/walk/work states with frame cycling | `characters.ts` — IDLE, WALK, WORK, TALK, KNOCK states |
| Sprite sheet system | PNG sheets with frame extraction + caching | `spriteSheet.ts` + `limeZuAtlas.ts` — LimeZu 16x16 tiles |
| Three-world architecture | Engine (pure TS) / UI (React) / State (bridge) | Engine writes to Zustand, React reads from Zustand, no direct coupling |
| Top-down pixel office | Office rooms with agents at desks | 10-room 3x3 grid with 7 characters |
| Integer zoom | Pixel-perfect rendering, no fractional scaling | `camera.ts` — exponential zoom with cursor-centered scaling |
| Layered renderer | Background → tiles → furniture → characters → UI | 6-layer pipeline with Y-sorted depth occlusion |
| Non-reactive engine reads | getState() instead of React subscriptions | Game loop reads officeStore via `getState()`, writes only on meaningful changes |

---

## Backlog

### P0 — In Progress (v2.0 Active)

#### ART-01: LimeZu Premade Character Sprites (Quick Win)
Use the 20 premade 32x32 character sprites from LimeZu Character Generator as an immediate upgrade over programmatic placeholders. Each premade already has walk/idle/sit animations baked in. Assign one premade per agent based on visual fit.
- **Status:** Atlas mapped, integration in progress. Premade sheets at `public/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32/`
- **Files:** `limeZuCharFrames.ts`, `characters.ts`, `renderer.ts`
- **Available:** 20 premade characters (Premade_Character_32x32_01 through _20)

#### ART-02: Custom Character Sprites via Character Generator (The Real Goal)
Build unique custom characters for each agent using the LimeZu Character Generator layering system. Each character is composed by stacking PNG layers in order:
1. **Body** (skin tone, build) — 9 body types
2. **Eyes** (expression, color) — 7 eye styles
3. **Outfit** (clothing, profession) — 15+ outfit sets with color variants
4. **Hairstyle** (hair, hats) — 15+ styles with color variants
5. **Accessory** (optional: backpack, hat, etc.)

Layers are composited in a pixel art editor (Piskel, Aseprite) or at runtime via Canvas layering. This gives each character a distinct look that matches their persona:
- **BILLY:** Executive body, sharp eyes, blazer outfit, styled hair — the boss
- **Patrik (CFO):** Formal body, glasses (accessory), suit outfit, neat hair — conservative finance
- **Marcos (Lawyer):** Suited body, reading glasses, formal outfit — always has documents
- **Sandra (Producer):** Dynamic body, energetic eyes, creative outfit — production energy
- **Isaac (Dev):** Casual body, focused eyes, hoodie/casual outfit — developer look
- **Wendy (Coach):** Warm body, expressive eyes, smart-casual outfit — approachable
- **Charlie (Designer):** Creative body, artistic eyes, casual-cool outfit — designer vibe

**Two approaches:**
1. **Offline compositing** (recommended first): Use Piskel/Aseprite to manually layer the PNGs, export 7 custom character sheets, drop them into `public/sprites/`. Simple, no code changes beyond updating sheet paths.
2. **Runtime compositing** (stretch goal): Load individual layer PNGs at runtime, composite them onto offscreen canvases per character. Enables future customization UI where user could tweak agent appearances.

- **Assets available locally:** `public/sprites/modern-interiors-paid/2_Characters/Character_Generator/` — Bodies, Eyes, Outfits, Hairstyles, Accessories all at 32x32
- **Character Generator app also downloaded:** `Character Generator 2.0 Setup.exe` / Linux build (GUI tool for compositing)
- **Complexity:** Medium (offline) / High (runtime)
- **Files:** `limeZuCharFrames.ts` (sheet paths), `characters.ts` (animation frames)
- **Req:** ART-04 in REQUIREMENTS.md

#### ART-03: LimeZu Environment Tiles
Replace colored rectangle floor/wall tiles with 16x16 LimeZu Modern Interiors environment tilesets. Floors, walls, furniture, decorations.
- **Status:** Atlas mapped, `environment.png` updated, needs full integration
- **Assets:** `public/sprites/modern-interiors-paid/1_Interiors/16x16/` — full room themes (Office, Kitchen, Bathroom, Living Room, etc.)
- **Files:** `limeZuAtlas.ts`, `officeLayout.ts`, `renderer.ts`

#### ART-04: LimeZu Conference Hall for War Room
Use LimeZu Conference Hall assets (conference table, whiteboard, projector) for the War Room / Board Room.
- **Files:** `limeZuAtlas.ts`, `officeLayout.ts`

#### ART-05: LimeZu UI Elements
Integrate LimeZu UI sprite elements (speech bubbles, emote sprites, panel frames) into chat/deal panels for visual cohesion.
- **Assets:** `public/sprites/modern-interiors-paid/4_User_Interface_Elements/`
- **Files:** `limeZuAtlas.ts`, chat components

#### ART-06: Animated Environment Objects
Use LimeZu animated objects (ceiling fans, screen flickers, plant sway) for ambient life in the office. Assets at `public/sprites/modern-interiors-paid/3_Animated_objects/`.
- **Req:** ART-03 in REQUIREMENTS.md
- **Complexity:** Medium — need animation frame cycling in renderer for environment tiles

---

### P1 — Next Up (v2.0 Planned)

#### ENGINE-01: Furniture Collision Boundaries
Characters should respect table/desk/furniture boundaries instead of walking through them. Add collision flag to FurnitureItem, update BFS pathfinding to treat collision furniture as unwalkable.
- **Complexity:** Medium
- **Files:** `types.ts` (collision field), `tileMap.ts` (pathfinding), `officeLayout.ts` (furniture data)

#### ANIM-01: Agent Idle Behaviors
Agents perform ambient activities when not engaged: work at desk (typing), get water from cooler, stretch, check phone. Each agent has 2-3 personality-appropriate idle routines that cycle randomly.
- **Inspired by:** pixel-agents shows agents with ambient activity at their desks
- **Complexity:** Medium-High
- **Files:** `characters.ts` (state machine expansion), new idle behavior scheduler

#### ANIM-02: Speech/Thought Bubbles
Show LimeZu emote sprites above character heads: thinking emote while API is streaming, exclamation when response is ready, speech bubble during conversation. Replaces current amber dot status indicators.
- **Inspired by:** pixel-agents status indicators + LimeZu UI emote sprites
- **Complexity:** Medium
- **Files:** `renderer.ts` (bubble rendering layer), `limeZuAtlas.ts` (emote sprites mapped)
- **Atlas ready:** `emote-thinking`, `emote-exclamation`, `speech-bubble-left`, `speech-bubble-right`

#### AI-01: Agent-to-Agent Collaboration Chains
Agents autonomously visit each other's offices to collaborate on complex tasks that span multiple domains. The user kicks it off by giving one agent a task, and that agent figures out who else needs to be involved, walks to their office, shares context, and continues the chain until the work is done.

**The screenplay workflow (flagship use case):**
1. User drops a screenplay PDF on Isaac's (Dev) desk and says "Evaluate this for production"
2. Isaac reads it, forms creative notes, then walks to Sandra's (Producer) office to discuss budget feasibility
3. Sandra runs preliminary budget numbers, flags tax incentive questions, walks to Patrik's (CFO) office
4. Patrik models the financing, identifies EFICINE/Decreto 2026 angles, walks to Marcos (Lawyer) to check rights/chain of title
5. Marcos reviews legal exposure, walks to Wendy (Coach) for packaging/talent strategy
6. Each agent builds on what the previous agents found — context accumulates through the chain
7. Final summary delivered back to BILLY with each agent's contribution attributed

**Other example chains:**
- "Marcos, review this distribution agreement" → Marcos flags financial terms → walks to Patrik for P&L impact → walks to Sandra for production timeline feasibility
- "Patrik, stress-test this fund model" → Patrik runs numbers → walks to Marcos for legal structure validation → walks to Sandra for deal pipeline reality check

- **Inspired by:** pixel-agents showing agents interacting + the real workflow of a production company where specialists consult each other
- **Complexity:** High
- **Key design decisions:**
  - User gives initial instruction to one agent, agent decides the chain (who to visit and why)
  - Each agent produces a handoff summary when visiting the next agent (not raw conversation dump)
  - Chain context accumulates: each agent sees what previous agents concluded
  - All conversations stored as linked sub-threads within the active deal
  - Visual: agents physically walk between offices on the canvas as the chain progresses
  - Each agent's contribution is attributed in the final report

#### AI-02: User-Approved Agent Chaining
Each "hop" in a collaboration chain (Agent A decides to visit Agent B) requires user approval before proceeding. Prevents runaway API costs, keeps user in control, and lets user redirect the chain if needed.
- **Depends on:** AI-01
- **Complexity:** Medium
- **UI:** Approval dialog showing:
  - Who wants to visit whom and why
  - What they plan to discuss / share
  - Estimated tokens for the next hop
  - Option to approve, skip this agent, redirect to a different agent, or stop the chain
- **User can also:** inject additional instructions before approving ("tell Patrik to focus on the Decreto 2026 angle")

#### AI-03: Live View / Background Summary of Agent Collaboration
User can either watch the collaboration chain live (see agents walking between offices, conversations streaming in real-time) or let it run in background and get a consolidated summary when the chain completes.
- **Depends on:** AI-01, AI-02
- **Complexity:** Medium-High
- **Live view:** Camera follows the active agent as they walk to the next office, conversation streams in a special collaboration panel
- **Background mode:** Notification badge appears when chain completes, summary shows each agent's contribution in order
- **UI:** Toggle between live/background at any point during the chain

#### AI-04: Concurrent BILLY Activity During Collaboration
BILLY can continue chatting with other agents or working while a collaboration chain runs in the background. Requires decoupling the streaming pipeline so multiple conversations can run simultaneously.
- **Depends on:** AI-01, AI-03
- **Complexity:** High
- **Example:** BILLY drops a screenplay on Isaac, approves the chain, then walks to Wendy's office to discuss a separate coaching question while the screenplay evaluation chain runs autonomously

#### AI-05: Auto Deal Creation from Agent Instructions
Agents can suggest or auto-create a new deal when collaboration context warrants it. Example: during a screenplay evaluation chain, Isaac says "This project needs its own deal — it's big enough to track separately" and a new deal is created with all the chain's context already scoped to it.
- **Depends on:** AI-01
- **Complexity:** Medium
- **Files:** `parseDealAction.ts` (already started), `dealStore.ts`

#### AI-06: Chain Templates
Pre-built collaboration chain templates for common workflows that skip the "agent decides who to visit" step:
- **Screenplay Evaluation:** Isaac → Sandra → Patrik → Marcos → Wendy
- **Deal Review:** Marcos → Patrik → Sandra
- **Fund Structuring:** Patrik → Marcos → Sandra
- **Project Packaging:** Wendy → Sandra → Patrik
- User can create custom templates from successful past chains
- **Depends on:** AI-01
- **Complexity:** Medium

---

### P2 — Future Enhancements

#### VISUAL-01: Agent Personality Animations
Each agent has unique animation quirks beyond generic idle:
- **Sandra:** Stands up while talking, paces
- **Isaac:** Barely moves, deep focus at screen
- **Wendy:** Post-its flying, gestures while talking
- **Patrik:** Checks spreadsheets, adjusts glasses
- **Marcos:** Always has document in hand, reads
- **Charlie:** Moves around office, sketches on board
- **Complexity:** Medium per character

#### VISUAL-02: Room Transition Polish
Smooth door-frame transition effect when BILLY enters a room (brief fade or zoom shift). Currently walks through open doorways with no visual punctuation.
- **Complexity:** Low

#### VISUAL-03: Notification Badges on Rooms
In overview zoom, show notification badges on rooms with unread agent responses. Currently room labels show but no unread indicators at overview level.
- **Complexity:** Low
- **Files:** `renderer.ts` (Layer 6 overlays)

#### VISUAL-04: Minimap
Optional minimap in corner showing full office layout with BILLY's position highlighted. Useful when zoomed in and navigating.
- **Complexity:** Medium
- **Deferred from:** Phase 2 original spec (decided "room label, no minimap")

#### AUDIO-01: Contextual Room Audio
Subtle audio shift between rooms — War Room more energetic ambience, offices quieter, break room casual. Currently ambient audio is uniform.
- **Complexity:** Low-Medium
- **Files:** Audio system already exists, needs room-aware volume/tone

#### AUDIO-02: Agent Voice Chimes
Each agent gets a subtle unique chime or sound when they start/finish responding. Helps identify which agent is active without looking.
- **Complexity:** Low

#### PERF-01: Sprite Cache Optimization
Sprite cache exists but renderer bypasses it (draws via setTransform). Evaluate whether re-enabling cache improves performance at high zoom levels.
- **Known issue from:** PROJECT.md

#### PERF-02: renderHeight Dead Field Cleanup
Remove unused `renderHeight` field from FurnitureItem — not used by depthSort.
- **Known issue from:** PROJECT.md
- **Complexity:** Trivial

---

### P3 — Known Bugs

#### BUG-01: War Room Agent Gathering Inconsistency
War Room agent gathering animation may not always trigger. Pre-existing pathfinding edge case where some agents fail to find path to their war room seat.
- **Known issue from:** PROJECT.md
- **Severity:** Low (cosmetic — agents still participate in War Room chat)

---

## Out of Scope (Decided)

These were explicitly discussed and rejected:

| Feature | Reason |
|---------|--------|
| Real-time collaboration / multi-user | Personal productivity tool |
| Mobile app | Desktop-only, web-first |
| Server-side backend | Client-side with direct Anthropic API |
| OAuth/SSO authentication | Single-user, API key in .env |
| Custom LLM fine-tuning | Standard API with system prompts |
| Agents visiting each other casually (idle social visits) | Keep idle behaviors to personal activities only |
| Keyboard typing sounds | User decision — audio kept subtle |

---

## Reference

- **pixel-agents source:** https://github.com/pablodelucca/pixel-agents
- **LimeZu Modern Interiors:** https://limezu.itch.io/moderninteriors (paid pack, stored locally)
- **Architecture doc:** `.planning/PROJECT.md`
- **Original spec:** `LEMON-COMMAND-CENTER-PROMPT.md`
- **Office 3.0 plan:** `docs/superpowers/plans/2026-03-15-office-3.0-redesign.md`

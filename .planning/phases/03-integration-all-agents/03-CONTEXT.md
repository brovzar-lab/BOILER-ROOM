# Phase 3: Integration + All Agents - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wires the Canvas navigation to the chat system and expands from 1 agent to 5 fully distinct personas. When BILLY walks to an agent's room, the chat panel instantly switches to that agent's conversation. Each agent has independent conversation history, a unique persona with Mexican entertainment domain expertise, and visible status on the canvas. The canvas shows who's thinking, who has unread responses, and who's idle.

**Delivers:** Canvas-to-chat integration (room entry opens agent chat), 4 new agent personas (Marcos, Sasha, Roberto, Valentina), independent conversation histories per agent, agent status indicators on canvas (speech bubble for unread, typing animation for streaming), overview panel at BILLY's office, keyboard shortcuts (1-5) for agent navigation.

**Does NOT deliver:** War Room broadcast (Phase 4), deal rooms/scoping (Phase 5), file handling (Phase 6), agent memory (Phase 7), polished sprites (Phase 8), sound (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Chat Panel Navigation Behavior
- Panel is **always visible** (never slides open/closed) — content switches instantly when BILLY enters a room
- When BILLY is at his **own office**, panel shows an **overview screen** with an agent cards grid:
  - 5 cards showing agent name, title, color, status (idle/thinking/needs-attention), last message preview
  - Clicking a card makes BILLY walk to that agent's room
- Agent identity shown in panel header: **name + title + color accent bar** (e.g., "Diana — CFO" with amber accent)
- **Instant swap** when switching agents — no animation transition. The walk IS the transition
- Panel width remains **fixed at 400px** (resize deferred to Phase 8 polish)

### Keyboard Navigation
- **Number keys 1-5** trigger BILLY walking to the corresponding agent's room:
  1 = Diana (CFO), 2 = Marcos (Counsel), 3 = Sasha (Deals), 4 = Roberto (Accounting), 5 = Valentina (Development)
- BILLY follows the same walk path as if clicking the room on canvas

### Agent Personas — Language & Style
- **Bilingual-natural**: Agents use Spanish terms where they're the correct term of art (fideicomiso, EFICINE, sociedad anónima, crédito fiscal) but explain in English context. Mimics how Mexican executives actually communicate with a bilingual CEO
- **Cross-agent references**: Agents naturally reference other agents when relevant ("You should run these numbers by Diana", "Marcos would need to review this clause", "This is a War Room question"). Reinforces the team dynamic
- **Distinct response formats per agent**: Each agent has a characteristic way of structuring responses:
  - Diana: Tables, scenario comparisons (best/base/worst)
  - Marcos: Numbered clauses, risk flags, protective language suggestions
  - Sasha: Relationship maps, strategic positioning, long-game analysis
  - Roberto: Precise calculations, compliance checklists, optimization paths
  - Valentina: Comparative analysis, buyer profiles, market positioning

### Marcos (Counsel) — Full-Spectrum Legal
- Personality: Methodical, risk-averse, thorough. Reviews everything twice
- Domain: Both contract/rights work AND corporate/regulatory. Adapts to the question — deal review gets clause analysis, structure questions get corporate law
- Expertise: Distribution deals, talent agreements, rights chains, co-production treaties, SPVs, fideicomisos, IMCINE regulations, Ley Federal de Cinematografía
- Communication style: Numbered clauses, flags risk prominently, suggests protective language, cites applicable law/regulation

### Sasha (Deals) — Strategic Networker
- Personality: Plays the long game. Maps relationships, knows who's buying what, positions Lemon for the best partnerships. More chess than boxing
- Domain: Latin American content market, streaming platform strategies, international co-production packaging, festival circuit, territorial sales
- Expertise: Netflix/Amazon/Disney+/HBO Max/Vix acquisition trends, Spanish-language content demand, co-production treaty benefits (Mexico-Spain, Mexico-Colombia), festival strategy (Cannes, Sundance, San Sebastián, Morelia)
- Communication style: Strategic positioning, relationship mapping, opportunity windows, long-term alliance framing

### Roberto (Accounting) — Tax Strategy + Compliance
- Personality: Quiet, meticulous, finds advantages within the rules. Optimizes without cutting corners
- Domain: Both tax strategy AND compliance guardianship. Maximizes incentives AND ensures audit-readiness
- Expertise: EFICINE tax credits, Decreto 2026 incentives, SAT reporting requirements, IMCINE compliance, production cost reporting, cross-border tax implications, incentive stacking
- Communication style: Precise calculations, compliance checklists, "here's the advantage AND here's the paperwork trail", conservative on risk

### Valentina (Development) — Commercial + Creative Hybrid
- Personality: Passionate about great stories, but always knows who the buyer is. Packages creativity for market windows
- Domain: Intersection of artistic quality and commercial viability. Develops projects for specific buyers
- Expertise: Platform buyer preferences (what Netflix Mexico wants vs Prime Video), genre trends, writer/director talent pipeline, festival-to-deal conversion, slate strategy, IP development
- Communication style: Comparative analysis of projects, buyer profiles, "this is a [Platform] limited series because...", creative-commercial hybrid thinking

### Canvas Status Indicators
- **Unread message indicator**: Pixel **speech bubble icon** above agent's head when they have an unread response. Disappears when user visits the room (panel opens = read)
- **Thinking animation**: When API is streaming for an agent, their character plays a **fast typing animation** at their desk. Returns to idle/work when streaming completes
- **'needs-attention' clears**: The moment BILLY enters the room and the chat panel switches to that agent. Visiting = reading
- **Overview zoom visibility**: Status indicators are **visible at both zoom levels** — essential for overview mode's purpose (seeing who needs attention). May be slightly simplified at zoom=1 but always present
- **Status sync mechanism**: chatStore.streaming state → officeStore agent status → canvas character animation state. The Zustand bridge pattern carries status from the chat world to the canvas world

### Claude's Discretion
- Speech bubble pixel art design (size, animation, color)
- Agent card grid layout in overview screen (2+3 arrangement? single column? etc.)
- Exact keyboard shortcut implementation (keydown listener location, conflict handling)
- How to handle "thinking" state for an agent whose room BILLY isn't currently in (just the animation, no panel change)
- Whether to add a subtle transition effect when panel content swaps (e.g., 50ms opacity change)
- Agent persona prompt length and level of detail
- Base system prompt additions needed for cross-agent reference awareness
- How to handle the case where BILLY is walking and user presses a number key (queue or override?)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`AgentId` type** (`src/types/agent.ts`): Already defines `'diana' | 'marcos' | 'sasha' | 'roberto' | 'valentina'`
- **`AgentPersona` interface**: Has all needed fields (id, name, title, color, systemPrompt, personality, domain, status)
- **`AgentStatus` type**: Already has `'idle' | 'thinking' | 'needs-attention'`
- **`dianaPersona`** (`src/config/agents/diana.ts`): Template pattern for all 4 new personas — `personaPrompt` field + metadata
- **`getAgent()` / `agents` registry** (`src/config/agents/index.ts`): Ready to register new agents — currently only Diana
- **`chatStore.getOrCreateConversation(agentId)`**: Already scopes conversations per agent — no changes needed
- **`useChat(agentId)` hook**: Already accepts agentId parameter — currently hardcoded to 'diana' in usage, not in implementation
- **`buildContext(agentId, ...)`**: Already looks up agent persona via `getAgent(agentId)` — adding agents to registry auto-wires them
- **Character system** (`src/engine/characters.ts`): Already has idle/walk/work states with animation frame cycling
- **`officeStore.activeRoomId`**: Already updated when BILLY arrives at a room (via knock timer completion)
- **`officeStore.targetRoomId`**: Set when user clicks a room, before BILLY starts walking
- **`input.ts handleClick`**: Already converts click → room → startWalk. Just needs keyboard handler extension

### Integration Points
- `officeStore.activeRoomId` changes → React listens reactively → chat panel switches agent
- `chatStore.streaming.isStreaming` + `activeConversationId` → derive which agent is "thinking"
- New: officeStore needs per-agent status tracking (idle/thinking/needs-attention)
- New: characters.ts needs to read agent status and switch between work/idle/typing animations
- New: renderer.ts needs to draw speech bubble overlay for needs-attention agents
- New: input.ts needs keyboard shortcut handler (1-5 keys)
- `App.tsx` needs conditional rendering: agent chat panel vs overview panel based on activeRoomId

### Patterns to Follow
- Persona files follow diana.ts pattern: `Omit<AgentPersona, 'status' | 'systemPrompt'> & { personaPrompt: string }`
- Store actions only fire on meaningful state changes (not every frame)
- Three-world bridge: Canvas reads status via getState(), React subscribes reactively
- DOM overlays (like speech bubbles) could be React components OR canvas-rendered — canvas-rendered is simpler for this

</code_context>

<deferred>
## Deferred Ideas

- War Room broadcast (all agents walk to central table) — Phase 4
- Deal rooms with per-deal conversation scoping — Phase 5
- File drag-and-drop onto agent desks — Phase 6
- Agent memory extraction and cross-agent knowledge — Phase 7
- Polished production sprites for all characters — Phase 8
- Ambient sound design — Phase 8
- Resizable chat panel (drag handle) — Phase 8
- Agent pixel art portraits in panel header — Phase 8

</deferred>

---

*Phase: 03-integration-all-agents*
*Context gathered: 2026-03-13 via discuss-phase*

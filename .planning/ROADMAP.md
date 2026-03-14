# Roadmap: Lemon Command Center

## Overview

Lemon Command Center delivers a multi-agent AI advisory workspace through 8 phases, starting with the core value (streaming chat with one agent) and progressively layering the isometric office, additional agents, War Room broadcast, deal scoping, file handling, memory, and polish. Each phase delivers an independently verifiable capability. The architecture follows a three-world separation: game engine (Canvas 2D), chat interface (React DOM), and services/stores (framework-agnostic TypeScript), connected only through Zustand stores.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Single-Agent Chat** - React/Vite scaffold, streaming chat with Diana (CFO), IndexedDB persistence, context window management, dark theme
- [x] **Phase 2: Canvas Engine** - Top-down pixel art office rendering, BILLY avatar with pathfinding, placeholder agent sprites, camera with integer zoom
- [x] **Phase 3: Integration + All Agents** - Wire Canvas navigation to chat, expand to 5 agent personas, agent status indicators synced to streaming (completed 2026-03-13)
- [x] **Phase 4: War Room** - Broadcast to all agents simultaneously, parallel color-coded streaming, rate-limit-aware concurrency, partial failure handling (completed 2026-03-13)
- [ ] **Phase 5: Deal Rooms** - Named deal entities, per-deal conversation/file/memory scoping, atomic context switching
- [x] **Phase 6: File Handling** - Drag-and-drop PDF/DOCX, Web Worker text extraction, file content injected into agent context (completed 2026-03-13)
- [x] **Phase 7: Agent Memory** - Structured fact extraction from conversations, memory panel, cross-agent knowledge sharing with attribution (completed 2026-03-13)
- [ ] **Phase 8: Polish** - Production pixel art sprites, personality animations, ambient sound, responsive design, bundle optimization

## Phase Details

### Phase 1: Foundation + Single-Agent Chat
**Goal**: User can have a persistent, streaming conversation with Diana (CFO) that survives browser restarts, with context window auto-managed
**Depends on**: Nothing (first phase)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, AGNT-01, AGNT-02, INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06
**Research**: Skip (standard patterns -- React + Vite + Zustand + streaming chat is well-documented)
**Success Criteria** (what must be TRUE):
  1. User types a message and sees tokens stream in real-time from Diana with financial/CFO-flavored responses
  2. User closes the browser, reopens it, and sees the full conversation history intact
  3. User sees token count updating per conversation and auto-summarization triggers when context window approaches 80% capacity
  4. User can cancel a streaming response mid-generation and retry after API errors
  5. App renders in a dark theme with warm amber/gold Lemon Studios branding
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold, types, PersistenceAdapter + IndexedDB, 5 Zustand stores, dark theme
- [x] 01-02-PLAN.md — Anthropic API proxy + streaming service, Diana persona, system prompt layering, token counter, auto-summarizer
- [x] 01-03-PLAN.md — Chat UI components, markdown rendering, useChat hook wiring, persistence loading, human verification

### Phase 2: Canvas Engine
**Goal**: Top-down pixel art office renders at 60fps with BILLY walking between rooms via BFS pathfinding, entirely independent of the chat system
**Depends on**: Phase 1 (shares Zustand store infrastructure and app shell)
**Requirements**: ENGN-01, ENGN-02, ENGN-03, ENGN-04, ENGN-05, ENGN-06, NAV-01, NAV-02, NAV-04
**Research**: COMPLETE -- pixel-agents repo study, sprite sheet format, tile dimensions, office floor plan layout
**Success Criteria** (what must be TRUE):
  1. Top-down office with 7 distinct rooms (5 agent offices, 1 War Room, 1 BILLY corner) renders on Canvas at stable 60fps
  2. User clicks a room and BILLY walks there along a BFS-computed path (not teleporting)
  3. Agent placeholder sprites display idle animations at their desks (typing, reading, coffee)
  4. Canvas supports pixel-perfect integer zoom levels and renders correctly on HiDPI/Retina displays
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Engine core: types, tile map with BFS pathfinding, 7-room office layout, renderer, camera, game loop, officeStore expansion, vitest setup
- [x] 02-02-PLAN.md — Character state machine, BILLY movement with speed ramping, agent idle/work animations, click-to-walk input, knock animation
- [x] 02-03-PLAN.md — React OfficeCanvas component, RoomLabel overlay, ZoomControls, App.tsx wiring, human visual verification

### Phase 3: Integration + All Agents
**Goal**: Walking to an agent's room opens their unique chat panel, all 5 agents have distinct personas, and agent status is visible in the office
**Depends on**: Phase 1 (chat system), Phase 2 (Canvas engine)
**Requirements**: AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08, NAV-03, NAV-05, NAV-06
**Research**: Skip (standard Zustand cross-store wiring)
**Success Criteria** (what must be TRUE):
  1. User clicks an agent room, BILLY walks there, and the chat panel slides open for that specific agent
  2. Each of the 5 agents responds with domain-appropriate expertise (legal from Marcos, financial from Diana, etc.)
  3. Each agent maintains independent conversation history that persists separately
  4. Agent sprites animate in sync with their status: idle at desk, typing animation while API streams, visual indicator for unread messages
  5. Room indicators show which agents have active conversations and unread responses
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — 4 agent personas (Marcos, Sasha, Roberto, Valentina) + agent registry expansion
- [ ] 03-02-PLAN.md — Canvas-chat integration bridge: status sync, chat panel agent switching, keyboard shortcuts, speech bubbles
- [ ] 03-03-PLAN.md — Overview panel at BILLY's office, dynamic Header, gameLoop wiring, human visual verification

### Phase 4: War Room
**Goal**: User can broadcast a question to all 5 agents simultaneously and see parallel streaming responses, each feeding back into individual agent histories
**Depends on**: Phase 3 (all 5 agents working individually)
**Requirements**: WAR-01, WAR-02, WAR-03, WAR-04, WAR-05, WAR-06
**Research**: COMPLETE -- Anthropic API rate limits verified (Scale tier 1000+ RPM), concurrency design established
**Success Criteria** (what must be TRUE):
  1. User enters the War Room and all 5 agent characters visually walk to the central table
  2. User types one message and receives 5 parallel streaming responses, each color-coded and labeled by agent
  3. Each War Room response is appended to that agent's individual conversation history (viewable later in their office)
  4. If 1-2 agents error, the remaining agents still display their responses without interruption
  5. API rate limits are respected via staggered requests with no 429 errors under normal use
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — chatStore multi-stream expansion, Message source field, cross-visibility summary builder, retry backoff utility
- [x] 04-02-PLAN.md — Agent gathering/dispersal animations, War Room entry detection, 'w' key shortcut, WAR_ROOM_SEATS positions
- [x] 04-03-PLAN.md — useWarRoom hook, WarRoomPanel + WarRoomMessage + WarRoomBadge components, ChatPanel routing, human verification

### Phase 5: Deal Rooms
**Goal**: User can create named deals and switch between them, with every agent's context (history, files, memory) atomically scoping to the active deal
**Depends on**: Phase 3 (multi-agent chat), Phase 4 (War Room history feeds)
**Requirements**: DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06
**Research**: Skip (CRUD + IndexedDB queries via existing PersistenceAdapter)
**Success Criteria** (what must be TRUE):
  1. User creates a named deal (e.g., "Oro Verde - Netflix") and it appears in the deal switcher
  2. Each deal maintains completely separate conversation histories per agent
  3. Switching deals atomically changes every agent's context -- user sees different histories, files, and memory per deal
  4. Deal switcher shows deal name, last activity timestamp, and per-agent activity summary
  5. Active deal name is prominently displayed in the interface at all times
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Deal types, dealStore CRUD, chatStore deal-scoping, buildContext Layer 3 injection, migration utility (TDD)
- [ ] 05-02-PLAN.md — Deal sidebar UI, deal cards with agent dots, Header deal badge, App.tsx initialization, hook deal-awareness, fade transition, human verification

### Phase 6: File Handling
**Goal**: User can drag-and-drop PDF and DOCX files onto agent desks, with extracted text injected into the agent's conversation context
**Depends on**: Phase 3 (agent rooms), Phase 5 (deal-scoped file storage)
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, FILE-06
**Research**: COMPLETE -- pdfjs-dist + mammoth extraction, Vite worker configuration, drag-and-drop patterns
**Success Criteria** (what must be TRUE):
  1. User drags a PDF onto an agent's room and the extracted text appears in that agent's context for future responses
  2. User drags a DOCX onto an agent's room and the extracted text appears in that agent's context for future responses
  3. Uploaded files appear as pixel document icons on the agent's desk in the Canvas view
  4. User can click a file icon on a desk to view the file's extracted contents
  5. File metadata (name, size, date, associated agent, associated deal) is stored and queryable
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — FileRecord type, PDF/DOCX extraction services, fileService orchestrator, fileStore CRUD (TDD)
- [ ] 06-02-PLAN.md — buildContext Layer 4 file injection, canvas drag-and-drop handlers, file icon rendering with drop zone highlights
- [ ] 06-03-PLAN.md — FileViewer slide-out panel, ChatPanel drop zone, Header file count indicator, human verification

### Phase 7: Agent Memory
**Goal**: Agents automatically extract and retain structured facts from conversations, building persistent knowledge per deal that informs future responses and can be shared across agents
**Depends on**: Phase 5 (deal-scoped storage), Phase 1 (context window management -- memory must not be summarized)
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06
**Research**: COMPLETE -- memory extraction prompt engineering, structured fact extraction from financial domain conversations
**Success Criteria** (what must be TRUE):
  1. After a conversation, key facts (decisions, dollar amounts, dates, action items) are automatically extracted without user intervention
  2. User can open a memory panel and see structured facts an agent "knows" about the current deal
  3. Structured memory is prepended to the agent's system prompt and visibly influences response quality
  4. Structured memory persists permanently and is never auto-summarized (only narrative history is summarizable)
  5. Agents can reference facts from other agents' memory with clear attribution (e.g., "Per Diana's financial analysis...")
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — MemoryFact types, LLM extraction service, memoryStore CRUD with IndexedDB persistence (TDD)
- [ ] 07-02-PLAN.md — buildContext Layer 5 memory injection, cross-agent attribution, useChat/useWarRoom extraction wiring
- [ ] 07-03-PLAN.md — MemoryPanel slide-over UI, ChatPanel memory button, Header fact count, human verification

### Phase 8: Polish
**Goal**: Production-quality visual and audio experience with polished sprites, personality-driven animations, ambient sound, and responsive layout
**Depends on**: Phase 2 (Canvas engine with placeholder sprites), Phase 3 (agent animations)
**Requirements**: PLSH-01, PLSH-02, PLSH-03, PLSH-04, PLSH-05
**Research**: Skip (art pipeline and responsive design are implementation tasks, not research questions)
**Success Criteria** (what must be TRUE):
  1. All 6 characters (BILLY + 5 agents) have polished pixel art sprites with multiple animation states (idle, walking, working, talking)
  2. Each agent's office has personality-specific decorations (Sasha stands at a whiteboard, Roberto barely moves, Valentina has Post-its everywhere)
  3. Ambient sounds play contextually: office hum, keyboard clicks while agents type, paper shuffle on file drops
  4. Application renders usably on screen sizes from 1280px to ultrawide, with Canvas and chat panel adapting proportionally
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Pixel art sprite sheets (characters + environment), sprite atlas definitions, renderer upgrade from colored rectangles to sprites, personality office decorations
- [ ] 08-02-PLAN.md — Audio system: AudioManager with lazy loading, ambient loop with room-aware volume, SFX triggers (footsteps, knock, paper, chime), Header mute controls
- [ ] 08-03-PLAN.md — Responsive side-by-side layout, collapsible chat panel at narrow widths, auto-fit zoom calculation, ultrawide support

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Single-Agent Chat | 3/3 | Complete | 2026-03-12 |
| 2. Canvas Engine | 3/3 | Complete | 2026-03-13 |
| 3. Integration + All Agents | 3/3 | Complete   | 2026-03-13 |
| 4. War Room | 3/3 | Complete | 2026-03-13 |
| 5. Deal Rooms | 1/2 | In Progress|  |
| 6. File Handling | 3/3 | Complete   | 2026-03-13 |
| 7. Agent Memory | 4/4 | Complete   | 2026-03-13 |
| 8. Polish | 1/3 | In Progress|  |

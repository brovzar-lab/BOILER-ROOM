# Requirements: Lemon Command Center

**Defined:** 2026-03-12
**Core Value:** Multi-perspective, context-aware AI advisory for complex production deals — type one question, get informed responses from five domain specialists who already know the deal history.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Chat & Streaming

- [x] **CHAT-01**: User can send a message and receive a streaming token-by-token response from Claude
- [x] **CHAT-02**: Messages render with markdown formatting (headers, lists, bold, code blocks)
- [x] **CHAT-03**: Conversation history persists across browser sessions (survives refresh/close)
- [x] **CHAT-04**: Token count is tracked per conversation and displayed to user
- [x] **CHAT-05**: When conversation approaches 80% of context window, old messages are auto-summarized while preserving recent messages verbatim
- [x] **CHAT-06**: Full conversation history is stored in IndexedDB even after summarization
- [x] **CHAT-07**: Streaming can be cancelled mid-response by the user
- [x] **CHAT-08**: API errors display user-friendly messages with retry option

### Agent Personas

- [x] **AGNT-01**: Each agent has a unique system prompt with base rules + persona + domain expertise
- [x] **AGNT-02**: Diana (CFO) responds with financial analysis, P&L focus, Mexican film finance context
- [x] **AGNT-03**: Marcos (Counsel) responds with legal analysis, contract focus, Mexican entertainment law context
- [x] **AGNT-04**: Sasha (Deals) responds with deal strategy, negotiation focus, Latin American content market context
- [x] **AGNT-05**: Roberto (Accounting) responds with tax/incentive analysis, compliance focus, EFICINE/Decreto 2026 context
- [x] **AGNT-06**: Valentina (Development) responds with creative/market analysis, slate strategy, platform buyer preferences
- [x] **AGNT-07**: Each agent maintains independent conversation history
- [x] **AGNT-08**: Agent status is visible: idle, thinking (API call in progress), needs-attention (unread response)

### Canvas Engine

- [x] **ENGN-01**: Isometric pixel art office renders on HTML5 Canvas 2D at 60fps
- [x] **ENGN-02**: Office contains 7 distinct rooms: 5 agent offices, 1 War Room, 1 BILLY corner office
- [x] **ENGN-03**: Rooms have furniture and decoration appropriate to each agent's personality
- [x] **ENGN-04**: Canvas supports integer zoom levels with pixel-perfect rendering (no anti-aliasing)
- [x] **ENGN-05**: Canvas renders correctly on HiDPI displays (Retina)
- [x] **ENGN-06**: Game loop runs independently of React render cycle (requestAnimationFrame)

### Characters & Navigation

- [x] **NAV-01**: BILLY (user avatar) is a pixel character that walks between rooms using BFS pathfinding
- [x] **NAV-02**: Clicking a room causes BILLY to walk there (not instant teleport)
- [x] **NAV-03**: When BILLY arrives at an agent's room, the chat panel slides open for that agent
- [x] **NAV-04**: Agent characters have idle animations at their desks (typing, reading, coffee)
- [x] **NAV-05**: Agent characters animate in sync with their status (typing animation when API is streaming)
- [x] **NAV-06**: Visual indicators show which rooms have active conversations and unread messages

### War Room

- [x] **WAR-01**: Entering the War Room causes all agent characters to walk to the central table
- [x] **WAR-02**: User can type a message that is sent to ALL 5 agents simultaneously
- [x] **WAR-03**: Responses stream in parallel, labeled and color-coded by agent
- [x] **WAR-04**: Each War Room response feeds back into that agent's individual conversation history
- [x] **WAR-05**: War Room handles partial failures gracefully (if 1 agent errors, other 4 still display)
- [x] **WAR-06**: API rate limits are respected via staggered requests and concurrency control

### Deal Rooms

- [x] **DEAL-01**: User can create named deals (e.g., "Oro Verde - Netflix", "Lemon Trust I")
- [x] **DEAL-02**: Each deal has its own conversation histories per agent
- [x] **DEAL-03**: Each deal has its own uploaded files and agent memory
- [x] **DEAL-04**: Switching deals atomically switches all agent contexts (history, files, memory)
- [ ] **DEAL-05**: Deal switcher UI shows deal name, last activity, and per-agent activity summary
- [ ] **DEAL-06**: Active deal name is prominently displayed in the interface

### File Handling

- [x] **FILE-01**: User can drag-and-drop PDF files onto an agent's room/desk
- [x] **FILE-02**: User can drag-and-drop DOCX files onto an agent's room/desk
- [ ] **FILE-03**: Extracted text from files is injected into the agent's conversation context
- [ ] **FILE-04**: Uploaded files appear as pixel document icons on the agent's desk
- [ ] **FILE-05**: User can click a file on a desk to view its contents
- [x] **FILE-06**: File metadata is stored: name, size, date, associated agent, associated deal

### Agent Memory

- [ ] **MEM-01**: After each conversation, key facts are automatically extracted (decisions, numbers, dates, action items)
- [ ] **MEM-02**: Extracted memory is structured (not narrative) and stored per agent per deal
- [ ] **MEM-03**: User can view what an agent "knows" about the current deal via a memory panel
- [ ] **MEM-04**: Structured memory is prepended to the agent's system prompt as context
- [ ] **MEM-05**: Structured memory is NEVER auto-summarized (only narrative history is summarizable)
- [ ] **MEM-06**: Agents can reference facts from other agents' memory with attribution

### Persistence & Infrastructure

- [x] **INFR-01**: All data persists via a PersistenceAdapter abstraction (interface, not concrete implementation)
- [x] **INFR-02**: Initial PersistenceAdapter implementation uses IndexedDB (via idb wrapper)
- [x] **INFR-03**: API key is stored in .env and proxied through Vite dev server (never exposed to client bundle)
- [x] **INFR-04**: System prompt is layered: base → persona → deal context → file summaries → memory → conversation history
- [x] **INFR-05**: App uses dark theme with warm amber/gold Lemon Studios brand accents
- [x] **INFR-06**: State is managed via 5 independent Zustand stores (office, chat, deal, file, memory)

### Polish & Visual

- [ ] **PLSH-01**: Polished pixel art sprites for all 6 characters with multiple animation states
- [ ] **PLSH-02**: Rich office environments with personality-specific decorations per agent
- [ ] **PLSH-03**: Agent personality reflected in animations (Sasha stands, Roberto barely moves, Valentina has Post-its)
- [ ] **PLSH-04**: Ambient sound design: office sounds, keyboard clicks, paper shuffle on file drops
- [ ] **PLSH-05**: Responsive design for different screen sizes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cloud Persistence

- **V2-01**: PersistenceAdapter implementation for Supabase or Firebase
- **V2-02**: Cloud sync of conversations, deals, files, and memory
- **V2-03**: Multi-device access to same workspace

### Collaboration

- **V2-04**: Multiple users can share a deal room
- **V2-05**: Real-time presence (see who's in which room)

### Advanced AI

- **V2-06**: Agent-to-agent conversations (agents discuss among themselves)
- **V2-07**: Tool use / function calling (agents can query real data sources)
- **V2-08**: RAG with vector database for document search across all files

## Out of Scope

| Feature | Reason |
|---------|--------|
| VS Code extension | Standalone web app with direct API control |
| Mobile app | Web-first, responsive only |
| Server-side backend | Single-user, client-side with API proxy |
| OAuth/SSO authentication | Single-user tool, API key in .env |
| Custom LLM fine-tuning | Standard API with system prompts |
| Agent-to-agent autonomous conversations | Circular reasoning risk, unclear value |
| RAG / vector database | Overkill for single-user; structured memory sufficient |
| Real-time data feeds | Agents advise on info user provides, not live market data |
| Plugin/extension system | Premature abstraction for personal tool |
| Voice input/output | Text-first interaction model |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 1 | Complete |
| CHAT-02 | Phase 1 | Complete |
| CHAT-03 | Phase 1 | Complete |
| CHAT-04 | Phase 1 | Complete |
| CHAT-05 | Phase 1 | Complete |
| CHAT-06 | Phase 1 | Complete |
| CHAT-07 | Phase 1 | Complete |
| CHAT-08 | Phase 1 | Complete |
| AGNT-01 | Phase 1 | Complete |
| AGNT-02 | Phase 1 | Complete |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 1 | Complete |
| INFR-06 | Phase 1 | Complete |
| ENGN-01 | Phase 2 | Complete |
| ENGN-02 | Phase 2 | Complete |
| ENGN-03 | Phase 2 | Complete |
| ENGN-04 | Phase 2 | Complete |
| ENGN-05 | Phase 2 | Complete |
| ENGN-06 | Phase 2 | Complete |
| NAV-01 | Phase 2 | Complete |
| NAV-02 | Phase 2 | Complete |
| NAV-04 | Phase 2 | Complete |
| AGNT-03 | Phase 3 | Complete |
| AGNT-04 | Phase 3 | Complete |
| AGNT-05 | Phase 3 | Complete |
| AGNT-06 | Phase 3 | Complete |
| AGNT-07 | Phase 3 | Complete |
| AGNT-08 | Phase 3 | Complete |
| NAV-03 | Phase 3 | Complete |
| NAV-05 | Phase 3 | Complete |
| NAV-06 | Phase 3 | Complete |
| WAR-01 | Phase 4 | Complete |
| WAR-02 | Phase 4 | Pending |
| WAR-03 | Phase 4 | Complete |
| WAR-04 | Phase 4 | Complete |
| WAR-05 | Phase 4 | Pending |
| WAR-06 | Phase 4 | Complete |
| DEAL-01 | Phase 5 | Complete |
| DEAL-02 | Phase 5 | Complete |
| DEAL-03 | Phase 5 | Complete |
| DEAL-04 | Phase 5 | Complete |
| DEAL-05 | Phase 5 | Pending |
| DEAL-06 | Phase 5 | Pending |
| FILE-01 | Phase 6 | Complete |
| FILE-02 | Phase 6 | Complete |
| FILE-03 | Phase 6 | Pending |
| FILE-04 | Phase 6 | Pending |
| FILE-05 | Phase 6 | Pending |
| FILE-06 | Phase 6 | Complete |
| MEM-01 | Phase 7 | Pending |
| MEM-02 | Phase 7 | Pending |
| MEM-03 | Phase 7 | Pending |
| MEM-04 | Phase 7 | Pending |
| MEM-05 | Phase 7 | Pending |
| MEM-06 | Phase 7 | Pending |
| PLSH-01 | Phase 8 | Pending |
| PLSH-02 | Phase 8 | Pending |
| PLSH-03 | Phase 8 | Pending |
| PLSH-04 | Phase 8 | Pending |
| PLSH-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 63 total
- Mapped to phases: 63
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*

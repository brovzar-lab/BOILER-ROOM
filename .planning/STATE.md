---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
stopped_at: Completed 08-02-PLAN.md
last_updated: "2026-03-14T01:40:45.872Z"
last_activity: 2026-03-14 -- Phase 8 Plan 03 complete (responsive layout with auto-fit zoom)
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 24
  completed_plans: 24
  percent: 96
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** Multi-perspective, context-aware AI advisory for complex production deals -- type one question, get informed responses from five domain specialists who already know the deal history.
**Current focus:** Phase 7 in progress -- Agent memory extraction and persistence

## Current Position

Phase: 8 of 8 (Polish)
Plan: 3 of 3
Status: in-progress
Last activity: 2026-03-14 -- Phase 8 Plan 03 complete (responsive layout with auto-fit zoom)

Progress: [██████████] 96% (23/24 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 7 min
- Total execution time: 1.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 Foundation | 3/3 | 20 min | 7 min |
| 02 Canvas Engine | 3/3 | 27 min | 9 min |
| 03 Integration | 3/3 | 7 min | 2 min |
| 04 War Room | 3/3 | 25 min | 8 min |
| 05 Deal Rooms | 1/2 | 4 min | 4 min |
| 06 File Handling | 3/3 | 13 min | 4 min |

**Recent Trend:**
- Last 5 plans: 04-01 (5 min), 04-02 (5 min), 04-03 (15 min), 05-01 (4 min)
- Trend: 06-01 fast TDD data layer continues established pattern

*Updated after each plan completion*
| Phase 03 P03 | 2min | 1 task | 3 files |
| Phase 04 P01 | 5min | 2 tasks | 7 files |
| Phase 04 P02 | 5min | 1 task | 3 files |
| Phase 04 P03 | 15min | 3 tasks | 12 files |
| Phase 05 P01 | 4min | 2 tasks | 8 files |
| Phase 06 P01 | 4min | 2 tasks | 8 files |
| Phase 06 P02 | 6min | 2 tasks | 5 files |
| Phase 06 P03 | 3min | 2 tasks | 5 files |
| Phase 07 P01 | 3min | 2 tasks | 5 files |
| Phase 07 P02 | 3min | 2 tasks | 5 files |
| Phase 07 P03 | 5min | 2 tasks | 4 files |
| Phase 07 P04 | 2min | 1 tasks | 2 files |
| Phase 08 P01 | 15min | 3 tasks | 11 files |
| Phase 08 P03 | 8min | 3 tasks | 4 files |
| Phase 08 P02 | 5min | 2 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Standalone web app, not VS Code extension (direct API control, custom UI, persistence)
- Canvas 2D over WebGL (pixel art style, lower complexity, pixel-agents proved it works)
- localStorage + IndexedDB first (fastest to ship, migration abstraction for future cloud)
- Client-side Anthropic API calls via Vite dev server proxy
- Zustand with 5 independent stores (office, chat, deal, file, memory)
- System prompt layering: base > persona > deal > files > memory > history
- Tailwind v4 CSS-first config via @theme directive (no tailwind.config.ts)
- ESM-compatible vite.config.ts using fileURLToPath
- Conversation messages stored in separate IndexedDB store, joined by conversationId index
- PersistenceAdapter singleton via getPersistence() accessor
- SDK client uses dummy apiKey='proxy-handled' -- real key injected by Vite proxy server-side
- Token estimation at 4 chars/token avoids heavy tiktoken dependency
- Summarizer keeps last 10 messages verbatim, stores full history as {id}-full in IndexedDB
- useChat hook encapsulates all chat orchestration -- components only receive props
- react-markdown renders both completed messages and live streaming content
- Anthropic SDK baseURL uses window.location.origin prefix for browser URL constructor compatibility
- 16x16 tiles at 2x zoom displaying as 32x32 -- matches pixel-agents reference
- Hub-and-spoke layout: 42x34 tile grid with hallways connecting all 7 rooms
- Placeholder colored rectangles for Phase 2 instead of sprite sheets
- Camera offsets via integer math (no ctx.translate) for pixel-perfect rendering
- Game loop reads officeStore via getState() non-reactively to avoid React re-renders
- Knock timer stored in module-level Map per character ID -- avoids extra Character interface fields
- Camera follows BILLY only in zoom >= 2 (follow mode) -- overview mode centers on map origin
- Hallway clicks ignored -- BILLY only walks to rooms per user decision
- FurnitureItem with roomId string key for per-room filtering and hallway decorations
- Tailwind manages CSS canvas sizing (w-full h-full) -- never set canvas.style.width/height
- Brightened placeholder colors for dark-theme visibility (floor #6e, wall #45, hallway #58)
- [Phase 03]: Persona prompts use bilingual-natural style with Spanish terms of art and cross-agent references
- [Phase 03]: Agent registry upgraded from Partial<Record> to full Record<AgentId, PersonaConfig> with PersonaConfig exported
- [Phase 03]: ChatPanel split into outer (room-aware router) + inner (AgentChatPanel) for clean useChat initialization per agent via React key prop
- [Phase 03]: Agent status flows through Zustand bridge: chatStore streaming -> officeStore agentStatuses -> engine reads via getState() -> canvas renders overlays
- [Phase 03]: OverviewPanel uses single-column stacked card layout for 400px panel width with inline relative time helper (no library)
- [Phase 03]: Escape key returns BILLY to his office, setActiveRoom('billy') fires on arrival to restore OverviewPanel
- [Phase 03]: Agent prompts tuned for conversational brevity (2-4 sentences default, skip preambles, ask follow-ups)
- [Phase 04]: WarRoomAgentStream additive alongside existing StreamingState (no modifications to single-stream)
- [Phase 04]: Cross-visibility uses simple truncation at 160 chars per agent (zero latency, ~200 token budget)
- [Phase 04]: Retry backoff formula: 2^attempt * baseDelay + jitter(0-500ms)
- [Phase 04]: WAR_ROOM_SEATS adjacent to table edges (row 13 above, row 17 below, col 17 left, col 23 right)
- [Phase 04]: Gathering uses Promise with setInterval(100ms) polling; dispersal is fire-and-forget
- [Phase 04]: War Room entry bypasses knock animation -- separate branch in updateAllCharacters
- [Phase 04]: useWarRoom hook encapsulates all War Room orchestration (sendBroadcast, cancelAll, isGathering)
- [Phase 04]: Promise.allSettled for partial failure tolerance -- if 1 agent errors, other 4 continue
- [Phase 04]: Fine-grained Zustand selectors: WarRoomMessage subscribes only to its own agent stream
- [Phase 04]: crossVisibilityBlock parameter to buildContext is optional (backward-compatible)
- [Phase 04]: billyStandTile at (20,13) head-of-table position above conference table center
- [Phase 05]: dealStore uses crypto.randomUUID() for deal IDs, reserved 'default' for General deal
- [Phase 05]: switchDeal aborts in-flight streaming before context swap (race condition prevention)
- [Phase 05]: loadConversations with null activeDealId returns empty state (no conversations loaded)
- [Phase 05]: migrateConversationsToDeals uses bulkSet for efficient orphan stamping
- [Phase 05]: Layer 3 deal context positioned after crossVisibilityBlock (Layer 2.5)
- [Phase 06]: pdfjs-dist worker configured via Vite ?url import pattern for non-blocking PDF parsing
- [Phase 06]: Store extracted text only (not raw file blobs) in IndexedDB for storage efficiency
- [Phase 06]: shareFileWithAllAgents creates independent copies per agent with new UUIDs
- [Phase 06]: File icons on desk area (1 row above seatTile, 2 tiles wide) matching furniture layout
- [Phase 06]: Desk-area-only drop zone highlight with amber dashed border (not full room)
- [Phase 06]: Per-file cap 2000 tokens, total cap 8000 tokens for context budget
- [Phase 06]: onFileClickCallback pattern for clean React file viewer integration
- [Phase 06]: FileViewer overlays chat panel with absolute inset-0 z-50 within chat column container
- [Phase 06]: Only Close and Delete buttons in FileViewer (no Share/Copy/Re-extract) per locked user decision
- [Phase 06]: Three-column flexbox layout (DealSidebar left, OfficeCanvas center, ChatPanel right)
- [Phase 07]: Prompt-based JSON extraction with code fence fallback over SDK structured outputs
- [Phase 07]: Word overlap >50% threshold for memory fact deduplication
- [Phase 07]: loadFacts replaces state (not appends) to prevent stale data on deal switch
- [Phase 07]: Memory token budget 2000+2000 enforced via estimateTokens per-line accumulation
- [Phase 07]: Cross-agent facts grouped by agent name with getAgent() display name lookup
- [Phase 07]: Extraction uses void prefix for non-blocking fire-and-forget in both hooks
- [Phase 07]: MemoryPanel follows FileViewer overlay pattern for consistency
- [Phase 07]: Test assertion narrowed from generic 'deal' to specific 'Deal Creation Capability' since base prompt refactor added 'this deal' to rules
- [Phase 08]: Programmatic sprite generation via node-canvas script rather than hand-drawn assets
- [Phase 08]: Individual sprite sheets per character (not a single shared sheet) for modularity
- [Phase 08]: Graceful fallback to colored rectangles when sprites not yet loaded
- [Phase 08]: Side-by-side flexbox layout replaces Phase 2 overlay approach for canvas/chat
- [Phase 08]: Chat auto-collapses below 1400px width, auto-expands above
- [Phase 08]: Auto-fit zoom uses integer levels for pixel-perfect rendering
- [Phase 08]: Manual zoom override disables auto-fit recalculation until reset
- [Phase 08]: WAV data saved as .mp3 for path consistency; AudioContext on first click/keydown; Room volume multipliers 0.6/0.8/1.0

### Research Flags

- **Phase 2**: COMPLETE -- pixel-agents repo study, sprite sheet format, tile dimensions, office floor plan layout
- **Phase 4**: Anthropic API rate limits for pricing tier. Affects concurrency design.
- **Phase 7**: Memory extraction prompt engineering. Limited prior art for financial domain.
- Phases 1, 3, 5, 6: Standard patterns, skip research.

### Pending Todos

None yet.

### Blockers/Concerns

- ~~Package versions (React 19, Vite 6, Tailwind v4, Anthropic SDK) need `npm info` verification before Phase 1 scaffolding~~ RESOLVED: All pinned in 01-01
- ~~Anthropic SDK version pins matter -- SDK changes frequently~~ RESOLVED: Pinned @anthropic-ai/sdk@0.78.0

## Session Continuity

Last session: 2026-03-14T00:47:47.113Z
Stopped at: Completed 08-02-PLAN.md
Resume file: None

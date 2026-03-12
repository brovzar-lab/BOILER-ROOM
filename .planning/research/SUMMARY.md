# Project Research Summary

**Project:** Lemon Command Center
**Domain:** Multi-agent AI workspace with isometric pixel art Canvas 2D rendering
**Researched:** 2026-03-12
**Confidence:** MEDIUM

## Executive Summary

Lemon Command Center is a hybrid application spanning three distinct engineering domains: a Canvas 2D game engine (isometric pixel art office, sprite animation, BFS pathfinding), a streaming LLM chat interface (5 specialized agents with parallel responses and context management), and a persistence-backed productivity tool (deal-scoped history, file parsing, structured memory). All four research dimensions converge on one architectural mandate: the game engine and chat interface must be completely isolated from each other, bridged exclusively through Zustand stores. This separation is the foundation everything else depends on.

The recommended stack is React 19 + Vite 6 + TypeScript + Tailwind v4 for the shell, raw Canvas 2D (no game libraries) for the office, Zustand for state (5 independent stores), `idb` for IndexedDB persistence, and the official `@anthropic-ai/sdk` for streaming. Build order should start with chat (the core value), then Canvas engine (independently testable), then integration, then layered features. Chat without Canvas is a usable product; Canvas without chat is a screensaver.

The top risks are: (1) React-Canvas render coupling destroying 60fps performance -- must be correct from Phase 1, retrofitting is a rewrite; (2) streaming token floods during War Room (5 parallel streams producing 100-250 state updates/sec) -- requires token batching and staggered API calls; (3) IndexedDB transaction misuse causing silent data loss -- use `idb` wrapper, never hold transactions across non-IDB awaits; (4) auto-summarization losing critical financial details (dollar amounts, Mexican legal terms, contract dates) -- structured memory must never be summarized, only narrative history.

## Key Findings

### Recommended Stack

Lean stack targeting ~90-110KB gzipped initial bundle. PDF.js (~400KB) lazy-loaded on first file upload.

- **React 19 + Vite 6:** Pure SPA. No router (the office IS the navigation), no SSR, no Next.js.
- **Raw Canvas 2D:** No PixiJS/Phaser. Integer zoom + `imageSmoothingEnabled = false` for pixel-perfect rendering.
- **Zustand (5 stores):** office, chat, deal, file, memory. `subscribe()` lets game loop read state without React re-renders.
- **@anthropic-ai/sdk:** `.stream()` method for SSE. Pin exact minor version -- SDK changes frequently.
- **idb:** 1.2KB IndexedDB wrapper. `PersistenceAdapter` interface designed from day 1 for future Supabase swap.
- **pdfjs-dist + mammoth:** Lazy-loaded. PDF.js must run in Web Worker mode.

### Expected Features

**Must have:** Streaming responses, persistent history, per-agent prompts, context window management with auto-summarization, dark theme, markdown rendering, error handling with retry.

**Differentiators:** Isometric office with BILLY navigation, War Room broadcast (5 parallel streams), deal rooms with context switching, agent memory with structured facts, file drag-and-drop with text extraction.

**Defer:** Cross-agent memory (circular reasoning risk), polished sprites and sound (placeholder sprites suffice), mobile, plugins, RAG/vector DB, agent-to-agent conversations.

### Architecture Approach

Three isolated worlds: (1) Game Engine -- pure TypeScript, requestAnimationFrame loop, no React dependency; (2) Chat Interface -- React DOM + Tailwind; (3) Services/Stores -- framework-agnostic TypeScript. They connect only through Zustand. The game engine and chat system have zero code dependencies on each other and can be built in parallel.

### Critical Pitfalls

1. **Canvas re-render storm** -- Mount canvas once with `React.memo`. Game state in plain TS classes, not `useState`. Must be correct from Phase 1; retrofitting is a rewrite.
2. **Streaming token flood** -- Batch tokens every 50-100ms via `requestAnimationFrame`. War Room: stagger API calls by 100ms, limit concurrency to 3-4, use `Promise.allSettled()`.
3. **IndexedDB silent data loss** -- Use `idb` wrapper, call `navigator.storage.persist()` on startup, define `PersistenceAdapter` before storing any data.
4. **Context window mismanagement** -- Never summarize structured memory (facts, numbers). Priority: system prompt > memory > recent messages > file summaries > old history.
5. **Isometric coordinate errors** -- Centralize transforms in one `CoordinateSystem` class. Integer-only coordinates everywhere. Depth sort by `(gridX + gridY)`.

## Implications for Roadmap

### Phase 1: Foundation + Single-Agent Chat
**Rationale:** Chat is the core value. Validates API integration, streaming, persistence, and context management -- patterns every phase depends on.
**Delivers:** Streaming conversation with Diana (CFO), IndexedDB persistence, context window management, dark theme, PersistenceAdapter abstraction, Vite proxy.
**Avoids:** P1 (no Canvas yet), P3 (correct persistence patterns from day 1), P6 (API key via proxy).

### Phase 2: Canvas Engine (Standalone)
**Rationale:** Zero dependencies on chat code. Built as independent module with placeholder sprites.
**Delivers:** Isometric office rendering, BILLY with BFS pathfinding, character FSMs, camera with integer zoom, HiDPI-safe pixel art.
**Avoids:** P5 (centralized CoordinateSystem), P11 (fixed-timestep loop), P13 (pixelated rendering).

### Phase 3: Integration + All Agents
**Rationale:** Wires the two independent systems through Zustand. Expands from 1 to 5 agents.
**Delivers:** Room click navigates BILLY, arrival opens chat panel, 5 agent personas, typing animation synced to streaming.
**Avoids:** P9 (5 stores max, selectors only).

### Phase 4: War Room
**Rationale:** Killer feature, but requires all 5 agents working individually. Highest streaming complexity.
**Delivers:** Broadcast to all agents, parallel color-coded responses, rate-limit-aware concurrency, partial failure handling.
**Avoids:** P7 (staggered requests, concurrency limiter), P2 (batched streaming critical here).

### Phase 5: Deal Rooms
**Rationale:** Scoping mechanism for all data. Tests PersistenceAdapter under real multi-deal load.
**Delivers:** Named deals, per-deal conversations/files/memory, atomic context switching, DealSwitcher UI.
**Avoids:** P14 (cancellation token pattern for rapid switching).

### Phase 6: File Handling
**Rationale:** Additive feature, lazy-loaded, no impact on existing code paths.
**Delivers:** Drag-and-drop PDF/DOCX, Web Worker text extraction, file content in context builder, visual desk icons.
**Avoids:** P10 (Web Worker for PDF.js), context bloat (summarize on upload).

### Phase 7: Agent Memory
**Rationale:** Most complex feature. Needs stable chat and deal infrastructure before attempting LLM-based extraction.
**Delivers:** Structured fact extraction (facts, decisions, numbers, action items), memory in prompts, cross-agent sharing with attribution.
**Avoids:** P15 (one-way sharing, source attribution), P12 (structured memory never summarized).

### Phase 8: Polish
**Delivers:** Real pixel art sprites, sound, transitions, bundle optimization, edge cases.

### Research Flags

**Needs phase research:**
- **Phase 2:** Sprite sheet format, tile dimensions, office floor plan layout. Study pixel-agents repo in detail.
- **Phase 4:** Anthropic API rate limits for specific pricing tier. Affects concurrency design.
- **Phase 7:** Memory extraction prompt engineering. Sparse prior art for structured fact extraction from financial domain conversations.

**Standard patterns (skip research):**
- **Phase 1:** React + Vite + Zustand + streaming chat is thoroughly documented.
- **Phase 3:** Zustand cross-store wiring is standard.
- **Phase 5:** CRUD + IndexedDB queries via existing PersistenceAdapter.
- **Phase 6:** PDF.js and mammoth have excellent official docs including Worker setup.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core choices sound. Version numbers need `npm info` verification. Anthropic SDK version especially likely outdated. |
| Features | MEDIUM-HIGH | Well-defined by project spec. Memory extraction quality is the main uncertainty. |
| Architecture | MEDIUM-HIGH | Three-world separation is proven (react-three-fiber uses same principle). Context management thresholds need real-world tuning. |
| Pitfalls | HIGH | All 15 pitfalls from well-established domains. Only P15 (circular reasoning) has limited prior art. |

**Overall:** MEDIUM -- Architectural patterns are solid. Primary gaps are package versions (5 minutes of `npm info`) and LLM-specific features (memory extraction, summarization fidelity) that require implementation to validate.

### Gaps to Address

- **Package versions:** Verify with `npm info` before project init. Quick task.
- **Anthropic rate limits:** Tier-specific. Must check before Phase 4 War Room design.
- **Summarization quality:** Financial domain with Mexican legal terms is unvalidated. Needs real-world testing.
- **Memory extraction prompt:** Limited prior art. Needs prototyping in Phase 7.
- **Tailwind v4 stability:** Fallback to v3.4.x documented if issues arise.
- **Sprite assets:** No pixel art exists. Placeholder sprites cover Phases 2-7. Phase 8 needs art pipeline decision.

## Sources

**Primary:** Project spec (`LEMON-COMMAND-CENTER-PROMPT.md`), project config (`.planning/PROJECT.md`), pixel-agents reference repo.
**Secondary:** React 19, Vite 6, Tailwind v4 release patterns (training data early 2025), Zustand/IndexedDB/Canvas docs.
**Tertiary:** Exact SDK versions, Tailwind v4 production stability, bundle size estimates -- all need verification.

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*

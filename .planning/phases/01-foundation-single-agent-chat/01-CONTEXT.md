# Phase 1: Foundation + Single-Agent Chat - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning
**Source:** PRD Express Path (LEMON-COMMAND-CENTER-PROMPT.md)

<domain>
## Phase Boundary

This phase delivers a working single-agent chat application with Diana (CFO) as the first agent. No pixel art, no Canvas — just a streaming chat UI that proves the API integration, persistence, persona system, and context window management work correctly. The React + Vite + Tailwind app scaffold is created here. This is the foundation everything else builds on.

**Delivers:** Streaming conversation with Diana, persistent history (survives browser restart), context window auto-management, dark theme with Lemon Studios branding, PersistenceAdapter abstraction, Vite API proxy.

**Does NOT deliver:** Canvas rendering, multiple agents, War Room, deal rooms, file handling, agent memory. Those are Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- Zustand for state management (chatStore + infrastructure stores from day 1)
- No router — single-view app (the office IS the navigation in later phases)
- No SSR, no Next.js — pure SPA

### Anthropic API Integration
- Use `@anthropic-ai/sdk` official SDK with `.stream()` for SSE streaming
- API key stored in `.env` (ANTHROPIC_API_KEY), proxied through Vite dev server — never exposed to client bundle
- Pin exact SDK minor version (SDK changes frequently)
- Streaming responses display token-by-token as they arrive
- User can cancel streaming mid-response via AbortController
- API errors show user-friendly message with retry button

### System Prompt Architecture
- Layered structure (designed for expansion in later phases):
  1. Base system prompt — shared rules, response format, tone, Mexican business context
  2. Agent persona prompt — Diana's CFO domain expertise, personality, communication style
  3. (Future: deal context, file summaries, memory, conversation history)
- Diana's persona: Sharp, conservative, direct about financials, won't sugarcoat bad numbers
- Domain expertise: P&L analysis, cash flow, waterfall structures, fund economics, IRR/MOIC, EFICINE/Decreto 2026

### Conversation Persistence
- PersistenceAdapter interface defined from day 1 (get/set/query/bulkSet)
- Initial implementation: IndexedDB via `idb` wrapper library (not raw IndexedDB)
- Call `navigator.storage.persist()` on startup to prevent browser from evicting data
- Never hold IndexedDB transactions across non-IDB awaits
- Conversation history loads on app start and persists after every message exchange

### Context Window Management
- Track running token count per conversation (display to user)
- At 80% of context limit, trigger auto-summarization pass
- Send full conversation to Claude with instructions to extract key facts, decisions, open questions into structured summary
- Replace old messages with summary, keep last N messages verbatim
- Store full uncompressed history in IndexedDB for reference
- Only send summarized version + recent messages to API

### Message Rendering
- Markdown rendering in chat messages (headers, lists, bold, italic, code blocks)
- Distinct visual treatment for user messages vs agent responses
- Streaming indicator while tokens arrive
- Error states with retry affordance

### Visual Design
- Dark theme with warm amber/gold Lemon Studios brand accents
- Clean chat interface — no pixel art in this phase
- 5 independent Zustand stores scaffolded (office, chat, deal, file, memory) — only chatStore active in Phase 1

### Claude's Discretion
- Specific Tailwind color tokens for Lemon Studios brand palette
- Chat panel layout (sidebar vs full-width vs centered)
- Message bubble styling details
- Token count display format and position
- Auto-summarization trigger UX (silent vs notification)
- Loading/empty states
- Keyboard shortcuts (Enter to send, etc.)
- Font choices within Tailwind defaults
- Error message copy
- How many "recent messages" to keep verbatim after summarization

</decisions>

<specifics>
## Specific Ideas

- Diana's persona from spec: "Sharp, conservative, always thinking about cash flow. Gives direct financial opinions. Won't sugarcoat bad numbers."
- Diana's domain: "P&L analysis, cash flow projections, waterfall structures, fund economics (LP/GP splits, carried interest, hurdle rates), financial modeling, budget stress-testing, IRR/MOIC analysis"
- Diana's context: "Mexican film finance (EFICINE, Decreto 2026), production budgets in MXN, fund structures, Ley del Mercado de Valores"
- Diana's office vibe (for future phases): "Clean, organized, dual monitors showing dashboards, neat desk"
- `.env.example` should contain: `ANTHROPIC_API_KEY=sk-ant-...`
- The file structure from the spec should be followed where applicable for Phase 1 files

</specifics>

<deferred>
## Deferred Ideas

- BILLY avatar and all Canvas rendering (Phase 2)
- Other 4 agents: Marcos, Sasha, Roberto, Valentina (Phase 3)
- War Room parallel broadcast (Phase 4)
- Deal rooms and context switching (Phase 5)
- File drag-and-drop and parsing (Phase 6)
- Agent memory extraction (Phase 7)
- Polished sprites, sound, animations (Phase 8)
- Cloud persistence (v2)
- Multi-user collaboration (v2)

</deferred>

---

*Phase: 01-foundation-single-agent-chat*
*Context gathered: 2026-03-12 via PRD Express Path*

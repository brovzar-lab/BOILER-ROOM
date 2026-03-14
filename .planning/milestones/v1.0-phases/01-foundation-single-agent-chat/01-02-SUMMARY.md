---
phase: 01-foundation-single-agent-chat
plan: 02
subsystem: api
tags: [anthropic-sdk, streaming, persona, context-management, token-counting, vite-proxy]

# Dependency graph
requires:
  - phase: 01-foundation-single-agent-chat/01
    provides: TypeScript types (AgentPersona, Message, Conversation, StreamingState), persistence adapter, chat store
provides:
  - Anthropic SDK client singleton with proxy-handled auth
  - Streaming chat completion service using SDK .stream() method
  - Diana CFO persona with full financial domain prompt
  - Layered system prompt builder (base > persona > history)
  - Token counting estimation service
  - Auto-summarization at 80% context threshold
  - AnthropicError with retryable status classification
affects: [01-foundation-single-agent-chat/03, 03-multi-agent-personas, 04-war-room, 05-deal-rooms, 07-agent-memory]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk (streaming via .stream())"]
  patterns: [proxy-handled-auth, event-emitter-streaming, layered-system-prompts, singleton-client]

key-files:
  created:
    - src/services/anthropic/client.ts
    - src/services/anthropic/stream.ts
    - src/config/agents/diana.ts
    - src/config/agents/index.ts
    - src/config/prompts/base.ts
    - src/config/prompts/index.ts
    - src/services/context/builder.ts
    - src/services/context/tokenCounter.ts
    - src/services/context/summarizer.ts
  modified:
    - vite.config.ts

key-decisions:
  - "SDK client uses dummy apiKey='proxy-handled' with baseURL='/api/anthropic' - real key injected by Vite proxy"
  - "dangerouslyAllowBrowser: true is safe because real API key never reaches client bundle"
  - "Token estimation at 4 chars/token avoids heavy tiktoken dependency"
  - "Summarizer keeps last 10 messages verbatim and stores full history as {id}-full in IndexedDB"

patterns-established:
  - "Proxy-handled auth: SDK sends to Vite proxy, proxy injects API key server-side"
  - "Layered system prompt: base > persona > (future: deal, files, memory) > history"
  - "Streaming via SDK events: stream.on('text') for tokens, stream.on('finalMessage') for completion"
  - "Agent registry: getAgent(id) accessor, only active agents registered per phase"

requirements-completed: [CHAT-01, CHAT-07, CHAT-08, AGNT-01, AGNT-02, INFR-03, INFR-04]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 1 Plan 2: Anthropic API Integration Summary

**Streaming chat service via @anthropic-ai/sdk with Diana CFO persona, layered prompts, token counting, and auto-summarization**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T19:52:10Z
- **Completed:** 2026-03-12T19:56:16Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Vite proxy configured to inject ANTHROPIC_API_KEY server-side, keeping the key out of the client bundle
- Streaming service uses SDK .stream() with event emitters for incremental token delivery and AbortController cancellation
- Diana's CFO persona covers all required domains: P&L, EFICINE, Decreto 2026, waterfall structures, IRR/MOIC, fund economics
- Context builder assembles layered system prompt with summary-aware conversation history
- Token counter and auto-summarizer manage the 200K context window with 80% threshold trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Vite API proxy and create Anthropic SDK client with streaming service** - `bc97f16` (feat)
2. **Task 2: Build system prompt layering, Diana persona, token counter, and summarizer** - `84ef44b` (feat)

## Files Created/Modified
- `vite.config.ts` - Updated with loadEnv pattern and API key injection via proxy.on('proxyReq')
- `src/services/anthropic/client.ts` - Singleton Anthropic SDK client with proxy-handled baseURL
- `src/services/anthropic/stream.ts` - Streaming service using SDK .stream() with callbacks and abort support
- `src/config/agents/diana.ts` - Diana CFO persona with full domain expertise prompt
- `src/config/agents/index.ts` - Agent registry with getAgent() accessor
- `src/config/prompts/base.ts` - Base system prompt with Lemon Studios rules and Mexican business context
- `src/config/prompts/index.ts` - Prompt re-exports
- `src/services/context/builder.ts` - Layered system prompt assembly (base > persona > history)
- `src/services/context/tokenCounter.ts` - Token estimation, model limits, summarization threshold
- `src/services/context/summarizer.ts` - Auto-summarization with IndexedDB full-history preservation

## Decisions Made
- Used `apiKey: 'proxy-handled'` with `dangerouslyAllowBrowser: true` since the real key is never in the client bundle (injected by Vite proxy server-side)
- Token estimation uses 4 chars/token approximation to avoid bundling tiktoken (heavy dependency)
- Summarizer keeps the last 10 messages verbatim during summarization to preserve recent conversation context
- Full uncompressed history stored as `{id}-full` key in IndexedDB before summarization so data is never lost
- Agent registry uses `Partial<Record<AgentId, PersonaConfig>>` to allow incremental agent registration across phases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. The ANTHROPIC_API_KEY environment variable was already specified in .env.example from Plan 01.

## Next Phase Readiness
- API service layer complete and ready for UI integration in Plan 03
- Chat store actions (startStreaming, stopStreaming, addMessage, updateStreamingContent) can wire directly to streaming callbacks
- Summarizer integrates with setConversationSummary store action
- All types compile cleanly with zero errors

## Self-Check: PASSED

All 10 files verified present. Both task commits (bc97f16, 84ef44b) confirmed in git log. TypeScript typecheck passes with zero errors.

---
*Phase: 01-foundation-single-agent-chat*
*Completed: 2026-03-12*

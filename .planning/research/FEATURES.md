# Feature Landscape

**Domain:** Multi-agent AI chat workspace with isometric pixel art office UI
**Researched:** 2026-03-12

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Streaming token responses | Every modern LLM chat shows tokens as they arrive. Non-streaming feels broken. | Medium | Use @anthropic-ai/sdk `.stream()`. Handle partial markdown rendering during stream. |
| Persistent conversation history | The entire product premise is "no more re-explaining." History MUST survive page refresh. | Medium | IndexedDB via `idb`. Design PersistenceAdapter interface from day 1. |
| Per-agent system prompts | Each agent must have distinct expertise/personality or the multi-agent concept is meaningless. | Low | Static TypeScript config files. 5 agents x ~2KB prompts each. |
| Context window management | Conversations will hit Claude's context limit. Users cannot be expected to manage this. | High | Auto-summarization at 80% capacity. Store full history in IndexedDB, send summary + recent to API. |
| Keyboard input + send | Chat must work with Enter to send, Shift+Enter for newlines. Basic chat UX. | Low | Standard textarea handling. |
| Dark theme | Project spec requires it. Film/entertainment industry expects dark UIs. | Low | Tailwind dark mode + CSS custom properties for lemon-gold accent tokens. |
| Markdown rendering in responses | Claude outputs markdown. Raw text feels amateur. | Low | react-markdown + remark-gfm. |
| Error handling and retry | API calls fail. Rate limits hit. Users expect graceful recovery. | Medium | Retry with exponential backoff, user-visible error messages, regenerate last response. |

## Differentiators

Features that set the product apart. Not expected in a generic chat app, but core to THIS product.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Isometric pixel art office | Spatial metaphor makes multi-agent chat intuitive and delightful. Walking between rooms beats clicking tabs. | Very High | Custom Canvas 2D engine. Game loop, pathfinding, sprite state machines, isometric projection. |
| War Room (broadcast to all agents) | Multi-perspective analysis in one view. The killer feature per the project spec. | High | 5 parallel API streams. UI must handle concurrent streaming responses with agent color coding. |
| BILLY avatar navigation | Spatial navigation (walking between rooms) instead of tab switching. Creates sense of presence. | High | BFS pathfinding, walk animation, room transition triggers. |
| Deal rooms (context switching) | Change the deal, change every agent's context simultaneously. No other LLM chat does this. | Medium | Per-deal conversation histories, files, and memory. Deal switcher UI. |
| Agent memory (structured facts) | Agents "remember" key decisions and numbers across conversations within a deal. | High | Post-conversation extraction via LLM. Structured storage. Memory prepended to system prompts. |
| Cross-agent memory references | Facts from one agent inform another's responses. | Very High | Shared memory store accessible to all agents. Memory injection in context builder. Risk of context pollution. |
| File drag-and-drop with extraction | Drop a PDF on an agent's desk, extracted text injected into their context. Visual: file icon on desk. | Medium | PDF.js + mammoth.js. Lazy-loaded. File metadata persisted per-deal per-agent. |
| Agent status indicators | See at a glance which agents are idle, thinking, or have unread responses. | Medium | State machine per agent. Visual indicators in Canvas (desk lamp color, speech bubble). |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| URL-based routing | This is a single-view spatial app. URL routes break the office metaphor. | Use Zustand state for "current room." No react-router. |
| Server-side backend | Project spec says client-side with direct API calls. A backend adds deployment complexity for a single-user tool. | Vite dev server proxy for API key protection. |
| User authentication | Single-user personal tool. Auth adds friction with zero benefit. | API key in .env, loaded via Vite proxy. |
| Real-time collaboration | Not a multi-user tool. WebSocket infrastructure is waste. | Single-user persistence in IndexedDB. |
| Mobile-native experience | Isometric office requires pointer device and reasonable screen. | Basic responsive so it does not break on tablets, but optimize for desktop. |
| Agent-to-agent conversations | Unpredictable, hard to debug, expensive. User must always be decision-maker. | User always initiates. Cross-agent memory sharing is passive. |
| RAG pipeline / vector database | Over-engineered. Film deals have 10-50 docs per deal, not thousands. Direct text injection is simpler and more predictable. | Inject document text directly into prompt layers. |
| Tool use / function calling | Adds massive complexity for an advisory product. Agents should advise, not execute. | Natural language advice. User takes actions outside the tool. |
| Voice input/output | Precision domain (contracts, financial terms) where voice introduces errors. | Text input only. |
| Plugin / extension system | Product does not exist yet. Premature abstraction. | Build clean architecture with clear boundaries. Extensibility can come later. |

## Feature Dependencies

```
Streaming Chat --> Context Window Management (needs token counting)
Streaming Chat --> Conversation Persistence (needs message storage)
Conversation Persistence --> Deal Rooms (per-deal history)
Isometric Office --> BILLY Navigation (office must render before avatar walks)
BILLY Navigation --> Room-to-Chat Transitions (navigation triggers chat panel)
All Agents Working --> War Room (requires all 5 agents individually first)
Conversation Persistence --> Agent Memory (memory extracted from conversations)
Agent Memory --> Cross-Agent References (requires shared memory store)
File Parsing --> File Context Injection (must parse before injecting)
Deal Rooms --> Everything scoped to deals (files, memory, history)
```

## MVP Recommendation

Prioritize (Phase 1):
1. Single agent (Diana/CFO) with streaming chat
2. Conversation persistence in IndexedDB
3. Context window management with auto-summarization
4. Dark theme with lemon-gold accents

Defer:
- Canvas office rendering: Phase 2. Chat must work first.
- War Room: Phase 4. Requires all agents working individually.
- File handling: Phase 5. Additive feature.
- Agent memory: Phase 7. Complex extraction, defer until chat is proven.
- Polish/sound: Phase 8. Always last.

## Sources

- Project specification: `LEMON-COMMAND-CENTER-PROMPT.md`
- Project requirements: `.planning/PROJECT.md`
- Domain analysis based on project context (film/TV production deal management)

---

*Feature research: 2026-03-12*

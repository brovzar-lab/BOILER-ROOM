# Lemon Command Center

## What This Is

A standalone web application that serves as a persistent, multi-agent AI workspace for managing film/TV production deals, financing, and operations. The interface is a top-down isometric pixel art office floor where specialized AI agents (legal, finance, deals, accounting, creative) sit in dedicated rooms. The user avatar (BILLY) walks between rooms to chat with agents, and enters a central War Room to address all agents simultaneously. All conversations persist across sessions, scoped to specific deals/projects.

## Core Value

Multi-perspective, context-aware AI advisory for complex production deals — type one question, get informed responses from five domain specialists who already know the deal history.

## Requirements

### Validated

<!-- Existing infrastructure from the Python scaffolding layer -->

- ✓ Directive-driven workflow templates — existing (`directives/`)
- ✓ Shared Python execution utilities — existing (`execution/utils.py`)
- ✓ AI agent configuration surface — existing (`CLAUDE.md`, `GEMINI.md`, `agents.md`)
- ✓ Environment-based secrets management — existing (`.env` + `load_env()`)

### Active

<!-- Lemon Command Center — the React/TypeScript web application -->

- [ ] Anthropic API integration with streaming token responses
- [ ] Agent persona system with structured system prompts (base + persona + deal context + files + history)
- [ ] Persistent conversation history per agent per deal (localStorage → IndexedDB migration path)
- [ ] Token counting and context window management with auto-summarization
- [ ] Isometric pixel art office rendering via HTML5 Canvas 2D (game loop, BFS pathfinding, sprite state machines)
- [ ] BILLY user avatar with walk animations between rooms (spatial navigation, not tab switching)
- [ ] 5 AI agent characters with idle/working animations at their desks
- [ ] Full agent roster: Diana (CFO), Marcos (Counsel), Sasha (Deals), Roberto (Accounting), Valentina (Development)
- [ ] Room-to-room navigation with agent status indicators (idle, thinking, needs-attention)
- [ ] War Room: broadcast messages to all agents, parallel streaming responses color-coded by agent
- [ ] File drag-and-drop with PDF/DOCX text extraction injected into agent context
- [ ] Deal rooms: named deal entities with per-deal conversation histories, files, and agent memory
- [ ] Deal switching that changes every agent's context simultaneously
- [ ] Structured agent memory per deal: auto-extracted key facts, decisions, numbers, action items
- [ ] Cross-agent references in memory (facts from one agent inform another's responses)
- [ ] Polished pixel art sprites, rich office environments, ambient sound design
- [ ] Dark theme with warm amber/gold Lemon Studios brand accents

### Out of Scope

- VS Code extension architecture — this is a standalone web app, not a fork of pixel-agents
- Real-time collaboration / multi-user — this is a personal productivity tool
- Mobile app — web-first, responsive design only
- Server-side backend — client-side with direct Anthropic API calls
- OAuth/SSO authentication — single-user, API key in .env
- Custom LLM fine-tuning — uses Claude via standard API with system prompts

## Context

- **User:** Billy Rovzar, CEO of Lemon Studios (Mexico City). Film/TV production company managing simultaneous deals across fund structuring, distribution, talent contracts, co-productions, and tax incentives.
- **Problem:** Context fragmentation across LLM chat windows. Every new conversation loses accumulated deal history, requiring re-explanation before getting useful advice.
- **Inspiration:** [pixel-agents](https://github.com/pablodelucca/pixel-agents) — VS Code extension rendering Claude Code agents as animated pixel characters. Study its Canvas 2D rendering approach (game loop, BFS pathfinding, sprite state machines, integer zoom). Do NOT inherit its VS Code extension architecture.
- **Existing codebase:** Python scaffolding layer (directives, execution scripts, agent config). The React/TS app will be built alongside this, not replacing it.
- **Domain context:** Mexican entertainment law, EFICINE/Decreto 2026 tax incentives, cross-border structures (Mexico-Spain-US), IMCINE regulations, streaming platform deals.

## Constraints

- **Tech stack:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + HTML5 Canvas 2D + Anthropic API
- **Rendering:** Canvas 2D for the office (not WebGL, not DOM-based) — pixel-perfect integer zoom, lightweight game loop
- **Persistence:** Start with localStorage/IndexedDB, design abstraction for future Supabase/Firebase migration
- **API:** Direct Anthropic API calls from client (API key in .env, proxied through Vite dev server or CORS-aware setup)
- **File parsing:** PDF.js for PDFs, mammoth.js for DOCX
- **Single user:** No auth system, no multi-tenancy
- **Context window:** Auto-summarize at 80% capacity, store full history in IndexedDB, send summary + recent messages to API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone web app, not VS Code extension | Need direct API control, custom UI, persistence — VS Code Webview too limited | — Pending |
| Canvas 2D over WebGL | Pixel art style matches 2D perfectly, lower complexity, pixel-agents proved it works | — Pending |
| localStorage + IndexedDB first | Fastest to ship, migration abstraction keeps door open for cloud persistence | — Pending |
| Client-side Anthropic API calls | Single-user tool, no need for server middleware initially | — Pending |
| Zustand over Redux/Context | Lightweight, minimal boilerplate, good for multiple independent stores (chat, office, deals, files, memory) | — Pending |
| System prompt layering (base → persona → deal → files → history) | Clean separation lets each layer update independently as context changes | — Pending |

---
*Last updated: 2026-03-12 after initialization*

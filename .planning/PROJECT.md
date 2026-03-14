# Lemon Command Center

## What This Is

A standalone web application serving as a persistent, multi-agent AI workspace for managing film/TV production deals. Features a top-down pixel art office where 5 specialized AI agents sit in dedicated rooms. The user avatar (BILLY) walks between rooms to chat with agents, enters a War Room to address all agents simultaneously, and manages deals with per-deal scoping of conversations, files, and memory.

## Core Value

Multi-perspective, context-aware AI advisory for complex production deals — type one question, get informed responses from five domain specialists who already know the deal history.

## Requirements

### Validated

- ✓ Anthropic API integration with streaming token responses — v1.0
- ✓ Agent persona system with structured system prompts (5-layer: base + persona + deal + files + memory) — v1.0
- ✓ Persistent conversation history per agent per deal (IndexedDB) — v1.0
- ✓ Token counting and context window management with auto-summarization — v1.0
- ✓ Top-down pixel art office rendering via HTML5 Canvas 2D — v1.0
- ✓ BILLY user avatar with walk animations and BFS pathfinding — v1.0
- ✓ 5 AI agent characters with idle/walking/working/talking animations — v1.0
- ✓ Full agent roster: Diana (CFO), Marcos (Counsel), Sasha (Deals), Roberto (Accounting), Valentina (Development) — v1.0
- ✓ Room-to-room navigation with agent status indicators — v1.0
- ✓ War Room: broadcast to all agents, parallel streaming, color-coded responses — v1.0
- ✓ File drag-and-drop with PDF/DOCX/Excel text extraction into agent context — v1.0
- ✓ Deal rooms: named deal entities with per-deal scoping — v1.0
- ✓ Deal switching that changes every agent's context simultaneously — v1.0
- ✓ Structured agent memory: auto-extracted facts, decisions, numbers — v1.0
- ✓ Cross-agent memory references with attribution — v1.0
- ✓ Pixel art sprites with personality office decorations — v1.0
- ✓ Ambient sound design with contextual SFX — v1.0
- ✓ Responsive layout (1280px to ultrawide) — v1.0
- ✓ Dark theme with warm amber/gold Lemon Studios branding — v1.0

## Current Milestone: v1.1 Visual Overhaul

**Goal:** Transform the flat top-down office into a rich JRPG 3/4 perspective with Stardew Valley-quality 16-bit pixel art, compact room layout, smooth trackpad zoom, and refined UI matching the War Room mockup.

**Target features:**
- JRPG 3/4 perspective art (Pokémon FireRed / Zelda style) — floors flat, north walls visible, furniture/characters face south
- 24x32 character sprites with expressive faces, outfit detail, drop shadows
- Rich environment tiles: wood grain floors, glowing monitors, desk lamps with ambient halos, detailed bookshelves/plants
- Compact grid room layout (2 top, War Room center, 4 bottom) — no sprawling hallways
- Smooth trackpad pinch-to-zoom replacing integer snap levels
- Chat/UI refinements matching mockup style (deals sidebar left, chat right, clean dark panel)
- Deal switcher UI improvements (DEAL-05, DEAL-06 carried from v1.0)

### Active

- [ ] JRPG 3/4 perspective replacing flat top-down rendering
- [ ] 24x32 character sprites with Stardew Valley quality
- [ ] Rich 16-bit environment tiles (glow effects, wood grain, area rugs, detailed furniture)
- [ ] Compact grid room layout matching mockup
- [ ] Smooth trackpad pinch-to-zoom (free zoom, not integer snap)
- [ ] Chat UI refinements matching mockup style
- [ ] Deal switcher UI with per-agent activity summary (DEAL-05, carried from v1.0)
- [ ] More prominent active deal name display (DEAL-06, carried from v1.0)

### Out of Scope

- Real-time collaboration / multi-user — personal productivity tool
- Mobile app — web-first, responsive desktop only
- Server-side backend — client-side with direct Anthropic API calls
- OAuth/SSO authentication — single-user, API key in .env
- Custom LLM fine-tuning — uses Claude via standard API with system prompts

## Context

Shipped v1.0 MVP with 13,450 LOC TypeScript/TSX across 190 files in 2 days.
Tech stack: React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand, HTML5 Canvas 2D, Anthropic API.
Architecture: three-world separation — game engine (Canvas 2D), chat interface (React DOM), services/stores (framework-agnostic TypeScript), connected through Zustand stores.

**User:** Billy Rovzar, CEO of Lemon Studios (Mexico City). Film/TV production company managing simultaneous deals.
**Domain:** Mexican entertainment law, EFICINE/Decreto 2026 tax incentives, cross-border structures, streaming platform deals.

**Known issues:**
- War Room agent gathering may not always trigger (pre-existing pathfinding edge case)
- Programmatically generated sprites are functional but could benefit from professional pixel art
- DEAL-05/DEAL-06 deal switcher UI gaps carried to next milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone web app, not VS Code extension | Need direct API control, custom UI, persistence | ✓ Good |
| Canvas 2D over WebGL | Pixel art style matches 2D perfectly, lower complexity | ✓ Good |
| IndexedDB via `idb` wrapper | Fast persistence, navigator.storage.persist() prevents eviction | ✓ Good |
| Client-side Anthropic API calls | Single-user tool, no server middleware needed | ✓ Good |
| Zustand over Redux/Context | Lightweight, multiple independent stores (chat, office, deals, files, memory) | ✓ Good |
| 5-layer system prompt (base → persona → deal → files → memory) | Clean separation, each layer updates independently | ✓ Good |
| Top-down perspective (not isometric) | Better readability, easier sprite sourcing, pixel-agents reference | ✓ Good |
| Side-by-side layout (changed from overlay in Phase 8) | Better UX at production scale, canvas always visible | ✓ Good |
| Programmatic sprite generation | Claude can't download assets; individual PNGs enable easy swapping | ⚠️ Revisit — swap for professional art |
| NO keyboard typing sounds | User decision — kept audio subtle, not distracting | ✓ Good |

## Constraints

- **Tech stack:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + HTML5 Canvas 2D + Anthropic API
- **Rendering:** Canvas 2D — pixel-perfect integer zoom, lightweight game loop
- **Persistence:** IndexedDB via `idb` wrapper with PersistenceAdapter abstraction
- **API:** Direct Anthropic API calls, proxied through Vite dev server
- **File parsing:** pdfjs-dist for PDFs, mammoth.js for DOCX, xlsx for Excel
- **Single user:** No auth system, no multi-tenancy
- **Context window:** Auto-summarize at 80% capacity, memory never summarized

---
*Last updated: 2026-03-14 after v1.1 milestone start*

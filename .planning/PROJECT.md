# Lemon Command Center

## What This Is

A standalone web application serving as a persistent, multi-agent AI workspace for managing film/TV production deals. Features a JRPG-style 3/4 perspective pixel art office where 5 specialized AI agents sit in dedicated rooms. The user avatar (BILLY) walks between rooms to chat with agents, enters a War Room to address all agents simultaneously, and manages deals with per-deal scoping of conversations, files, and memory. The office features ambient glow effects, day/night theming, and smooth pinch-to-zoom navigation.

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
- ✓ Full agent roster: Patrik (CFO), Marcos (Lawyer), Sandra (Producer), Isaac (Dev), Wendy (Coach) — v1.1
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
- ✓ JRPG 3/4 perspective with compact grid layout — v1.1
- ✓ 24x32 character sprites with expressive faces, outfit detail, drop shadows — v1.1
- ✓ setTransform-based renderer with Y-sorted depth occlusion — v1.1
- ✓ Smooth trackpad pinch-to-zoom with cursor-centered scaling — v1.1
- ✓ Drag-to-pan canvas navigation — v1.1
- ✓ Ambient glow effects (monitor blue halos, desk lamp amber circles) — v1.1
- ✓ Day/night theming based on system clock — v1.1
- ✓ Area rugs and personality decorations per office — v1.1
- ✓ Chat panel with inline Attach/Memory buttons and accent color bar — v1.1
- ✓ Always-visible deals sidebar with per-agent activity summary — v1.1
- ✓ All-room labels on canvas at zoom >= 1.5x — v1.1

### Out of Scope

- Real-time collaboration / multi-user — personal productivity tool
- Mobile app — web-first, responsive desktop only
- Server-side backend — client-side with direct Anthropic API calls
- OAuth/SSO authentication — single-user, API key in .env
- Custom LLM fine-tuning — uses Claude via standard API with system prompts

## Context

Shipped v1.0 MVP (13,450 LOC) in 2 days, then v1.1 Visual Overhaul (15,474 LOC) in 1 day.
Tech stack: React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand, HTML5 Canvas 2D, Anthropic API.
Architecture: three-world separation — game engine (Canvas 2D with 6-layer pipeline), chat interface (React DOM), services/stores (framework-agnostic TypeScript), connected through Zustand stores.

**User:** Billy Rovzar, CEO of Lemon Studios (Mexico City). Film/TV production company managing simultaneous deals.
**Domain:** Mexican entertainment law, EFICINE/Decreto 2026 tax incentives, cross-border structures, streaming platform deals.

**Known issues:**
- War Room agent gathering may not always trigger (pre-existing pathfinding edge case)
- Programmatically generated sprites are functional but could benefit from professional pixel art
- renderHeight dead field on FurnitureItem (unused by depthSort)
- Sprite cache exists but renderer bypasses it (intentional — draws via setTransform)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone web app, not VS Code extension | Need direct API control, custom UI, persistence | ✓ Good |
| Canvas 2D over WebGL | Pixel art style matches 2D perfectly, lower complexity | ✓ Good |
| IndexedDB via `idb` wrapper | Fast persistence, navigator.storage.persist() prevents eviction | ✓ Good |
| Client-side Anthropic API calls | Single-user tool, no server middleware needed | ✓ Good |
| Zustand over Redux/Context | Lightweight, multiple independent stores (chat, office, deals, files, memory) | ✓ Good |
| 5-layer system prompt (base → persona → deal → files → memory) | Clean separation, each layer updates independently | ✓ Good |
| JRPG 3/4 perspective (not isometric) | Better readability, classic game feel, Stardew Valley inspiration | ✓ Good |
| Side-by-side layout (changed from overlay in Phase 8) | Better UX at production scale, canvas always visible | ✓ Good |
| Programmatic sprite generation | Claude can't download assets; individual PNGs enable easy swapping | ⚠️ Revisit — swap for professional art |
| NO keyboard typing sounds | User decision — kept audio subtle, not distracting | ✓ Good |
| setTransform-based zoom (Phase 10) | Eliminates manual coordinate math, fractional zoom support | ✓ Good |
| Exponential zoom factor (Phase 12) | Natural feel — each scroll tick multiplies by 1.002x | ✓ Good |
| Pause follow during zoom/pan (Phase 12) | Prevents camera fighting user input | ✓ Good |
| Day/night from system clock (Phase 13) | Immersive — office reflects real time, no settings needed | ✓ Good |
| Agent rename: Patrik/Sandra/Isaac/Wendy/Marcos (Phase 11) | Culturally grounded team matching Billy Rovzar's domain | ✓ Good |

## Constraints

- **Tech stack:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + HTML5 Canvas 2D + Anthropic API
- **Rendering:** Canvas 2D — 6-layer pipeline with setTransform zoom, Y-sorted depth
- **Persistence:** IndexedDB via `idb` wrapper with PersistenceAdapter abstraction
- **API:** Direct Anthropic API calls, proxied through Vite dev server
- **File parsing:** pdfjs-dist for PDFs, mammoth.js for DOCX, xlsx for Excel
- **Single user:** No auth system, no multi-tenancy
- **Context window:** Auto-summarize at 80% capacity, memory never summarized

---
*Last updated: 2026-03-14 after v1.1 Visual Overhaul shipped*

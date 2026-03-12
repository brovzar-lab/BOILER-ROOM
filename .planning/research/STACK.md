# Technology Stack

**Project:** Lemon Command Center
**Researched:** 2026-03-12
**Overall confidence:** MEDIUM (web verification tools unavailable; versions based on training data through early 2025 plus known release trajectories -- verify exact latest versions with `npm info <package> version` before installing)

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^19.0.0 | UI framework | Specified in project constraints. React 19 shipped stable Dec 2024. Use it for concurrent rendering, `use()` hook, and Actions API. Do NOT use React Server Components -- this is a client-side SPA with no server. | HIGH |
| TypeScript | ^5.7.0 | Type safety | Latest 5.x line. Satisfies decorators, `satisfies` operator, const type parameters. Pin to 5.x -- TypeScript rarely has breaking patch releases but major versions can break. | MEDIUM |
| Vite | ^6.0.0 | Build toolchain | Vite 6 released Dec 2024 with Environment API. Fast HMR, native ESM dev server. Use `@vitejs/plugin-react` (SWC-based) not `plugin-react-swc` separately -- they merged. | MEDIUM |
| Tailwind CSS | ^4.0.0 | Styling | Tailwind v4 released Jan 2025 with Oxide engine, zero-config content detection, CSS-first configuration (no more `tailwind.config.js`). If v4 proves too bleeding-edge, fall back to v3.4.x which is battle-tested. | MEDIUM |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | ^5.0.0 (or ^4.5.x if v5 not yet released) | Global state | Specified in constraints. Lightweight, no boilerplate, excellent for multiple independent stores (chat, office, deals, files, memory). Check `npm info zustand version` -- v5 may have shipped by now; v4.5.x is stable fallback. | MEDIUM |

**Zustand store architecture (5 stores):**

```typescript
// src/store/chatStore.ts    -- conversations per agent per deal, streaming state
// src/store/officeStore.ts  -- room focus, character positions, BILLY location
// src/store/dealStore.ts    -- deal entities, active deal ID
// src/store/fileStore.ts    -- uploaded files metadata, per-deal/per-agent
// src/store/memoryStore.ts  -- extracted facts per agent per deal
```

Use Zustand's `persist` middleware for localStorage/IndexedDB integration. Use `subscribeWithSelector` for fine-grained reactivity in the game loop (subscribe to office state changes without re-rendering React).

### LLM Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | ^0.39.0+ | Anthropic API client | Official TypeScript SDK. Supports streaming via `client.messages.stream()` which returns an async iterable of `MessageStreamEvent`. Handles retry logic, rate limiting, and proper SSE parsing. Do NOT hand-roll fetch-based streaming. | MEDIUM |

**Critical implementation notes:**

1. **Streaming:** Use `client.messages.stream()` not `client.messages.create({ stream: true })`. The `.stream()` method returns a higher-level `Stream` object with `.on('text')`, `.on('message')` event handlers and proper cleanup.

2. **Client-side API key:** The project spec says direct client-side API calls. For dev, proxy through Vite's dev server to avoid CORS and key exposure:
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       proxy: {
         '/api/anthropic': {
           target: 'https://api.anthropic.com',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
           headers: {
             'x-api-key': process.env.ANTHROPIC_API_KEY,
             'anthropic-version': '2023-06-01',
           },
         },
       },
     },
   });
   ```
   This keeps the API key server-side during development. For "production" (local use), same approach with a minimal Express/Hono proxy, or accept client-side key for single-user tool.

3. **Token counting:** The Anthropic SDK includes `client.messages.countTokens()` (beta endpoint) for exact server-side counting. For local estimation before API calls, use `@anthropic-ai/tokenizer` if available, or fall back to a heuristic of ~4 characters per token (rough but sufficient for 80% threshold triggers).

4. **Rate limiting with War Room:** 5 parallel API calls. Anthropic's rate limits vary by plan. Use `Promise.allSettled()` not `Promise.all()` so one failure does not kill all streams. Add a small stagger (100ms between initiations) to be polite to the API.

### Canvas 2D Rendering Engine

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| HTML5 Canvas 2D API | (browser native) | Isometric office rendering | Specified in constraints. No library needed -- raw Canvas 2D is the right call for pixel art with integer zoom. Libraries like PixiJS or Phaser add unnecessary weight and fight your pixel-perfect rendering. | HIGH |
| requestAnimationFrame | (browser native) | Game loop | Standard 60fps game loop. No library needed. | HIGH |

**Do NOT use:**
- **PixiJS** -- WebGL renderer, overkill for 2D pixel art, fights integer-zoom pixel-perfect rendering, large bundle (~500KB)
- **Phaser** -- Full game engine (~1MB), way too heavy for an office visualization with pathfinding
- **Three.js** -- 3D engine, wrong tool entirely
- **react-canvas** or **react-konva** -- React wrappers around Canvas add reconciliation overhead that conflicts with a 60fps game loop. Keep Canvas rendering outside React's render cycle.

**Architecture pattern (from pixel-agents reference):**

```typescript
// The Canvas element is mounted by React (OfficeCanvas.tsx)
// But the game loop runs OUTSIDE React's render cycle
// Communication: Zustand store <-> Game Engine (subscribe pattern)

class GameLoop {
  private lastTime = 0;
  private running = false;

  start() {
    this.running = true;
    requestAnimationFrame(this.tick.bind(this));
  }

  private tick(time: number) {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.update(dt);  // physics, pathfinding, state machines
    this.render();     // draw to canvas
    requestAnimationFrame(this.tick.bind(this));
  }
}
```

**BFS Pathfinding:** Implement from scratch -- it is ~30 lines of code for grid-based BFS. No library needed. The office grid is small (maybe 40x30 tiles). A* is unnecessary at this scale.

**Isometric math:**
```typescript
// Cartesian to isometric projection
function toIso(x: number, y: number): { screenX: number; screenY: number } {
  return {
    screenX: (x - y) * (TILE_WIDTH / 2),
    screenY: (x + y) * (TILE_HEIGHT / 2),
  };
}
```

**Integer zoom:** Pixel art MUST use integer zoom levels (1x, 2x, 3x, 4x) to avoid sub-pixel blurring. Set `canvas.style.imageRendering = 'pixelated'` and `ctx.imageSmoothingEnabled = false`.

### Client-Side Persistence

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| idb | ^8.0.0 | IndexedDB wrapper | Thin promise-based wrapper around IndexedDB. ~1.2KB gzipped. Use for conversation history, files, agent memory. Do NOT use raw IndexedDB -- the callback API is painful and error-prone. Do NOT use Dexie.js (~16KB) -- heavier than needed for simple key-value + indexed stores. | MEDIUM |
| localStorage | (browser native) | Quick settings | User preferences, active deal ID, API key storage (single-user tool). Not for conversation data (5MB limit). | HIGH |

**Migration-ready abstraction:**

```typescript
// src/services/persistence.ts
interface PersistenceAdapter {
  getConversation(agentId: string, dealId: string): Promise<Conversation>;
  saveMessage(agentId: string, dealId: string, msg: Message): Promise<void>;
  getMemory(agentId: string, dealId: string): Promise<MemoryEntry[]>;
  saveMemory(agentId: string, dealId: string, entry: MemoryEntry): Promise<void>;
  // ... etc
}

// Start with: IndexedDBAdapter implements PersistenceAdapter
// Later swap to: SupabaseAdapter implements PersistenceAdapter
```

### File Parsing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pdfjs-dist | ^4.0.0+ | PDF text extraction | Specified in constraints. Official Mozilla PDF.js distribution. Use the worker for off-main-thread parsing. Bundle the worker separately via Vite. | MEDIUM |
| mammoth | ^1.8.0 | DOCX to text/HTML | Specified in constraints. Lightweight, focused on text extraction. Do NOT use docx.js (that is for CREATING docx files, not reading them). | MEDIUM |

**PDF.js Vite integration notes:**
```typescript
// PDF.js worker must be configured for Vite bundling
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();
```

### UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.0.0 | Utility CSS | For all HTML UI (chat panels, deal switcher, overlays). NOT for Canvas content. | MEDIUM |
| clsx | ^2.1.0 | Conditional class names | Tiny (239B), no dependencies, cleaner than template literals for conditional Tailwind classes. | HIGH |

**Do NOT use:**
- **styled-components / emotion** -- Runtime CSS-in-JS is dead weight alongside Tailwind. Pick one paradigm.
- **Radix UI / shadcn/ui** -- Tempting but this app has very few standard UI patterns (mostly chat bubbles and overlays). The Canvas is the primary UI. Roll the few components you need rather than pulling in a component library with accessibility patterns you do not need for a single-user tool.
- **Framer Motion** -- Do NOT use for Canvas animations. Framer Motion is for DOM elements. Canvas animations are handled by the game loop. Acceptable ONLY for React UI panels (chat slide-in/out) but CSS transitions suffice.

### Development Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.0.0 | Linting | ESLint 9 uses flat config. Use `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks`. | MEDIUM |
| Prettier | ^3.4.0 | Formatting | Auto-format on save. Tailwind plugin (`prettier-plugin-tailwindcss`) for class sorting. | HIGH |
| Vitest | ^2.0.0+ | Unit testing | Vite-native testing. Same config as the app. Use for testing services (persistence, context builder, summarizer, memory extractor) and stores. Do NOT unit test Canvas rendering -- use visual inspection. | MEDIUM |

### Markdown Rendering (for chat messages)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-markdown | ^9.0.0 | Render agent responses | Claude responses contain markdown (headers, lists, bold, code blocks). Use react-markdown with remark-gfm for tables. Lightweight, React-native. | MEDIUM |
| remark-gfm | ^4.0.0 | GitHub-flavored markdown | Tables, strikethrough, task lists in Claude responses. | MEDIUM |
| rehype-highlight | ^7.0.0 | Code syntax highlighting | If agents include code snippets in responses (financial formulas, contract clauses). Lightweight alternative to full Prism/Shiki. | LOW |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| State Management | Zustand | Redux Toolkit | Too much boilerplate for 5 simple stores. Zustand's subscribe-outside-React pattern is critical for the game loop. |
| State Management | Zustand | Jotai | Atom-based model is wrong shape for this app. We have 5 domain stores, not many small atoms. |
| Canvas Library | Raw Canvas 2D | PixiJS | WebGL-based, large bundle, fights pixel-perfect integer zoom, overkill for 2D tile rendering. |
| Canvas Library | Raw Canvas 2D | Phaser | Full game engine (~1MB), adds scene management and physics we do not need. |
| IndexedDB | idb | Dexie.js | Dexie is ~16KB vs idb's ~1.2KB. Dexie's query DSL is nice but unnecessary -- we query by composite key (agentId + dealId). |
| IndexedDB | idb | localForage | localForage is a shim for older browsers. IndexedDB support is universal in 2026. |
| Build Tool | Vite | Next.js | We do NOT need SSR, routing, or API routes. This is a pure SPA. Next.js adds server complexity that contradicts the project's "no backend" constraint. |
| Build Tool | Vite | Turbopack / Rspack | Not mature enough ecosystem. Vite has the best plugin ecosystem for this stack. |
| Styling | Tailwind CSS | CSS Modules | Tailwind is faster to build with, better for rapid prototyping, and the project spec requires it. |
| Chat Rendering | react-markdown | @mdx-js/react | MDX is for authoring, not rendering API responses. react-markdown is the right tool. |
| API Client | @anthropic-ai/sdk | Raw fetch + SSE | The SDK handles streaming edge cases (reconnection, event parsing, type safety) that you will get wrong with raw fetch. |
| Token Counting | SDK countTokens / heuristic | tiktoken | tiktoken is for OpenAI models. Anthropic uses a different tokenizer. Use their SDK's built-in counting. |

## Version Verification Commands

**Run these before `npm init` to get exact current versions:**

```bash
# Core framework
npm info react version
npm info react-dom version
npm info typescript version
npm info vite version
npm info tailwindcss version

# State & persistence
npm info zustand version
npm info idb version

# Anthropic
npm info @anthropic-ai/sdk version

# File parsing
npm info pdfjs-dist version
npm info mammoth version

# Chat rendering
npm info react-markdown version
npm info remark-gfm version

# Dev tooling
npm info vitest version
npm info eslint version
npm info prettier version
```

**IMPORTANT:** My version recommendations are based on training data through early 2025. Several of these packages may have released newer major versions. The `npm info` commands above are the source of truth.

## Installation

```bash
# Initialize project
npm create vite@latest lemon-command-center -- --template react-ts
cd lemon-command-center

# Core dependencies
npm install react@^19.0.0 react-dom@^19.0.0
npm install zustand
npm install @anthropic-ai/sdk
npm install idb
npm install pdfjs-dist
npm install mammoth
npm install react-markdown remark-gfm
npm install clsx

# Tailwind CSS v4 (new install method -- CSS-first, no config file)
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
npm install -D prettier prettier-plugin-tailwindcss
```

**Tailwind v4 setup** (no tailwind.config.ts needed):
```css
/* src/index.css */
@import "tailwindcss";

/* Custom theme tokens */
@theme {
  --color-lemon-gold: #d4a017;
  --color-lemon-amber: #b8860b;
  --color-office-dark: #1a1a2e;
  --color-office-panel: #16213e;
}
```

**Vite config:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/messages': {
        target: 'https://api.anthropic.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  define: {
    // Expose env vars prefixed with VITE_ to client
    // API key stays server-side via proxy
  },
});
```

## Bundle Size Budget

| Category | Target | Notes |
|----------|--------|-------|
| React + ReactDOM | ~45KB gzipped | Core framework |
| Zustand | ~2KB gzipped | Minimal state library |
| @anthropic-ai/sdk | ~15-25KB gzipped | Verify -- may be larger with streaming deps |
| idb | ~1.2KB gzipped | Tiny IndexedDB wrapper |
| pdfjs-dist | ~300-400KB gzipped | Large -- lazy-load on first file upload, use dynamic import |
| mammoth | ~30KB gzipped | Lazy-load alongside pdfjs-dist |
| react-markdown + remark-gfm | ~15KB gzipped | Acceptable for chat rendering |
| Tailwind CSS | ~10-15KB gzipped | Only used utilities extracted at build time |
| **Total initial bundle** | **~90-110KB gzipped** | Without PDF.js (lazy-loaded) |
| **Total with lazy-loaded** | **~450KB gzipped** | After first file upload triggers PDF.js load |

**Lazy-loading strategy:**
```typescript
// src/services/fileParser.ts
export async function parsePDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // ... parse
}

export async function parseDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  // ... parse
}
```

## Architecture-Relevant Stack Decisions

### React-Canvas Bridge Pattern

React owns the DOM (chat panels, overlays, deal switcher). Canvas owns the office rendering. They communicate through Zustand:

```
React Component ──writes──> Zustand Store <──reads── Game Engine
                                │
React Component <──reads─── Zustand Store ──writes──> Game Engine
```

- React components use `useStore()` hooks (trigger re-renders)
- Game engine uses `store.subscribe()` (no React re-renders, just reads state)
- Game engine writes to store via `store.getState().setCharacterPosition(...)` (triggers React updates only for subscribed components)

### No Router Needed

This is a single-view application. The "navigation" is BILLY walking between rooms, not URL-based routing. Do NOT install react-router. The office floor IS the navigation.

### No CSS Animation Library for Canvas

All character animations (walk cycles, idle loops, status changes) are sprite-based and handled by the game loop's `CharacterStateMachine`. CSS/JS animation libraries (Framer Motion, react-spring, GSAP) are irrelevant for Canvas content.

For React UI panels (chat slide-in, deal switcher transitions): use CSS transitions (`transition-transform`, `transition-opacity`). If you find yourself wanting more, `framer-motion` is the escape hatch, but you should not need it for the few panel animations in this app.

### Anthropic SDK Version Sensitivity

The `@anthropic-ai/sdk` package updates frequently as Anthropic adds features (tool use, extended thinking, prompt caching). Pin to a specific minor version in package.json (e.g., `"0.39.2"` not `"^0.39.0"`) and update deliberately. Breaking changes in the streaming API can silently break the chat.

## Sources

- Project specification: `LEMON-COMMAND-CENTER-PROMPT.md` (primary source for stack decisions)
- Project constraints: `.planning/PROJECT.md` (validated constraints section)
- pixel-agents reference: `https://github.com/pablodelucca/pixel-agents` (Canvas 2D rendering patterns)
- React 19 release: Training data (Dec 2024 stable release) -- MEDIUM confidence on exact version
- Vite 6 release: Training data (Dec 2024 release) -- MEDIUM confidence on exact version
- Tailwind v4 release: Training data (Jan 2025 release) -- MEDIUM confidence on exact version
- Zustand API: Training data (v4.5.x stable, v5 possible) -- MEDIUM confidence
- @anthropic-ai/sdk: Training data (rapid iteration, version may be higher) -- LOW confidence on version number
- idb: Training data (v8.x line) -- MEDIUM confidence
- pdfjs-dist: Training data (v4.x line) -- MEDIUM confidence

**NOTE:** All version numbers should be verified with `npm info <package> version` before installation. The WebSearch and WebFetch tools were unavailable during this research session, so versions could not be cross-checked against npmjs.com. My training data is current through early 2025, which means packages that release frequently (Anthropic SDK, Vite, ESLint) may have newer versions available in March 2026.

---

*Stack research: 2026-03-12*

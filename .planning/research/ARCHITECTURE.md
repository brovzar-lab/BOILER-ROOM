# Architecture Patterns

**Domain:** Multi-agent AI workspace with isometric Canvas 2D rendering
**Researched:** 2026-03-12
**Overall Confidence:** MEDIUM (training-data-derived patterns verified against project spec and pixel-agents reference; no live source verification possible this session)

## Recommended Architecture

The system is a hybrid application: part game engine (Canvas 2D isometric office), part chat application (streaming LLM conversations), part productivity tool (deal management, file parsing, persistent memory). The architecture must bridge these three worlds cleanly.

### High-Level Architecture

```
+-----------------------------------------------------------------------+
|                        React Application Shell                         |
|  (App.tsx - Layout, Routing, Top Bar, Deal Switcher)                   |
+--------+-------------------------+------------------------------------+
         |                         |
+--------v--------+   +-----------v-----------+   +--------------------+
|   Office Layer   |   |     Chat Layer         |   |   Deal/Memory      |
|   (Canvas 2D)    |   |     (React DOM)        |   |   Layer (React)    |
|                  |   |                        |   |                    |
| GameLoop         |   | ChatPanel              |   | DealSwitcher       |
| Renderer         |   | WarRoomPanel           |   | MemoryPanel        |
| TileMap          |   | StreamingMessage       |   | FileViewer         |
| Pathfinding      |   | FileDropZone           |   | DealCreator        |
| CharacterFSM     |   |                        |   |                    |
| Camera           |   |                        |   |                    |
| SpriteSheet      |   |                        |   |                    |
+--------+---------+   +-----------+------------+   +---------+----------+
         |                         |                          |
+--------v-------------------------v--------------------------v----------+
|                         Zustand Store Layer                             |
|                                                                        |
|  officeStore    chatStore    dealStore    fileStore    memoryStore      |
|  (positions,    (messages,   (deals,      (files,     (facts,          |
|   rooms,        streams,     active       metadata,   decisions,       |
|   characters)   tokens)      deal)        content)    action items)    |
+--------+-------------------------+------------------------------------+
         |                         |
+--------v-------------------------v------------------------------------+
|                        Service Layer                                   |
|                                                                        |
|  anthropic.ts     contextBuilder.ts    summarizer.ts                   |
|  (API calls,      (prompt assembly)    (context window                 |
|   streaming)                            management)                    |
|                                                                        |
|  fileParser.ts    memoryExtractor.ts   persistence.ts                  |
|  (PDF/DOCX)      (fact extraction)     (storage abstraction)           |
+--------+-------------------------+------------------------------------+
         |                         |
+--------v--------+   +-----------v-----------+
|  Anthropic API   |   |  Storage Backend       |
|  (External)      |   |  localStorage/IndexedDB|
+------------------+   +------------------------+
```

### The Three Worlds and Their Boundaries

**World 1 - Game Engine (Canvas 2D):** Pure TypeScript classes, no React dependency. Runs its own requestAnimationFrame loop. Communicates with React exclusively through Zustand stores and callbacks. This isolation is non-negotiable -- the game loop must not be coupled to React's render cycle.

**World 2 - Chat Interface (React DOM):** Standard React components rendered in HTML/CSS on top of or beside the canvas. Handles all text input/output, streaming message display, file drop zones. This is where Tailwind CSS applies.

**World 3 - Data/Business Logic (Services + Stores):** Framework-agnostic TypeScript. Zustand stores hold all state. Services handle API calls, file parsing, context assembly, and persistence. Both World 1 and World 2 consume state from here.

### Component Boundaries

| Component | Responsibility | Communicates With | Never Touches |
|-----------|---------------|-------------------|---------------|
| **GameLoop** | requestAnimationFrame timing, delta time calculation, update/render cycle | Renderer, all game entities | React, DOM, API |
| **Renderer** | Canvas 2D draw calls, layered rendering (floor, furniture, characters, effects) | Canvas context, TileMap, Camera, Characters | React, stores directly |
| **TileMap** | Office layout data, room definitions, walkable/blocked tiles, furniture positions | Pathfinding (provides grid), Renderer (provides tiles to draw) | Canvas context, API |
| **Pathfinding** | BFS grid pathfinding, path caching | TileMap (reads grid), Characters (provides paths) | Canvas, React, API |
| **CharacterFSM** | State machine per character (idle, walk, sit, type, read), animation frame selection | SpriteSheet (gets frames), officeStore (reads target position) | Canvas context, API |
| **Camera** | Viewport transform, zoom (integer only), pan, screen-to-world coordinate mapping | Renderer (provides transform matrix) | Characters, API |
| **SpriteSheet** | Image loading, frame extraction, animation definitions | CharacterFSM (provides frame data) | Everything else |
| **OfficeCanvas** | React-Canvas bridge component, mounts canvas element, starts/stops GameLoop | GameLoop (lifecycle), officeStore (click handling) | Chat components, API |
| **ChatPanel** | Individual agent conversation UI, message input, streaming display | chatStore, useAgent hook | Canvas, game engine |
| **WarRoomPanel** | Multi-agent broadcast UI, parallel streaming display | chatStore, useWarRoom hook | Canvas, game engine |
| **anthropic.ts** | HTTP calls to Anthropic API, SSE stream parsing, token counting | chatStore (delivers messages), contextBuilder (gets prompts) | Canvas, React components |
| **contextBuilder.ts** | Assembles system prompt layers: base + persona + deal + files + history | Agent configs, dealStore, fileStore, memoryStore, chatStore | API directly, Canvas |
| **persistence.ts** | Storage abstraction (read/write/query), migration between backends | All stores (provides load/save), IndexedDB/localStorage | React, Canvas, API |

## Patterns to Follow

### Pattern 1: React-Canvas Bridge via Ref + Store

**What:** React owns the canvas DOM element via a ref. The game engine operates on the raw canvas context independently of React renders. Communication flows through Zustand stores, not props or state.

**Why:** React's reconciliation cycle (16ms minimum per render) conflicts with a game loop targeting 60fps. Letting React control canvas drawing causes jank, dropped frames, and unnecessary re-renders. The bridge pattern keeps both systems running at their natural cadence.

**When:** Always, for the OfficeCanvas component.

**Confidence:** HIGH -- this is the standard pattern used by every React game integration (react-three-fiber uses the same principle for WebGL).

```typescript
// OfficeCanvas.tsx - The bridge component
import { useRef, useEffect } from 'react';
import { GameLoop } from '../engine/GameLoop';
import { useOfficeStore } from '../store/officeStore';

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    // Pixel-perfect rendering: disable image smoothing
    ctx.imageSmoothingEnabled = false;

    const gameLoop = new GameLoop(ctx, canvas);
    gameLoopRef.current = gameLoop;
    gameLoop.start();

    return () => {
      gameLoop.stop();
      gameLoopRef.current = null;
    };
  }, []);

  // Canvas click -> world coordinate -> store action
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const gameLoop = gameLoopRef.current;
    if (!gameLoop) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = gameLoop.camera.screenToWorld(screenX, screenY);
    const room = gameLoop.tileMap.getRoomAt(worldPos);

    if (room) {
      useOfficeStore.getState().navigateToRoom(room.id);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
```

**Key rules for this bridge:**
- React NEVER calls `ctx.drawImage()` or any canvas drawing methods
- The game engine NEVER calls `setState()` or React hooks
- Communication is unidirectional through Zustand: React dispatches actions to stores, game engine reads store state each frame
- Canvas element sizing is handled by React (responsive), but internal resolution is managed by the engine (integer zoom)

### Pattern 2: Game Loop with Fixed Update, Variable Render

**What:** A standard game loop that decouples update logic (physics, pathfinding, state machines) from rendering. Updates run at a fixed timestep (e.g., 60 updates/sec). Rendering happens as fast as the browser allows via requestAnimationFrame.

**Why:** Fixed timestep prevents character movement speed from varying with frame rate. Variable rendering ensures smooth animation on high-refresh displays.

**Confidence:** HIGH -- this is the canonical game loop pattern, used in pixel-agents and virtually all 2D game engines.

```typescript
// GameLoop.ts
export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly FIXED_DT = 1000 / 60; // 60 updates per second

  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    private renderer: Renderer,
    private entities: GameEntity[]
  ) {}

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const elapsed = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += elapsed;

    // Fixed-step updates (deterministic)
    while (this.accumulator >= this.FIXED_DT) {
      this.update(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    // Variable render (smooth)
    const alpha = this.accumulator / this.FIXED_DT;
    this.render(alpha);

    requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Read target positions from Zustand store
    const officeState = useOfficeStore.getState();

    for (const entity of this.entities) {
      entity.update(dt, officeState);
    }
  }

  private render(alpha: number) {
    this.renderer.clear();
    this.renderer.drawFloor();
    this.renderer.drawFurniture();

    // Render entities with interpolation for smoothness
    for (const entity of this.entities) {
      entity.render(this.ctx, alpha);
    }

    this.renderer.drawOverlays();
  }
}
```

### Pattern 3: Character Finite State Machine

**What:** Each character (BILLY + 5 agents) has an independent state machine controlling their behavior and animation. States: `idle`, `walking`, `sitting`, `typing`, `reading`, `walking-to-table` (War Room). Transitions are driven by store state changes.

**Why:** Clean separation between what a character is doing (state) and how it looks (animation frames). Adding new states or animations later (Phase 8 polish) requires zero changes to movement/pathfinding logic.

**Confidence:** HIGH -- pixel-agents uses this exact pattern for its agent characters. Standard in game development.

```typescript
// CharacterStateMachine.ts
type CharacterState =
  | 'idle'
  | 'walking'
  | 'sitting'
  | 'typing'      // Agent responding to user
  | 'reading'     // Agent processing file
  | 'walking-to-table'; // War Room assembly

interface StateTransition {
  from: CharacterState;
  to: CharacterState;
  condition: (ctx: TransitionContext) => boolean;
}

export class CharacterStateMachine {
  private state: CharacterState = 'idle';
  private animationFrame = 0;
  private frameTimer = 0;

  constructor(
    private characterId: string,
    private animations: Map<CharacterState, AnimationDef>,
    private transitions: StateTransition[]
  ) {}

  update(dt: number, context: TransitionContext) {
    // Check transitions
    for (const t of this.transitions) {
      if (t.from === this.state && t.condition(context)) {
        this.enterState(t.to);
        break;
      }
    }

    // Advance animation
    const anim = this.animations.get(this.state);
    if (anim) {
      this.frameTimer += dt;
      if (this.frameTimer >= anim.frameDuration) {
        this.frameTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % anim.frameCount;
      }
    }
  }

  private enterState(newState: CharacterState) {
    this.state = newState;
    this.animationFrame = 0;
    this.frameTimer = 0;
  }

  getCurrentFrame(): SpriteFrame {
    const anim = this.animations.get(this.state)!;
    return anim.frames[this.animationFrame];
  }
}
```

### Pattern 4: Zustand Sliced Stores with Cross-Store Subscriptions

**What:** Five independent Zustand stores (office, chat, deal, file, memory), each managing a single domain. Cross-store coordination happens through subscriptions, not by merging into one monolithic store.

**Why:** Each store has radically different update patterns. officeStore updates 60 times/sec (game loop reads). chatStore updates on every streamed token. dealStore rarely changes. Combining them would cause unnecessary re-renders and make the code harder to reason about.

**Confidence:** HIGH -- Zustand explicitly recommends multiple stores over one giant store for complex apps. The `subscribeWithSelector` middleware enables efficient cross-store reactions.

```typescript
// chatStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ChatState {
  conversations: Record<string, Record<string, Message[]>>; // dealId -> agentId -> messages
  activeStreams: Record<string, StreamState>; // agentId -> current stream
  sendMessage: (agentId: string, content: string) => Promise<void>;
  appendStreamToken: (agentId: string, token: string) => void;
  finalizeStream: (agentId: string) => void;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    conversations: {},
    activeStreams: {},

    sendMessage: async (agentId, content) => {
      const dealId = useDealStore.getState().activeDealId;
      // Add user message
      set(state => {
        const dealConvos = state.conversations[dealId] ?? {};
        const agentMessages = dealConvos[agentId] ?? [];
        return {
          conversations: {
            ...state.conversations,
            [dealId]: {
              ...dealConvos,
              [agentId]: [...agentMessages, { role: 'user', content }]
            }
          }
        };
      });
      // Trigger API call via service layer (not in store)
    },

    appendStreamToken: (agentId, token) => {
      set(state => ({
        activeStreams: {
          ...state.activeStreams,
          [agentId]: {
            ...state.activeStreams[agentId],
            content: (state.activeStreams[agentId]?.content ?? '') + token,
          }
        }
      }));
    },

    finalizeStream: (agentId) => {
      // Move stream content to conversation history, clear stream
    }
  }))
);

// Cross-store subscription: when chat updates, update office character state
useChatStore.subscribe(
  state => state.activeStreams,
  (streams) => {
    const officeStore = useOfficeStore.getState();
    for (const [agentId, stream] of Object.entries(streams)) {
      if (stream?.isStreaming) {
        officeStore.setCharacterState(agentId, 'typing');
      }
    }
  }
);
```

**Cross-store subscription map (who reacts to whom):**
```
chatStore.activeStreams -> officeStore (character typing animation)
dealStore.activeDealId  -> chatStore (swap conversation history)
dealStore.activeDealId  -> fileStore (swap visible files)
dealStore.activeDealId  -> memoryStore (swap agent memories)
officeStore.activeRoom  -> chatStore (open correct chat panel)
officeStore.billyPosition -> (game engine reads directly)
```

### Pattern 5: Streaming API with AbortController + Event Source Parsing

**What:** Anthropic's Messages API supports server-sent events (SSE) for streaming. The client reads the stream chunk by chunk, dispatching tokens to the chatStore. Each stream is tied to an AbortController so it can be cancelled (user navigates away, switches deals, etc.).

**Why:** Streaming gives perceived instant response. AbortController prevents orphaned streams from wasting API credits when the user changes context. Manual SSE parsing (not EventSource API) because the Anthropic API requires POST with a body, which EventSource does not support.

**Confidence:** HIGH -- Anthropic's streaming API is well-documented. This is the standard integration pattern.

```typescript
// anthropic.ts
const ANTHROPIC_BASE = '/api/messages'; // Proxied through Vite dev server

export async function streamMessage(
  messages: Message[],
  systemPrompt: string,
  signal: AbortSignal,
  onToken: (token: string) => void,
  onComplete: (usage: TokenUsage) => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            onToken(data.delta.text);
          } else if (data.type === 'message_stop') {
            // Extract usage from message_delta event
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // Expected cancellation
    onError(err as Error);
  }
}
```

### Pattern 6: War Room Parallel Streaming with Rate Limit Awareness

**What:** When the user sends a message in the War Room, it fans out to all 5 agents simultaneously. Each agent gets its own stream. Responses render in parallel, color-coded by agent. Rate limiting is handled with staggered starts (50-100ms between each call) to avoid hitting Anthropic's concurrent request limits.

**Why:** Simultaneous responses are the killer feature. Staggered starts prevent 429 rate limit errors without noticeable delay to the user.

**Confidence:** MEDIUM -- the fan-out pattern is straightforward; the specific rate limit thresholds depend on the user's Anthropic API tier and may need tuning.

```typescript
// useWarRoom.ts
export function useWarRoom() {
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const broadcast = async (content: string) => {
    const agents = useAgentConfig(); // All 5 agents
    const chatStore = useChatStore.getState();

    // Cancel any existing streams
    for (const controller of abortControllers.current.values()) {
      controller.abort();
    }
    abortControllers.current.clear();

    // Staggered parallel fan-out
    const STAGGER_MS = 100;
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const controller = new AbortController();
      abortControllers.current.set(agent.id, controller);

      // Delay each agent slightly to avoid rate limits
      setTimeout(() => {
        const systemPrompt = buildContextForAgent(agent.id);
        streamMessage(
          chatStore.getMessagesForAgent(agent.id),
          systemPrompt,
          controller.signal,
          (token) => chatStore.appendStreamToken(agent.id, token),
          (usage) => chatStore.finalizeStream(agent.id, usage),
          (error) => chatStore.streamError(agent.id, error)
        );
      }, i * STAGGER_MS);
    }
  };

  return { broadcast };
}
```

### Pattern 7: Persistence Abstraction Layer (Repository Pattern)

**What:** A storage abstraction that exposes a simple key-value + query interface. Phase 1 implementation uses localStorage (for small data) and IndexedDB (for conversations, files). The abstraction is designed so a future Supabase/Firebase backend can be swapped in without changing any store or component code.

**Why:** The project spec explicitly requires "design abstraction for future Supabase/Firebase migration." Starting with a clean interface means the migration is a single service file replacement, not a rewrite.

**Confidence:** HIGH -- repository/adapter pattern is well-established. IndexedDB via idb (wrapper library) provides a clean async API.

```typescript
// persistence.ts
export interface PersistenceAdapter {
  // Key-value operations
  get<T>(collection: string, key: string): Promise<T | null>;
  set<T>(collection: string, key: string, value: T): Promise<void>;
  delete(collection: string, key: string): Promise<void>;

  // Query operations (needed for deal-scoped queries)
  getAll<T>(collection: string): Promise<T[]>;
  query<T>(collection: string, index: string, value: string): Promise<T[]>;

  // Bulk operations (for deal export/import)
  bulkSet<T>(collection: string, entries: { key: string; value: T }[]): Promise<void>;

  // Migration support
  getVersion(): Promise<number>;
  setVersion(version: number): Promise<void>;
}

// IndexedDB implementation (Phase 1)
export class IndexedDBAdapter implements PersistenceAdapter {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    // Open DB with schema migrations for conversations, files, deals, memory
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    const db = await this.getDb();
    const tx = db.transaction(collection, 'readonly');
    const store = tx.objectStore(collection);
    return store.get(key) as Promise<T | null>;
  }

  // ... other methods
}

// Future: Supabase implementation (same interface, different backend)
// export class SupabaseAdapter implements PersistenceAdapter { ... }

// Collections map to IndexedDB object stores:
// 'conversations' -> dealId+agentId compound key
// 'deals'         -> dealId key
// 'files'         -> fileId key, indexed by dealId
// 'memory'        -> dealId+agentId compound key
// 'settings'      -> key-value for app config
```

### Pattern 8: Context Window Management (Sliding Window + Summarization)

**What:** Each conversation tracks its token count. When approaching 80% of the model's context limit, older messages are summarized by Claude into a structured format (key facts, decisions, open questions). The summary replaces old messages in the API payload, while the full history remains in IndexedDB.

**Why:** Production deal conversations will be long-running (days/weeks per deal). Without summarization, the context window fills up and the agent loses the ability to see new messages. This is explicitly called out in the project spec.

**Confidence:** MEDIUM -- the approach is sound but the summarization prompt and trigger thresholds will need tuning through real usage. Token counting accuracy depends on using a proper tokenizer (tiktoken or Anthropic's token counting endpoint).

```typescript
// summarizer.ts
const CONTEXT_LIMIT = 200_000; // Claude's context window
const SUMMARIZE_THRESHOLD = 0.8; // Trigger at 80%
const KEEP_RECENT_MESSAGES = 20; // Always keep last N messages verbatim

export async function maybeSummarize(
  messages: Message[],
  currentTokenCount: number
): Promise<{ messages: Message[]; wasSummarized: boolean }> {
  if (currentTokenCount < CONTEXT_LIMIT * SUMMARIZE_THRESHOLD) {
    return { messages, wasSummarized: false };
  }

  const oldMessages = messages.slice(0, -KEEP_RECENT_MESSAGES);
  const recentMessages = messages.slice(-KEEP_RECENT_MESSAGES);

  // Use Claude to summarize older messages
  const summary = await requestSummary(oldMessages);

  // Replace old messages with a single summary message
  const summaryMessage: Message = {
    role: 'user',
    content: `[CONVERSATION SUMMARY]\n${summary}\n[END SUMMARY - Recent messages follow]`,
  };

  return {
    messages: [summaryMessage, ...recentMessages],
    wasSummarized: true,
  };
}
```

### Pattern 9: System Prompt Layering (Composable Context)

**What:** Each API call's system prompt is assembled from independent layers, each of which can change independently. The contextBuilder service composes them in a fixed order.

**Why:** Different layers change at different rates. The base prompt never changes. The persona changes only if you reconfigure an agent. The deal context changes when you switch deals. The file summaries change on upload. The memory changes after each conversation. Layering means each piece can be updated without touching the others.

**Confidence:** HIGH -- this is the standard pattern for multi-persona LLM applications. Directly specified in the project requirements.

```typescript
// contextBuilder.ts
export function buildSystemPrompt(agentId: string, dealId: string): string {
  const layers: string[] = [];

  // Layer 1: Base (shared across all agents)
  layers.push(BASE_SYSTEM_PROMPT); // Response format, tone, Mexican business context

  // Layer 2: Agent persona
  const agent = getAgentConfig(agentId);
  layers.push(agent.systemPrompt); // Domain expertise, personality, communication style

  // Layer 3: Deal context
  const deal = useDealStore.getState().deals[dealId];
  if (deal) {
    layers.push(`## Active Deal: ${deal.name}\n${deal.description}`);
  }

  // Layer 4: Agent memory for this deal
  const memories = useMemoryStore.getState().getMemories(dealId, agentId);
  if (memories.length > 0) {
    layers.push(formatMemoriesForPrompt(memories));
  }

  // Layer 5: File summaries on agent's desk
  const files = useFileStore.getState().getFilesForAgent(dealId, agentId);
  if (files.length > 0) {
    layers.push(formatFileSummariesForPrompt(files));
  }

  return layers.join('\n\n---\n\n');
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: React State for Game Engine Data

**What:** Using `useState` or React context to store character positions, animation frames, or other data that changes every frame.

**Why bad:** React re-renders the entire component tree on state changes. At 60fps, updating character positions via `useState` causes 60 re-renders per second of the entire canvas component and its siblings. This will drop frames, cause UI jank, and make the chat interface unresponsive.

**Instead:** Store game-engine-internal state (positions, animation frames, interpolation values) as plain class properties on the engine objects. Only push to Zustand store for data React actually needs to react to (active room changes, character status for UI overlays).

### Anti-Pattern 2: Monolithic Zustand Store

**What:** Putting office state, chat state, deal state, file state, and memory state into a single Zustand store.

**Why bad:** Every streamed token (chatStore update) would trigger re-renders in components subscribed to office state. Every game loop read of office state would be entangled with chat state updates. Selector optimization helps but cannot fully prevent cross-domain coupling in a single store.

**Instead:** Five independent stores with explicit cross-store subscriptions where needed. Each store has its own update frequency and access pattern.

### Anti-Pattern 3: Canvas Drawing in React Render

**What:** Calling canvas context methods (drawImage, fillRect, etc.) inside a React component's render function or useEffect that runs on every render.

**Why bad:** React's render cycle is asynchronous and batched. Canvas drawing must be synchronous and happen in a predictable order (background first, then characters, then overlays). Mixing the two timing models causes visual glitches, z-ordering bugs, and frame tearing.

**Instead:** Canvas drawing happens exclusively in the GameLoop's render method. React's only responsibility is mounting/unmounting the canvas element and forwarding click events.

### Anti-Pattern 4: Storing Full File Contents in Zustand

**What:** Loading entire PDF/DOCX text content into Zustand store state.

**Why bad:** A single production contract can be 50-100 pages. Five files across five agents across multiple deals could easily hit hundreds of megabytes in memory. Zustand state is kept in JS heap and triggers equality checks on updates.

**Instead:** Store file metadata (name, size, hash, agent association) in Zustand. Store extracted text content in IndexedDB. Load content on-demand when building the system prompt or when the user views a file.

### Anti-Pattern 5: Direct API Key Exposure in Client Bundle

**What:** Embedding `VITE_ANTHROPIC_API_KEY` directly in client-side fetch calls with no proxy.

**Why bad:** The API key is visible in browser dev tools, network tab, and the built JS bundle. Anyone with access to the app can extract and misuse the key. Even for a single-user tool, this creates risk if the built app is ever shared or deployed.

**Instead:** Use Vite's dev server proxy to route `/api/messages` to `https://api.anthropic.com/v1/messages`, attaching the API key server-side. In the proxy config, the key lives in `.env` and never reaches the browser. For production, use a minimal Cloudflare Worker or Vercel Edge Function as a proxy (adds 5-10 lines of code).

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/messages': {
        target: 'https://api.anthropic.com/v1/messages',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/messages/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('x-api-key', process.env.ANTHROPIC_API_KEY!);
            proxyReq.setHeader('anthropic-version', '2023-06-01');
          });
        },
      },
    },
  },
});
```

## Data Flow

### Flow 1: User Sends Message to Individual Agent

```
User types message
  -> ChatPanel.onSubmit()
  -> useChatStore.sendMessage(agentId, content)
  -> [store: add user message to conversations[dealId][agentId]]
  -> [store: set activeStreams[agentId] = { isStreaming: true }]
  -> contextBuilder.buildSystemPrompt(agentId, dealId)
      -> reads: agent config, dealStore, memoryStore, fileStore, chatStore.conversations
      -> returns: assembled system prompt string
  -> anthropic.streamMessage(messages, systemPrompt, signal, callbacks)
      -> POST /api/messages (proxied to Anthropic)
      -> SSE stream begins
      -> onToken: useChatStore.appendStreamToken(agentId, token)
        -> [store: activeStreams[agentId].content += token]
        -> [cross-store: officeStore.setCharacterState(agentId, 'typing')]
        -> StreamingMessage component re-renders (shows token)
      -> onComplete: useChatStore.finalizeStream(agentId, usage)
        -> [store: move stream content to conversations, clear stream]
        -> [store: update token count]
        -> [cross-store: officeStore.setCharacterState(agentId, 'idle')]
        -> persistence.set('conversations', key, updatedMessages)
        -> summarizer.maybeSummarize(messages, tokenCount)
        -> memoryExtractor.extractFacts(messages) -> memoryStore
```

### Flow 2: War Room Broadcast

```
User types message in War Room
  -> WarRoomPanel.onSubmit()
  -> useWarRoom.broadcast(content)
  -> for each agent (staggered by 100ms):
      -> useChatStore.sendMessage(agentId, content)
      -> [same flow as individual message, x5 in parallel]
  -> WarRoomPanel renders all 5 streaming responses simultaneously
  -> officeStore: all 5 agent characters show 'typing' state
  -> as each stream completes: character returns to 'idle'
```

### Flow 3: BILLY Navigates to Agent Room

```
User clicks on room in OfficeCanvas
  -> OfficeCanvas.handleClick(screenCoords)
  -> camera.screenToWorld(screenCoords) -> worldCoords
  -> tileMap.getRoomAt(worldCoords) -> Room
  -> officeStore.navigateToRoom(roomId)
  -> [store: set targetRoom, calculate BILLY path via Pathfinding.findPath()]
  -> [store: set billy.state = 'walking', billy.path = [...]]
  -> GameLoop reads officeStore.billy each frame
      -> CharacterFSM transitions to 'walking'
      -> BILLY sprite animates along path tiles
      -> on arrival: officeStore.setActiveRoom(roomId)
        -> [cross-store: triggers ChatPanel to open for that agent]
        -> CharacterFSM transitions to 'sitting' or 'idle'
```

### Flow 4: Deal Switch

```
User selects new deal in DealSwitcher
  -> useDealStore.setActiveDeal(newDealId)
  -> [store: activeDealId = newDealId]
  -> cross-store subscriptions fire:
      -> chatStore: swap visible conversations to newDealId scope
      -> fileStore: swap visible files to newDealId scope
      -> memoryStore: swap visible memories to newDealId scope
      -> officeStore: (optional) visual effect showing deal transition
  -> persistence.get('conversations', newDealId) -> load from IndexedDB
  -> all panels update to show new deal context
  -> if user sends a message now, contextBuilder uses newDealId data
```

### Flow 5: File Upload

```
User drags file onto agent's FileDropZone
  -> useFileUpload.handleDrop(file, agentId)
  -> fileParser.parse(file) -> extracted text
      -> PDF: pdfjs.getDocument(arrayBuffer) -> page.getTextContent()
      -> DOCX: mammoth.convertToText(arrayBuffer)
  -> fileStore.addFile(dealId, agentId, { metadata, extractedText })
  -> persistence.set('files', fileId, { metadata, content })
  -> officeStore: add tiny file icon to agent's desk
  -> next API call to this agent includes file content in system prompt
```

## Isometric Rendering Architecture

### Coordinate Systems

The engine uses three coordinate systems. Mixing them up is the number one source of rendering bugs in isometric games.

```
World Coordinates (grid):     Isometric Coordinates:        Screen Coordinates:
  Logical tile (col, row)      Visual diamond projection     Pixel position on canvas
  (0,0) (1,0) (2,0)           Transformed by:               After camera offset + zoom
  (0,1) (1,1) (2,1)             isoX = (col - row) * tileW/2
  (0,2) (1,2) (2,2)             isoY = (col + row) * tileH/2
```

**Tile size recommendation:** 32x16 pixels for base tiles (2:1 ratio, standard isometric). Character sprites at 16x32 or 32x32, scaled by integer zoom factor (2x, 3x, 4x). Integer zoom only -- fractional zoom causes sub-pixel rendering artifacts that destroy pixel art clarity.

### Render Order (Painter's Algorithm)

Isometric rendering requires strict back-to-front ordering to handle occlusion correctly:

```
1. Floor tiles (all tiles, back-to-front by row then column)
2. Wall tiles and room dividers
3. Furniture (back-to-front, same ordering as floor)
4. Characters (sorted by their row position -- characters in higher rows render later)
5. Overhead elements (ceiling decorations, lighting effects)
6. UI overlays (status bubbles, notification dots -- these are HTML, not canvas)
```

### BFS Pathfinding

For the office floor plan (approximately 30x20 tiles), BFS (breadth-first search) is the correct pathfinding algorithm. A* is unnecessary overhead for a space this small.

```typescript
// Pathfinding.ts
export function findPath(
  grid: boolean[][], // true = walkable
  start: GridPos,
  end: GridPos
): GridPos[] {
  const queue: GridPos[] = [start];
  const visited = new Set<string>();
  const parent = new Map<string, GridPos>();
  const key = (p: GridPos) => `${p.col},${p.row}`;

  visited.add(key(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.col === end.col && current.row === end.row) {
      return reconstructPath(parent, start, end);
    }

    // 4-directional neighbors (no diagonal for isometric grid)
    for (const neighbor of getNeighbors(current)) {
      const nk = key(neighbor);
      if (!visited.has(nk) && grid[neighbor.row]?.[neighbor.col]) {
        visited.add(nk);
        parent.set(nk, current);
        queue.push(neighbor);
      }
    }
  }

  return []; // No path found
}
```

## Scalability Considerations

| Concern | Phase 1-3 (Single User, 1-5 Deals) | Phase 4-7 (Heavy Usage, 20+ Deals) | Future (Cloud Migration) |
|---------|-------------------------------------|-------------------------------------|--------------------------|
| **Conversation storage** | localStorage is fine for short histories | IndexedDB required -- localStorage has 5-10MB limit | Supabase/Firebase via PersistenceAdapter swap |
| **Token counting** | Rough character-based estimate works | Proper tokenizer needed (tiktoken-js or API count endpoint) | Server-side tokenization |
| **API rate limits** | Single agent: no concern | War Room 5x parallel: stagger + retry with backoff | Queue through backend proxy |
| **Canvas performance** | 6 characters, 600 tiles: trivial | Same -- office does not grow | Same |
| **Memory (browser)** | <100MB: fine | File content in IndexedDB, not RAM | Offload to server |
| **Context window** | Conversation fits in window | Summarization pipeline essential | Server-side summarization |
| **Startup time** | <1s: everything from localStorage | 2-3s: IndexedDB hydration for active deal only | Background sync, stale-while-revalidate |

## Suggested Build Order (Dependencies Between Components)

The build order is driven by dependency chains. You cannot test B until A works.

```
Phase 1 (Foundation - No Canvas):
  types/ -> Must be first, everything depends on type definitions
  services/persistence.ts -> Storage abstraction (IndexedDB adapter)
  services/anthropic.ts -> API wrapper + streaming
  store/chatStore.ts -> Conversation state (depends on types, persistence)
  services/contextBuilder.ts -> Prompt assembly (depends on types, agent configs)
  config/agents.ts -> Agent persona definitions
  components/chat/ChatPanel.tsx -> Basic chat UI (depends on chatStore, anthropic)
  components/chat/StreamingMessage.tsx -> Token streaming display

Phase 2 (Canvas Engine - No React Integration Yet):
  engine/SpriteSheet.ts -> Image loading (no dependencies)
  engine/TileMap.ts -> Grid data structure (no dependencies)
  engine/Camera.ts -> Viewport math (no dependencies)
  engine/Pathfinding.ts -> BFS (depends on TileMap for grid)
  engine/CharacterStateMachine.ts -> FSM (depends on SpriteSheet for frames)
  engine/Renderer.ts -> Drawing (depends on Camera, TileMap, SpriteSheet)
  engine/GameLoop.ts -> Main loop (depends on Renderer, all entities)
  store/officeStore.ts -> Office state (depends on types)
  components/office/OfficeCanvas.tsx -> Bridge (depends on GameLoop, officeStore)

Phase 3 (Integration):
  Wire OfficeCanvas clicks -> officeStore -> ChatPanel visibility
  Cross-store subscriptions (chat typing -> character animation)
  All 5 agent configs + chat panels
  Navigation: click room -> BILLY walks -> panel opens

Phase 4+ (Features on the Foundation):
  services/summarizer.ts -> Context management (depends on anthropic, chatStore)
  hooks/useWarRoom.ts -> Parallel streaming (depends on anthropic, chatStore)
  services/fileParser.ts -> PDF/DOCX (independent, can build anytime)
  store/dealStore.ts -> Deal entities (depends on persistence)
  store/memoryStore.ts -> Agent memory (depends on persistence)
  services/memoryExtractor.ts -> Fact extraction (depends on anthropic)
```

**Key dependency insight:** The game engine (Phase 2) and the chat system (Phase 1) have ZERO code dependencies on each other. They can be built in parallel by separate developers. They only connect through Zustand stores (Phase 3). This is the most important architectural property to preserve.

## Technology-Specific Notes

### IndexedDB Schema Design

Use compound keys for deal-scoped data. IndexedDB supports compound indexes natively.

```typescript
// Database schema (version 1)
const DB_SCHEMA = {
  conversations: {
    keyPath: ['dealId', 'agentId'],
    indexes: [
      { name: 'byDeal', keyPath: 'dealId' },
      { name: 'byAgent', keyPath: 'agentId' },
      { name: 'byTimestamp', keyPath: 'lastUpdated' },
    ]
  },
  deals: {
    keyPath: 'id',
    indexes: [
      { name: 'byName', keyPath: 'name' },
      { name: 'byCreated', keyPath: 'createdAt' },
    ]
  },
  files: {
    keyPath: 'id',
    indexes: [
      { name: 'byDeal', keyPath: 'dealId' },
      { name: 'byDealAgent', keyPath: ['dealId', 'agentId'] },
    ]
  },
  memory: {
    keyPath: ['dealId', 'agentId'],
    indexes: [
      { name: 'byDeal', keyPath: 'dealId' },
    ]
  },
};
```

**Recommendation:** Use the `idb` library (tiny wrapper around IndexedDB providing a Promise-based API) rather than raw IndexedDB callbacks. Raw IndexedDB's event-based API is error-prone and verbose.

### Vite Proxy for Anthropic API

The Vite dev server proxy handles CORS and API key injection. For production builds, deploy a minimal edge function.

```typescript
// vite.config.ts - proxy configuration
server: {
  proxy: {
    '/api': {
      target: 'https://api.anthropic.com/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('x-api-key', process.env.ANTHROPIC_API_KEY!);
          proxyReq.setHeader('anthropic-version', '2023-06-01');
          // Remove browser-set headers that Anthropic rejects
          proxyReq.removeHeader('origin');
        });
      },
    },
  },
},
```

### Sprite Asset Strategy

For initial development (Phases 2-3), use procedurally generated placeholder sprites (colored rectangles with direction indicators). This decouples engine development from art asset creation. Real pixel art assets can be swapped in during Phase 8 without changing any engine code, because the SpriteSheet class abstracts frame extraction.

```typescript
// Placeholder sprite generator (Phase 2)
export function generatePlaceholderSprite(
  color: string,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  // Add direction indicator
  ctx.fillStyle = '#000';
  ctx.fillRect(width / 2 - 2, 2, 4, 4); // "eyes" at top
  return canvas;
}
```

## Sources

- Project specification: `/Users/quantumcode/CODE/BOILER-ROOM/LEMON-COMMAND-CENTER-PROMPT.md`
- Existing codebase architecture: `/Users/quantumcode/CODE/BOILER-ROOM/.claude/worktrees/angry-antonelli/.planning/codebase/ARCHITECTURE.md`
- pixel-agents reference (architecture study target): `https://github.com/pablodelucca/pixel-agents`
- Patterns derived from training knowledge of: requestAnimationFrame game loops, Zustand store design, Anthropic streaming API, IndexedDB patterns, React-Canvas bridge techniques
- **Note:** Web-based verification was unavailable during this research session. Confidence levels reflect training-data-only derivation. Anthropic API specifics (streaming format, headers) should be verified against current official documentation before implementation.

---

*Architecture analysis: 2026-03-12*

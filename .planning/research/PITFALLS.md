# Domain Pitfalls

**Domain:** Multi-agent AI workspace with isometric pixel art Canvas 2D rendering
**Project:** Lemon Command Center
**Researched:** 2026-03-12
**Overall confidence:** MEDIUM-HIGH (training data across well-established domains; web verification unavailable)

---

## Critical Pitfalls

Mistakes that cause rewrites, severe performance degradation, or data loss.

---

### Pitfall 1: Canvas Re-render Storm from React State Changes

**What goes wrong:** The Canvas game loop (requestAnimationFrame at 60fps) and React's reconciliation cycle fight each other. Every React state update (new chat token, agent status change, deal switch) triggers a re-render. If the Canvas element is inside a React component that re-renders, the Canvas context gets destroyed and recreated, causing flickering, lost state, and dropped frames. Developers commonly put game state in React state (useState/useReducer), which means every sprite movement triggers React reconciliation -- a 16ms budget blown on virtual DOM diffing instead of drawing pixels.

**Why it happens:** React's mental model ("UI is a function of state") conflicts with imperative Canvas drawing ("mutate pixels every frame"). Developers try to unify both under React's state model because it feels clean, but Canvas rendering needs to be an escape hatch from React, not governed by it.

**Consequences:**
- Canvas flickers or goes blank on every chat message
- Frame rate drops from 60fps to 5-15fps during streaming responses
- BILLY avatar stutters or teleports during pathfinding walks
- Agent idle animations freeze when React is busy reconciling chat state
- Memory leaks from repeatedly creating/destroying Canvas contexts

**Prevention:**
1. **Mount Canvas once, never unmount.** Use a single `<canvas>` element wrapped in a React component that uses `React.memo` with an empty dependency comparison (or `shouldComponentUpdate` returning false). The Canvas component should render exactly once.
2. **Game state lives outside React.** Use a plain TypeScript class or module for all game state (sprite positions, animation frames, pathfinding queues). Zustand stores are acceptable because they support subscriptions without React re-renders via `subscribe()`.
3. **Bridge pattern:** React reads game state only when it needs to (e.g., "which room is BILLY in?" to show the correct chat panel). Game loop reads React/Zustand state only when it needs to (e.g., "is agent X currently responding?" to switch sprite animation).
4. **Use refs, not state, for Canvas.** `useRef` for the canvas element, context, and any mutable game data. Never `useState` for anything the game loop touches.

**Detection (warning signs):**
- Canvas element has a React key that changes
- `useState` calls for sprite positions, animation frame indices, or camera offset
- Canvas component re-renders visible in React DevTools during chat
- FPS counter drops when UI panels update

**Phase mapping:** Must be correct from Phase 1 (Canvas rendering foundation). Retrofitting this is a rewrite.

**Confidence:** HIGH -- this is a universally documented React+Canvas integration problem.

---

### Pitfall 2: Streaming Token Render Bottleneck (Death by a Thousand setState Calls)

**What goes wrong:** When streaming tokens from the Anthropic API via SSE (Server-Sent Events), each token arrives as a separate event -- often 20-50 tokens per second. Calling `setState` on every single token (to append it to the message string) triggers 20-50 React re-renders per second. In the War Room (5 agents streaming simultaneously), that becomes 100-250 re-renders per second. React batching helps in React 18+ but still can not prevent layout thrashing when the DOM is complex (markdown rendering, syntax highlighting, scrolling containers).

**Why it happens:** The naive implementation `setMessages(prev => [...prev, token])` or `setCurrentMessage(prev => prev + token)` is the obvious approach, and it works fine for a single slow stream. It falls apart at scale (War Room with 5 parallel streams) or with rich rendering (markdown-to-HTML on every token).

**Consequences:**
- War Room becomes unusable -- UI freezes, scroll jank, tokens appear in bursts
- Canvas game loop starves (main thread blocked by React reconciliation)
- Browser tab becomes unresponsive during parallel streaming
- Markdown re-parsing on every token is O(n^2) over the message length
- Memory pressure from thousands of intermediate string allocations

**Prevention:**
1. **Batch tokens before rendering.** Accumulate tokens in a ref or plain variable. Flush to React state on a timer (every 50-100ms) or via `requestAnimationFrame`. This reduces 50 updates/sec to 10-20, which React handles comfortably.
2. **Append-only rendering.** Do not re-render the entire message on each token. Maintain a "committed" portion (already rendered markdown) and a "pending" tail (raw text, not yet parsed). Only re-parse markdown when a natural boundary is hit (newline, paragraph break, code fence close).
3. **War Room: stagger initial connections.** Do not fire all 5 API calls in the same tick. Stagger by 100-200ms to avoid simultaneous token floods that create render contention.
4. **Use CSS `content-visibility: auto`** on chat containers that are off-screen (agents not currently visible).
5. **Consider a dedicated streaming state store** separate from the message history store, so streaming updates only trigger re-renders in the active chat panel, not the entire app.

**Detection:**
- React DevTools shows >30 re-renders/sec on chat components
- Performance profiler shows long tasks (>50ms) during streaming
- Canvas frame drops correlate with streaming activity
- Browser "page unresponsive" warnings during War Room sessions

**Phase mapping:** Foundation in Phase 2 (chat integration), critical optimization in the War Room phase.

**Confidence:** HIGH -- well-documented pattern in LLM chat interfaces.

---

### Pitfall 3: IndexedDB Transaction Gotchas and Silent Data Loss

**What goes wrong:** IndexedDB has a counter-intuitive transaction model that causes silent failures. Transactions auto-commit when they become inactive (no pending requests), which means any `await` that yields to the microtask queue can cause the transaction to close prematurely. Developers write `const tx = db.transaction(...); await someOtherThing(); tx.objectStore(...)` and the second line silently fails because the transaction already committed. Additionally, IndexedDB operations are async but NOT Promise-based natively -- the IDBRequest API uses events, and mixing it with async/await without a wrapper library leads to race conditions.

**Why it happens:** IndexedDB's API predates modern async/await patterns. Its transaction lifecycle is tied to the event loop in ways that are invisible to developers used to SQL transactions or Promise-based APIs. The "transaction auto-close" behavior is technically documented but consistently surprises people.

**Consequences:**
- Conversation history silently fails to save (user thinks it saved, returns to find messages missing)
- Deal context data corrupts when switching deals rapidly (overlapping transactions)
- Full history stored in IndexedDB but reads return partial data due to index misconfiguration
- Storage quota exceeded without warning on Safari (default 1GB vs Chrome's more generous limits)
- Version upgrade migrations fail silently, leaving database in inconsistent state

**Prevention:**
1. **Use a wrapper library.** `idb` by Jake Archibald (lightweight, well-maintained) or Dexie.js (more features, query builder). These handle the transaction lifecycle correctly and provide proper Promise-based APIs. Given this project's scope, **Dexie.js is recommended** -- it handles schema versioning/migrations cleanly, which matters for a product that will evolve its data model (deal rooms, agent memory, file references).
2. **Never hold a transaction across an await that does non-IDB work.** If you must do async work mid-transaction, complete all IDB operations first, then do the async work, then open a new transaction.
3. **Implement write-ahead logging for critical data.** Before a complex multi-store write (e.g., saving a message + updating agent memory + updating deal metadata), write a "pending operation" record first. On app startup, check for incomplete operations and replay them.
4. **Set explicit storage persistence.** Call `navigator.storage.persist()` on startup. Without this, the browser can evict IndexedDB data under storage pressure -- catastrophic for conversation history.
5. **Safari-specific: test with storage limits.** Safari has a 1GB limit per origin and aggressive eviction in private browsing mode. Test with large conversation histories.
6. **Design the abstraction layer from day one.** The project already plans localStorage-to-IndexedDB migration and future Supabase/Firebase. Define a `PersistenceProvider` interface early:
   ```typescript
   interface PersistenceProvider {
     getConversation(agentId: string, dealId: string): Promise<Message[]>;
     appendMessage(agentId: string, dealId: string, msg: Message): Promise<void>;
     getDealContext(dealId: string): Promise<DealContext>;
     // ...
   }
   ```
   Implement IndexedDB behind this interface. Never import `idb`/Dexie directly in components.

**Detection:**
- Messages appear in chat but are gone after page reload
- `DOMException: TransactionInactiveError` in console
- Inconsistent data between what is shown and what is stored
- Storage usage grows unboundedly (orphaned records from failed transactions)

**Phase mapping:** Must be designed correctly in Phase 1 (persistence layer). Migration path architecture should be in place before any data is stored.

**Confidence:** HIGH -- IndexedDB transaction behavior is extensively documented in MDN and developer post-mortems.

---

### Pitfall 4: Context Window Mismanagement Causing Incoherent Agent Responses

**What goes wrong:** Claude's context window (200K tokens for Claude 3.5 Sonnet, 200K for Claude 4) seems enormous, but the system prompt layering described in the project (base + persona + deal context + files + history) fills it faster than expected. A single uploaded PDF can be 50K+ tokens. Two PDFs plus conversation history for an active deal plus the structured memory blob can exceed the window without the developer realizing. When the context is truncated or summarized poorly, agents lose critical deal context and give contradictory advice ("You should structure as an LLC" one day, "As we discussed, the S-Corp structure..." the next).

**Why it happens:** Token counting is not intuitive. Developers estimate based on word count (1 token ~= 0.75 words) but system prompts, JSON formatting, and file content have different token densities. The "80% auto-summarize" threshold in the project spec is good, but the summarization itself can lose critical numerical details (dollar amounts, dates, percentages) that are the entire point of a financial advisory tool.

**Consequences:**
- Agent contradicts previous advice because summarization lost key facts
- File content silently truncated, agent analyzes partial document
- Dollar amounts, dates, percentages lost in summarization (catastrophic for finance/legal domain)
- War Room broadcast consumes 5x context budget (same deal context sent to 5 agents)
- Slow API responses when context is near-full (more tokens to process)

**Prevention:**
1. **Token counting on write, not read.** Count tokens when messages are added to history, not when constructing the API call. Use Anthropic's `count_tokens` endpoint or `@anthropic-ai/tokenizer` for client-side counting. Maintain a running total per conversation.
2. **Structured memory as first-class data, not chat summary.** The project spec mentions "auto-extracted key facts, decisions, numbers, action items" -- this is correct. Implement this as a structured JSON document (not prose summary) that is always included in full. Summarize the conversation narrative, but never summarize the structured facts.
   ```typescript
   interface AgentMemory {
     keyFacts: { fact: string; source: string; date: string }[];
     decisions: { decision: string; rationale: string; date: string }[];
     numbers: { label: string; value: string; currency?: string; date: string }[];
     actionItems: { item: string; status: 'open' | 'done'; date: string }[];
   }
   ```
3. **Priority-based context assembly.** When constructing the API message array, allocate token budget in priority order: system prompt (fixed) > structured memory (fixed) > recent messages (sliding window) > file content (summarized if needed) > older history (summarized). Never let file content crowd out conversation history.
4. **File content: extract and summarize on upload, not on every API call.** When a user uploads a PDF, immediately extract text, create a summary (via Claude), and store both. Include only the summary in context by default; include full text only when the user explicitly asks about the document.
5. **Cross-agent memory requires careful deduplication.** When facts from one agent inform another (per the spec), ensure the same fact is not represented differently in two agents' memories, leading to contradictions.

**Detection:**
- Agent says "I don't recall" or contradicts earlier advice
- API calls taking >30 seconds (bloated context)
- Token counter exceeding 80% frequently
- User re-explaining things the agent should already know

**Phase mapping:** Architecture in Phase 1 (data model for memory), implementation in Phase 2 (chat), critical refinement in Phase 3 (War Room/cross-agent).

**Confidence:** HIGH -- context window management is the most discussed challenge in LLM application development.

---

### Pitfall 5: Isometric Coordinate Math Errors (Screen-to-World and Back)

**What goes wrong:** Isometric projection requires converting between three coordinate systems: world/grid coordinates (tile x,y), isometric screen coordinates (diamond-shaped projection), and actual pixel coordinates (with camera offset and zoom). Developers get the forward transform right (world-to-screen for rendering) but botch the inverse transform (screen-to-world for mouse clicks/pathfinding). The result: BILLY walks to the wrong tile, clicks register on the wrong room, and sprite sorting renders agents behind walls.

**Why it happens:** The isometric transform is:
```
screenX = (gridX - gridY) * (tileWidth / 2)
screenY = (gridX + gridY) * (tileHeight / 2)
```
The inverse is:
```
gridX = (screenX / (tileWidth/2) + screenY / (tileHeight/2)) / 2
gridY = (screenY / (tileHeight/2) - screenX / (tileWidth/2)) / 2
```
But this only works for the origin-centered case. Add camera pan, zoom (which must be integer-only for pixel art), sprite anchor points, and tile height offsets (tall objects), and the math accumulates floating-point errors that cause off-by-one tile selections.

**Consequences:**
- Clicking on a room door makes BILLY walk to the adjacent room
- Pathfinding (BFS) calculates correct grid path but renders it offset
- Sprites render in wrong depth order (agent appears in front of wall)
- At certain zoom levels, tiles have gaps or overlaps (sub-pixel rendering)
- Mouse hover highlights the wrong tile

**Prevention:**
1. **Integer-only coordinates.** All positions, camera offsets, and zoom levels must be integers. Use `Math.round()` after every coordinate transform. For zoom, only allow 1x, 2x, 3x, 4x -- never fractional. This is already implied by the "pixel-perfect integer zoom" constraint in the project spec, but it must be enforced everywhere, including intermediate calculations.
2. **Centralize coordinate transforms.** Create a single `CoordinateSystem` class with `worldToScreen()`, `screenToWorld()`, `screenToCanvas()` (accounts for camera), and `canvasToScreen()` (accounts for DOM position). Every piece of code uses these functions; nobody hand-rolls the math.
3. **Depth sorting: use grid position, not screen Y.** Sort sprites by `(gridX + gridY)` for correct isometric depth, not by `screenY`. For objects that span multiple tiles, use the "foot" position (bottom-center of the sprite) as the sort key.
4. **Tile picking: use a color-map approach for complex tiles.** If tiles have irregular shapes (furniture, desks), render an invisible "hit test" canvas where each tile is a unique color. On click, read the pixel color to determine which tile was clicked. This is more reliable than mathematical inverse transforms for irregular shapes.
5. **Test at every zoom level.** Off-by-one errors often only manifest at specific zoom levels. Automated visual regression tests at each zoom level catch these early.

**Detection:**
- BILLY walks to wrong destination after clicking
- Visible tile gaps at certain zoom levels
- Sprite "pops" when crossing tile boundaries (depth sort error)
- Mouse hover indicator misaligned with cursor

**Phase mapping:** Must be rock-solid in Phase 1 (Canvas rendering engine). Every subsequent feature depends on correct coordinate math.

**Confidence:** HIGH -- isometric coordinate math pitfalls are extremely well-documented in game development literature.

---

### Pitfall 6: API Key Exposure in Client-Side Architecture

**What goes wrong:** The project spec says "client-side with direct Anthropic API calls" and "API key in .env, proxied through Vite dev server." In development, Vite's proxy hides the key. But if the app is ever built for production (even for deployment on a local network or sharing with a colleague), the API key is embedded in the client bundle or exposed in network requests. Anthropic's API keys do not have per-key rate limits or scoping -- a leaked key means unlimited spend.

**Why it happens:** `.env` variables prefixed with `VITE_` are inlined into the build at compile time. Developers use `VITE_ANTHROPIC_API_KEY` in development, it works great, then the production build ships with the key literally in the JavaScript bundle as a string constant.

**Consequences:**
- API key visible in browser DevTools Network tab or in built JS files
- Unauthorized usage if the app is accessible on any network
- Anthropic bill shock from leaked key abuse
- No per-user rate limiting possible

**Prevention:**
1. **Never prefix the API key with `VITE_`.** Keep it as `ANTHROPIC_API_KEY` (no VITE_ prefix) so Vite does not inline it.
2. **Use Vite's server proxy in development.** Configure `vite.config.ts` to proxy `/api/anthropic` to `https://api.anthropic.com`, injecting the API key server-side in the proxy middleware. The client never sees the key.
3. **For production: add a minimal API relay.** Even a simple Cloudflare Worker or Vercel Edge Function that forwards requests to Anthropic with the key injected server-side. This also enables rate limiting and usage tracking.
4. **Add a `.env` validator on startup** that checks: if `NODE_ENV === 'production'` and `VITE_ANTHROPIC_API_KEY` is set, throw an error with a clear message.

**Detection:**
- `VITE_ANTHROPIC_API_KEY` appears in any source file
- API key visible in browser Network tab requests
- `grep -r "VITE_ANTHROPIC" dist/` finds matches in built files

**Phase mapping:** Must be correct from Phase 1 (project setup). Trivial to do right initially, painful to fix after deployment.

**Confidence:** HIGH -- this is a well-known Vite/CRA security pitfall.

---

### Pitfall 7: War Room Parallel Streaming Causes Rate Limiting and Race Conditions

**What goes wrong:** The War Room fires 5 simultaneous API calls to Claude (one per agent). Anthropic's API has rate limits (requests per minute, tokens per minute) that vary by tier. On the free/build tier, 5 simultaneous requests can hit the RPM limit. Even on higher tiers, 5 parallel streaming responses create complex state management: What if agent 3 errors while agents 1, 2, 4, 5 are still streaming? What if the user cancels mid-stream? What if the user sends a follow-up before all agents finish?

**Why it happens:** The "broadcast to all agents" feature is conceptually simple but operationally complex. Each stream is independent, they can fail independently, and the UI must handle every combination of states across 5 streams.

**Consequences:**
- HTTP 429 (rate limit) errors kill some agent responses but not others, giving partial War Room results
- User sees 3 of 5 responses, thinks all agents responded
- Cancellation aborts some streams but not others (orphaned connections)
- Follow-up message sent while agents are still streaming creates overlapping conversations
- Memory: 5 simultaneous streaming states consume significant browser memory

**Prevention:**
1. **Implement a request queue with concurrency control.** Use a semaphore pattern (e.g., `p-limit` library or custom implementation) to limit concurrent Anthropic requests to 3-4 max, even in War Room. Queue the remaining requests. The 200ms stagger mentioned in Pitfall 2 helps here too.
2. **Unified stream lifecycle manager.** Create a `WarRoomSession` class that:
   - Tracks all 5 stream states (pending, streaming, complete, error)
   - Handles partial failure gracefully (show error for failed agent, keep others)
   - Implements cancellation via `AbortController` for ALL streams simultaneously
   - Blocks new messages until all streams are either complete or cancelled
3. **Retry with exponential backoff for 429s.** When rate-limited, retry the specific failed agent after the `retry-after` header duration. Show "Agent X is waiting..." in the UI.
4. **Pre-flight token budget check.** Before firing 5 requests, estimate the total input tokens (system prompt + context for each agent). If the total would exceed the tokens-per-minute limit, warn the user or automatically stagger.
5. **Implement request deduplication.** If the user double-clicks "send" in War Room, deduplicate the broadcast.

**Detection:**
- Console shows 429 errors during War Room sessions
- Some agent panels show "Error" while others show responses
- Agent responses appear to "restart" (stream cancelled and retried without UI indication)
- Follow-up messages produce incoherent responses (context collision)

**Phase mapping:** Critical in the War Room phase (Phase 3 or later). Build the request queue infrastructure earlier in Phase 2.

**Confidence:** HIGH -- API rate limiting and parallel request management are standard distributed systems challenges.

---

## Moderate Pitfalls

Mistakes that cause significant bugs or poor UX but are fixable without rewrites.

---

### Pitfall 8: BFS Pathfinding Without Movement Cost Causes Unnatural BILLY Walks

**What goes wrong:** Basic BFS finds the shortest path in grid steps but does not account for diagonal movement cost. BILLY walks in "staircase" patterns (alternating horizontal and vertical steps) instead of smooth diagonal paths. Also, BFS on a naive grid does not account for furniture, desks, or other agents as obstacles -- BILLY walks through desks.

**Prevention:**
1. **Use A* instead of BFS** with a proper heuristic (Chebyshev distance for 8-directional movement, Manhattan for 4-directional). A* is barely more complex than BFS and produces significantly better paths.
2. **Maintain a separate walkability grid** that marks tiles as walkable/blocked. Update it when furniture or agents are placed. Agents sitting at desks should block those tiles.
3. **Smooth path rendering.** After pathfinding, apply path smoothing (remove intermediate waypoints that are collinear) so BILLY walks in straight lines where possible, not tile-by-tile.
4. **Path caching.** Pre-compute paths between room entrances since the office layout is static. Only compute dynamic paths within rooms.

**Detection:**
- BILLY takes visually absurd routes to reach adjacent rooms
- BILLY walks through furniture or agents
- Path calculation causes frame drops (grid too large, algorithm too slow)

**Phase mapping:** Phase 1 (Canvas engine), refine in Phase 2.

**Confidence:** HIGH -- standard game development pathfinding knowledge.

---

### Pitfall 9: Zustand Store Proliferation and Subscription Leaks

**What goes wrong:** The project plans multiple Zustand stores (chat, office, deals, files, memory). Without discipline, stores multiply (one per agent, one per deal, one per room) and cross-store subscriptions create implicit coupling. Components subscribe to entire stores instead of selecting specific slices, causing unnecessary re-renders. Zustand subscriptions in `useEffect` that are not cleaned up cause memory leaks.

**Prevention:**
1. **Define stores upfront** and resist creating new ones. Five stores max: `officeStore` (game state), `chatStore` (messages, streaming state), `dealStore` (active deal, deal metadata), `fileStore` (uploaded files, parsed content), `memoryStore` (agent structured memory).
2. **Always use selectors.** `useStore(store, state => state.specificField)` instead of `useStore(store)`. Zustand re-renders only when the selected value changes.
3. **Cross-store communication via actions, not subscriptions.** If switching a deal needs to update chat + memory + office stores, have the deal store's `switchDeal` action explicitly call actions on the other stores, rather than subscribing to deal changes.
4. **For non-React consumers (game loop), use `store.subscribe()` with cleanup.**

**Detection:**
- React DevTools shows components re-rendering when unrelated state changes
- More than 7-8 Zustand stores exist
- Circular subscription patterns (store A watches store B watches store A)

**Phase mapping:** Phase 1 (state architecture), maintained throughout.

**Confidence:** HIGH -- standard Zustand best practices.

---

### Pitfall 10: PDF/DOCX Parsing Blocking the Main Thread

**What goes wrong:** PDF.js parsing is CPU-intensive, especially for large contracts (50+ pages). Running it on the main thread freezes the UI -- Canvas stops animating, chat stops streaming, the app appears crashed. DOCX parsing with mammoth.js is lighter but still blocks for large documents.

**Prevention:**
1. **Run PDF.js in a Web Worker.** PDF.js supports worker mode natively (`pdfjs.GlobalWorkerOptions.workerSrc`). Always use it.
2. **Stream page extraction.** Parse one page at a time, yielding to the main thread between pages. Show progress ("Extracting page 12 of 47...").
3. **Set a file size limit.** Warn users for files >10MB, reject files >50MB. Large files should be summarized before context injection.
4. **Cache parsed content.** Store extracted text in IndexedDB alongside the file metadata. Never re-parse the same file.

**Detection:**
- UI freezes when user drops a PDF onto the app
- Canvas animations stutter during file processing
- No progress indicator during long extractions

**Phase mapping:** Phase 2 or 3 (file handling feature).

**Confidence:** HIGH -- PDF.js Web Worker usage is in its official documentation.

---

### Pitfall 11: Sprite Animation Frame Timing Tied to requestAnimationFrame Rate

**What goes wrong:** If sprite animation frame advancement is done once per `requestAnimationFrame` callback, animations run at different speeds on 60Hz vs 120Hz vs 144Hz monitors. On a 144Hz display, BILLY walks 2.4x faster than on a 60Hz display. Idle animations look frantic on high-refresh-rate monitors.

**Prevention:**
1. **Delta-time based animation.** Pass `deltaTime` (time since last frame) to the update loop. Advance animation frames based on accumulated time, not frame count:
   ```typescript
   update(deltaTime: number) {
     this.animTimer += deltaTime;
     if (this.animTimer >= this.frameDuration) {
       this.animTimer -= this.frameDuration;
       this.currentFrame = (this.currentFrame + 1) % this.frameCount;
     }
   }
   ```
2. **Fixed timestep game loop.** Use the "fixed update, variable render" pattern: simulation runs at a fixed rate (e.g., 30 updates/sec), rendering interpolates between simulation states. This is more robust than pure delta-time for pathfinding movement.
3. **Cap frame rate.** Even if the display is 144Hz, the pixel art style does not benefit from >60fps rendering. Use `requestAnimationFrame` but skip frames when the delta is too small.

**Detection:**
- Animations look too fast on gaming monitors (>60Hz)
- BILLY's walk speed varies between devices
- Pathfinding "overshoots" destination tiles on high-refresh displays

**Phase mapping:** Phase 1 (game loop foundation).

**Confidence:** HIGH -- fundamental game development timing pattern.

---

### Pitfall 12: Auto-Summarization Quality Destroys Domain-Specific Accuracy

**What goes wrong:** Using Claude to summarize conversation history for context management sounds elegant, but LLM summarization systematically loses the details that matter most in the finance/legal domain: exact dollar amounts get rounded, contract clause numbers get dropped, date-specific deadlines get generalized ("in Q2" instead of "by April 15"), and Mexican legal terms (EFICINE, IMCINE designations, Decreto 2026 articles) get anglicized or omitted.

**Prevention:**
1. **Never summarize structured memory.** The `AgentMemory` structured data (key facts, decisions, numbers, action items) is always sent in full. Only narrative conversation history gets summarized.
2. **Domain-aware summarization prompt.** The summarization system prompt must explicitly instruct: "Preserve exact dollar amounts, dates, percentages, legal entity names, Mexican legal terms (EFICINE, IMCINE, Decreto 2026), contract clause numbers, and action item deadlines verbatim."
3. **Hierarchical summarization.** Instead of summarizing the entire history at once, summarize in chunks (e.g., per-session) and maintain a chain of summaries. This limits information loss per summarization step.
4. **User-visible summary.** Show the auto-generated summary to the user in the UI (expandable section) so they can spot when critical details are lost.

**Detection:**
- Agent gives advice that contradicts established deal parameters
- Specific numbers or dates missing from agent responses after summarization
- User re-provides information that was previously discussed

**Phase mapping:** Phase 2 (chat + context management), refined throughout.

**Confidence:** MEDIUM -- based on general LLM summarization limitations; specific domain testing needed.

---

## Minor Pitfalls

Issues that cause friction but are straightforward to fix.

---

### Pitfall 13: Canvas DPI Scaling Makes Pixel Art Blurry

**What goes wrong:** On HiDPI/Retina displays, the Canvas renders at CSS pixel resolution, not device pixel resolution. Pixel art looks blurry because the browser upscales with bilinear filtering. Developers fix the DPI issue but forget to disable image smoothing, causing sprites to look smudged.

**Prevention:**
1. Set canvas dimensions to `width * devicePixelRatio` and `height * devicePixelRatio`, then scale down with CSS.
2. Disable image smoothing: `ctx.imageSmoothingEnabled = false` (set this after every context state reset, as `save()`/`restore()` can reset it).
3. Use `image-rendering: pixelated` CSS on the canvas element as a fallback.
4. For integer zoom: multiply sprite coordinates by zoom level BEFORE drawing, do not use `ctx.scale()`.

**Detection:**
- Pixel art looks blurry on MacBook Retina displays
- Sprites have visible anti-aliasing halos
- Pixels are not crisp 1:1 squares at 1x zoom

**Phase mapping:** Phase 1 (Canvas setup, literally the first 20 lines of Canvas code).

**Confidence:** HIGH -- standard Canvas pixel art requirement.

---

### Pitfall 14: Deal Switching Race Condition

**What goes wrong:** When switching deals, multiple async operations happen: load conversation histories from IndexedDB, load deal metadata, load file references, update agent memory context. If the user switches deals rapidly (click Deal A, then Deal B before Deal A finishes loading), stale data from Deal A's load can overwrite Deal B's state.

**Prevention:**
1. **Cancellation token pattern.** Each deal switch gets a unique ID. All async operations check `if (currentDealSwitchId !== myId) return;` before writing results to state.
2. **Loading state that blocks interaction.** Show a brief loading state during deal switch that prevents further switches.
3. **Atomic deal context.** Load all deal data in a single IndexedDB transaction, then update all stores in a single synchronous batch.

**Detection:**
- Chat history shows messages from the wrong deal
- Agent memory references deals the user did not select
- UI shows Deal B's name but Deal A's data

**Phase mapping:** Phase 3 (deal rooms feature).

**Confidence:** HIGH -- standard async race condition pattern.

---

### Pitfall 15: Cross-Agent Memory Creating Circular Reasoning

**What goes wrong:** The spec says "facts from one agent inform another's responses." If Diana (CFO) extracts a fact ("Budget is $2M") and this is shared with Marcos (Counsel), Marcos might reference it in advice. If Marcos's response is then summarized and a fact extracted ("Legal advice based on $2M budget"), this gets shared back to Diana. Over multiple rounds, agents reinforce each other's assumptions without fresh grounding, creating a closed epistemic loop. If the original $2M figure was wrong or changed, the echo propagates.

**Prevention:**
1. **Source attribution on every shared fact.** Tag each cross-agent fact with its origin: `{ fact: "Budget is $2M", source: "Diana", sourceMessage: "msg-123", date: "..." }`. When displaying to another agent, include attribution.
2. **Facts have versions.** If the user corrects Diana ("Actually it's $2.5M"), the update propagates to all agents who received the old fact.
3. **One-way sharing with explicit acknowledgment.** Facts flow from source agent to others, but derived conclusions do not flow back as "facts." Only user-confirmed information becomes cross-agent facts.
4. **Staleness warnings.** If a shared fact is older than N days or N conversation turns, flag it as potentially stale.

**Detection:**
- Multiple agents cite the same fact with slight variations
- Agent advice does not change even after user corrects a key assumption
- Agents reference facts that were never directly discussed with them, without clear attribution

**Phase mapping:** Phase 4 or later (cross-agent memory feature). This is an advanced feature that should not be rushed.

**Confidence:** MEDIUM -- architectural risk specific to this multi-agent design; limited prior art.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Canvas 2D engine setup | Canvas re-render storm (P1), DPI scaling (P13), coordinate math (P5) | Mount once pattern, integer-only math, pixelated rendering | CRITICAL |
| Game loop + animations | Frame timing (P11), pathfinding quality (P8) | Delta-time/fixed timestep, A* over BFS | MODERATE |
| State architecture | Zustand proliferation (P9), Canvas-React bridge | Pre-define stores, ref-based bridge | MODERATE |
| Persistence layer | IndexedDB transactions (P3), silent data loss | Use Dexie.js, persistence abstraction | CRITICAL |
| Chat + streaming | Token render bottleneck (P2), context management (P4) | Batch tokens, priority-based context assembly | CRITICAL |
| API integration | Key exposure (P6), rate limiting (P7) | Server proxy, request queue | CRITICAL |
| File handling | Main thread blocking (P10) | Web Worker for PDF.js | MODERATE |
| War Room | Parallel streaming (P7), render contention (P2) | Concurrency limiter, staggered requests | CRITICAL |
| Deal rooms | Switching race condition (P14), context corruption | Cancellation tokens, atomic loads | MODERATE |
| Cross-agent memory | Circular reasoning (P15), summarization quality (P12) | Source attribution, structured memory | MODERATE |

---

## Sources and Confidence Notes

All findings in this document are based on training data across the following well-established domains:
- React+Canvas integration patterns (React documentation, game development community)
- IndexedDB API behavior (MDN Web Docs, Jake Archibald's writings on IDB)
- Isometric game development (game programming textbooks and community resources)
- LLM streaming interface patterns (Anthropic documentation, Vercel AI SDK patterns)
- Anthropic API rate limiting (Anthropic API documentation)
- Vite environment variable security (Vite official documentation)
- Canvas pixel art rendering (HTML5 Canvas specification, game dev community)
- Zustand state management (Zustand documentation)

**Note:** Web search verification was unavailable during this research session. Findings are based on training data which covers these topics extensively. All confidence ratings reflect this -- marked HIGH where the domain knowledge is well-established and stable, MEDIUM where project-specific validation is recommended.

Specific areas that should be validated with current documentation during implementation:
- Anthropic API rate limits for the specific pricing tier being used (these change)
- Dexie.js current version and API compatibility with the project's target browsers
- PDF.js Web Worker configuration for the current version
- React 19 specific behavior around Canvas refs and concurrent mode

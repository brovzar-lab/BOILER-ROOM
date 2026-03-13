# Phase 4: War Room - Research

**Researched:** 2026-03-12
**Domain:** Multi-agent parallel streaming, Zustand multi-stream state, BFS pathfinding orchestration, Anthropic API concurrency
**Confidence:** HIGH

## Summary

Phase 4 implements the War Room -- a broadcast-to-all-agents feature where the user types one message and receives 5 parallel streaming responses from all agents simultaneously. This requires expanding the current single-stream chatStore architecture to track 5 independent streaming states, orchestrating agent character movement to the conference table, handling API rate limits for 5 simultaneous requests, and mirroring War Room exchanges back into individual agent conversation histories.

The core technical challenge is the chatStore expansion. Currently, `chatStore.streaming` is a single `StreamingState` object (isStreaming, currentContent, abortController). The War Room requires a `Record<AgentId, StreamingState>` pattern, plus a separate "war room mode" flag and a single shared cancel mechanism. The existing `sendStreamingMessage()` function is already well-suited for parallel use -- it accepts an AbortSignal and uses callbacks, so 5 instances can run concurrently with 5 separate AbortControllers linked to one master cancel button.

For rate limits, the Anthropic API Scale tier (Tier 2+) provides 1,000+ RPM and 450,000+ ITPM for Claude Sonnet 4.x. Firing 5 simultaneous requests is well within limits. The SDK has built-in retry (maxRetries=2 by default) with exponential backoff that respects `retry-after` headers, but this only covers pre-stream 429 errors. For the War Room, custom retry logic is needed at the application level to handle 429s that occur before the stream starts flowing.

**Primary recommendation:** Expand chatStore with a `warRoomStreaming: Record<AgentId, StreamingState>` field alongside the existing single-stream `streaming` field. Create a `useWarRoom` hook that orchestrates 5 parallel `sendStreamingMessage()` calls, each with its own AbortController, all linked to a single cancel action. Agent gathering uses the existing `startWalk()` BFS pathfinding with staggered `setTimeout` calls (500-1000ms apart).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- When BILLY enters the War Room, all 5 agents **walk from their offices** to the central conference table
- Agents start walking with **staggered timing** (0.5-1s apart) for a natural, organic feel
- Agents are **seated around the conference table** in fixed positions (5 seat tiles around the 5x3 table at tile 18,14)
- **Chat input is locked** until all 5 agents are seated -- 2-3 second dramatic buildup
- When BILLY leaves the War Room, agents **walk back to their offices** (mirror of gathering)
- Agents use existing walk pathfinding (BFS) while walking to/from War Room
- API tier: **Scale tier** (1000+ RPM) -- all 5 requests **fire simultaneously** (no stagger)
- On 429 rate limit errors: **auto-retry with exponential backoff** (1-2s wait, then retry). User sees "waiting..." indicator for that agent while others keep streaming
- **Single cancel button** stops all 5 streams at once -- partial responses preserved
- WAR-05 partial failure: if 1-2 agents error (non-retryable), remaining agents still display responses
- **Full mirroring**: user's War Room message AND agent's response both appear in individual conversation threads
- **Cross-visibility via summary block**: on follow-up questions, each agent sees ~200 token summary of other 4 agents' previous round responses
- First War Room message: agents respond independently (no cross-visibility)
- War Room messages **visually tagged** with "War Room" badge in individual threads
- War Room does NOT have its own separate conversation entity -- messages live in each agent's individual conversation

### Claude's Discretion
- Parallel response layout in the 400px chat panel (design for readability with 5 simultaneous streams)
- Multi-stream store architecture (chatStore expansion pattern)
- Exact stagger timing for agent walks (0.5-1s range)
- Specific seat tile positions around the conference table
- War Room badge visual design (color, shape, text)
- Summary block format for cross-visibility injection
- Whether to show agent names/labels above each streaming response or inline
- Error state visual design per agent (for non-retryable failures)
- How to handle the "all agents are walking" loading state visually in the chat panel

### Deferred Ideas (OUT OF SCOPE)
- Deal-scoped War Room sessions -- Phase 5
- Agent-to-agent autonomous discussion -- V2/Out of scope
- War Room "minutes" (auto-generated session summary) -- Phase 7 memory feature
- Drag-and-drop files onto War Room table -- Phase 6
- War Room ambient sound (overlapping keyboard clicks) -- Phase 8
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WAR-01 | Entering War Room causes all agent characters to walk to central table | BFS pathfinding via existing `startWalk()`, staggered `setTimeout` (500-1000ms), 5 seat tile positions around conference table, `updateAllCharacters` already handles concurrent walks |
| WAR-02 | User can type a message sent to ALL 5 agents simultaneously | `useWarRoom` hook fires 5 `sendStreamingMessage()` calls with `Promise.allSettled()`, shares user message via `chatStore.addMessage()` to each agent's conversation |
| WAR-03 | Responses stream in parallel, labeled and color-coded by agent | `warRoomStreaming: Record<AgentId, StreamingState>` in chatStore, WarRoomPanel component renders 5 streaming sections using agent colors from `PersonaConfig.color` |
| WAR-04 | Each War Room response feeds back into individual conversation history | `chatStore.addMessage(convId, {...})` called per agent on stream complete, messages tagged with `source: 'war-room'` for badge rendering |
| WAR-05 | Partial failures handled gracefully (1 agent errors, others continue) | `Promise.allSettled()` pattern, per-agent error state in `warRoomStreaming`, independent `onError` callbacks per stream |
| WAR-06 | API rate limits respected via concurrency control | Scale tier supports 1,000+ RPM / 450K+ ITPM -- 5 simultaneous requests safe. SDK auto-retries 429s (maxRetries=2). Application-level retry for streaming 429 with exponential backoff |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | (existing) | Multi-stream state management | Already used for 5 stores. War Room extends chatStore with per-agent streaming state |
| @anthropic-ai/sdk | 0.78.0 (pinned) | Parallel streaming via `client.messages.stream()` | Already used. `sendStreamingMessage()` called 5x in parallel |
| react | (existing) | WarRoomPanel component tree | Existing stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | - | No new dependencies needed | All War Room functionality builds on existing stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-agent AbortControllers | Single AbortController for all 5 | Single controller is simpler but doesn't allow per-agent retry. Use 5 controllers linked to 1 cancel button |
| Promise.allSettled() | Promise.all() | `.all()` fails fast on first error, breaking WAR-05. `.allSettled()` lets all streams complete independently |
| Zustand warRoomStreaming map | Separate warRoomStore | Separate store adds complexity. Keeping it in chatStore maintains the existing Zustand bridge pattern |

## Architecture Patterns

### Recommended Project Structure
```
src/
  hooks/
    useWarRoom.ts           # War Room orchestration hook (parallel streams, cancel, retry)
  store/
    chatStore.ts            # EXPANDED: warRoomStreaming Record, warRoomSessionId, isWarRoomMode
  components/
    chat/
      ChatPanel.tsx         # EXPANDED: 'war-room' branch renders WarRoomPanel
      WarRoomPanel.tsx      # War Room chat UI (multi-stream display, shared input)
      WarRoomMessage.tsx    # Single agent's streaming response section
      WarRoomBadge.tsx      # "War Room" badge for tagged messages in individual threads
  engine/
    characters.ts           # EXPANDED: gatherAgentsToWarRoom(), disperseAgentsToOffices()
  services/
    context/
      builder.ts            # EXPANDED: injectWarRoomSummary() for cross-visibility
      warRoomSummary.ts     # NEW: generates ~200 token summaries of other agents' responses
```

### Pattern 1: Multi-Stream Zustand State
**What:** Expand chatStore with a `warRoomStreaming` record keyed by AgentId, where each entry is an independent `StreamingState`.
**When to use:** Whenever multiple parallel streams need tracked in a single store.
**Example:**
```typescript
// chatStore.ts expansion
interface ChatState {
  // ... existing fields ...

  // War Room parallel streaming
  isWarRoomMode: boolean;
  warRoomStreaming: Record<AgentId, WarRoomAgentStream>;
  warRoomRound: number;  // increments each broadcast, used for cross-visibility

  // War Room actions
  startWarRoomStream: (agentId: AgentId, abortController: AbortController) => void;
  updateWarRoomContent: (agentId: AgentId, content: string) => void;
  completeWarRoomStream: (agentId: AgentId) => void;
  failWarRoomStream: (agentId: AgentId, error: string) => void;
  cancelAllWarRoomStreams: () => void;
  setWarRoomMode: (active: boolean) => void;
}

interface WarRoomAgentStream {
  isStreaming: boolean;
  currentContent: string;
  error: string | null;
  abortController: AbortController | null;
  status: 'idle' | 'streaming' | 'complete' | 'error' | 'retrying';
}

// Initial state for all 5 agents
const createEmptyWarRoomStreaming = (): Record<AgentId, WarRoomAgentStream> => ({
  diana: { isStreaming: false, currentContent: '', error: null, abortController: null, status: 'idle' },
  marcos: { isStreaming: false, currentContent: '', error: null, abortController: null, status: 'idle' },
  sasha: { isStreaming: false, currentContent: '', error: null, abortController: null, status: 'idle' },
  roberto: { isStreaming: false, currentContent: '', error: null, abortController: null, status: 'idle' },
  valentina: { isStreaming: false, currentContent: '', error: null, abortController: null, status: 'idle' },
});
```

### Pattern 2: Parallel Stream Orchestration Hook
**What:** `useWarRoom` hook that fires 5 `sendStreamingMessage()` calls simultaneously with individual error handling.
**When to use:** For the War Room broadcast.
**Example:**
```typescript
// hooks/useWarRoom.ts
export function useWarRoom() {
  const sendBroadcast = useCallback(async (content: string) => {
    const store = useChatStore.getState();
    const agentIds: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

    // 1. Add user message to each agent's conversation
    const convIds = await Promise.all(
      agentIds.map(id => store.getOrCreateConversation(id))
    );

    await Promise.all(
      agentIds.map((id, i) =>
        store.addMessage(convIds[i], {
          conversationId: convIds[i],
          role: 'user',
          content,
          source: 'war-room',  // Tag for badge rendering
        })
      )
    );

    // 2. Fire all 5 streams simultaneously
    const streamPromises = agentIds.map((agentId, i) => {
      const controller = new AbortController();
      store.startWarRoomStream(agentId, controller);
      useOfficeStore.getState().setAgentStatus(agentId, 'thinking');

      let accumulated = '';

      return sendStreamingMessage(
        agentId,
        /* messages for this agent */,
        {
          onToken: (token) => {
            accumulated += token;
            useChatStore.getState().updateWarRoomContent(agentId, accumulated);
          },
          onComplete: async (fullContent, usage) => {
            useChatStore.getState().completeWarRoomStream(agentId);
            // Mirror response to individual conversation
            await store.addMessage(convIds[i], {
              conversationId: convIds[i],
              role: 'assistant',
              content: fullContent,
              source: 'war-room',
            });
          },
          onError: (err) => {
            // Check if retryable (429)
            if (err instanceof AnthropicError && err.status === 429) {
              // Retry with backoff (see Pattern 3)
              retryWithBackoff(agentId, /* ... */);
            } else {
              useChatStore.getState().failWarRoomStream(agentId, err.message);
            }
          },
        },
        controller.signal,
      );
    });

    // Wait for all to settle (not all -- handles partial failure per WAR-05)
    await Promise.allSettled(streamPromises);
  }, []);

  const cancelAll = useCallback(() => {
    const store = useChatStore.getState();
    store.cancelAllWarRoomStreams();  // Aborts all 5 controllers
  }, []);

  return { sendBroadcast, cancelAll };
}
```

### Pattern 3: Application-Level 429 Retry for Streaming
**What:** Custom retry logic for 429 errors that occur before stream starts. The SDK auto-retries initial connection 429s (maxRetries=2), but if the SDK exhausts its retries and still gets a 429, the application retries with exponential backoff.
**When to use:** When a specific agent's stream fails with 429 while other agents are already streaming.
**Example:**
```typescript
async function retryWithBackoff(
  agentId: AgentId,
  fn: () => Promise<void>,
  maxRetries: number = 3,
): Promise<void> {
  const store = useChatStore.getState();
  store.failWarRoomStream(agentId, 'Rate limited, retrying...');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500; // 1-1.5s, 2-2.5s, 4-4.5s
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await fn();
      return; // Success
    } catch (err) {
      if (attempt === maxRetries - 1) {
        store.failWarRoomStream(agentId, 'Failed after retries');
      }
    }
  }
}
```

### Pattern 4: Agent Gathering/Dispersal Animation
**What:** Staggered BFS walks for all 5 agents to conference table seats, with a "ready" callback when all are seated.
**When to use:** When BILLY arrives at the War Room.
**Example:**
```typescript
// engine/characters.ts addition

/** Conference table seat tiles for the 5 agents (around the 5x3 table at 18,14) */
export const WAR_ROOM_SEATS: Record<AgentId, TileCoord> = {
  diana:     { col: 19, row: 13 },  // top-left of table
  marcos:    { col: 21, row: 13 },  // top-right of table
  sasha:     { col: 17, row: 15 },  // left side of table
  roberto:   { col: 23, row: 15 },  // right side of table
  valentina: { col: 20, row: 17 },  // bottom-center of table
};

/**
 * Walk all 5 agents to their War Room seats with staggered starts.
 * Returns a Promise that resolves when all agents are seated.
 */
export function gatherAgentsToWarRoom(tileMap: TileType[][]): Promise<void> {
  return new Promise((resolve) => {
    const agentIds: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];
    let seatedCount = 0;

    agentIds.forEach((agentId, index) => {
      const delay = 500 + Math.random() * 500; // 500-1000ms stagger per agent
      setTimeout(() => {
        const seat = WAR_ROOM_SEATS[agentId];
        startWalk(agentId, seat.col, seat.row, tileMap);
      }, index * delay);
    });

    // Poll for all agents seated (check in game loop or via interval)
    const checkInterval = setInterval(() => {
      const { characters } = useOfficeStore.getState();
      const allSeated = agentIds.every(id => {
        const ch = characters.find(c => c.id === id);
        return ch && ch.state === 'idle' && ch.path.length === 0;
      });
      if (allSeated) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

/**
 * Walk all 5 agents back to their office seats.
 */
export function disperseAgentsToOffices(tileMap: TileType[][]): void {
  const agentIds: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];
  agentIds.forEach((agentId, index) => {
    const delay = 300 + Math.random() * 400; // Slightly faster dispersal
    setTimeout(() => {
      const room = ROOMS.find(r => r.id === agentId);
      if (room) {
        startWalk(agentId, room.seatTile.col, room.seatTile.row, tileMap);
      }
    }, index * delay);
  });
}
```

### Pattern 5: Cross-Visibility Summary Injection
**What:** On follow-up War Room messages (round > 1), inject a compact summary of other agents' previous responses into each agent's context.
**When to use:** For War Room follow-up questions only (not the first message in a session).
**Example:**
```typescript
// services/context/warRoomSummary.ts

/**
 * Generate a ~200 token summary block for cross-visibility.
 * Each agent sees what the other 4 said in the previous round.
 */
export function buildCrossVisibilityBlock(
  currentAgentId: AgentId,
  previousResponses: Record<AgentId, string>,
): string {
  const otherAgents = Object.entries(previousResponses)
    .filter(([id]) => id !== currentAgentId);

  if (otherAgents.length === 0) return '';

  const summaries = otherAgents.map(([id, response]) => {
    const agent = getAgent(id as AgentId);
    // Truncate each response to ~40 tokens (~160 chars)
    const truncated = response.slice(0, 160).trimEnd();
    return `- ${agent?.name ?? id} (${agent?.title ?? ''}): ${truncated}...`;
  });

  return `[War Room Context — Previous round responses from your colleagues]\n${summaries.join('\n')}`;
}
```

### Pattern 6: War Room Panel Layout (400px panel)
**What:** Stacked layout for 5 parallel streaming responses in a 400px-wide panel. Each agent gets a collapsible section with color-coded header.
**When to use:** WarRoomPanel component.
**Recommendation:**
```
+----------------------------------+
| War Room                         |
| [All agents are gathering...]    |  <- Loading state while walking
+----------------------------------+
| Diana (CFO)        [streaming]   |  <- Amber left-border accent
| "The cash flow implications..."  |
+----------------------------------+
| Marcos (Counsel)   [streaming]   |  <- Green left-border accent
| "From a legal perspective..."    |
+----------------------------------+
| Sasha (Deals)      [complete]    |  <- Blue left-border accent
| "The deal structure suggests..." |
+----------------------------------+
| Roberto (Accounting) [error]     |  <- Red error indicator
| "Rate limited, retrying..."      |
+----------------------------------+
| Valentina (Dev)    [streaming]   |  <- Purple left-border accent
| "The creative angle here is..."  |
+----------------------------------+
| [Cancel All]                     |
| [Ask the team...]                |  <- Disabled until all seated
+----------------------------------+
```

Each section scrolls independently. The full panel scrolls vertically to accommodate all 5 responses. Agent color accents come from existing `PersonaConfig.color` values.

### Anti-Patterns to Avoid
- **Single streaming state for War Room:** The existing `chatStore.streaming` must NOT be reused for War Room. It would cause race conditions between 5 agents updating the same `currentContent`.
- **Promise.all() for parallel streams:** Using `.all()` instead of `.allSettled()` would reject on the first error, losing partial responses from other agents. Always use `.allSettled()` for WAR-05 compliance.
- **Shared AbortController across all streams:** Using one controller for all 5 would prevent per-agent retry on 429 errors. Use 5 individual controllers with a `cancelAll()` action that aborts all of them.
- **Blocking UI on agent walk animation:** The chat input should be disabled but visible during the gathering animation. Do not hide the chat panel entirely.
- **Creating a separate War Room conversation entity:** Per user decision, War Room messages live in each agent's individual conversation. Do NOT create a war-room-specific conversation in IndexedDB.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limit retry | Custom HTTP retry layer | SDK built-in retry (maxRetries=2) + app-level backoff for exhausted retries | SDK already handles retry-after headers, exponential backoff, jitter. Only add app-level retry as fallback |
| BFS pathfinding for agent walks | New pathfinding for War Room | Existing `startWalk()` + `findPath()` from tileMap.ts | Already works for BILLY; agents use same grid |
| Agent status updates | Manual canvas re-rendering | Existing Zustand bridge pattern (chatStore -> officeStore -> getState() -> canvas) | Status overlay rendering already handles 'thinking' dots per agent |
| Streaming token delivery | Custom SSE parser | `sendStreamingMessage()` with callback pattern | Already proven, handles abort/partial content |
| Text summarization for cross-visibility | LLM-based summarization call | Simple truncation (~160 chars per agent) | ~200 token budget is too small for LLM summarization overhead. Truncation with ellipsis is sufficient and adds zero latency |

**Key insight:** Phase 4 requires NO new external dependencies. Every building block exists: the streaming service, the Zustand bridge, the BFS pathfinding, the character movement system. The complexity is purely in orchestrating these existing pieces for 5 agents simultaneously.

## Common Pitfalls

### Pitfall 1: Zustand Re-Render Storm from High-Frequency Updates
**What goes wrong:** 5 agents streaming simultaneously means 5 `updateWarRoomContent()` calls every few milliseconds. Each call triggers React re-renders for all subscribed components.
**Why it happens:** Naive implementation updates `warRoomStreaming[agentId].currentContent` on every token, and components subscribe to the entire `warRoomStreaming` object.
**How to avoid:** Use fine-grained selectors. Each `WarRoomMessage` component should select only its own agent's stream: `useChatStore(s => s.warRoomStreaming[agentId])`. Zustand's default equality check will prevent re-renders when other agents' content changes.
**Warning signs:** UI jank or dropped frames during parallel streaming. Profile with React DevTools Profiler.

### Pitfall 2: Agent Walk Race Condition with Chat Unlock
**What goes wrong:** Chat input unlocks before all 5 agents are seated because the "all seated" check fires between an agent's `state = 'idle'` transition and the next frame.
**Why it happens:** BFS path exhaustion sets `state = 'idle'` mid-frame. If the gathering promise checks between character updates, some agents may appear idle while still one tile away.
**How to avoid:** Check both `ch.state === 'idle'` AND `ch.path.length === 0` AND that the agent is actually at its War Room seat tile (compare `ch.tileCol/Row` to `WAR_ROOM_SEATS[agentId]`).
**Warning signs:** Chat input briefly flashes enabled then disabled, or agents appear to still be walking when the input unlocks.

### Pitfall 3: Race Between addMessage and Stream Start
**What goes wrong:** When broadcasting, the user message must be added to all 5 conversations BEFORE starting the 5 streams. If streams start before `addMessage` resolves, the API call builds context without the user message.
**Why it happens:** `addMessage` is async (writes to IndexedDB). Starting streams before awaiting all 5 `addMessage` calls creates a race.
**How to avoid:** `await Promise.all(addMessagePromises)` THEN fire all 5 streams. The stream firing is intentionally simultaneous (per user decision), but message persistence must complete first.
**Warning signs:** Agent occasionally responds to the previous message instead of the current one.

### Pitfall 4: Memory Leak from Uncleaned Abort Controllers
**What goes wrong:** If the user leaves the War Room while streams are active, AbortControllers and their event listeners are not cleaned up.
**Why it happens:** `cancelAllWarRoomStreams()` might not be called on room exit.
**How to avoid:** In the `updateAllCharacters` logic, when BILLY leaves the War Room (walks to another room), trigger `cancelAllWarRoomStreams()` and `disperseAgentsToOffices()`. Also clean up in `useWarRoom` hook's cleanup return.
**Warning signs:** Stale "thinking" dots on agents after leaving War Room, or console errors about updating unmounted components.

### Pitfall 5: Message Ordering in Individual Threads
**What goes wrong:** War Room messages appear out of order in individual agent threads because 5 async `addMessage` calls use `Date.now()` timestamps that may collide.
**Why it happens:** Multiple `addMessage` calls within the same millisecond get identical timestamps. The message list sorts by timestamp.
**How to avoid:** The user message is added once to each conversation (same timestamp is fine -- it IS the same message). The assistant responses complete at different times, so their timestamps will naturally differ. No special handling needed as long as user messages are added before streams start (see Pitfall 3).
**Warning signs:** Messages appearing in wrong order when viewing an individual agent's history.

### Pitfall 6: War Room Entry Detection vs. Agent Office Entry
**What goes wrong:** The existing `updateAllCharacters` knock-and-enter logic treats War Room entry like an agent office entry, trying to set `activeRoom` to 'war-room' and opening a chat panel for agent 'war-room'.
**Why it happens:** `getRoomAtTile()` returns the War Room room object, and the existing code tries to `setActiveRoom(room.id)` without distinguishing room types.
**How to avoid:** In `updateAllCharacters`, when `room.id === 'war-room'`, trigger the War Room gathering flow instead of the standard knock-and-enter. Set `activeRoom('war-room')` (for the ChatPanel router), but also call `gatherAgentsToWarRoom()`.
**Warning signs:** War Room entry behaves like an agent office visit -- no agents gather, normal chat panel shows.

## Code Examples

### War Room Store Expansion (chatStore.ts)
```typescript
// Add to ChatState interface
isWarRoomMode: boolean;
warRoomStreaming: Record<AgentId, WarRoomAgentStream>;
warRoomRound: number;
warRoomLastResponses: Record<AgentId, string>; // Previous round for cross-visibility

// Implementation
startWarRoomStream: (agentId, abortController) => {
  set((state) => ({
    warRoomStreaming: {
      ...state.warRoomStreaming,
      [agentId]: {
        isStreaming: true,
        currentContent: '',
        error: null,
        abortController,
        status: 'streaming',
      },
    },
  }));
},

updateWarRoomContent: (agentId, content) => {
  set((state) => ({
    warRoomStreaming: {
      ...state.warRoomStreaming,
      [agentId]: {
        ...state.warRoomStreaming[agentId],
        currentContent: content,
      },
    },
  }));
},

cancelAllWarRoomStreams: () => {
  set((state) => {
    // Abort all active controllers
    for (const stream of Object.values(state.warRoomStreaming)) {
      stream.abortController?.abort();
    }
    return {
      warRoomStreaming: createEmptyWarRoomStreaming(),
      isWarRoomMode: false,
    };
  });
},
```

### ChatPanel Router Expansion
```typescript
// ChatPanel.tsx -- add war-room branch
export function ChatPanel() {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);

  if (activeRoomId === 'war-room') {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[--color-surface-bg]">
        <WarRoomPanel />
      </div>
    );
  }

  if (isAgentRoom(activeRoomId)) {
    // ... existing agent chat panel
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[--color-surface-bg]">
      <OverviewPanel />
    </div>
  );
}
```

### Message Type Expansion
```typescript
// types/chat.ts -- add source field
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  tokenCount?: number;
  isSummary?: boolean;
  source?: 'direct' | 'war-room';  // NEW: tags War Room messages for badge
}
```

### War Room Badge Component
```typescript
// components/chat/WarRoomBadge.tsx
export function WarRoomBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-300 border border-amber-700/30">
      War Room
    </span>
  );
}
```

### Input Handler Expansion
```typescript
// engine/input.ts -- add War Room shortcut
const KEY_TO_ROOM: Record<string, string> = {
  '1': 'diana',
  '2': 'marcos',
  '3': 'sasha',
  '4': 'roberto',
  '5': 'valentina',
  'w': 'war-room',  // NEW: 'W' key navigates to War Room
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single streaming state | Per-agent streaming map | Phase 4 (this phase) | chatStore must track 5 independent streams |
| Agent-only room navigation | Room navigation includes War Room | Phase 4 (this phase) | Input handler, ChatPanel router, character movement all expand |
| Messages belong to 1 context | Messages tagged with source | Phase 4 (this phase) | Message type gets `source` field for UI badges |

**Anthropic API changes relevant to this phase:**
- Claude Sonnet 4.x rate limits: Tier 2 provides 1,000 RPM and 450,000 ITPM. 5 simultaneous requests = 5 RPM used. Well within limits even at Tier 1 (50 RPM).
- SDK v0.78.0 has built-in retry with maxRetries=2, exponential backoff, retry-after header support. For streaming, retry only applies before the stream connection is established.
- Cached input tokens do NOT count toward ITPM limits. Since all 5 agents share the base system prompt and the same user message, prompt caching could reduce effective ITPM usage by ~50%. However, prompt caching configuration is not critical for 5 requests.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest + jsdom |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WAR-01 | Agent gathering: 5 agents walk to War Room seats | unit | `npx vitest run src/engine/__tests__/warRoom.test.ts -t "gather" -x` | No -- Wave 0 |
| WAR-02 | Broadcast sends to all 5 agents | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "broadcast" -x` | No -- Wave 0 |
| WAR-03 | Parallel streaming state tracks 5 agents | unit | `npx vitest run src/store/__tests__/chatStore.warRoom.test.ts -x` | No -- Wave 0 |
| WAR-04 | War Room responses mirror to individual histories | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "mirror" -x` | No -- Wave 0 |
| WAR-05 | Partial failure: 1 agent errors, 4 continue | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "partial" -x` | No -- Wave 0 |
| WAR-06 | Rate limit retry with backoff | unit | `npx vitest run src/services/__tests__/retryBackoff.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/engine/__tests__/warRoom.test.ts` -- covers WAR-01 (agent gathering/dispersal, seat positions)
- [ ] `src/hooks/__tests__/useWarRoom.test.ts` -- covers WAR-02, WAR-04, WAR-05 (broadcast orchestration, mirroring, partial failure)
- [ ] `src/store/__tests__/chatStore.warRoom.test.ts` -- covers WAR-03 (multi-stream state management)
- [ ] `src/services/__tests__/retryBackoff.test.ts` -- covers WAR-06 (exponential backoff retry logic)

## Open Questions

1. **Exact conference table seat tile coordinates**
   - What we know: Table furniture at (18,14) size 5x3 occupies cols 18-22, rows 14-16. Interior floor of War Room is cols 17-24, rows 12-19.
   - What's unclear: Whether agents should sit directly adjacent to the table or one tile away. Adjacent tiles: top row 13, bottom row 17, left col 17, right col 23.
   - Recommendation: Use tiles immediately adjacent to the table edges: Diana (19,13), Marcos (21,13), Sasha (17,15), Roberto (23,15), Valentina (20,17). These are all walkable floor tiles within the War Room interior. Verify at implementation time by checking `isWalkable()` for each tile.

2. **Cross-visibility summary: truncation vs. LLM summarization**
   - What we know: User specified ~200 tokens for cross-visibility. At ~4 chars/token, that is ~800 chars total for 4 agent summaries, or ~200 chars per agent.
   - What's unclear: Whether simple truncation is sufficient or if an LLM call to summarize each agent's response would produce better context.
   - Recommendation: Start with truncation (160-200 chars per agent, totaling ~800 chars). LLM summarization would add latency (5 additional API calls) and complexity. If users report that cross-visibility context is too shallow, upgrade to LLM summarization in a future iteration. This is explicitly Claude's discretion.

3. **Agents returning to offices: when exactly?**
   - What we know: User said "when BILLY leaves the War Room" agents walk back.
   - What's unclear: What counts as "leaving"? Walking out of the room bounds? Clicking another room? Pressing Escape?
   - Recommendation: Trigger dispersal when `setTargetRoom()` is called with a non-war-room target while `activeRoomId === 'war-room'`. This covers clicking another room, pressing 1-5 keys, and pressing Escape. Also cancel any active War Room streams.

## Sources

### Primary (HIGH confidence)
- [Anthropic Rate Limits - Official Docs](https://platform.claude.com/docs/en/api/rate-limits) -- Complete tier breakdown, retry-after headers, token bucket algorithm, ITPM/OTPM limits
- Anthropic SDK v0.78.0 source (`node_modules/@anthropic-ai/sdk/client.mjs`) -- maxRetries=2 default, exponential backoff with jitter, retry-after header support
- Existing codebase analysis -- `sendStreamingMessage()`, `chatStore`, `useChat`, `characters.ts`, `officeLayout.ts`, `input.ts`, `renderer.ts`

### Secondary (MEDIUM confidence)
- [Anthropic API Rate Limits - Claude Docs](https://docs.claude.com/en/api/rate-limits) -- Additional rate limit documentation
- [Anthropic 429 Error Handling Guide](https://www.aifreeapi.com/en/posts/claude-api-429-error-fix) -- Best practices for retry-after header usage

### Tertiary (LOW confidence)
- None. All critical findings verified against official docs or codebase source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries verified in codebase
- Architecture: HIGH -- patterns derived from existing codebase patterns (Zustand bridge, callback streaming, BFS pathfinding)
- Rate limits: HIGH -- verified against official Anthropic docs with exact tier numbers
- Pitfalls: HIGH -- derived from codebase analysis of actual race conditions and state management patterns

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days -- stable domain, Anthropic rate limits may change but architecture patterns are solid)

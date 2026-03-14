# Phase 4: War Room - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

User can broadcast a question to all 5 agents simultaneously from the War Room and see parallel streaming responses, each color-coded and labeled by agent. Each War Room response feeds back into that agent's individual conversation history. The War Room handles partial failures gracefully, and API rate limits are respected.

**Delivers:** War Room chat panel with parallel multi-agent streaming, agent gathering/departure animations, War Room ↔ individual history mirroring, rate-limit-aware concurrency with auto-retry, partial failure handling.

**Does NOT deliver:** Deal rooms/scoping (Phase 5), file handling (Phase 6), agent memory (Phase 7), polished sprites (Phase 8), sound (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Agent Gathering Animation
- When BILLY enters the War Room, all 5 agents **walk from their offices** to the central conference table
- Agents start walking with **staggered timing** (0.5-1s apart) for a natural, organic feel — like they each got the memo at slightly different times
- Agents are **seated around the conference table** in fixed positions (5 seat tiles around the 5×3 table at tile 18,14)
- **Chat input is locked** until all 5 agents are seated — 2-3 second dramatic buildup before the War Room session begins
- When BILLY leaves the War Room, agents **walk back to their offices** (mirror of the gathering animation)
- While agents are walking to/from the War Room, their canvas characters use the existing walk pathfinding (BFS)

### Rate Limit & Concurrency
- API tier: **Scale tier** (1000+ RPM, generous token limits) — design for this tier
- All 5 requests **fire simultaneously** (no stagger delay between requests)
- On 429 rate limit errors: **auto-retry with exponential backoff** (1-2s wait, then retry). User sees a brief "waiting..." indicator for that agent while others keep streaming
- **Single cancel button** stops all 5 streams at once — partial responses from all agents are preserved
- WAR-05 partial failure: if 1-2 agents error (non-retryable), remaining agents still display their responses without interruption

### War Room ↔ Individual History
- **Full mirroring**: the user's War Room message AND the agent's response both appear in that agent's individual conversation thread. When you visit Diana's office later, you see the War Room exchange in her history
- **Cross-visibility via summary block**: on follow-up questions in the same War Room session, each agent sees a compact summary (~200 tokens) of what the other 4 agents said in the previous round. Enables real team discussion dynamics
- First War Room message in a session: agents respond independently (no cross-visibility)
- War Room messages are **visually tagged** with a "War Room" badge when viewed in an agent's individual thread — different background or badge so user knows it came from a broadcast, not a 1-on-1
- The War Room does NOT have its own separate conversation entity — messages live in each agent's individual conversation

### Claude's Discretion
- Parallel response layout in the 400px chat panel (user skipped this area — design for readability with 5 simultaneous streams)
- Multi-stream store architecture (chatStore currently has single streaming state — needs expansion for 5 parallel streams)
- Exact stagger timing for agent walks (0.5-1s range)
- Specific seat tile positions around the conference table
- War Room badge visual design (color, shape, text)
- Summary block format for cross-visibility injection
- Whether to show agent names/labels above each streaming response or inline
- Error state visual design per agent (for non-retryable failures)
- How to handle the "all agents are walking" loading state visually in the chat panel

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`sendStreamingMessage()`** (`src/services/anthropic/stream.ts`): Single-agent streaming with callbacks (onToken, onComplete, onError). War Room will call this 5 times in parallel with 5 separate AbortControllers
- **`chatStore`** (`src/store/chatStore.ts`): Has `getOrCreateConversation(agentId)`, `addMessage()`, `startStreaming()`, `stopStreaming()`. Currently single-stream — needs expansion to track 5 parallel streams for War Room mode
- **`useChat` hook** (`src/hooks/useChat.ts`): Agent-scoped chat orchestration. War Room needs a new `useWarRoom` hook (or extension) that coordinates 5 agents
- **`officeStore.agentStatuses`**: Already tracks per-agent status (idle/thinking/needs-attention). War Room sets all 5 to 'thinking' simultaneously
- **`officeStore.setAgentStatus(agentId, status)`**: Ready for War Room to call per-agent
- **`buildContext(agentId, messages, conversation)`**: Builds layered system prompts per agent. War Room uses this for each agent independently, plus injects cross-visibility summary block for follow-ups
- **`ROOMS` and `FURNITURE`** (`src/engine/officeLayout.ts`): War Room already exists at cols 16-25, rows 11-20 with conference table furniture at (18,14) size 5×3
- **`startWalk()` / `characters.ts`**: BFS pathfinding for character movement. War Room gathering reuses this to walk agents from their offices to conference table seat tiles
- **`input.ts` keyboard handlers**: Already handles number keys 1-5 for agent rooms. War Room needs a 'W' or '6' key shortcut

### Established Patterns
- **Zustand bridge**: chatStore streaming → officeStore agentStatuses → canvas rendering. War Room extends this with 5 simultaneous status updates
- **Split component pattern**: Outer component reads store + routes, inner receives stable props. War Room chat panel follows this
- **Non-reactive engine reads**: Game loop reads stores via `getState()` to avoid React re-renders. Agent gathering animation follows this pattern
- **Callback-based streaming**: `sendStreamingMessage` uses callbacks, not promises for incremental delivery. War Room calls 5 instances in parallel
- **Input focus guard**: Keyboard shortcuts check `document.activeElement?.tagName` before firing. War Room shortcuts follow this

### Integration Points
- `ChatPanel.tsx` currently shows OverviewPanel for 'billy' room and AgentChatPanel for agent rooms. Needs new branch for 'war-room' → WarRoomPanel
- `Header.tsx` already handles 'war-room' activeRoomId (shows "War Room" label)
- `characters.ts` handles BILLY's arrival at rooms and knock timer. War Room arrival triggers agent gathering instead of knock
- `renderer.ts` draws agent overlays (speech bubbles, thinking dots). May need War Room-specific rendering (e.g., all agents seated around table)
- `gameLoop.ts` passes agentStatuses to renderFrame. War Room sets all 5 to 'thinking' during broadcast
- `officeStore.initializeCharacters()` sets all agents at their office seats. War Room temporarily repositions them

</code_context>

<deferred>
## Deferred Ideas

- Deal-scoped War Room sessions (broadcast within a specific deal context) — Phase 5
- Agent-to-agent autonomous discussion (agents debate without user prompting) — V2/Out of scope
- War Room "minutes" (auto-generated summary of the session) — could be Phase 7 memory feature
- Drag-and-drop files onto the War Room table for all agents — Phase 6
- War Room ambient sound (overlapping keyboard clicks) — Phase 8

</deferred>

---

*Phase: 04-war-room*
*Context gathered: 2026-03-13 via discuss-phase*

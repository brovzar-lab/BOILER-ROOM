---
phase: 03-integration-all-agents
verified: 2026-03-12T23:45:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Room indicators show which agents have active conversations and unread responses"
    status: partial
    reason: "Canvas overlays (speech bubbles, thinking dots) work correctly, but the OverviewPanel becomes unreachable after first agent navigation because setActiveRoom('billy') is never called when BILLY returns to his office"
    artifacts:
      - path: "src/engine/characters.ts"
        issue: "Line 223: condition `room.id !== 'billy'` prevents setActiveRoom from being called when BILLY arrives at his own room, so activeRoomId stays at the previous agent"
    missing:
      - "Add setActiveRoom('billy') call when BILLY arrives at his own room (or handle billy room entry as a case in the knock timer / room entry detection)"
---

# Phase 3: Integration + All Agents Verification Report

**Phase Goal:** Walking to an agent's room opens their unique chat panel, all 5 agents have distinct personas, and agent status is visible in the office
**Verified:** 2026-03-12T23:45:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User clicks an agent room, BILLY walks there, and the chat panel slides open for that specific agent | VERIFIED | `input.ts` handleClick -> `startWalk` to room's billyStandTile; `characters.ts` knock timer -> `setActiveRoom(room.id)`; `ChatPanel.tsx` reads `activeRoomId`, renders `AgentChatPanel` with `key={activeRoomId}` and `useChat(agentId)` |
| 2 | Each of the 5 agents responds with domain-appropriate expertise | VERIFIED | 5 distinct persona files (`diana.ts`, `marcos.ts`, `sasha.ts`, `roberto.ts`, `valentina.ts`), each with detailed domain expertise and communication style; `buildContext` (builder.ts) resolves agent via `getAgent(agentId)` and injects `personaPrompt`; `sendStreamingMessage` passes `agentId` to `buildContext` |
| 3 | Each agent maintains independent conversation history that persists separately | VERIFIED | `Conversation` type has `agentId: AgentId` field; `chatStore.getOrCreateConversation(agentId)` finds existing by agentId or creates new; messages stored in IndexedDB per conversation; `ChatPanel` uses React `key={activeRoomId}` to force fresh `useChat` mount per agent |
| 4 | Agent sprites animate in sync with their status: idle at desk, typing animation while API streams, visual indicator for unread messages | VERIFIED | `useChat.ts` calls `setAgentStatus(agentId, 'thinking')` on send, then `'needs-attention'` or `'idle'` on complete; `characters.ts` lines 201-217 drive character `state` from `agentStatuses`; `renderer.ts` lines 217-276 render speech bubble (needs-attention) and amber dots (thinking) |
| 5 | Room indicators show which agents have active conversations and unread responses | PARTIAL | Canvas overlays work correctly (speech bubbles for needs-attention, thinking dots for streaming). OverviewPanel has status dots and last-message previews. However, OverviewPanel becomes unreachable after first agent navigation (see Gaps Summary below) |

**Score:** 4/5 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/config/agents/diana.ts` | CFO persona with financial domain | VERIFIED | 37 lines, detailed personaPrompt with P&L, waterfall, IRR/MOIC expertise |
| `src/config/agents/marcos.ts` | Counsel persona with legal domain | VERIFIED | 39 lines, covers distribution deals, Ley Federal de Cinematografia, fideicomisos |
| `src/config/agents/sasha.ts` | Head of Deals persona with strategy domain | VERIFIED | 37 lines, covers platform strategies, festival circuit, territorial sales |
| `src/config/agents/roberto.ts` | Head of Accounting persona with tax domain | VERIFIED | 39 lines, covers EFICINE credits, SAT reporting, incentive stacking |
| `src/config/agents/valentina.ts` | Head of Development persona with creative domain | VERIFIED | 37 lines, covers platform buyer preferences, genre trends, slate strategy |
| `src/config/agents/index.ts` | Registry with all 5 agents | VERIFIED | `Record<AgentId, PersonaConfig>` with all 5 agents, `getAgent()` accessor, `PersonaConfig` exported |
| `src/config/prompts/base.ts` | Base system prompt | VERIFIED | 20 lines, conversational brevity rules, bilingual support, Mexican entertainment context |
| `src/components/chat/ChatPanel.tsx` | Agent-switching chat panel | VERIFIED | 123 lines, outer/inner split pattern, `isAgentRoom()` guard, `key={activeRoomId}`, OverviewPanel fallback |
| `src/components/chat/OverviewPanel.tsx` | Agent cards overview grid | VERIFIED | 184 lines, 5 agent cards with color bars, status dots, last-message preview, click-to-navigate, keyboard hint |
| `src/components/chat/MessageList.tsx` | Dynamic agent name in empty state | VERIFIED | `agentName` prop with default, renders "Start a conversation with {agentName}" |
| `src/components/chat/ChatInput.tsx` | Dynamic placeholder per agent | VERIFIED | `placeholder` prop with default, `Ask ${agentName} something...` passed from ChatPanel |
| `src/components/ui/Header.tsx` | Dynamic agent indicator | VERIFIED | 81 lines, reads `activeRoomId` + `agentStatuses`, shows agent name/title/status dot or "Command Center"/"War Room" |
| `src/store/officeStore.ts` | agentStatuses map | VERIFIED | `agentStatuses: Record<string, AgentStatus>` initialized with all 5 agents idle, `setAgentStatus` action |
| `src/hooks/useChat.ts` | Status transitions | VERIFIED | Sets 'thinking' on send, 'needs-attention' or 'idle' on complete, 'idle' on error |
| `src/engine/input.ts` | Keyboard shortcuts 1-5 | VERIFIED | `KEY_TO_AGENT` map, input focus guard for TEXTAREA/INPUT, mirrors click-to-walk logic |
| `src/engine/characters.ts` | Status-driven animations | VERIFIED | Lines 201-217 drive character state from `agentStatuses`: thinking->work, idle/needs-attention->idle |
| `src/engine/renderer.ts` | Speech bubble + thinking dots overlays | VERIFIED | `renderStatusOverlays` function with white rounded rect + red dot (needs-attention) and amber triple dots (thinking) |
| `src/engine/gameLoop.ts` | Passes agentStatuses to renderFrame | VERIFIED | Line 90: `state.agentStatuses` passed as 7th argument to `renderFrame` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ChatPanel | officeStore | `useOfficeStore((s) => s.activeRoomId)` | WIRED | ChatPanel reads activeRoomId to decide agent vs overview rendering |
| ChatPanel | useChat | `useChat(agentId)` in AgentChatPanel | WIRED | AgentChatPanel passes activeRoomId as agentId to useChat hook |
| useChat | chatStore | `getOrCreateConversation(agentId)` | WIRED | Creates/finds per-agent conversation on mount |
| useChat | officeStore | `setAgentStatus(agentId, status)` | WIRED | Status transitions: thinking on send, needs-attention/idle on complete |
| officeStore -> characters.ts | agentStatuses | `state.agentStatuses` in `updateAllCharacters` | WIRED | Drives agent character state (work/idle) from status map |
| officeStore -> renderer.ts | agentStatuses | `renderStatusOverlays(ctx, chars, agentStatuses, ...)` | WIRED | Renders speech bubbles and thinking dots on canvas |
| gameLoop.ts | renderFrame | `state.agentStatuses` as argument | WIRED | Line 90 passes agentStatuses from officeStore to renderFrame |
| input.ts | characters.ts | `startWalk('billy', col, row, OFFICE_TILE_MAP)` | WIRED | Click + keyboard handlers trigger BILLY walk |
| characters.ts | officeStore | `state.setActiveRoom(room.id)` | PARTIAL | Works for agent rooms but NOT for billy's room (line 223 condition) |
| builder.ts | agents registry | `getAgent(agentId)` -> `agent.personaPrompt` | WIRED | Context builder resolves persona for any registered agent |
| stream.ts | builder.ts | `buildContext(agentId, messages, conversation)` | WIRED | Streaming service builds per-agent context before API call |
| OverviewPanel | chatStore | `useChatStore((s) => s.conversations)` | WIRED | Reads all conversations for last-message preview |
| OverviewPanel | characters.ts | `navigateToAgent -> startWalk` | WIRED | Card clicks trigger BILLY walk to agent room |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AGNT-03 | 03-01 | Marcos responds with legal analysis | SATISFIED | `marcos.ts` has detailed legal persona prompt covering contracts, IMCINE, Ley Federal |
| AGNT-04 | 03-01 | Sasha responds with deal strategy | SATISFIED | `sasha.ts` has deal strategy persona with platform strategies, festival circuit |
| AGNT-05 | 03-01 | Roberto responds with tax/incentive analysis | SATISFIED | `roberto.ts` has accounting persona with EFICINE, SAT, incentive stacking |
| AGNT-06 | 03-01 | Valentina responds with creative/market analysis | SATISFIED | `valentina.ts` has development persona with platform preferences, slate strategy |
| AGNT-07 | 03-02 | Each agent maintains independent conversation history | SATISFIED | `Conversation.agentId` field, `getOrCreateConversation(agentId)`, ChatPanel key prop forces new mount per agent |
| AGNT-08 | 03-02 | Agent status visible: idle, thinking, needs-attention | SATISFIED | `agentStatuses` in officeStore, status transitions in useChat, canvas overlays in renderer |
| NAV-03 | 03-02/03-03 | Chat panel slides open when BILLY arrives at agent room | SATISFIED | knock timer -> `setActiveRoom` -> ChatPanel reads activeRoomId -> renders AgentChatPanel |
| NAV-05 | 03-02 | Agent characters animate in sync with status | SATISFIED | `characters.ts` lines 201-217: thinking->work, idle/needs-attention->idle animation |
| NAV-06 | 03-02/03-03 | Visual indicators for active conversations and unread messages | SATISFIED | Canvas: speech bubble (needs-attention), thinking dots (thinking). OverviewPanel: status dots + last-message preview |

No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/chat/ChatPanel.tsx` | 24 | Comment says "shows a placeholder (Plan 03 adds overview)" but OverviewPanel IS already wired | Info | Stale comment, no functional impact |
| `src/engine/renderer.ts` | 7, 83 | "Furniture placeholders" | Info | Expected -- Phase 8 replaces with sprites per roadmap |
| `src/config/agents/*.ts` | 14 | "matches PLACEHOLDER_COLORS" | Info | Color comment references placeholder rendering, expected for Phase 2-3 |
| `src/hooks/useChat.ts` | 45 | Comment says "Send a user message and stream Diana's response" | Warning | Stale Phase 1 comment referencing only Diana; should say "agent's response" |
| `src/engine/characters.ts` | 223 | `room.id !== 'billy'` prevents returning to billy's room | Warning | Causes OverviewPanel to become unreachable after first agent navigation |

### Human Verification Required

### 1. Agent Domain Responses

**Test:** Navigate to each agent's room and send a domain-relevant question (e.g., "What EFICINE credits apply to our next project?" to Roberto, "What are Netflix Mexico's current commissioning priorities?" to Valentina)
**Expected:** Each agent responds with domain-appropriate expertise reflecting their persona prompt (legal from Marcos, financial from Diana, etc.)
**Why human:** Cannot verify AI response quality programmatically -- need to confirm persona differentiation is perceptible

### 2. Canvas Status Overlay Animations

**Test:** Send a message to an agent, then walk BILLY to a different room before the response completes
**Expected:** The agent's canvas sprite shows amber thinking dots during streaming, then switches to white speech bubble with red dot when response is complete (needs-attention), then clears when BILLY returns to that room
**Why human:** Canvas rendering and animation timing require visual inspection

### 3. Chat Panel Sliding Transition

**Test:** Click an agent room and watch the chat panel switch from overview to agent chat
**Expected:** Smooth transition from OverviewPanel to AgentChatPanel with the correct agent's name, title, and color bar in the header
**Why human:** Visual smoothness and timing of the panel switch cannot be verified programmatically

### 4. Keyboard Navigation

**Test:** Press keys 1 through 5 while the chat input is NOT focused
**Expected:** BILLY walks to each corresponding agent's room (1=Diana, 2=Marcos, 3=Sasha, 4=Roberto, 5=Valentina); pressing the key while typing in the chat textarea should NOT trigger navigation
**Why human:** Input focus guard behavior requires interactive testing

### 5. Independent Conversation Persistence

**Test:** Chat with Diana, switch to Marcos and chat, close the browser, reopen, navigate to each agent
**Expected:** Diana's conversation history is intact and separate from Marcos's; each agent shows their own message history
**Why human:** IndexedDB persistence across browser sessions requires manual browser testing

### Gaps Summary

One gap was identified, affecting Truth #5 (room indicators):

**OverviewPanel unreachable after first navigation:** In `src/engine/characters.ts` line 223, the condition `room.id !== 'billy'` prevents `setActiveRoom('billy')` from being called when BILLY returns to his own office. This means `activeRoomId` stays set to the last visited agent, and the `ChatPanel` continues showing that agent's chat instead of the `OverviewPanel`. The OverviewPanel -- which displays all 5 agent cards with status indicators, last-message previews, and click-to-navigate functionality -- becomes unreachable.

**Impact:** The canvas speech bubbles and thinking dots still work correctly as visual indicators (they render based on `agentStatuses` regardless of `activeRoomId`). However, the full overview dashboard with conversation previews and status dots is only visible on first load.

**Fix:** Add a case in `characters.ts` to call `setActiveRoom('billy')` when BILLY arrives at his own room, either by removing the `room.id !== 'billy'` guard or by adding a separate handler for BILLY's room entry.

---

_Verified: 2026-03-12T23:45:00Z_
_Verifier: Claude (gsd-verifier)_

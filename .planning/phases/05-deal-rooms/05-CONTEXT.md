# Phase 5: Deal Rooms - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

User can create named deals and switch between them, with every agent's context (history, files, memory) atomically scoping to the active deal. A collapsible sidebar shows all deals with activity indicators. The active deal name is always visible in the header. On session start, the deal picker always opens so the user intentionally chooses context.

**Delivers:** Deal CRUD (create, rename, archive, soft-delete), deal switcher sidebar with agent activity dots, atomic context switching across all 5 agents + War Room, deal-scoped conversation queries, deal name in header, migration prompt for existing conversations, 200-300ms fade transition on deal switch.

**Does NOT deliver:** File drag-and-drop or file storage (Phase 6), agent memory extraction (Phase 7), polished sprites or sound (Phase 8). The `dealId` scoping columns already exist in IndexedDB and the Conversation interface — this phase activates them.

</domain>

<decisions>
## Implementation Decisions

### Deal Identity & Fields
- **Name**: Required string (e.g., "Oro Verde - Netflix", "Lemon Trust I")
- **Description**: Optional one-liner free text (e.g., "Netflix MX limited series, $2.4M budget, 2026 delivery")
- **No type tags**: Keep it simple — name + description is enough context. No category dropdowns
- **Auto-generated metadata**: `id`, `createdAt`, `updatedAt`, `status` (active/archived/deleted), `deletedAt` (for soft-delete TTL)

### Deal Lifecycle
- **Create**: User clicks '+' in the deals sidebar. Name is required, description is optional
- **Rename/Edit**: Three-dot menu on each deal in the sidebar → edit name and description inline
- **Archive**: Three-dot menu → archive. Deal disappears from the main sidebar list, accessible via a "Show archived" toggle
- **Soft-delete**: Three-dot menu → delete. Confirmation dialog warns about permanent data loss. Deal moves to deleted state. Permanently purged after 7 days (or on next app load after 7 days). During the 7-day window, deal is recoverable from an "Recently deleted" section
- **No hard-delete UI**: Permanent deletion happens automatically after the 7-day TTL. No manual "permanently delete now" button

### First Load & Default Deal
- **Very first app load (no deals exist)**: Auto-create a "General" deal. User lands on the deal picker modal/sidebar showing just "General". They can start chatting immediately or create a new deal
- **General deal is a hidden catch-all**: It exists but is de-emphasized in the sidebar — shown at the bottom in a muted style, or only visible when the user toggles "Show all". New user-created deals are the primary focus
- **General deal can be renamed**: It has no special protected status. User can rename "General" to something meaningful once they start a real deal

### Session Resume Behavior
- **Every session opens with deal picker**: When the app loads, the deals sidebar opens (or a deal picker overlay appears) before the user can chat. Forces intentional deal selection. No accidental chatting in the wrong deal context
- **Last-active deal is pre-highlighted** in the picker for quick re-selection, but not auto-loaded
- **After deal selection**: Sidebar can be toggled off. Deal name stays visible in header

### Deal Switcher UI — Sidebar Panel
- **Position**: Far-left sidebar, to the left of the Canvas
- **Width**: ~200-240px when expanded
- **Toggle**: Header button toggles sidebar completely on/off. When off, Canvas takes full available width. Active deal name always visible in header regardless of sidebar state
- **Deal card contents**: Name, description (truncated to 1 line), agent dots (5 small colored circles — filled if that agent has conversation history in this deal, hollow/muted if not), relative last-activity timestamp
- **Deal order**: Most recently active at top, archived at bottom (when "Show archived" is on)
- **Create button**: '+' button at top of sidebar list
- **Deal actions**: Three-dot menu per deal card → Rename, Archive, Delete
- **Active deal highlight**: Selected deal has a distinct left border accent (amber, matching Lemon branding)

### Context Switching Transition
- **Fade crossfade**: 200-300ms opacity transition on the chat panel content when switching deals. Canvas remains stable (BILLY stays in place). Only the chat panel content (messages, agent header) fades out/in
- **Atomic swap**: All stores update simultaneously — chatStore loads deal-scoped conversations, deal context injects into buildContext Layer 3, War Room history scopes to the new deal
- **BILLY position persists**: BILLY stays in whatever room he was in. Only the conversation content changes. If he's in Diana's room, Diana's chat history swaps to the new deal's history

### Deal Context in Agent Prompts
- **buildContext Layer 3** (currently placeholder): Inject deal name and description into the system prompt. Example: "You are currently advising on the deal: Oro Verde - Netflix. Description: Netflix MX limited series, $2.4M budget, 2026 delivery."
- **Minimal injection**: Just name + description. No file summaries (Phase 6) or memory (Phase 7) here yet. Those layers remain placeholder
- **All agents see the same deal context**: The Layer 3 injection is identical across all 5 agents

### Existing Conversation Migration
- **On first load after Phase 5 upgrade**: If conversations exist without a `dealId`, show a one-time migration prompt
- **Migration prompt**: "You have existing conversations. Would you like to assign them to a deal?" with options to create a new deal for them or assign to the auto-created "General" deal
- **After assignment**: `dealId` is backfilled on all existing Conversation records and their messages. IndexedDB is updated in a single transaction
- **If user dismisses**: Conversations get assigned to "General" by default (no orphans allowed)

### Claude's Discretion
- Exact sidebar styling, padding, typography, hover states
- Deal picker modal design (if used for session-start instead of auto-opening sidebar)
- Three-dot menu implementation (dropdown, popover, etc.)
- Fade transition implementation (CSS transitions vs. framer-motion)
- How to handle "Show archived" / "Recently deleted" toggle UX
- Agent dot colors (match agent accent colors from persona config)
- Migration prompt UI design (modal, banner, inline)
- IndexedDB migration transaction strategy (version bump vs. runtime check)
- dealStore expansion details (CRUD actions, selectors, persistence wiring)
- chatStore modifications for deal-scoped conversation queries
- Keyboard shortcut for opening deal picker (if any)
- Whether deal switch resets BILLY to his office or keeps him in place (decided: keeps in place)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets — Already Built for Deal Rooms
- **`Conversation.dealId?: string`** (`src/types/chat.ts`): Already in the interface, currently unused. Phase 5 activates this field
- **IndexedDB `dealId` indexes** (`src/services/persistence/indexedDB.ts`): Already created on conversations, files, and memory stores during Phase 1 scaffolding. Zero schema migration needed
- **`PersistenceAdapter.query(store, indexName, value)`** (`src/types/persistence.ts`): Ready to query conversations by dealId index
- **`useDealStore`** (`src/store/dealStore.ts`): Stub exists with `activeDealId: string | null`. Needs full CRUD expansion
- **`buildContext()` Layer 3 placeholder** (`src/services/context/builder.ts`): Comment says "// Layers 3-5: Reserved for future phases (deal context, file summaries, memory)". Phase 5 fills Layer 3
- **`StoreName` includes 'deals'** (`src/types/persistence.ts`): The persistence type already supports a 'deals' store
- **`IndexedDB 'deals' object store`** (`src/services/persistence/indexedDB.ts`): Already created with `keyPath: 'id'`

### What Needs Changing
- **`dealStore.ts`**: Expand from stub to full CRUD (deals array, activeDealId, create/update/archive/delete actions, persistence loading)
- **`chatStore.getOrCreateConversation(agentId)`**: Currently finds by `agentId` only. Must also scope by `activeDealId` from dealStore. Signature becomes deal-aware
- **`chatStore.loadConversations()`**: Currently loads ALL conversations. Must filter by active dealId
- **`useChat` hook**: Currently takes `agentId` only. Must read `activeDealId` from dealStore for deal-scoped conversation initialization
- **`useWarRoom` hook**: War Room broadcasts must tag messages with the active dealId
- **`buildContext()`**: Add Layer 3 deal context injection (deal name + description)
- **`ChatPanel.tsx`**: Add fade transition wrapper for deal switching
- **`App.tsx`**: Add sidebar component, deal picker on load, header deal name display
- **Header component**: Add deal name display + sidebar toggle button

### Patterns to Follow
- Zustand store pattern: flat state + actions, persist to IndexedDB via `getPersistence()`
- Store reads from engine via `getState()` (non-reactive), React subscribes reactively
- Hook encapsulation: `useChat` and `useWarRoom` patterns — create a `useDealSwitcher` or similar
- PersistenceAdapter.query() for filtered reads (same pattern as messages by conversationId)

</code_context>

<deferred>
## Deferred Ideas

- Deal templates (pre-populated description and agent context for common deal types) — future enhancement
- Deal sharing/export (export a deal's full history as a document) — V2
- Deal-scoped War Room "minutes" (auto-summary of War Room sessions per deal) — Phase 7 memory feature
- Deal dashboard (aggregate view of all deals with status/health indicators) — future enhancement
- Drag-and-drop files scoped to deals — Phase 6
- Agent memory scoped to deals — Phase 7
- Deal-specific agent instructions (custom persona tweaks per deal) — future enhancement

</deferred>

---

*Phase: 05-deal-rooms*
*Context gathered: 2026-03-13 via discuss-phase*

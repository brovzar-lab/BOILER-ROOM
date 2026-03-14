# Phase 5: Deal Rooms - Research

**Researched:** 2026-03-12
**Domain:** CRUD state management, IndexedDB scoping, atomic UI context switching
**Confidence:** HIGH

## Summary

Deal Rooms is a data-scoping and CRUD phase, not a technology discovery phase. The existing infrastructure is already well-prepared: the IndexedDB schema has a `deals` object store and `dealId` indexes on `conversations`, `files`, and `memory` stores (Phase 1 created these forward-looking). The `dealStore` Zustand store exists as a stub with `activeDealId: string | null`. The `Conversation` type already has an optional `dealId?: string` field.

The core challenge is threading `dealId` through the entire data flow: conversations must be created with a `dealId`, queries must filter by `dealId`, and switching deals must atomically swap all visible state (conversations, future files, future memory) without visual flicker. The secondary challenge is a clean deal switcher UI pattern and a data migration for any pre-existing conversations into a "default" deal.

**Primary recommendation:** Extend the existing `dealStore` with full CRUD actions, add `dealId` to conversation creation in `chatStore`, and filter `loadConversations` by `activeDealId`. Use a single `switchDeal(dealId)` action that clears and reloads all deal-scoped state atomically. No new libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEAL-01 | User can create named deals | Deal CRUD in dealStore + IndexedDB `deals` store (already exists) |
| DEAL-02 | Each deal has its own conversation histories per agent | Filter conversations by `dealId` index (index already exists) |
| DEAL-03 | Each deal has its own uploaded files and agent memory | `dealId` index exists on `files` and `memory` stores; scoping pattern same as conversations |
| DEAL-04 | Switching deals atomically switches all agent contexts | `switchDeal()` action clears chatStore conversations, reloads from IndexedDB filtered by new dealId |
| DEAL-05 | Deal switcher UI shows deal name, last activity, per-agent summary | Deal metadata type with `lastActivity` timestamp; derive per-agent summary from conversation `updatedAt` |
| DEAL-06 | Active deal name is prominently displayed in the interface | Header component already has dynamic right-side content; add deal name to left side or center |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5 | Deal state management (dealStore expansion) | Already used for all 5 stores |
| idb | ^8 | IndexedDB access via PersistenceAdapter | Already the persistence layer |
| React | ^19 | Deal switcher UI components | Already the UI framework |
| Tailwind | ^4 | Styling deal switcher, deal badge in header | Already the styling system |

### Supporting
No new libraries needed. This phase uses exclusively existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual IndexedDB queries | Dexie.js | Dexie adds compound query sugar but `idb` is already integrated and the queries here are simple index lookups -- not worth the dependency |
| Zustand atomic swap | React Context for deal scope | Context causes re-render cascades; Zustand getState() is already the pattern for non-reactive reads |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── deal.ts              # Deal interface, DealSummary type
├── store/
│   └── dealStore.ts         # EXPANDED: full CRUD + switchDeal action
├── services/
│   └── persistence/
│       └── indexeddb.ts     # DB_VERSION bump to 2 for migration
├── components/
│   └── deal/
│       ├── DealSwitcher.tsx  # Dropdown/modal for deal selection + creation
│       └── DealBadge.tsx     # Active deal name badge for Header
└── hooks/
    └── useChat.ts           # Modified: uses activeDealId for conversation lookup
```

### Pattern 1: Deal-Scoped Conversation Loading
**What:** Filter conversations by `dealId` when loading, not by scanning all conversations in memory.
**When to use:** Every time `loadConversations` or `getOrCreateConversation` runs.
**Example:**
```typescript
// In chatStore.loadConversations -- filter by active deal
loadConversations: async () => {
  const persistence = getPersistence();
  const dealId = useDealStore.getState().activeDealId;
  if (!dealId) return;

  // Use the existing dealId index on conversations store
  const conversations = await persistence.query<Conversation>('conversations', 'dealId', dealId);
  const conversationMap: Record<string, Conversation> = {};

  for (const conv of conversations) {
    const messages = await persistence.query<Message>('messages', 'conversationId', conv.id);
    messages.sort((a, b) => a.timestamp - b.timestamp);
    conversationMap[conv.id] = { ...conv, messages };
  }

  set({ conversations: conversationMap, activeConversationId: null });
},
```

### Pattern 2: Atomic Deal Switching
**What:** A single `switchDeal(dealId)` action that updates `activeDealId` and triggers reload of all deal-scoped stores.
**When to use:** When user selects a different deal from the switcher.
**Example:**
```typescript
// In dealStore
switchDeal: async (dealId: string) => {
  // 1. Abort any in-flight streaming
  const chatState = useChatStore.getState();
  if (chatState.streaming.isStreaming) {
    chatState.streaming.abortController?.abort();
    chatState.stopStreaming();
  }

  // 2. Update active deal ID (synchronous -- immediate UI feedback)
  set({ activeDealId: dealId });

  // 3. Reload deal-scoped data from IndexedDB
  await useChatStore.getState().loadConversations();
  // Future phases: await useFileStore.getState().loadFiles();
  // Future phases: await useMemoryStore.getState().loadMemory();
},
```

### Pattern 3: Conversation Creation with Deal Scoping
**What:** Every new conversation gets stamped with the active `dealId`.
**When to use:** In `chatStore.getOrCreateConversation`.
**Example:**
```typescript
getOrCreateConversation: async (agentId: AgentId) => {
  const { conversations } = get();
  const dealId = useDealStore.getState().activeDealId;

  // Find existing conversation for this agent IN THIS DEAL
  const existing = Object.values(conversations).find(
    (conv) => conv.agentId === agentId && conv.dealId === dealId
  );
  if (existing) {
    set({ activeConversationId: existing.id });
    return existing.id;
  }

  // Create with dealId
  const newConversation: Conversation = {
    id: crypto.randomUUID(),
    agentId,
    dealId: dealId ?? undefined,
    messages: [],
    totalTokens: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  // ... persist and set state
},
```

### Pattern 4: Default Deal Migration
**What:** On first load after upgrade, create a "General" default deal and assign all existing conversations to it.
**When to use:** IndexedDB `upgrade` handler when bumping from version 1 to version 2.
**Example:**
```typescript
// In IndexedDB upgrade handler -- version 1 -> 2
// Note: IndexedDB upgrade transactions cannot be async in the idb wrapper,
// so migration of existing data should happen in a post-upgrade init step
async migrateToDeals(): Promise<void> {
  const persistence = getPersistence();
  const deals = await persistence.getAll<Deal>('deals');

  if (deals.length === 0) {
    // Create default deal
    const defaultDeal: Deal = {
      id: 'default',
      name: 'General',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persistence.set('deals', defaultDeal.id, defaultDeal);

    // Stamp all existing conversations with dealId = 'default'
    const conversations = await persistence.getAll<Conversation>('conversations');
    for (const conv of conversations) {
      if (!conv.dealId) {
        await persistence.set('conversations', conv.id, { ...conv, dealId: 'default' });
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Loading all conversations then filtering in JS:** Always use the IndexedDB `dealId` index to filter at the database level. Loading all conversations across all deals wastes memory and gets slower as data grows.
- **Storing dealId in localStorage:** The `dealId` is relational data, not a preference. Store it in IndexedDB alongside the deal entity. Only `activeDealId` (the user's current selection) belongs in Zustand state (and optionally localStorage for session restore).
- **Separate IndexedDB databases per deal:** This fragments data, makes cross-deal queries impossible, and complicates cleanup. Use indexes, not separate databases.
- **Cascading deletes via application code without transactions:** When deleting a deal, all its conversations and messages must be deleted in a single IndexedDB transaction to prevent orphaned data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Already used everywhere; browser-native, cryptographically random |
| IndexedDB queries | Raw IDB API calls | `idb` wrapper via existing `PersistenceAdapter` | Already abstracted; consistent error handling |
| State management | Custom pub/sub for deal switching | Zustand cross-store coordination | Already the pattern (chatStore reads officeStore via `getState()`) |
| Date formatting | Custom relative time | Inline helper (already exists in OverviewPanel) | Project decision: no date library for simple relative timestamps |

**Key insight:** This phase introduces zero new external dependencies. Every tool needed is already in the project. The challenge is purely architectural: threading `dealId` through existing patterns cleanly.

## Common Pitfalls

### Pitfall 1: Conversation Lookup Without Deal Scope
**What goes wrong:** `getOrCreateConversation('diana')` finds Diana's conversation from a DIFFERENT deal because the lookup only checks `agentId`, not `agentId + dealId`.
**Why it happens:** The current code uses `Object.values(conversations).find(conv => conv.agentId === agentId)` without filtering by deal.
**How to avoid:** Always include `dealId` in the conversation lookup predicate. The `dealId` comes from `useDealStore.getState().activeDealId`.
**Warning signs:** Agent shows conversation history from a different deal after switching.

### Pitfall 2: Race Condition on Deal Switch During Streaming
**What goes wrong:** User switches deals while an agent is streaming. The streaming response completes and writes to the NEW deal's conversation state, or the abort doesn't complete before new data loads.
**Why it happens:** Streaming is async; deal switch is a state swap that can happen mid-stream.
**How to avoid:** `switchDeal()` MUST abort any in-flight streaming FIRST (synchronously), THEN update `activeDealId`, THEN reload conversations. The abort ensures no stale callbacks fire after the switch.
**Warning signs:** Messages appearing in wrong deal, ghost streaming indicators.

### Pitfall 3: Orphaned Data on Deal Deletion
**What goes wrong:** Deleting a deal removes the deal record but leaves conversations, messages, files, and memory orphaned in IndexedDB.
**Why it happens:** No cascade delete, and IndexedDB has no foreign key constraints.
**How to avoid:** Implement `deleteDeal()` as a multi-step transaction: query all conversations by `dealId`, collect all message IDs from those conversations, delete messages, delete conversations, delete files, delete memory, delete deal -- all in one transaction if possible, or in ordered steps with error handling.
**Warning signs:** IndexedDB storage growing without bound, ghost data appearing if a new deal gets the same ID (unlikely with UUIDs but conceptually wrong).

### Pitfall 4: No Default Deal on Fresh Install
**What goes wrong:** App loads with no deals, `activeDealId` is null, no conversations can be created because `dealId` is required.
**Why it happens:** Skipping the initialization step that creates a default deal.
**How to avoid:** App initialization (in `App.tsx` or a boot function) must ensure at least one deal exists. If `deals` store is empty, create a "General" default deal and set it as active.
**Warning signs:** Blank screen, "no deal selected" state with no way to create one.

### Pitfall 5: UI Flicker on Deal Switch
**What goes wrong:** User sees a flash of empty state (no conversations) when switching deals because the old conversations are cleared before new ones load.
**Why it happens:** Two-step process: clear state, then async load from IndexedDB.
**How to avoid:** Either (a) load new conversations first, then swap atomically in a single `set()` call, or (b) show a brief loading indicator during the switch. Option (a) is preferred for deals with small data; IndexedDB reads for 5 conversations are sub-millisecond.
**Warning signs:** Brief empty chat panel flashing between deal switches.

### Pitfall 6: IndexedDB Version Bump Without Migration
**What goes wrong:** Bumping `DB_VERSION` from 1 to 2 without handling existing data causes the upgrade handler to run but existing data doesn't get `dealId` fields, breaking filtered queries.
**Why it happens:** IndexedDB upgrade only fires for schema changes (new stores/indexes), not data migration.
**How to avoid:** The existing schema already has `dealId` indexes (Phase 1 forward-planned this). No schema change is needed -- only a data migration step that runs on app boot to backfill `dealId` on legacy conversations. This does NOT require a version bump.
**Warning signs:** Existing conversations vanish after the upgrade because they have no `dealId` and the filtered query returns nothing.

## Code Examples

### Deal Type Definition
```typescript
// src/types/deal.ts
export interface Deal {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface DealSummary extends Deal {
  /** Last activity across all agents in this deal */
  lastActivity: number;
  /** Per-agent activity: agent ID -> last message timestamp (0 if no messages) */
  agentActivity: Record<string, number>;
}
```

### Expanded dealStore
```typescript
// src/store/dealStore.ts
import { create } from 'zustand';
import type { Deal } from '@/types/deal';
import { getPersistence } from '@/services/persistence/adapter';
import { useChatStore } from '@/store/chatStore';

interface DealState {
  activeDealId: string | null;
  deals: Deal[];

  // Actions
  loadDeals: () => Promise<void>;
  createDeal: (name: string) => Promise<string>;
  renameDeal: (dealId: string, newName: string) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  switchDeal: (dealId: string) => Promise<void>;
}

export const useDealStore = create<DealState>((set, get) => ({
  activeDealId: null,
  deals: [],

  loadDeals: async () => {
    const persistence = getPersistence();
    const deals = await persistence.getAll<Deal>('deals');
    deals.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ deals, activeDealId: deals[0]?.id ?? null });
  },

  createDeal: async (name: string) => {
    const deal: Deal = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const persistence = getPersistence();
    await persistence.set('deals', deal.id, deal);
    set((state) => ({ deals: [deal, ...state.deals] }));
    return deal.id;
  },

  switchDeal: async (dealId: string) => {
    // Abort streaming first
    const chatState = useChatStore.getState();
    if (chatState.streaming.isStreaming) {
      chatState.streaming.abortController?.abort();
      chatState.stopStreaming();
    }

    set({ activeDealId: dealId });
    await useChatStore.getState().loadConversations();
  },

  // ... renameDeal, deleteDeal implementations
}));
```

### Deal Switcher Component Pattern
```typescript
// src/components/deal/DealSwitcher.tsx -- structural pattern
function DealSwitcher() {
  const deals = useDealStore((s) => s.deals);
  const activeDealId = useDealStore((s) => s.activeDealId);
  const switchDeal = useDealStore((s) => s.switchDeal);
  const createDeal = useDealStore((s) => s.createDeal);

  return (
    <div className="relative">
      {/* Trigger button showing active deal name */}
      <button onClick={toggleDropdown}>
        {activeDeal?.name ?? 'No deal selected'}
      </button>

      {/* Dropdown with deal list + create option */}
      {isOpen && (
        <div className="absolute ...">
          {deals.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              isActive={deal.id === activeDealId}
              onSelect={() => switchDeal(deal.id)}
            />
          ))}
          <CreateDealRow onCreate={createDeal} />
        </div>
      )}
    </div>
  );
}
```

### Deal Badge in Header Pattern
```typescript
// In Header.tsx -- add deal name to left side
<div className="flex items-center gap-2">
  <span className="text-lg font-bold text-[--color-lemon-400] tracking-tight">
    Lemon Command Center
  </span>
  {activeDealName && (
    <>
      <span className="text-[--color-text-muted]">/</span>
      <span className="text-sm font-medium text-[--color-text-secondary]">
        {activeDealName}
      </span>
    </>
  )}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-context apps | Multi-workspace/project switching | Always been the pattern | Standard UX for tools like Slack, Linear, Notion |
| Full page reload on context switch | Atomic state swap in SPA | SPA era (2015+) | No page reload needed; Zustand makes this trivial |
| localStorage for relational data | IndexedDB with indexes | IndexedDB widely supported since 2015 | Proper querying by index, transactional integrity |

**Deprecated/outdated:**
- Nothing relevant -- this is standard CRUD + state management.

## Open Questions

1. **Should deleted deals be soft-deleted or hard-deleted?**
   - What we know: Hard delete is simpler, soft delete allows "undo"
   - What's unclear: User expectation for deal deletion (is it rare and intentional, or frequent?)
   - Recommendation: Hard delete with a confirmation dialog. Soft delete adds schema complexity (deletedAt field, filtered queries everywhere) for little value in a single-user app.

2. **Should the deal switcher be in the header or a sidebar?**
   - What we know: Header has space on the left (app name only). Deal count is likely small (5-20 deals).
   - What's unclear: Whether the user wants to see deal list persistently or only on demand.
   - Recommendation: Dropdown trigger in the header (next to app name), expanding to a panel/dropdown. Keeps the UI clean and follows Slack/Linear patterns.

3. **Should War Room conversations be deal-scoped?**
   - What we know: War Room (Phase 4) sends to all agents and feeds responses into individual histories. If those histories are deal-scoped, War Room sessions are implicitly deal-scoped.
   - What's unclear: Whether War Room should have its own conversation history separate from agent histories.
   - Recommendation: War Room conversations ARE deal-scoped by inheritance -- each agent's War Room response goes into their deal-scoped conversation. No separate War Room history store needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vitest.config.ts (via vite.config.ts) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEAL-01 | Create named deals | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "create deal"` | Wave 0 |
| DEAL-02 | Per-deal conversation histories | unit | `npx vitest run src/store/__tests__/chatStore.test.ts -t "deal-scoped"` | Wave 0 |
| DEAL-03 | Per-deal files and memory scoping | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "scoping"` | Wave 0 |
| DEAL-04 | Atomic deal switching | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "switchDeal"` | Wave 0 |
| DEAL-05 | Deal switcher UI with metadata | manual-only | Visual verification | N/A -- UI component |
| DEAL-06 | Active deal name in header | manual-only | Visual verification | N/A -- UI component |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/store/__tests__/dealStore.test.ts` -- covers DEAL-01, DEAL-03, DEAL-04
- [ ] `src/store/__tests__/chatStore.deal.test.ts` -- covers DEAL-02 (deal-scoped conversation loading)
- [ ] Mock PersistenceAdapter for tests (may already exist in engine tests pattern)

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all source files listed above (stores, types, persistence, components)
- **IndexedDB schema** -- `src/services/persistence/indexeddb.ts` already has `deals` store and `dealId` indexes
- **Zustand patterns** -- Existing cross-store coordination pattern in `useChat.ts` (reads `officeStore` from `chatStore` actions)

### Secondary (MEDIUM confidence)
- **Zustand documentation** -- `getState()` for non-reactive reads, `set()` for atomic updates are well-documented patterns
- **idb library** -- `getAllFromIndex()` for indexed queries is the standard approach

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing
- Architecture: HIGH -- patterns directly extend existing codebase conventions
- Pitfalls: HIGH -- derived from reading actual code and identifying concrete gaps

**Research date:** 2026-03-12
**Valid until:** Indefinite -- this is application-specific architecture, not library-version-dependent

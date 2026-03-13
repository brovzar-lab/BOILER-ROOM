# Phase 7: Agent Memory - Research

**Researched:** 2026-03-13
**Domain:** Structured fact extraction from LLM conversations, persistent agent memory, cross-agent knowledge sharing
**Confidence:** HIGH

## Summary

Agent Memory requires three capabilities: (1) automatic extraction of structured facts from conversations after each assistant response, (2) persistent storage and retrieval of those facts per agent per deal, and (3) injection of memory into the system prompt with cross-agent attribution. The existing codebase already has all the infrastructure pieces: an empty `memoryStore`, a reserved "Layer 5" slot in `buildContext`, IndexedDB `memory` object store with `agentId` and `dealId` indexes, and a pattern for post-response async processing (see how summarization runs after `onComplete` in `useChat`).

The core research question -- how to extract structured facts from financial domain conversations -- is solved by using the same Anthropic API the app already calls, with a dedicated extraction prompt that outputs JSON. The project uses `@anthropic-ai/sdk@0.78.0` which supports structured outputs via the beta header `structured-outputs-2025-11-13`, but given the project's simplicity-first philosophy and existing patterns, a prompt-based JSON extraction approach (identical pattern to the existing summarizer) is more reliable and avoids adding `zod` as a dependency. The extraction prompt asks Claude to output a JSON array of fact objects, and `JSON.parse()` handles deserialization.

**Primary recommendation:** Use a fire-and-forget extraction call after each assistant response (same pattern as auto-summarization), storing structured `MemoryFact` records in IndexedDB. Inject memory as a formatted text block in Layer 5 of `buildContext`. Cross-agent memory uses the existing `query()` method on the persistence adapter to fetch other agents' facts for the same deal.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEM-01 | After each conversation, key facts are automatically extracted (decisions, numbers, dates, action items) | Extraction service fires post-response in `onComplete` callback, same pattern as summarizer. Extraction prompt targets financial domain fact categories. |
| MEM-02 | Extracted memory is structured (not narrative) and stored per agent per deal | `MemoryFact` type with category, content, confidence, source fields. IndexedDB `memory` store already exists with `agentId` + `dealId` indexes. |
| MEM-03 | User can view what an agent "knows" about the current deal via a memory panel | `MemoryPanel` component slides over chat panel (same pattern as `FileViewer`). Reads from `memoryStore` filtered by current agent + deal. |
| MEM-04 | Structured memory is prepended to the agent's system prompt as context | Layer 5 in `buildContext` formats facts as structured text block. Token budget of ~2000 tokens for memory (consistent with file budget pattern). |
| MEM-05 | Structured memory is NEVER auto-summarized (only narrative history is summarizable) | Memory is stored in separate IndexedDB store (`memory`), completely independent of conversation messages. Summarizer only touches `conversations`/`messages` stores. |
| MEM-06 | Agents can reference facts from other agents' memory with attribution | Cross-agent memory block appended after own-agent memory in Layer 5. Uses `persistence.query('memory', 'dealId', dealId)` to get all agents' facts, grouped by agent name. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5 | memoryStore state management | Already used for all 5 stores in the project |
| idb | ^8 | IndexedDB persistence for memory facts | Already used, `memory` object store already created |
| @anthropic-ai/sdk | 0.78.0 | LLM call for fact extraction | Already used for chat streaming and summarization |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react | ^19 | MemoryPanel UI component | Already used for all UI components |
| tailwindcss | ^4 | MemoryPanel styling | Already used for all styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prompt-based JSON extraction | SDK structured outputs (beta) | Structured outputs guarantees schema compliance but requires beta header, possibly Zod dependency, and SDK version uncertainty. Prompt-based is simpler, matches existing summarizer pattern, and JSON.parse with try/catch is sufficient for this use case. |
| Flat fact list | Knowledge graph (Zep/Graphiti style) | Knowledge graphs handle entity relationships better but are massive overkill for a single-user client-side app. Flat categorized facts are sufficient and far simpler. |
| Post-response extraction | Real-time extraction during streaming | Real-time would add latency to the chat experience. Fire-and-forget post-response is non-blocking and matches the summarizer pattern. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── memory.ts              # MemoryFact, MemoryCategory types
├── services/
│   └── memory/
│       ├── extractMemory.ts    # LLM-based fact extraction service
│       └── memoryContext.ts    # Format memory for system prompt injection
├── store/
│   └── memoryStore.ts          # Expand existing stub with full CRUD + load
├── hooks/
│   └── useMemory.ts            # Optional: hook for MemoryPanel data access
└── components/
    └── memory/
        └── MemoryPanel.tsx     # Slide-over panel showing agent facts
```

### Pattern 1: Post-Response Memory Extraction
**What:** After each assistant response completes, fire a non-blocking API call to extract structured facts from the latest exchange.
**When to use:** Every time `onComplete` fires in `useChat` and `useWarRoom`.
**Example:**
```typescript
// In useChat onComplete callback, after addMessage:
// Fire-and-forget extraction (non-blocking, non-fatal)
void extractAndStoreMemory(agentId, userMessage, assistantMessage, dealId);
```

The extraction function:
```typescript
export async function extractAndStoreMemory(
  agentId: AgentId,
  userMessage: string,
  assistantMessage: string,
  dealId: string,
): Promise<void> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: MEMORY_EXTRACTION_PROMPT,
      messages: [{
        role: 'user',
        content: `USER: ${userMessage}\n\nASSISTANT: ${assistantMessage}`,
      }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => 'text' in b ? b.text : '')
      .join('');

    const facts: ExtractedFact[] = JSON.parse(text);
    if (!Array.isArray(facts) || facts.length === 0) return;

    // Deduplicate against existing facts, then persist
    await deduplicateAndStore(agentId, dealId, facts);
  } catch {
    // Extraction failure is non-fatal -- log and continue
    console.warn('Memory extraction failed for', agentId);
  }
}
```

### Pattern 2: System Prompt Memory Injection (Layer 5)
**What:** Format stored facts as a structured text block injected between file summaries (Layer 4) and conversation history (Layer 6).
**When to use:** Every `buildContext` call.
**Example:**
```typescript
// Layer 5: Agent memory
const { getFactsForAgent, getFactsForDeal } = useMemoryStore.getState();
const ownFacts = getFactsForAgent(agentId, activeDealId);
const allFacts = getFactsForDeal(activeDealId);

if (ownFacts.length > 0 || allFacts.length > 0) {
  let memoryBlock = '## Your Memory (Structured Facts)\n\n';

  // Own facts
  for (const fact of ownFacts) {
    memoryBlock += `- [${fact.category}] ${fact.content}\n`;
  }

  // Cross-agent facts (MEM-06)
  const otherAgentFacts = allFacts.filter(f => f.agentId !== agentId);
  if (otherAgentFacts.length > 0) {
    memoryBlock += '\n## Other Advisors\' Knowledge\n\n';
    const grouped = groupByAgent(otherAgentFacts);
    for (const [otherAgentId, facts] of Object.entries(grouped)) {
      const agent = getAgent(otherAgentId as AgentId);
      memoryBlock += `### Per ${agent?.name ?? otherAgentId}:\n`;
      for (const f of facts) {
        memoryBlock += `- [${f.category}] ${f.content}\n`;
      }
    }
  }

  layers.push(memoryBlock);
}
```

### Pattern 3: Memory Panel UI (Same as FileViewer overlay pattern)
**What:** A slide-over panel that overlays the chat panel, showing structured facts grouped by category.
**When to use:** User clicks a "Memory" button in the agent chat header.
**Example:**
```typescript
// Same absolute inset-0 z-50 pattern as FileViewer
<MemoryPanel
  agentId={activeAgentId}
  onClose={() => setShowMemory(false)}
/>
```

### Anti-Patterns to Avoid
- **Extracting from full conversation history:** Only extract from the latest exchange (user message + assistant response). The summarizer already handles full-history compression. Extracting from the full history would be slow, expensive, and produce duplicates.
- **Storing memory in the conversation object:** Memory MUST be separate from conversations to satisfy MEM-05 (never auto-summarized). The `memory` IndexedDB store is already separate.
- **Blocking chat on extraction:** Extraction is fire-and-forget. Never `await` it in the critical chat path.
- **Unbounded memory growth in prompt:** Cap memory tokens (2000 for own facts, 2000 for cross-agent) to prevent context window bloat.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fact extraction | Custom NLP/regex parser | Claude API call with extraction prompt | LLM understands financial domain context, entities, and relationships far better than regex |
| Deduplication | Exact string matching | Semantic similarity via category + content substring check | Facts may be rephrased across conversations; simple category + key-term overlap is sufficient without needing embeddings |
| Persistent storage | Custom file-based storage | Existing IndexedDB `memory` store via PersistenceAdapter | Already created in Phase 1 schema, has agentId and dealId indexes |
| State management | Custom event system | Existing memoryStore (Zustand) | Stub already exists, follows project pattern |

**Key insight:** The entire memory system is a straightforward extension of existing patterns. The extraction service mirrors the summarizer. The store mirrors fileStore. The UI mirrors FileViewer. The only genuinely new work is the extraction prompt engineering.

## Common Pitfalls

### Pitfall 1: Extraction Producing Invalid JSON
**What goes wrong:** Claude sometimes wraps JSON in markdown code fences or adds explanatory text.
**Why it happens:** Without explicit instruction, Claude tends to be conversational even when asked for JSON.
**How to avoid:** System prompt must explicitly say "Output ONLY a JSON array, no markdown fences, no explanation." Add a fallback parser that strips code fences before `JSON.parse()`.
**Warning signs:** `JSON.parse()` errors in console.

### Pitfall 2: Duplicate Facts Accumulating
**What goes wrong:** Same fact extracted repeatedly across multiple conversation turns.
**Why it happens:** Facts like "deal budget is $2M USD" will appear in every exchange that references it.
**How to avoid:** Before storing new facts, check existing facts for the same agent+deal. If a new fact's category matches and content is substantially similar (contains same key numbers/names), update the existing fact's timestamp rather than creating a duplicate.
**Warning signs:** Memory panel showing the same fact 10+ times.

### Pitfall 3: Memory Token Budget Explosion
**What goes wrong:** After many conversations, memory block exceeds context window budget.
**Why it happens:** Facts accumulate indefinitely per the MEM-05 requirement (never auto-summarized).
**How to avoid:** Cap memory injection at ~2000 tokens for own facts + ~2000 tokens for cross-agent facts. Prioritize by recency and confidence. When over budget, include most recent facts first.
**Warning signs:** `buildContext` totalTokens growing faster than expected.

### Pitfall 4: Extraction API Call Failing Silently
**What goes wrong:** Memory never gets extracted because the extraction API call silently errors.
**Why it happens:** Rate limits, network issues, or prompt issues cause the extraction to fail.
**How to avoid:** Log extraction failures at `console.warn` level. Consider a visual indicator (subtle dot or badge) showing extraction status, but don't block the user.
**Warning signs:** Memory panel stays empty despite many conversations.

### Pitfall 5: Cross-Agent Memory Creating Circular References
**What goes wrong:** Agent A sees Agent B's memory, references it in response, then Agent B extracts that reference as a new fact.
**Why it happens:** Extraction prompt doesn't distinguish between original facts and cross-referenced facts.
**How to avoid:** Tag facts with `sourceAgentId`. In the extraction prompt, instruct Claude to only extract NEW facts from the conversation, not facts that were injected from other agents' memory.
**Warning signs:** Exponential growth of nearly-identical cross-referenced facts.

## Code Examples

### MemoryFact Type Definition
```typescript
// src/types/memory.ts
import type { AgentId } from './agent';

export type MemoryCategory =
  | 'decision'       // "Decided to proceed with 3-tranche waterfall"
  | 'financial'      // "$2.4M USD production budget"
  | 'date'           // "Principal photography starts June 15, 2026"
  | 'action-item'    // "Need to file EFICINE application by April 30"
  | 'entity'         // "Co-producer: Videocine"
  | 'assumption'     // "Assuming 35% EFICINE tax credit applies"
  | 'risk'           // "Currency risk on MXN/USD if peso weakens beyond 19.5"
  | 'term';          // "Hurdle rate set at 8% IRR"

export interface MemoryFact {
  id: string;                // crypto.randomUUID()
  agentId: AgentId;          // Which agent extracted this
  dealId: string;            // Which deal this belongs to
  category: MemoryCategory;  // Structured category
  content: string;           // The fact itself (1-2 sentences max)
  confidence: 'high' | 'medium' | 'low';  // How certain the extraction is
  sourceAgentId: AgentId;    // Original agent (for cross-agent attribution)
  createdAt: number;         // Date.now()
  updatedAt: number;         // Last confirmed/updated
}
```

### Memory Extraction Prompt
```typescript
// src/services/memory/extractMemory.ts
const MEMORY_EXTRACTION_PROMPT = `You extract structured facts from conversations about film/television production deals.

Given a conversation exchange between a user (Billy, CEO) and an advisor, extract key facts as a JSON array.

Categories:
- "decision": Explicit decisions or commitments made
- "financial": Dollar amounts, budgets, percentages, financial metrics (IRR, MOIC, hurdle rates)
- "date": Dates, deadlines, timelines
- "action-item": Tasks, next steps, things to follow up on
- "entity": People, companies, organizations, projects mentioned
- "assumption": Assumptions being made in analysis
- "risk": Risks, concerns, potential problems identified
- "term": Deal terms, contract terms, legal structures

Rules:
- Output ONLY a JSON array. No markdown fences. No explanation.
- Each object: { "category": string, "content": string, "confidence": "high"|"medium"|"low" }
- "content" should be a concise factual statement (1-2 sentences max)
- Only extract NEW facts from this exchange. Do not extract facts that were clearly injected as prior context.
- If no new facts are present, output an empty array: []
- "high" confidence: explicitly stated numbers, dates, or decisions
- "medium" confidence: implied or discussed but not finalized
- "low" confidence: speculative or conditional

Example output:
[
  {"category":"financial","content":"Production budget is $2.4M USD with 60/40 MXN/USD split","confidence":"high"},
  {"category":"date","content":"EFICINE application deadline is April 30, 2026","confidence":"high"},
  {"category":"action-item","content":"Need to send term sheet to Videocine by end of week","confidence":"medium"}
]`;
```

### Memory Store Expansion
```typescript
// src/store/memoryStore.ts (expanded from stub)
import { create } from 'zustand';
import type { AgentId } from '@/types/agent';
import type { MemoryFact } from '@/types/memory';
import { getPersistence } from '@/services/persistence/adapter';

interface MemoryState {
  facts: MemoryFact[];
  isExtracting: boolean;

  loadFacts: (dealId: string) => Promise<void>;
  addFacts: (facts: MemoryFact[]) => Promise<void>;
  removeFact: (factId: string) => Promise<void>;
  getFactsForAgent: (agentId: AgentId, dealId: string) => MemoryFact[];
  getFactsForDeal: (dealId: string) => MemoryFact[];
  setExtracting: (value: boolean) => void;
}
```

### BuildContext Layer 5 Integration
```typescript
// Addition to src/services/context/builder.ts
// After Layer 4 (files), before systemPrompt join:

// Layer 5: Agent memory
const MEMORY_TOKEN_CAP = 2000;
const CROSS_AGENT_TOKEN_CAP = 2000;

const { facts } = useMemoryStore.getState();
const ownFacts = facts
  .filter(f => f.agentId === agentId && f.dealId === activeDealId)
  .sort((a, b) => b.updatedAt - a.updatedAt);

if (ownFacts.length > 0) {
  let memoryBlock = '## Your Memory\n\n';
  let usedTokens = 0;
  for (const fact of ownFacts) {
    const line = `- [${fact.category}] ${fact.content}\n`;
    const tokens = estimateTokens(line);
    if (usedTokens + tokens > MEMORY_TOKEN_CAP) break;
    memoryBlock += line;
    usedTokens += tokens;
  }
  layers.push(memoryBlock);
}

// Cross-agent facts (MEM-06)
const crossFacts = facts
  .filter(f => f.agentId !== agentId && f.dealId === activeDealId)
  .sort((a, b) => b.updatedAt - a.updatedAt);

if (crossFacts.length > 0) {
  let crossBlock = '## Other Advisors\' Notes\n\n';
  let usedTokens = 0;
  // Group by agent
  const byAgent = new Map<AgentId, MemoryFact[]>();
  for (const f of crossFacts) {
    const arr = byAgent.get(f.agentId as AgentId) ?? [];
    arr.push(f);
    byAgent.set(f.agentId as AgentId, arr);
  }
  for (const [otherAgent, agentFacts] of byAgent) {
    const persona = getAgent(otherAgent);
    crossBlock += `### Per ${persona?.name ?? otherAgent}:\n`;
    for (const f of agentFacts) {
      const line = `- [${f.category}] ${f.content}\n`;
      const tokens = estimateTokens(line);
      if (usedTokens + tokens > CROSS_AGENT_TOKEN_CAP) break;
      crossBlock += line;
      usedTokens += tokens;
    }
  }
  layers.push(crossBlock);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RAG with vector embeddings for memory | Structured fact extraction + categorization | 2024-2025 | Simpler for single-user apps, no vector DB needed |
| Knowledge graphs (Zep/Graphiti) | Flat structured facts for simple use cases | 2025 | KG is for multi-user/complex relationship tracking; flat facts suffice here |
| Manual memory management | Automatic extraction post-conversation | 2024 (Mem0, etc.) | Users don't have to tag/save facts manually |
| Full conversation replay for context | Structured memory + narrative summary | 2024-2025 | Separating structured facts from narrative history enables MEM-05 |

**Deprecated/outdated:**
- Embedding-based memory retrieval for single-user apps: overkill when you can load all facts for a deal into the prompt directly
- Storing memory as unstructured notes: loses queryability and category-based filtering

## Open Questions

1. **Extraction frequency for War Room**
   - What we know: War Room produces 5 responses simultaneously. Each should trigger extraction.
   - What's unclear: Should all 5 extractions run in parallel, or staggered to avoid rate limits?
   - Recommendation: Run in parallel with Promise.allSettled (same pattern as War Room streaming). Rate limits are unlikely at 5 additional requests, and the project is on Scale tier (1000+ RPM per Phase 4 research).

2. **User editing of extracted facts**
   - What we know: MEM-03 requires a memory panel to VIEW facts. Requirements don't mention editing.
   - What's unclear: Should users be able to delete incorrect facts?
   - Recommendation: Add a delete button per fact (simple, low cost). Skip editing -- if a fact is wrong, delete it and the correct version will be re-extracted from future conversations.

3. **Memory loading on deal switch**
   - What we know: Deal switching atomically swaps all agent contexts (DEAL-04).
   - What's unclear: Should memory be eagerly loaded for all agents on deal switch, or lazily per agent?
   - Recommendation: Eager load all facts for the active deal into memoryStore on deal switch (single IndexedDB query via `dealId` index). Facts are small (text only), so loading all is cheap.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEM-01 | Extraction service parses conversation and returns structured facts | unit | `npx vitest run src/services/memory/__tests__/extractMemory.test.ts -x` | Wave 0 |
| MEM-02 | memoryStore CRUD: add, load, remove facts with agent+deal scoping | unit | `npx vitest run src/store/__tests__/memoryStore.test.ts -x` | Wave 0 |
| MEM-03 | MemoryPanel renders facts grouped by category | unit | `npx vitest run src/components/memory/__tests__/MemoryPanel.test.tsx -x` | Wave 0 |
| MEM-04 | buildContext includes memory block in system prompt (Layer 5) | unit | `npx vitest run src/services/context/__tests__/builder.memory.test.ts -x` | Wave 0 |
| MEM-05 | Memory facts survive conversation summarization unchanged | integration | `npx vitest run src/services/memory/__tests__/memorySurvivesSummarization.test.ts -x` | Wave 0 |
| MEM-06 | buildContext includes cross-agent facts with attribution | unit | `npx vitest run src/services/context/__tests__/builder.memory.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/types/memory.ts` -- MemoryFact type definition
- [ ] `src/services/memory/__tests__/extractMemory.test.ts` -- extraction service tests
- [ ] `src/store/__tests__/memoryStore.test.ts` -- memory store CRUD tests
- [ ] `src/services/context/__tests__/builder.memory.test.ts` -- Layer 5 injection tests
- [ ] `src/components/memory/__tests__/MemoryPanel.test.tsx` -- panel render tests (if UI plan included)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/services/context/builder.ts` Layer 5 reservation, `src/store/memoryStore.ts` stub, `src/services/persistence/indexeddb.ts` memory store schema
- Codebase analysis: `src/services/context/summarizer.ts` pattern for post-response async LLM calls
- Codebase analysis: `src/hooks/useChat.ts` onComplete callback pattern for fire-and-forget operations
- Anthropic docs: [Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- JSON schema compliance feature

### Secondary (MEDIUM confidence)
- [Mem0 research paper](https://arxiv.org/pdf/2504.19413) -- Production agent memory architecture with entity extraction and conflict detection
- [Zep temporal knowledge graph](https://blog.getzep.com/content/files/2025/01/ZEP__USING_KNOWLEDGE_GRAPHS_TO_POWER_LLM_AGENT_MEMORY_2025011700.pdf) -- Entity extraction from conversation episodes
- [Schema Design for Agent Memory](https://medium.com/@pranavprakash4777/schema-design-for-agent-memory-and-llm-history-38f5cbc126fb) -- Three-layer memory schema (short-term, long-term, episodic)

### Tertiary (LOW confidence)
- [ICLR 2026 MemAgents Workshop](https://openreview.net/pdf?id=U51WxL382H) -- Academic taxonomy of memory mechanisms (validates structured approach)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all infrastructure exists
- Architecture: HIGH - Patterns mirror existing summarizer, fileStore, FileViewer 1:1
- Pitfalls: HIGH - Common LLM extraction pitfalls are well-documented; deduplication is the main risk
- Extraction prompt: MEDIUM - Financial domain extraction prompt needs empirical tuning; initial version based on summarizer prompt patterns and domain knowledge

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- no fast-moving dependencies)

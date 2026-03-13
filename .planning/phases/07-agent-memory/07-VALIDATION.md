---
phase: 7
slug: agent-memory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | MEM-01 | unit | `npx vitest run src/services/memory/__tests__/extractMemory.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | MEM-02 | unit | `npx vitest run src/store/__tests__/memoryStore.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | MEM-04 | unit | `npx vitest run src/services/context/__tests__/builder.memory.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | MEM-06 | unit | `npx vitest run src/services/context/__tests__/builder.memory.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | MEM-05 | integration | `npx vitest run src/services/memory/__tests__/memorySurvivesSummarization.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | MEM-03 | unit | `npx vitest run src/components/memory/__tests__/MemoryPanel.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/types/memory.ts` — MemoryFact type definition
- [ ] `src/services/memory/__tests__/extractMemory.test.ts` — extraction service tests
- [ ] `src/store/__tests__/memoryStore.test.ts` — memory store CRUD tests
- [ ] `src/services/context/__tests__/builder.memory.test.ts` — Layer 5 injection tests
- [ ] `src/services/memory/__tests__/memorySurvivesSummarization.test.ts` — summarization survival tests
- [ ] `src/components/memory/__tests__/MemoryPanel.test.tsx` — panel render tests

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Memory extraction triggers after real chat | MEM-01 | Requires live Anthropic API | Chat with agent, verify facts appear in memory panel |
| Memory influences response quality | MEM-04 | Subjective quality assessment | Chat, check agent references stored facts |
| Cross-agent attribution displays correctly | MEM-06 | Visual verification | Switch agents, verify "Per Diana's..." attribution |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

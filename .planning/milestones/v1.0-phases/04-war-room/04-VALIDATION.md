---
phase: 04
slug: war-room
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + jsdom |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | WAR-01 | unit | `npx vitest run src/engine/__tests__/warRoom.test.ts -t "gather" -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | WAR-02 | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "broadcast" -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | WAR-03 | unit | `npx vitest run src/store/__tests__/chatStore.warRoom.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | WAR-04 | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "mirror" -x` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | WAR-05 | unit | `npx vitest run src/hooks/__tests__/useWarRoom.test.ts -t "partial" -x` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | WAR-06 | unit | `npx vitest run src/services/__tests__/retryBackoff.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/__tests__/warRoom.test.ts` — stubs for WAR-01 (agent gathering/dispersal, seat positions)
- [ ] `src/hooks/__tests__/useWarRoom.test.ts` — stubs for WAR-02, WAR-04, WAR-05 (broadcast orchestration, mirroring, partial failure)
- [ ] `src/store/__tests__/chatStore.warRoom.test.ts` — stubs for WAR-03 (multi-stream state management)
- [ ] `src/services/__tests__/retryBackoff.test.ts` — stubs for WAR-06 (exponential backoff retry logic)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 5 agents visually walk to table | WAR-01 | Canvas animation is visual | Enter War Room, observe staggered walking, confirm all 5 reach seats |
| Color-coded parallel streaming | WAR-03 | Visual rendering in chat panel | Send War Room message, verify each agent response has correct color accent |
| War Room badge in individual threads | WAR-04 | Visual badge rendering | After War Room session, visit agent office, confirm badge on mirrored messages |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

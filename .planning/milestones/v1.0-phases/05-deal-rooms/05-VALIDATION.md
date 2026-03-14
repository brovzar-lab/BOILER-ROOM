---
phase: 5
slug: deal-rooms
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vitest.config.ts (via vite.config.ts) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DEAL-01 | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "create deal"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DEAL-02 | unit | `npx vitest run src/store/__tests__/chatStore.deal.test.ts -t "deal-scoped"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | DEAL-03 | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "scoping"` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | DEAL-04 | unit | `npx vitest run src/store/__tests__/dealStore.test.ts -t "switchDeal"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | DEAL-05 | manual | Visual verification of deal switcher | N/A | ⬜ pending |
| 05-02-02 | 02 | 2 | DEAL-06 | manual | Visual verification of header deal name | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/__tests__/dealStore.test.ts` — stubs for DEAL-01, DEAL-03, DEAL-04
- [ ] `src/store/__tests__/chatStore.deal.test.ts` — stubs for DEAL-02 (deal-scoped conversation loading)
- [ ] Mock PersistenceAdapter for store tests (check if existing test patterns provide one)

*Existing vitest infrastructure covers framework needs — only test files for new stores/behaviors needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deal switcher sidebar UI | DEAL-05 | Visual layout, interaction design | Open app, verify sidebar shows deals with name, description, agent dots, last activity |
| Active deal name in header | DEAL-06 | Visual placement and styling | Open app, verify header displays active deal name, updates on deal switch |
| Deal creation flow | DEAL-01 | End-to-end interaction | Click '+' in sidebar, enter deal name, verify deal appears in list |
| Atomic deal switching feel | DEAL-04 | Fade transition UX | Switch deals, verify 200-300ms crossfade on chat panel content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

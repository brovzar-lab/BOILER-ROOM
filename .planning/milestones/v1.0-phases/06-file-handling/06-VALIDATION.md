---
phase: 6
slug: file-handling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (via vite.config.ts) |
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
| 06-01-01 | 01 | 1 | FILE-01, FILE-02 | unit | `npx vitest run src/services/files/__tests__/fileService.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | FILE-06 | unit | `npx vitest run src/store/__tests__/fileStore.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | FILE-03 | unit | `npx vitest run src/services/context/__tests__/builder.test.ts -t "file" -x` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | FILE-04 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "file icon" -x` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | FILE-05 | manual-only | Visual: click file icon, verify slide-out panel | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | FILE-01 | manual-only | Visual: drag PDF over desk, verify highlight + tooltip | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/files/__tests__/fileService.test.ts` — stubs for FILE-01, FILE-02 (mock pdfjs-dist and mammoth)
- [ ] `src/store/__tests__/fileStore.test.ts` — stubs for FILE-06
- [ ] `src/services/context/__tests__/builder.test.ts` — extend for FILE-03 (file layer)
- [ ] `src/engine/__tests__/renderer.test.ts` — extend for FILE-04 (file icons)
- [ ] Mock for `pdfjs-dist` in tests (Worker not available in jsdom/vitest)
- [ ] Mock for `mammoth` in tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Click file icon shows slide-out panel | FILE-05 | Requires canvas click + React panel interaction | Click file icon on desk, verify panel slides out with rich preview |
| Drag-and-drop visual feedback | FILE-01 | Requires real drag events over canvas | Drag PDF over agent desk, verify desk highlight and tooltip on invalid areas |
| File icon hover tooltip | FILE-04 | Canvas hover + tooltip rendering | Hover over file icon, verify filename tooltip appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

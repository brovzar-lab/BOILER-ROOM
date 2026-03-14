---
phase: 13
slug: polish-and-ui
status: draft
nyquist_compliant: true
wave_0_complete: false
wave_0_plan: "13-00"
created: 2026-03-14
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/engine/__tests__/renderer.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/__tests__/renderer.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-00-01 | 00 | 0 | ENV-03, ENV-04, ENV-05, ENV-07, UI-03, UI-05 | stub | `npx vitest run --reporter=verbose 2>&1 \| grep todo` | Creates | pending |
| 13-01-01 | 01 | 1 | ENV-03 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "glow"` | W0 (13-00) | pending |
| 13-01-02 | 01 | 1 | ENV-04 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "lamp"` | W0 (13-00) | pending |
| 13-01-03 | 01 | 1 | ENV-05 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "rug"` | W0 (13-00) | pending |
| 13-01-04 | 01 | 1 | ENV-06 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "plant"` | Partial | pending |
| 13-01-05 | 01 | 1 | ENV-07 | unit | `npx vitest run src/engine/__tests__/officeLayout.test.ts -t "decoration"` | W0 (13-00) | pending |
| 13-02-01 | 02 | 1 | UI-05 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "room label"` | W0 (13-00) | pending |
| 13-03-01 | 03 | 2 | UI-01 | smoke | Manual visual verification | manual-only | pending |
| 13-03-02 | 03 | 2 | UI-02 | smoke | Manual visual verification | manual-only | pending |
| 13-03-03 | 03 | 2 | UI-03 | unit | `npx vitest run src/components/__tests__/DealCard.test.tsx -t "activity"` | W0 (13-00) | pending |
| 13-03-04 | 03 | 2 | UI-04 | smoke | Manual visual verification | manual-only | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] Add glow/lamp/rug/room-label test stubs to `src/engine/__tests__/renderer.test.ts` — covers ENV-03, ENV-04, ENV-05, UI-05
- [ ] Add decoration count/key stubs to `src/engine/__tests__/officeLayout.test.ts` — covers ENV-07
- [ ] Create `src/components/__tests__/DealCard.test.tsx` with activity stubs — covers UI-03

*Wave 0 test stubs created by 13-00-PLAN.md (must execute before plans 01/02/03).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat panel layout with inline buttons | UI-01 | Visual layout quality | Open chat with any agent, verify Attach/Memory in input area, accent color bar, file badge |
| Deals sidebar always visible | UI-02 | Layout persistence | Load app, verify sidebar visible. Click collapse arrow, verify thin strip with deal name |
| Active deal name prominence | UI-04 | Visual emphasis | Create/select a deal, verify name is large bold at sidebar top |
| Day/night palette shift | Context | Time-dependent visual | Check during day hours and night hours (or adjust system clock) |
| Glow effects visual quality | ENV-03, ENV-04 | Subjective visual quality | Verify blue monitor halos and amber lamp circles look good at various zoom levels |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (via 13-00-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready (pending 13-00 execution)

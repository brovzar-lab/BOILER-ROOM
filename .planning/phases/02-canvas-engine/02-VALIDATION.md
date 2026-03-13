---
phase: 02
slug: canvas-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3 (not yet installed) |
| **Config file** | None — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ENGN-06 | unit | `npx vitest run src/engine/__tests__/gameLoop.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ENGN-02 | unit | `npx vitest run src/engine/__tests__/tileMap.test.ts -t "rooms"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | NAV-01 | unit | `npx vitest run src/engine/__tests__/tileMap.test.ts -t "pathfinding"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | ENGN-04 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "zoom"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | ENGN-05 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "hidpi"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | NAV-02 | integration | `npx vitest run src/engine/__tests__/characters.test.ts -t "walk"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | NAV-04 | unit | `npx vitest run src/engine/__tests__/characters.test.ts -t "idle"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | ENGN-03 | unit | `npx vitest run src/engine/__tests__/officeLayout.test.ts -t "furniture"` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | ENGN-01 | manual-only | Visual inspection: 60fps in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest + canvas mock: `npm install -D vitest vitest-canvas-mock @vitest/coverage-v8`
- [ ] Create `vitest.config.ts` with jsdom environment and canvas mock setup
- [ ] `src/engine/__tests__/tileMap.test.ts` — stubs for ENGN-02, NAV-01
- [ ] `src/engine/__tests__/officeLayout.test.ts` — stubs for ENGN-03
- [ ] `src/engine/__tests__/renderer.test.ts` — stubs for ENGN-04, ENGN-05
- [ ] `src/engine/__tests__/gameLoop.test.ts` — stubs for ENGN-06
- [ ] `src/engine/__tests__/characters.test.ts` — stubs for NAV-02, NAV-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 60fps rendering | ENGN-01 | Requires real browser GPU rendering | Open app, open DevTools Performance tab, record 5s, verify frame rate stays above 55fps with no dropped frames |
| Pixel-perfect zoom visual | ENGN-04 | Visual verification of no blur/aliasing | Zoom in/out, screenshot, verify crisp pixel edges at each zoom level |
| Camera follow smoothness | NAV-02 | Feel-based quality check | Click distant room, observe BILLY walking, verify camera follows smoothly without jitter |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

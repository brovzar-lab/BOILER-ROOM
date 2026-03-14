---
phase: 12
slug: smooth-zoom
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/engine/__tests__/zoomController.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/engine/__tests__/zoomController.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | ZOOM-01 | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "wheel input"` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | ZOOM-02 | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "cursor centered"` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | ZOOM-03 | unit | `npx vitest run src/engine/__tests__/zoomController.test.ts -t "snap"` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | ZOOM-04 | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -t "quantized"` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | ZOOM-05 | unit | `npx vitest run src/engine/__tests__/gameLoop.test.ts -t "auto-fit"` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/__tests__/zoomController.test.ts` — stubs for ZOOM-01, ZOOM-02, ZOOM-03 (wheel input, cursor-centered zoom, snap/settle)
- [ ] `src/engine/__tests__/spriteSheet.test.ts` — stubs for ZOOM-04 (quantized cache keys)

*Existing `gameLoop.test.ts` partially covers ZOOM-05 (auto-fit).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trackpad pinch feels smooth | ZOOM-01 | Gesture feel is subjective | Open app, pinch on trackpad, verify no jitter or snapping during active gesture |
| Inertia momentum feels natural | ZOOM-01 | Deceleration curve is subjective | Fast pinch, verify zoom continues briefly then decelerates |
| Snap animation looks polished | ZOOM-03 | Visual animation quality | Stop zooming at non-0.5 value, verify smooth ease-out to nearest 0.5 |
| Camera pixel alignment at rest | ZOOM-03 | Sub-pixel rendering quality | After snap settles, verify tile edges are crisp (no blur) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

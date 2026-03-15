---
phase: 14
slug: limezu-art-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | CHAR-01 | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -x` | Needs update | ⬜ pending |
| 14-01-02 | 01 | 1 | CHAR-02 | unit | `npx vitest run src/engine/__tests__/spriteAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-01-03 | 01 | 1 | CHAR-03 | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -x` | Needs update | ⬜ pending |
| 14-01-04 | 01 | 1 | CHAR-04 | unit | `npx vitest run src/engine/__tests__/depthSort.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-01 | 02 | 1 | ENV-08 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-02 | 02 | 1 | ENV-09 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-03 | 02 | 1 | ENV-10 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-04 | 02 | 1 | ENV-11 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-05 | 02 | 1 | ENV-12 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-06 | 02 | 1 | ENV-13 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-02-07 | 02 | 1 | ENV-14 | unit | `npx vitest run src/engine/__tests__/spriteSheet.test.ts -x` | Needs update | ⬜ pending |
| 14-03-01 | 03 | 2 | UI-06 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |
| 14-03-02 | 03 | 2 | UI-07 | unit | `npx vitest run src/engine/__tests__/limeZuAtlas.test.ts -x` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/engine/__tests__/limeZuAtlas.test.ts` — stubs for ENV-08 through ENV-13, UI-06, UI-07 (atlas key resolution)
- [ ] `src/engine/__tests__/spriteAtlas.test.ts` — stubs for CHAR-02 (character frame mapping for all 6 characters)
- [ ] `src/engine/__tests__/depthSort.test.ts` — stubs for CHAR-04 (32x32 baseRow calculation)
- [ ] Update `src/engine/__tests__/spriteSheet.test.ts` — covers CHAR-01 (dimension constants), ENV-14 (multi-sheet loading)
- [ ] Update `src/engine/__tests__/renderer.test.ts` — covers CHAR-03 (anchor math for 32x32)

*Existing infrastructure covers test framework — no new packages needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Characters visually render as correct LimeZu sprites | CHAR-02 | Visual correctness requires human eye | Load app, verify each character uses correct premade sprite |
| Floor tiles seamless at all zoom levels | ENV-08 | Visual seam detection | Zoom in/out, check tile boundaries |
| 3D walls align with floor boundaries | ENV-09 | Visual alignment check | Inspect wall-floor junction at all room edges |
| War Room looks professional with Conference Hall assets | ENV-11 | Aesthetic judgment | Open War Room, compare to LimeZu reference |
| Emote sprites appear above characters correctly | UI-06 | Visual overlay positioning | Trigger agent thinking state, verify emote position |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

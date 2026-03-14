---
phase: 11-jrpg-sprite-integration
plan: 02
subsystem: engine, sprites
tags: [pixel-art, jrpg, sprite-generation, canvas, 24x32, 3/4-perspective]

# Dependency graph
requires:
  - phase: 11-jrpg-sprite-integration
    plan: 01
    provides: Agent IDs (patrik/marcos/sandra/isaac/wendy), DECORATION_ATLAS keys, office layout
provides:
  - 24x32 JRPG character sprite sheets for all 6 characters
  - 3/4 perspective environment tiles (parquet floors, drawer-front desks, couch, plant)
  - CHAR_SPRITE_W=24 and CHAR_SPRITE_H=32 constants in types.ts
  - Updated spriteAtlas.ts with split makeCharFrame/makeEnvFrame builders
  - SPRT-04 asset swap contract documented in spriteAtlas.ts
affects: [11-03-PLAN, renderer, depth-sort]

# Tech tracking
tech-stack:
  added: []
  patterns: [split-frame-builders, asset-swap-contract, character-specific-drawfns]

key-files:
  created: []
  modified:
    - scripts/generateSprites.ts
    - src/engine/spriteAtlas.ts
    - src/engine/types.ts
    - public/sprites/billy.png
    - public/sprites/patrik.png
    - public/sprites/marcos.png
    - public/sprites/sandra.png
    - public/sprites/isaac.png
    - public/sprites/wendy.png
    - public/sprites/environment.png

key-decisions:
  - "Split makeCharFrame (24x32) and makeEnvFrame (16x16) instead of parameterized single function"
  - "Environment sheet expanded to 16x12 rows (from 16x8) to accommodate couch, motivational, corkboard"
  - "Character-specific appearance via drawCharacterSpecifics dispatch (hair styles, gray temples, ponytail)"

patterns-established:
  - "Asset swap contract: drop PNG at public/sprites/{id}.png with same layout, no code changes"
  - "Character frame builders use CHAR_SPRITE_W/H constants from types.ts (not hardcoded)"

requirements-completed: [SPRT-01, SPRT-02, SPRT-03, SPRT-04, ENV-01, ENV-02]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 11 Plan 02: Sprite Generation Pipeline Summary

**24x32 JRPG character sprites with per-character appearance (hair, outfits, skin tones) and 3/4 perspective environment tiles (parquet floors, drawer-front desks, couch)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T15:25:45Z
- **Completed:** 2026-03-14T15:31:06Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Rewrote generateSprites.ts from 16x16 flat sprites to 24x32 JRPG 3/4 perspective characters
- 6 visually distinct characters: Billy (gold blazer, tousled hair), Patrik (navy suit, neat hair), Marcos (charcoal suit, gray temples), Sandra (emerald outfit, ponytail), Isaac (cardigan, curly hair), Wendy (earth tones, curly hair)
- 3/4 environment tiles with warm parquet wood grain, front-face drawer desks, upholstered couch, detailed plant fronds
- spriteAtlas.ts uses CHAR_SPRITE_W/H from types.ts with documented asset swap contract

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite generateSprites.ts for 24x32 characters + 3/4 environment tiles** - `eab91cb` (feat)
2. **Task 2: Update spriteAtlas.ts + types.ts for 24x32 character dimensions** - `16131de` (feat)

## Files Created/Modified
- `scripts/generateSprites.ts` - Complete rewrite: 24x32 character renderer with per-character appearance, 16x12 environment sheet
- `src/engine/types.ts` - Added CHAR_SPRITE_W=24 and CHAR_SPRITE_H=32 constants
- `src/engine/spriteAtlas.ts` - Split frame builders, added couch/wendy-motivational, SPRT-04 asset swap docs
- `public/sprites/billy.png` - 240x128 character sheet (gold blazer CEO)
- `public/sprites/patrik.png` - 240x128 character sheet (navy suit CFO)
- `public/sprites/marcos.png` - 240x128 character sheet (charcoal suit lawyer)
- `public/sprites/sandra.png` - 240x128 character sheet (emerald outfit producer)
- `public/sprites/isaac.png` - 240x128 character sheet (cardigan developer)
- `public/sprites/wendy.png` - 240x128 character sheet (earth tone coach)
- `public/sprites/environment.png` - 256x192 environment tile sheet

## Decisions Made
- Split makeCharFrame (24x32) and makeEnvFrame (16x16) as separate functions rather than parameterized, for clarity
- Expanded environment sheet to 16 cols x 12 rows to accommodate new tile types (couch, corkboard, motivational, cushion)
- Character-specific appearance handled via drawCharacterSpecifics dispatch function per character ID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All sprite PNGs generated at correct dimensions (240x128 characters, 256x192 environment)
- CHAR_SPRITE_W/H constants available for renderer.ts to use in Plan 03 (foot-center anchoring)
- spriteAtlas.ts frame coordinates match generated PNG layouts exactly
- Couch sprite now has dedicated atlas entry (renderer no longer needs table-segment fallback)

---
*Phase: 11-jrpg-sprite-integration*
*Completed: 2026-03-14*

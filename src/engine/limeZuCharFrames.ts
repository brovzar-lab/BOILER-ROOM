/**
 * LimeZu character frame mapping for 32x32 premade character sheets.
 *
 * LimeZu premade sheets are 1792x1312 (56 cols x 41 rows of 32x32 frames).
 * Layout determined by visual inspection of Premade_Character_32x32_03.png:
 *
 *   Row 0:  Idle preview - 4 frames: down(0), left(1), right(2), up(3)
 *   Row 1:  Idle full loop - 18 frames per direction (down 0-17, then left, right, up)
 *           NOTE: Rows 1-2 appear to be a single idle cycle with directions packed.
 *           For simplicity, we use row 0 single-frame idle per direction.
 *   Row 2:  Walk cycle - directions packed sequentially within the row
 *           ~6 frames per direction: down(0-5), left(6-11), right(12-17), up(18-23)
 *   Row 3:  Sleep/bed - not used
 *   Row 4:  Sit down direction
 *   Row 5:  Sit other directions
 *   Row 6:  Phone animation (use for "work" state) - 4-9 loop marker visible
 *   Row 7:  Working at desk - 1-6 loop marker
 *   Rows 8+: Actions (push cart, pick up, etc.) - not needed
 *
 * Character assignments:
 *   billy:  Premade_Character_32x32_13.png
 *   patrik: Premade_Character_32x32_05.png
 *   marcos: Premade_Character_32x32_09.png
 *   sandra: Premade_Character_32x32_08.png
 *   isaac:  Premade_Character_32x32_03.png
 *   wendy:  Premade_Character_32x32_10.png
 */
import type { SpriteFrame, CharacterState, Direction } from './types';

const W = 32; // Character frame width
const H = 32; // Character frame height

/** Create a character SpriteFrame at the given grid position. */
function frame(col: number, row: number): SpriteFrame {
  return { x: col * W, y: row * H, w: W, h: H };
}

// ── Character Sheet Paths ────────────────────────────────────────────────────

const CHAR_BASE = '/sprites/modern-interiors-paid/2_Characters/Character_Generator/0_Premade_Characters/32x32';

/** Maps character IDs to their LimeZu premade character sheet paths. */
export const CHAR_SHEET_PATHS: Record<string, string> = {
  billy:  `${CHAR_BASE}/Premade_Character_32x32_13.png`,
  patrik: `${CHAR_BASE}/Premade_Character_32x32_05.png`,
  marcos: `${CHAR_BASE}/Premade_Character_32x32_09.png`,
  sandra: `${CHAR_BASE}/Premade_Character_32x32_08.png`,
  isaac:  `${CHAR_BASE}/Premade_Character_32x32_03.png`,
  wendy:  `${CHAR_BASE}/Premade_Character_32x32_10.png`,
};

// ── Character Frame Mapping ──────────────────────────────────────────────────
//
// Based on visual inspection of Premade_Character_32x32_03.png:
//
// Row 0: Idle preview - cols 0-3 = down, left, right, up (1 frame each)
//
// Row 1: Full idle animation. Each direction has ~6 frames packed sequentially:
//   down: cols 0-5, left: cols 6-11, right: cols 12-17, up: cols 18-23
//
// Row 2: Walk animation. Each direction has ~6 frames packed sequentially:
//   down: cols 0-5, left: cols 6-11, right: cols 12-17, up: cols 18-23
//
// Row 4-5: Sit animation (row 4 = down-facing seated, row 5 = other dirs)
//   Row 4: down sit, cols 0-5; left sit cols 6-11; right sit cols 12-17; up sit cols 18-23
//
// Row 6: Phone animation (use for "work" state)
//   Labeled "4-9 loop": cols 0-9 appear to be phone animation frames (down-facing)
//   For simplicity, use first 4 frames as work animation for down direction
//
// Row 7: Working at desk ("1-6 loop")
//   Use as alternate work state

/** Direction order in LimeZu sheets: down, left, right, up */
const DIR_ORDER: Direction[] = ['down', 'left', 'right', 'up'];

/**
 * Build frame arrays for an animation row where directions are packed sequentially.
 * @param row - Sheet row index
 * @param framesPerDir - Number of frames per direction
 */
function buildPackedRow(row: number, framesPerDir: number): Record<Direction, SpriteFrame[]> {
  const result = {} as Record<Direction, SpriteFrame[]>;
  for (let d = 0; d < DIR_ORDER.length; d++) {
    const dir = DIR_ORDER[d]!;
    const startCol = d * framesPerDir;
    const frames: SpriteFrame[] = [];
    for (let f = 0; f < framesPerDir; f++) {
      frames.push(frame(startCol + f, row));
    }
    result[dir] = frames;
  }
  return result;
}

/**
 * Character frame mapping for all states and directions.
 * Shared across all premade characters (same sheet layout).
 */
export const LIMEZU_CHARACTER_FRAMES: Record<
  CharacterState | 'talk',
  Record<Direction, SpriteFrame[]>
> = {
  // Idle: use row 0 preview frames (1 frame per direction)
  idle: {
    down:  [frame(0, 0)],
    left:  [frame(1, 0)],
    right: [frame(2, 0)],
    up:    [frame(3, 0)],
  },

  // Walk: row 2, 6 frames per direction packed sequentially
  walk: buildPackedRow(2, 6),

  // Work: row 6 (phone animation), 6 frames per direction
  // Visual inspection shows phone anim is primarily down-facing with ~10 frames.
  // Use first 4 frames for each direction; for non-down directions, mirror the down set.
  work: {
    down:  [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    left:  [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    right: [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    up:    [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
  },

  // Talk: use idle frames (row 0) + a slight variation
  // Talk uses the idle preview as a base since LimeZu doesn't have a dedicated talk row
  talk: {
    down:  [frame(0, 0), frame(0, 1)],
    left:  [frame(1, 0), frame(6, 1)],
    right: [frame(2, 0), frame(12, 1)],
    up:    [frame(3, 0), frame(18, 1)],
  },
};

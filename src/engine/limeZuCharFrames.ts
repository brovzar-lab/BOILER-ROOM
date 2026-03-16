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
const H = 32; // Single row height

/**
 * Create a character SpriteFrame spanning TWO rows (32x64).
 * LimeZu premade characters use paired rows: even row = head top, odd row = body.
 * The frame starts at the EVEN row and spans 2 rows (64px tall).
 * @param col - Column index in the 32px grid
 * @param evenRow - The EVEN row number (head top row). Body is at evenRow+1.
 */
function frame(col: number, evenRow: number): SpriteFrame {
  return { x: col * W, y: evenRow * H, w: W, h: H * 2 };
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
  charlie: `${CHAR_BASE}/Premade_Character_32x32_04.png`,
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
/**
 * Character frame mapping for all states and directions.
 * Shared across all premade characters (same sheet layout).
 *
 * VERIFIED via pixel scan:
 *   Row 0: Tiny head icons (4 tiles) — NOT usable as full sprites
 *   Row 1: Tiny items (4 tiles) — NOT usable
 *   Rows 2-5: Full-body animations, 24 tiles each = 6 frames × 4 directions
 *   Row 6: Phone/work animation (12 tiles)
 *   Row 8-9: More action animations (12 tiles each)
 *
 * Direction packing within each 24-frame row:
 *   Down: cols 0-5, Left: cols 6-11, Right: cols 12-17, Up: cols 18-23
 */
export const LIMEZU_CHARACTER_FRAMES: Record<
  CharacterState | 'talk',
  Record<Direction, SpriteFrame[]>
> = {
  // Idle: rows 2-3 pair (even row 2 = head, odd row 3 = body) → 32x64 frame
  idle: {
    down:  [frame(0, 2)],
    left:  [frame(6, 2)],
    right: [frame(12, 2)],
    up:    [frame(18, 2)],
  },

  // Walk: rows 4-5 pair (even row 4 = head, odd row 5 = body) → 32x64 frame
  walk: buildPackedRow(4, 6),

  // Work: rows 6-7 pair (phone/sit + equipment) → 32x64 frame
  work: {
    down:  [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    left:  [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    right: [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
    up:    [frame(0, 6), frame(1, 6), frame(2, 6), frame(3, 6)],
  },

  // Talk: alternate between first two idle frames (rows 2-3 pair)
  talk: {
    down:  [frame(0, 2), frame(1, 2)],
    left:  [frame(6, 2), frame(7, 2)],
    right: [frame(12, 2), frame(13, 2)],
    up:    [frame(18, 2), frame(19, 2)],
  },
};

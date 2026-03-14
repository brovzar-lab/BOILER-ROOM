/**
 * Sprite atlas coordinate maps for character and environment sprite sheets.
 *
 * Each character has its own sprite sheet with identical layout:
 *   - 10 columns (frames) x 4 rows (directions)
 *   - Row 0: down, Row 1: left, Row 2: right, Row 3: up
 *   - Cols 0: idle(1), 1-4: walk(4), 5-7: work(3), 8-9: talk(2)
 *   - Each frame is 16x16 pixels (TILE_SIZE)
 *
 * Environment sheet layout:
 *   - 16 columns x 8 rows, each tile 16x16
 *   - See ENVIRONMENT_ATLAS and DECORATION_ATLAS for coordinate maps
 */
import { TILE_SIZE } from './types';
import type { CharacterState, Direction, SpriteFrame } from './types';

const T = TILE_SIZE;

// ── Character Frame Atlas ────────────────────────────────────────────────────

/**
 * Maps character animation states + directions to sprite frame coordinates.
 * Since every character sheet has the same layout, these coordinates are
 * shared across all characters -- the renderer selects the correct sheet
 * by character ID.
 */

const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up'];

function makeFrame(col: number, row: number): SpriteFrame {
  return { x: col * T, y: row * T, w: T, h: T };
}

function buildCharacterFrames(): Record<CharacterState | 'talk', Record<Direction, SpriteFrame[]>> {
  const result = {} as Record<CharacterState | 'talk', Record<Direction, SpriteFrame[]>>;

  const stateConfigs: Array<{ state: CharacterState | 'talk'; startCol: number; count: number }> = [
    { state: 'idle', startCol: 0, count: 1 },
    { state: 'walk', startCol: 1, count: 4 },
    { state: 'work', startCol: 5, count: 3 },
    { state: 'talk', startCol: 8, count: 2 },
  ];

  for (const { state, startCol, count } of stateConfigs) {
    const dirMap = {} as Record<Direction, SpriteFrame[]>;
    for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
      const dir = DIRECTIONS[dirIdx]!;
      const frames: SpriteFrame[] = [];
      for (let f = 0; f < count; f++) {
        frames.push(makeFrame(startCol + f, dirIdx));
      }
      dirMap[dir] = frames;
    }
    result[state] = dirMap;
  }

  return result;
}

export const CHARACTER_FRAMES: Record<CharacterState | 'talk', Record<Direction, SpriteFrame[]>> =
  buildCharacterFrames();

/** Character IDs that have individual sprite sheets in public/sprites/ */
export const CHARACTER_SHEET_NAMES: string[] = [
  'billy',
  'patrik',
  'marcos',
  'sandra',
  'isaac',
  'wendy',
];

// ── Environment Atlas ────────────────────────────────────────────────────────

/**
 * Maps tile/furniture types to their SpriteFrame in environment.png.
 * Coordinates correspond exactly to the generateSprites.ts output.
 */
export const ENVIRONMENT_ATLAS: Record<string, SpriteFrame> = {
  // Row 0: Floor tiles
  'floor-office': makeFrame(0, 0),
  'floor-hallway': makeFrame(1, 0),
  'floor-warroom': makeFrame(2, 0),
  'door': makeFrame(3, 0),

  // Row 1: Wall tiles
  'wall-top': makeFrame(0, 1),
  'wall-side': makeFrame(1, 1),
  'wall-window': makeFrame(2, 1),

  // Row 2: Furniture
  'desk-left': makeFrame(0, 2),
  'desk-right': makeFrame(1, 2),
  'chair': makeFrame(2, 2),
  'bookshelf-top': makeFrame(3, 2),
  'bookshelf-bottom': makeFrame(4, 2),
  'table-segment': makeFrame(5, 2),

  // Row 3: Decorations
  'plant': makeFrame(0, 3),
  'water-cooler': makeFrame(1, 3),
  'artwork': makeFrame(2, 3),
  'whiteboard': makeFrame(3, 3),
  'post-it': makeFrame(4, 3),
  'filing-cabinet': makeFrame(5, 3),
  'monitor': makeFrame(6, 3),
};

// ── Decoration Atlas ─────────────────────────────────────────────────────────

/**
 * Personality-specific decoration sprites for agent offices.
 */
export const DECORATION_ATLAS: Record<string, SpriteFrame> = {
  // Row 4: Personality items
  'patrik-chart': makeFrame(0, 4),
  'marcos-lawbooks': makeFrame(1, 4),
  'sandra-whiteboard-tl': makeFrame(2, 4),
  'sandra-whiteboard-tr': makeFrame(3, 4),
  'sandra-whiteboard-bl': makeFrame(0, 5),
  'sandra-whiteboard-br': makeFrame(1, 5),
  'patrik-monitor': makeFrame(2, 5),
};

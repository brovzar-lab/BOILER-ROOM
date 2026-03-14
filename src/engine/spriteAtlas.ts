/**
 * Sprite atlas coordinate maps for character and environment sprite sheets.
 *
 * ASSET SWAP CONTRACT (SPRT-04):
 * Character sprite sheets can be replaced by dropping a new PNG at:
 *   public/sprites/{characterId}.png
 * Requirements for replacement PNGs:
 *   - Dimensions: 240x128 (10 cols x 4 rows of 24x32 frames)
 *   - Layout: cols 0=idle, 1-4=walk, 5-7=work, 8-9=talk
 *   - Rows: 0=down, 1=left, 2=right, 3=up
 *   - No code changes needed -- spriteAtlas.ts coordinates work for any art
 *     in the same frame layout.
 *
 * Environment sprite sheet can be replaced at:
 *   public/sprites/environment.png
 * Requirements:
 *   - Dimensions: 256x192 (16 cols x 12 rows of 16x16 tiles)
 *   - Tile positions must match ENVIRONMENT_ATLAS and DECORATION_ATLAS coordinates
 *
 * Each character has its own sprite sheet with identical layout:
 *   - 10 columns (frames) x 4 rows (directions)
 *   - Row 0: down, Row 1: left, Row 2: right, Row 3: up
 *   - Cols 0: idle(1), 1-4: walk(4), 5-7: work(3), 8-9: talk(2)
 *   - Each frame is 24x32 pixels (CHAR_SPRITE_W x CHAR_SPRITE_H)
 *
 * Environment sheet layout:
 *   - 16 columns x 12 rows, each tile 16x16 (TILE_SIZE)
 *   - See ENVIRONMENT_ATLAS and DECORATION_ATLAS for coordinate maps
 */
import { TILE_SIZE, CHAR_SPRITE_W, CHAR_SPRITE_H } from './types';
import type { CharacterState, Direction, SpriteFrame } from './types';

const T = TILE_SIZE;

// ── Character Frame Atlas ────────────────────────────────────────────────────

/**
 * Maps character animation states + directions to sprite frame coordinates.
 * Uses 24x32 frame dimensions (CHAR_SPRITE_W x CHAR_SPRITE_H).
 * Since every character sheet has the same layout, these coordinates are
 * shared across all characters -- the renderer selects the correct sheet
 * by character ID.
 */

const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up'];

/** Build a character frame at the given column/row using 24x32 dimensions. */
function makeCharFrame(col: number, row: number): SpriteFrame {
  return { x: col * CHAR_SPRITE_W, y: row * CHAR_SPRITE_H, w: CHAR_SPRITE_W, h: CHAR_SPRITE_H };
}

/** Build an environment frame at the given column/row using 16x16 dimensions. */
function makeEnvFrame(col: number, row: number): SpriteFrame {
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
        frames.push(makeCharFrame(startCol + f, dirIdx));
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
 * All environment frames are 16x16 (TILE_SIZE).
 */
export const ENVIRONMENT_ATLAS: Record<string, SpriteFrame> = {
  // Row 0: Floor tiles
  'floor-office': makeEnvFrame(0, 0),
  'floor-hallway': makeEnvFrame(1, 0),
  'floor-warroom': makeEnvFrame(2, 0),
  'door': makeEnvFrame(3, 0),

  // Row 1: Wall tiles
  'wall-top': makeEnvFrame(0, 1),
  'wall-side': makeEnvFrame(1, 1),
  'wall-window': makeEnvFrame(2, 1),

  // Row 2: Furniture (3/4 perspective with front faces)
  'desk-left': makeEnvFrame(0, 2),
  'desk-right': makeEnvFrame(1, 2),
  'chair': makeEnvFrame(2, 2),
  'bookshelf-top': makeEnvFrame(3, 2),
  'bookshelf-bottom': makeEnvFrame(4, 2),
  'table-segment': makeEnvFrame(5, 2),
  'monitor': makeEnvFrame(6, 2),
  'couch': makeEnvFrame(7, 2),

  // Row 3: Decorations
  'plant': makeEnvFrame(0, 3),
  'water-cooler': makeEnvFrame(1, 3),
  'artwork': makeEnvFrame(2, 3),
  'whiteboard': makeEnvFrame(3, 3),
  'post-it': makeEnvFrame(4, 3),
  'filing-cabinet': makeEnvFrame(5, 3),
};

// ── Decoration Atlas ─────────────────────────────────────────────────────────

/**
 * Personality-specific decoration sprites for agent offices.
 * Keys match the decoration keys used in officeLayout.ts DECORATIONS array.
 */
export const DECORATION_ATLAS: Record<string, SpriteFrame> = {
  // Row 4: Agent personality items
  'patrik-chart': makeEnvFrame(0, 4),        // Patrik (CFO): financial chart on wall
  'marcos-lawbooks': makeEnvFrame(1, 4),     // Marcos (Lawyer): law books
  'sandra-schedule': makeEnvFrame(2, 4),     // Sandra (Line Producer): production schedule
  'isaac-scripts': makeEnvFrame(3, 4),       // Isaac (Development): script stacks

  // Row 5: More personality items
  'isaac-corkboard': makeEnvFrame(0, 5),     // Isaac (Development): corkboard with notes
  'patrik-monitor': makeEnvFrame(1, 5),      // Patrik (CFO): monitor showing numbers
  'wendy-cushion': makeEnvFrame(2, 5),       // Wendy (Coach): comfort cushion
  'wendy-motivational': makeEnvFrame(3, 5),  // Wendy (Coach): framed motivational piece

  // Row 6: Personal touch items (coffee mugs, pen holders, photo frames, etc.)
  'coffee-mug': makeEnvFrame(0, 6),          // Small brown/white mug
  'pen-holder': makeEnvFrame(1, 6),          // Dark rectangle with pencil tips
  'calculator': makeEnvFrame(2, 6),          // Gray rectangle with button grid
  'photo-frame': makeEnvFrame(3, 6),         // Small brown frame with lighter inner
  'desk-plant': makeEnvFrame(4, 6),          // Tiny green pot plant (2-3 leaves)
  'figurine': makeEnvFrame(5, 6),            // Small colorful standing figure
  'candle': makeEnvFrame(6, 6),              // Cream cylinder with orange dot
  'papers': makeEnvFrame(7, 6),              // White rectangles with gray lines
  'water-glass': makeEnvFrame(8, 6),         // Clear/light blue small cylinder
};

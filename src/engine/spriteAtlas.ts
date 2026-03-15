/**
 * Sprite atlas coordinate maps for character and environment sprite sheets.
 *
 * Phase 14: CHARACTER_FRAMES now uses LimeZu premade character sheet layout
 * via LIMEZU_CHARACTER_FRAMES. Environment atlas maps are retained as
 * deprecated compat (renderer migrates to LIMEZU_ATLAS in Plan 02).
 *
 * LimeZu character sheet layout (32x32 premade, 56 cols x 41 rows):
 *   - Row 0: idle preview (4 frames: down, left, right, up)
 *   - Row 2: walk cycle (6 frames per direction, packed sequentially)
 *   - Row 6: phone animation (work state)
 *   - Each frame is 32x32 pixels (CHAR_SPRITE_W x CHAR_SPRITE_H)
 */
import { TILE_SIZE } from './types';
import type { CharacterState, Direction, SpriteFrame } from './types';
import { LIMEZU_CHARACTER_FRAMES } from './limeZuCharFrames';
import { CHAR_SHEET_PATHS } from './limeZuCharFrames';

const T = TILE_SIZE;

// ── Character Frame Atlas ────────────────────────────────────────────────────

/**
 * Maps character animation states + directions to sprite frame coordinates.
 * Uses LimeZu 32x32 premade character sheet layout.
 * Since every premade character sheet has the same layout, these coordinates
 * are shared across all characters -- the renderer selects the correct sheet
 * by character ID.
 */
export const CHARACTER_FRAMES: Record<CharacterState | 'talk', Record<Direction, SpriteFrame[]>> =
  LIMEZU_CHARACTER_FRAMES;

/** Character IDs that have individual sprite sheets. */
export const CHARACTER_SHEET_NAMES: string[] = Object.keys(CHAR_SHEET_PATHS);

// ── Environment Atlas (deprecated -- migrate to LIMEZU_ATLAS in Plan 02) ────

/** Build an environment frame at the given column/row using 16x16 dimensions. */
function makeEnvFrame(col: number, row: number): SpriteFrame {
  return { x: col * T, y: row * T, w: T, h: T };
}

/**
 * @deprecated Use LIMEZU_ATLAS from limeZuAtlas.ts instead.
 * Retained for backward compatibility until renderer migrates in Plan 02.
 * Maps tile/furniture types to their SpriteFrame in the legacy environment.png.
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

/**
 * @deprecated Use LIMEZU_ATLAS from limeZuAtlas.ts instead.
 * Retained for backward compatibility until renderer migrates in Plan 02.
 * Personality-specific decoration sprites for agent offices.
 */
export const DECORATION_ATLAS: Record<string, SpriteFrame> = {
  // Row 4: Agent personality items
  'patrik-chart': makeEnvFrame(0, 4),
  'marcos-lawbooks': makeEnvFrame(1, 4),
  'sandra-schedule': makeEnvFrame(2, 4),
  'isaac-scripts': makeEnvFrame(3, 4),

  // Row 5: More personality items
  'isaac-corkboard': makeEnvFrame(0, 5),
  'patrik-monitor': makeEnvFrame(1, 5),
  'wendy-cushion': makeEnvFrame(2, 5),
  'wendy-motivational': makeEnvFrame(3, 5),

  // Row 6: Personal touch items
  'coffee-mug': makeEnvFrame(0, 6),
  'pen-holder': makeEnvFrame(1, 6),
  'calculator': makeEnvFrame(2, 6),
  'photo-frame': makeEnvFrame(3, 6),
  'desk-plant': makeEnvFrame(4, 6),
  'figurine': makeEnvFrame(5, 6),
  'candle': makeEnvFrame(6, 6),
  'papers': makeEnvFrame(7, 6),
  'water-glass': makeEnvFrame(8, 6),
};

/**
 * LimeZu Modern Interiors multi-sheet atlas registry.
 *
 * Maps semantic asset keys to { sheetId, frame } tuples.
 * Sheet IDs reference paths in SHEET_PATHS, loaded at startup by spriteSheet.ts.
 *
 * All environment/furniture coordinates use 16x16 tile grid positions.
 * Coordinates determined by visual inspection of each LimeZu PNG sheet.
 */
import type { SpriteFrame } from './types';
import { TILE_SIZE } from './types';

const T = TILE_SIZE; // 16

// ── Sheet Paths ──────────────────────────────────────────────────────────────

/** Maps sheet IDs to paths under /sprites/modern-interiors-paid/ */
export const SHEET_PATHS: Record<string, string> = {
  'generic':       '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/1_Generic_16x16.png',
  'living-room':   '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/2_LivingRoom_16x16.png',
  'classroom':     '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/5_Classroom_and_library_16x16.png',
  'conference':    '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/13_Conference_Hall_16x16.png',
  'film-studio':   '/sprites/modern-interiors-paid/1_Interiors/16x16/Theme_Sorter/23_Television_and_Film_Studio.png',
  'floors':        '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Floors_16x16.png',
  'walls':         '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Walls_16x16.png',
  '3d-walls':      '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_3d_walls_16x16.png',
  'baseboards':    '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Baseboards_16x16.png',
  'floor-shadows': '/sprites/modern-interiors-paid/1_Interiors/16x16/Room_Builder_subfiles/Room_Builder_Floor_Shadows_16x16.png',
  'ui':            '/sprites/modern-interiors-paid/4_User_Interface_Elements/UI_16x16.png',
  'ui-emotes':     '/sprites/modern-interiors-paid/4_User_Interface_Elements/UI_thinking_emotes_animation_16x16.png',
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface SheetFrame {
  sheetId: string;
  frame: SpriteFrame;
}

// ── Helper ───────────────────────────────────────────────────────────────────

/**
 * Create a SheetFrame from grid coordinates.
 * @param sheetId - Key in SHEET_PATHS
 * @param col - Column index (0-based)
 * @param row - Row index (0-based)
 * @param w - Width in tiles (default 1)
 * @param h - Height in tiles (default 1)
 */
export function sf(sheetId: string, col: number, row: number, w = 1, h = 1): SheetFrame {
  return {
    sheetId,
    frame: { x: col * T, y: row * T, w: w * T, h: h * T },
  };
}

// ── LimeZu Atlas ─────────────────────────────────────────────────────────────
//
// Coordinates from visual inspection of each LimeZu PNG sheet.
// Floor sheet: 240x640 (15 cols x 40 rows) - each floor style is ~3 cols x 2 rows
// 3D walls sheet: 384x944 (24 cols x 59 rows)
// Generic sheet: 256x1248 (16 cols x 78 rows)
// Conference sheet: 256x192 (16 cols x 12 rows)
// Film Studio sheet: 256x224 (16 cols x 14 rows)
// Living Room sheet: 256x720 (16 cols x 45 rows)
// Classroom sheet: 256x544 (16 cols x 34 rows)
// UI sheet: 288x256 (18 cols x 16 rows)
// UI emotes sheet: 160x160 (10 cols x 10 rows)

export const LIMEZU_ATLAS: Record<string, SheetFrame> = {
  // ── Floors (Room_Builder_Floors_16x16.png) ─────────────────────────────────
  // Light tile/marble for offices - first group, center tile (col 1, row 1)
  'floor-office':   sf('floors', 1, 1),
  // Dark premium for War Room - grey stone group (col 13, row 1)
  'floor-warroom':  sf('floors', 13, 1),
  // Grey/charcoal for hallways (col 13, row 3)
  'floor-hallway':  sf('floors', 13, 3),
  // Warm wood for rec area (col 1, row 17)
  'floor-rec':      sf('floors', 1, 17),
  // Additional floor variants
  'floor-office-alt':  sf('floors', 4, 1),
  'floor-warroom-alt': sf('floors', 10, 1),

  // ── Walls (Room_Builder_3d_walls_16x16.png) ────────────────────────────────
  // Light grey wall band - top face tile
  'wall-3d-top':    sf('3d-walls', 1, 0),
  // Light grey wall band - front face tile
  'wall-3d-front':  sf('3d-walls', 1, 1),
  // Side wall left
  'wall-3d-side-l': sf('3d-walls', 0, 1),
  // Side wall right
  'wall-3d-side-r': sf('3d-walls', 2, 1),
  // Corner tiles
  'wall-3d-corner-tl': sf('3d-walls', 0, 0),
  'wall-3d-corner-tr': sf('3d-walls', 2, 0),
  // Flat walls (from Room_Builder_Walls_16x16.png)
  'wall-flat-top':  sf('walls', 1, 0),
  'wall-flat-side': sf('walls', 0, 1),
  // Baseboards
  'baseboard-top':  sf('baseboards', 1, 0),
  'baseboard-side': sf('baseboards', 0, 1),

  // ── Door ───────────────────────────────────────────────────────────────────
  'door':           sf('3d-walls', 4, 0),

  // ── Furniture from Generic sheet (1_Generic_16x16.png, 16 cols x 78 rows) ─
  // Desks - row 0-1 area, wood brown desks
  'desk-wood-2wide':  sf('generic', 0, 0, 2, 2),   // 2-wide desk (top-down view)
  'desk-wood-3wide':  sf('generic', 0, 0, 3, 2),   // 3-wide desk
  // Office chair (small, 1x1) - row ~7 area
  'chair-office':     sf('generic', 0, 7),
  // Monitor - row 0 area
  'monitor':          sf('generic', 6, 0),
  // Bookshelf (2 tiles tall)
  'bookshelf-2tall':  sf('generic', 0, 8, 2, 2),
  // Plant (potted)
  'plant-potted':     sf('generic', 14, 8),
  // Water cooler
  'water-cooler':     sf('generic', 15, 7, 1, 2),
  // Filing cabinet
  'filing-cabinet':   sf('generic', 12, 1, 1, 2),
  // Small desk items
  'desk-lamp':        sf('generic', 8, 0),
  'keyboard':         sf('generic', 7, 0),
  'phone-desk':       sf('generic', 9, 0),
  // Larger furniture
  'cabinet-2wide':    sf('generic', 0, 10, 2, 2),
  'shelf-wall':       sf('generic', 0, 12, 2, 1),
  // Rug/carpet
  'rug-office':       sf('generic', 4, 8, 4, 4),

  // ── Conference Hall (13_Conference_Hall_16x16.png, 16 cols x 12 rows) ──────
  // Conference table - large horizontal table (top area of sheet)
  'conf-table':       sf('conference', 0, 3, 6, 3),
  'table-conference': sf('conference', 0, 3, 6, 3),
  // Conference chair - office style
  'conf-chair':       sf('conference', 0, 0, 2, 2),
  // Whiteboard
  'whiteboard':       sf('conference', 8, 0, 3, 2),
  // Projector
  'conf-projector':   sf('conference', 12, 0, 2, 1),
  // Podium
  'conf-podium':      sf('conference', 14, 0, 2, 2),

  // ── Film Studio (23_Television_and_Film_Studio.png, 16 cols x 14 rows) ─────
  // Camera on tripod
  'camera':           sf('film-studio', 0, 0, 2, 3),
  // Clapboard
  'clapboard':        sf('film-studio', 4, 0, 2, 1),
  // Film reel
  'film-reel':        sf('film-studio', 8, 3),
  // Director chair
  'director-chair':   sf('film-studio', 8, 4, 2, 2),
  // Studio light
  'studio-light':     sf('film-studio', 2, 0, 2, 3),
  // Monitor/TV screen
  'studio-monitor':   sf('film-studio', 10, 4, 2, 2),

  // ── Living Room (2_LivingRoom_16x16.png, 16 cols x 45 rows) ───────────────
  // Couch (2 tiles wide)
  'couch-2wide':      sf('living-room', 0, 0, 3, 2),
  // Armchair
  'armchair':         sf('living-room', 4, 0, 2, 2),
  // Coffee table
  'coffee-table':     sf('living-room', 0, 4, 2, 1),
  // Large indoor plant
  'plant-large':      sf('living-room', 10, 3, 2, 2),
  // Small cushion
  'cushion':          sf('living-room', 6, 2),
  // Lamp
  'floor-lamp':       sf('living-room', 8, 4, 1, 2),

  // ── Classroom/Library (5_Classroom_and_library_16x16.png, 16 cols x 34 rows)
  // Large bookshelf (library style)
  'bookshelf-library': sf('classroom', 0, 10, 3, 3),
  // Study desk
  'desk-study':        sf('classroom', 0, 0, 2, 2),
  // Chalkboard/Whiteboard
  'chalkboard':        sf('classroom', 4, 2, 3, 2),

  // ── Decoration: Agent Personality Items ────────────────────────────────────
  // Patrik (CFO): financial chart on wall - use framed artwork from generic
  'patrik-chart':        sf('generic', 4, 3, 2, 2),
  // Marcos (Lawyer): law books - bookshelf from classroom
  'marcos-lawbooks':     sf('classroom', 0, 10, 2, 2),
  // Sandra (Producer): whiteboard from conference hall
  'sandra-whiteboard':   sf('conference', 8, 0, 3, 2),
  // Isaac (Development): corkboard/scripts - from generic
  'isaac-corkboard':     sf('generic', 4, 5, 2, 2),
  // Wendy (Coach): potted plant - from living room
  'wendy-plant':         sf('living-room', 10, 3, 2, 2),
  // BILLY (CEO): clapboard from film studio
  'billy-clapboard':     sf('film-studio', 4, 0, 2, 1),
  // Additional personality decorations
  'wendy-motivational':  sf('generic', 6, 3, 2, 2),
  'isaac-scripts':       sf('film-studio', 6, 0, 2, 1),
  'patrik-calculator':   sf('generic', 10, 0),
  'marcos-gavel':        sf('generic', 11, 0),
  'sandra-schedule':     sf('generic', 4, 5, 2, 1),
  'billy-award':         sf('generic', 6, 5, 2, 2),

  // ── UI Elements ────────────────────────────────────────────────────────────
  // Thinking emotes (UI_thinking_emotes_animation_16x16.png, 10 cols x 10 rows)
  'emote-thinking':      sf('ui-emotes', 0, 0),
  'emote-exclamation':   sf('ui-emotes', 2, 0),
  'emote-question':      sf('ui-emotes', 4, 0),
  'emote-heart':         sf('ui-emotes', 6, 0),
  'emote-music':         sf('ui-emotes', 8, 0),

  // Speech bubbles (UI_16x16.png, 18 cols x 16 rows)
  'speech-bubble-left':  sf('ui', 0, 8, 2, 2),
  'speech-bubble-right': sf('ui', 2, 8, 2, 2),
  'speech-bubble-small': sf('ui', 4, 8),

  // Floor shadows (Room_Builder_Floor_Shadows_16x16.png)
  'shadow-top':    sf('floor-shadows', 1, 0),
  'shadow-left':   sf('floor-shadows', 0, 1),
  'shadow-corner': sf('floor-shadows', 0, 0),
  'shadow-right':  sf('floor-shadows', 2, 1),
  'shadow-bottom': sf('floor-shadows', 1, 2),
};

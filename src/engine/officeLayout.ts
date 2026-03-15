/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Compact grid layout (32 cols x 30 rows):
 *
 *            [BILLY] [Patrik]           <- centered, top row (CEO + CFO adjacent)
 *   [Sandra]                [Marcos]    <- upper side offices (Producer left, Lawyer right)
 *            [ WAR ROOM ]             <- center, same height as one side pair
 *   [Isaac]               [Wendy]     <- lower side offices (Development left, Coach right)
 *
 * Room assignment rationale (workflow adjacency):
 *   - Patrik (CFO) top-right: closest to BILLY for frequent financial consultations
 *   - Sandra (Line Producer) upper-left: production budgets flow to/from CFO and Lawyer
 *   - Marcos (Lawyer) upper-right: contracts adjacent to CFO and Producer workflows
 *   - Isaac (Head of Development) lower-left: creative side, separate from finance operations
 *   - Wendy (Performance Coach) lower-right: private coaching space, separate from operations
 *
 *   - Top row: BILLY (center-left), Patrik (center-right) -- centered above War Room
 *   - War Room centered vertically between upper/lower corridors (rows 12-22, 11 tall)
 *   - Sandra & Isaac stacked on left (rows 11-17, rows 20-26)
 *   - Marcos & Wendy stacked on right (rows 11-17, rows 20-26)
 *   - Gap/corridor between upper and lower side offices at rows 18-19
 *   - 2-tile wide corridors between sections
 *   - VOID headroom above top rooms
 *   - VOID border around perimeter
 *
 * Column layout:
 *   Cols 0:      VOID border
 *   Cols 1-7:    Left offices (Sandra, Isaac)
 *   Cols 8-9:    Left vertical corridor
 *   Cols 9-15:   BILLY's Office (top row, center-left)
 *   Cols 10-21:  War Room (center, 12 wide x 11 tall)
 *   Cols 17-23:  Patrik's Office (top row, center-right)
 *   Cols 22-23:  Right vertical corridor
 *   Cols 24-30:  Right offices (Marcos, Wendy)
 *   Col  31:     VOID border
 *
 * Row layout:
 *   Rows 0-1:    VOID headroom
 *   Rows 2-8:    Top offices (BILLY, Patrik) -- 7 tall, centered
 *   Rows 9-10:   Horizontal corridor
 *   Rows 11-17:  Upper side offices (Sandra left, Marcos right)
 *   Rows 12-22:  War Room (center) -- 11 tall, centered between corridors
 *   Rows 18-19:  Corridor between upper/lower side offices (War Room continues)
 *   Rows 20-26:  Lower side offices (Isaac left, Wendy right)
 *   Rows 27-28:  Horizontal corridor below side offices
 *   Row  29:     VOID border
 *
 * Recreation Area (open-plan, no walls):
 *   Cols 10-21, Rows 23-26 -- open break area below War Room south wall
 *   Contains water cooler, ping pong table, and couch
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

// Shorthand aliases for readability
const V = TileType.VOID;
const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

// -- Grid Dimensions ----------------------------------------------------------
const GRID_COLS = 32;
const GRID_ROWS = 30;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function buildTileMap(): TileType[][] {
  // Initialize with VOID
  const map: TileType[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push(V);
    }
    map.push(row);
  }

  // Helper: fill a rectangular region
  const fill = (
    startCol: number,
    startRow: number,
    w: number,
    h: number,
    tile: TileType,
  ): void => {
    for (let r = startRow; r < startRow + h; r++) {
      for (let c = startCol; c < startCol + w; c++) {
        map[r]![c] = tile;
      }
    }
  };

  // Helper: outline a room (walls) then fill interior (floor)
  const room = (col: number, row: number, w: number, h: number): void => {
    fill(col, row, w, h, W); // walls
    fill(col + 1, row + 1, w - 2, h - 2, F); // interior floor
  };

  // ============================================================================
  // TOP ROW (rows 2-8)
  // ============================================================================

  // BILLY's Office (top, center-left): cols 9-15, rows 2-8
  room(9, 2, 7, 7);

  // Patrik's Office (top, center-right): cols 17-23, rows 2-8
  room(17, 2, 7, 7);

  // Doors (south wall -> upper horizontal corridor)
  map[8]![12] = D;  // BILLY door at south wall center
  map[8]![20] = D;  // Patrik door at south wall center

  // ============================================================================
  // UPPER HORIZONTAL CORRIDOR (rows 9-10, cols 1-30)
  // ============================================================================
  fill(1, 9, 30, 2, F);

  // ============================================================================
  // SIDE OFFICES + WAR ROOM (rows 11-26)
  // ============================================================================

  // Sandra's Office (upper-left): cols 1-7, rows 11-17
  room(1, 11, 7, 7);

  // Marcos's Office (upper-right): cols 24-30, rows 11-17
  room(24, 11, 7, 7);

  // War Room (center): cols 10-21, rows 12-22 (12 wide, 11 tall)
  room(10, 12, 12, 11);

  // Isaac's Office (lower-left): cols 1-7, rows 20-26
  room(1, 20, 7, 7);

  // Wendy's Office (lower-right): cols 24-30, rows 20-26
  room(24, 20, 7, 7);

  // Sandra door on east wall -> left vertical corridor
  map[14]![7] = D;

  // Marcos door on west wall -> right vertical corridor
  map[14]![24] = D;

  // Isaac door on east wall -> left vertical corridor
  map[23]![7] = D;

  // Wendy door on west wall -> right vertical corridor
  map[23]![24] = D;

  // Connecting corridor above War Room north door (row 11, cols 10-21)
  fill(10, 11, 12, 1, F);

  // War Room north door (connects to corridor above at row 11)
  map[12]![15] = D;
  map[12]![16] = D;

  // War Room south door (connects to corridor below at row 22)
  map[22]![15] = D;
  map[22]![16] = D;

  // Left vertical corridor: cols 8-9, rows 9-28
  // Connects upper horizontal corridor through side offices to lower corridor
  fill(8, 9, 2, 19, F);

  // Right vertical corridor: cols 22-23, rows 9-28
  fill(22, 9, 2, 19, F);

  // Recreation / break area below War Room south wall (open-plan, no walls)
  // Widens the narrow south passage into an open common area (cols 10-21, rows 23-26)
  fill(10, 23, 12, 4, F);

  // Corridor between upper and lower side offices on the left (rows 18-19, cols 1-7)
  fill(1, 18, 7, 2, F);

  // Corridor between upper and lower side offices on the right (rows 18-19, cols 24-30)
  fill(24, 18, 7, 2, F);

  // ============================================================================
  // LOWER HORIZONTAL CORRIDOR (rows 27-28, cols 1-30)
  // Below War Room south door
  // ============================================================================
  fill(1, 27, 30, 2, F);

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// -- Room Definitions ---------------------------------------------------------

export const ROOMS: Room[] = [
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 9, row: 2, width: 7, height: 7 },
    doorTile: { col: 12, row: 8 },
    seatTile: { col: 12, row: 5 },
    billyStandTile: { col: 13, row: 5 },
  },
  {
    id: 'patrik',
    name: "Patrik's Office",
    tileRect: { col: 17, row: 2, width: 7, height: 7 },
    doorTile: { col: 20, row: 8 },
    seatTile: { col: 20, row: 5 },
    billyStandTile: { col: 19, row: 5 },
  },
  {
    id: 'war-room',
    name: 'War Room',
    tileRect: { col: 10, row: 12, width: 12, height: 11 },
    doorTile: { col: 15, row: 12 },
    seatTile: { col: 15, row: 17 },
    billyStandTile: { col: 16, row: 15 },
  },
  {
    id: 'sandra',
    name: "Sandra's Office",
    tileRect: { col: 1, row: 11, width: 7, height: 7 },
    doorTile: { col: 7, row: 14 },
    seatTile: { col: 4, row: 14 },
    billyStandTile: { col: 5, row: 14 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 24, row: 11, width: 7, height: 7 },
    doorTile: { col: 24, row: 14 },
    seatTile: { col: 27, row: 14 },
    billyStandTile: { col: 26, row: 14 },
  },
  {
    id: 'isaac',
    name: "Isaac's Office",
    tileRect: { col: 1, row: 20, width: 7, height: 7 },
    doorTile: { col: 7, row: 23 },
    seatTile: { col: 4, row: 23 },
    billyStandTile: { col: 5, row: 23 },
  },
  {
    id: 'wendy',
    name: "Wendy's Coaching Room",
    tileRect: { col: 24, row: 20, width: 7, height: 7 },
    doorTile: { col: 24, row: 23 },
    seatTile: { col: 27, row: 23 },
    billyStandTile: { col: 26, row: 23 },
  },
];

// -- Furniture ----------------------------------------------------------------

export interface FurnitureItem {
  roomId: string;
  type: 'desk' | 'chair' | 'table' | 'bookshelf' | 'plant' | 'water-cooler' | 'artwork' | 'couch' | 'monitor' | 'whiteboard' | 'filing-cabinet';
  col: number;
  row: number;
  width: number;  // in tiles
  height: number; // in tiles
  /** Visual height in tiles for 3/4 perspective (default: height). Tall items (bookshelf=2, whiteboard=2) occlude more. */
  renderHeight?: number;
  /** Direct LIMEZU_ATLAS key for sprite lookup. When set, renderer uses this instead of type-based switch. */
  atlasKey?: string;
}

/**
 * Furniture placement data for all rooms and hallway decorations.
 * Each room has at least a desk; hallways have environmental props.
 *
 * Standard office layout: desk (2-3 wide) + chair + personality item.
 * Wendy's Coaching Room: couch + plants + secondary desk (coaching space, not corporate desk).
 */
export const FURNITURE: FurnitureItem[] = [
  // BILLY's Office (interior cols 10-14, rows 3-7) -- CEO corner
  { roomId: 'billy', type: 'desk', col: 11, row: 3, width: 3, height: 1, atlasKey: 'desk-wood-3wide' },
  { roomId: 'billy', type: 'chair', col: 12, row: 4, width: 1, height: 1, atlasKey: 'chair-office' },
  { roomId: 'billy', type: 'bookshelf', col: 10, row: 3, width: 1, height: 2, renderHeight: 2, atlasKey: 'bookshelf-2tall' },
  { roomId: 'billy', type: 'monitor', col: 13, row: 3, width: 1, height: 1, atlasKey: 'monitor' },

  // Patrik's Office (interior cols 18-22, rows 3-7) -- CFO, top-right adjacent to BILLY
  { roomId: 'patrik', type: 'desk', col: 19, row: 3, width: 2, height: 1, atlasKey: 'desk-wood-2wide' },
  { roomId: 'patrik', type: 'chair', col: 20, row: 4, width: 1, height: 1, atlasKey: 'chair-office' },
  { roomId: 'patrik', type: 'monitor', col: 21, row: 3, width: 1, height: 1, atlasKey: 'monitor' },

  // War Room (interior cols 11-20, rows 13-21) -- portrait conference table centered
  { roomId: 'war-room', type: 'table', col: 14, row: 14, width: 4, height: 6, atlasKey: 'conf-table' },
  // Chairs around the portrait conference table (cols 14-17, rows 14-19)
  { roomId: 'war-room', type: 'chair', col: 15, row: 13, width: 1, height: 1, atlasKey: 'conf-chair' }, // north/head (BILLY)
  { roomId: 'war-room', type: 'chair', col: 13, row: 15, width: 1, height: 1, atlasKey: 'conf-chair' }, // left side, upper (Patrik)
  { roomId: 'war-room', type: 'chair', col: 13, row: 17, width: 1, height: 1, atlasKey: 'conf-chair' }, // left side, lower (Sandra)
  { roomId: 'war-room', type: 'chair', col: 18, row: 15, width: 1, height: 1, atlasKey: 'conf-chair' }, // right side, upper (Marcos)
  { roomId: 'war-room', type: 'chair', col: 18, row: 17, width: 1, height: 1, atlasKey: 'conf-chair' }, // right side, lower (Isaac)
  { roomId: 'war-room', type: 'chair', col: 16, row: 20, width: 1, height: 1, atlasKey: 'conf-chair' }, // south/foot (Wendy)
  { roomId: 'war-room', type: 'whiteboard', col: 11, row: 13, width: 2, height: 1, atlasKey: 'conf-whiteboard' },

  // Sandra's Office (interior cols 2-6, rows 12-16) -- Line Producer, upper-left
  { roomId: 'sandra', type: 'desk', col: 3, row: 13, width: 2, height: 1, atlasKey: 'desk-wood-2wide' },
  { roomId: 'sandra', type: 'chair', col: 4, row: 14, width: 1, height: 1, atlasKey: 'chair-office' },
  { roomId: 'sandra', type: 'monitor', col: 4, row: 13, width: 1, height: 1, atlasKey: 'monitor' },

  // Marcos's Office (interior cols 25-29, rows 12-16) -- Lawyer, upper-right
  { roomId: 'marcos', type: 'desk', col: 26, row: 13, width: 2, height: 1, atlasKey: 'desk-wood-2wide' },
  { roomId: 'marcos', type: 'chair', col: 27, row: 14, width: 1, height: 1, atlasKey: 'chair-office' },
  { roomId: 'marcos', type: 'bookshelf', col: 25, row: 12, width: 1, height: 2, renderHeight: 2, atlasKey: 'bookshelf-2tall' },

  // Isaac's Office (interior cols 2-6, rows 21-25) -- Head of Development, lower-left
  { roomId: 'isaac', type: 'desk', col: 3, row: 22, width: 2, height: 1, atlasKey: 'desk-wood-2wide' },
  { roomId: 'isaac', type: 'chair', col: 4, row: 23, width: 1, height: 1, atlasKey: 'chair-office' },
  { roomId: 'isaac', type: 'monitor', col: 4, row: 22, width: 1, height: 1, atlasKey: 'monitor' },

  // Wendy's Coaching Room (interior cols 25-29, rows 21-25) -- Performance Coach, lower-right
  // Non-standard layout: coaching space with couch as primary, desk pushed to wall
  { roomId: 'wendy', type: 'couch', col: 26, row: 22, width: 2, height: 1, atlasKey: 'couch-2wide' },      // comfortable coaching couch (primary)
  { roomId: 'wendy', type: 'chair', col: 28, row: 23, width: 1, height: 1, atlasKey: 'chair-office' },      // coaching chair facing couch
  { roomId: 'wendy', type: 'desk', col: 29, row: 21, width: 1, height: 1, atlasKey: 'desk-wood-2wide' },       // small secondary desk pushed to wall
  { roomId: 'wendy', type: 'plant', col: 25, row: 21, width: 1, height: 1, atlasKey: 'plant-large' },      // plant 1 (warm feel)
  { roomId: 'wendy', type: 'plant', col: 25, row: 25, width: 1, height: 1, atlasKey: 'plant-potted' },      // plant 2
  { roomId: 'wendy', type: 'plant', col: 29, row: 25, width: 1, height: 1, atlasKey: 'plant-potted' },      // plant 3

  // Hallway decorations
  { roomId: 'hallway', type: 'plant', col: 8, row: 9, width: 1, height: 1, atlasKey: 'plant-potted' },
  { roomId: 'hallway', type: 'water-cooler', col: 15, row: 9, width: 1, height: 1, atlasKey: 'water-cooler' },
  { roomId: 'hallway', type: 'plant', col: 23, row: 9, width: 1, height: 1, atlasKey: 'plant-potted' },
  { roomId: 'hallway', type: 'plant', col: 8, row: 27, width: 1, height: 1, atlasKey: 'plant-potted' },
  { roomId: 'hallway', type: 'plant', col: 23, row: 27, width: 1, height: 1, atlasKey: 'plant-potted' },

  // Recreation area (open-plan break area below War Room, cols 10-21, rows 23-26)
  { roomId: 'hallway', type: 'water-cooler', col: 10, row: 23, width: 1, height: 1, atlasKey: 'water-cooler' },
  { roomId: 'hallway', type: 'table', col: 14, row: 24, width: 3, height: 1, atlasKey: 'coffee-table' },  // rec area table
  { roomId: 'hallway', type: 'couch', col: 18, row: 25, width: 3, height: 1, atlasKey: 'couch-2wide' },
  { roomId: 'hallway', type: 'plant', col: 11, row: 26, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 20, row: 23, width: 1, height: 1, atlasKey: 'plant-potted' },
];

// -- War Room Seats -----------------------------------------------------------

/**
 * Conference table seat tiles for BILLY + 5 agents.
 * Positioned at chairs adjacent to the 4x6 portrait table at (14,14)-(17,19)
 * within the War Room interior (cols 11-20, rows 13-21).
 *
 * Arrangement:
 *   - BILLY at head/north of table
 *   - Patrik & Sandra on left side
 *   - Marcos & Isaac on right side
 *   - Wendy at south/foot of table
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  billy:   { col: 15, row: 13 }, // head of table (north chair)
  patrik:  { col: 13, row: 15 }, // left side, upper chair
  sandra:  { col: 13, row: 17 }, // left side, lower chair
  marcos:  { col: 18, row: 15 }, // right side, upper chair
  isaac:   { col: 18, row: 17 }, // right side, lower chair
  wendy:   { col: 16, row: 20 }, // foot of table (south chair)
};

// -- Decoration Items ---------------------------------------------------------

/**
 * Personality decoration positioned within a room.
 * Keys match LIMEZU_ATLAS sprite keys for multi-sheet rendering.
 */
export interface DecorationItem {
  roomId: string;
  key: string;
  col: number;
  row: number;
}

/**
 * Centralized decoration data -- role-appropriate personality items per office.
 *
 * BILLY:  CEO decor (framed award, monitor)
 * Patrik: Financial charts on wall, calculator on desk, monitor showing numbers
 * Sandra: Production schedule on wall, clipboard
 * Marcos: Law books (bookshelf), legal documents on desk
 * Isaac:  Script stacks, corkboard with project notes
 * Wendy:  Motivational artwork, extra plants, cozy items
 */
export const DECORATIONS: DecorationItem[] = [
  // BILLY: CEO decor -- framed award + Film Studio props
  { roomId: 'billy', key: 'billy-award', col: 10, row: 3 },      // framed award on wall
  { roomId: 'billy', key: 'plant-potted', col: 14, row: 3 },     // small desk plant
  { roomId: 'billy', key: 'billy-clapboard', col: 14, row: 7 },  // Film Studio clapboard
  { roomId: 'billy', key: 'film-reel', col: 10, row: 7 },        // Film Studio film reel

  // Patrik (CFO): financial charts + monitor showing numbers
  { roomId: 'patrik', key: 'patrik-chart', col: 22, row: 3 },    // financial chart on wall
  { roomId: 'patrik', key: 'monitor', col: 21, row: 3 },         // monitor with numbers on desk
  { roomId: 'patrik', key: 'filing-cabinet', col: 18, row: 3 },  // filing cabinet (financial records)

  // Sandra (Line Producer): production schedule + whiteboard
  { roomId: 'sandra', key: 'sandra-schedule', col: 2, row: 12 }, // production schedule on wall
  { roomId: 'sandra', key: 'whiteboard', col: 5, row: 12 },      // scheduling whiteboard (conf whiteboard atlas key)
  { roomId: 'sandra', key: 'postit-note', col: 6, row: 13 },     // call sheet pinned up

  // Marcos (Lawyer): law books + legal documents
  { roomId: 'marcos', key: 'marcos-lawbooks', col: 29, row: 12 }, // law books on shelf
  { roomId: 'marcos', key: 'filing-cabinet', col: 29, row: 14 }, // legal document filing

  // Isaac (Head of Development): script stacks + corkboard + Film Studio props
  { roomId: 'isaac', key: 'isaac-scripts', col: 2, row: 21 },    // script stacks
  { roomId: 'isaac', key: 'isaac-corkboard', col: 5, row: 21 },  // corkboard with project notes
  { roomId: 'isaac', key: 'clapboard', col: 6, row: 22 },        // Film Studio clapboard
  { roomId: 'isaac', key: 'camera', col: 2, row: 25 },           // Film Studio camera

  // Wendy (Performance Coach): motivational artwork + cozy items
  { roomId: 'wendy', key: 'wendy-motivational', col: 27, row: 21 }, // motivational artwork on wall
  { roomId: 'wendy', key: 'cushion', col: 28, row: 22 },            // comfort cushion near couch

  // ── Personal Touches (1-2 per office) ─────────────────────────────────────
  // BILLY: coffee mug + pen holder on desk
  { roomId: 'billy', key: 'coffee-mug', col: 11, row: 3 },
  { roomId: 'billy', key: 'pen-holder', col: 12, row: 3 },
  // Patrik: calculator + small photo frame
  { roomId: 'patrik', key: 'patrik-calculator', col: 20, row: 3 },
  { roomId: 'patrik', key: 'photo-frame', col: 18, row: 5 },
  // Sandra: coffee mug on desk + desk plant
  { roomId: 'sandra', key: 'coffee-mug', col: 5, row: 13 },
  { roomId: 'sandra', key: 'desk-plant', col: 2, row: 14 },
  // Marcos: pen holder + small photo frame
  { roomId: 'marcos', key: 'pen-holder', col: 28, row: 13 },
  { roomId: 'marcos', key: 'photo-frame', col: 25, row: 14 },
  // Isaac: coffee mug + figurine
  { roomId: 'isaac', key: 'coffee-mug', col: 2, row: 22 },
  { roomId: 'isaac', key: 'figurine', col: 5, row: 23 },
  // Wendy: candle + small photo frame
  { roomId: 'wendy', key: 'candle', col: 29, row: 22 },
  { roomId: 'wendy', key: 'photo-frame', col: 27, row: 23 },

  // ── War Room Table Detail ─────────────────────────────────────────────────
  { roomId: 'war-room', key: 'papers', col: 15, row: 16 },
  { roomId: 'war-room', key: 'water-glass', col: 14, row: 15 },
  { roomId: 'war-room', key: 'water-glass', col: 17, row: 18 },
];

// -- Room Rugs ----------------------------------------------------------------

/**
 * Area rug placement per agent office. Each rug is a colored rectangle
 * drawn on the floor layer (after floor tiles, before walls) with a
 * woven-edge border using the agent's muted signature color.
 */
export interface RoomRug {
  roomId: string;
  col: number;
  row: number;
  w: number;
  h: number;
  color: string;
  borderColor: string;
}

export const ROOM_RUGS: RoomRug[] = [
  // BILLY: muted amber rug under desk area
  { roomId: 'billy', col: 11, row: 5, w: 3, h: 2, color: 'rgba(255, 191, 64, 0.12)', borderColor: 'rgba(255, 191, 64, 0.25)' },
  // Patrik: muted purple rug
  { roomId: 'patrik', col: 19, row: 5, w: 2, h: 2, color: 'rgba(139, 92, 246, 0.12)', borderColor: 'rgba(139, 92, 246, 0.25)' },
  // Sandra: muted green rug
  { roomId: 'sandra', col: 3, row: 14, w: 2, h: 2, color: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' },
  // Marcos: muted blue rug
  { roomId: 'marcos', col: 26, row: 14, w: 2, h: 2, color: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' },
  // Isaac: muted amber rug
  { roomId: 'isaac', col: 3, row: 23, w: 2, h: 2, color: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' },
  // Wendy: muted pink rug
  { roomId: 'wendy', col: 26, row: 23, w: 2, h: 2, color: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236, 72, 153, 0.25)' },
];

// -- Recreation Area Bounds ---------------------------------------------------

/** Rec area tile bounds for floor type identification (open-plan, no room walls) */
export const REC_AREA_BOUNDS = {
  minCol: 10, maxCol: 21,
  minRow: 23, maxRow: 26,
} as const;

/**
 * Returns true if the tile is within the recreation area (open-plan break area
 * below War Room south wall, cols 10-21, rows 23-26).
 */
export function isRecAreaTile(col: number, row: number): boolean {
  return (
    col >= REC_AREA_BOUNDS.minCol && col <= REC_AREA_BOUNDS.maxCol &&
    row >= REC_AREA_BOUNDS.minRow && row <= REC_AREA_BOUNDS.maxRow
  );
}

// -- Room Lookup --------------------------------------------------------------

/**
 * Returns which room contains the given tile coordinate, or null if the
 * tile is in a hallway or outside any room.
 */
export function getRoomAtTile(col: number, row: number): Room | null {
  for (const room of ROOMS) {
    const r = room.tileRect;
    if (
      col >= r.col &&
      col < r.col + r.width &&
      row >= r.row &&
      row < r.row + r.height
    ) {
      return room;
    }
  }
  return null;
}

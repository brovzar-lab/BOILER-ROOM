/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Compact grid layout (32 cols x 30 rows) matching War Room mockup:
 *
 *            [BILLY] [Sandra]           <- centered, top row
 *   [Patrik]                [Marcos]    <- upper side offices
 *            [ WAR ROOM ]             <- center, same height as one side pair
 *   [Isaac]              [Wendy] <- lower side offices
 *
 *   - Top row: BILLY (center-left), Sandra (center-right) -- centered above War Room
 *   - War Room centered vertically between upper/lower corridors (rows 12-22, 11 tall)
 *   - Patrik & Isaac stacked on left (rows 11-17, rows 20-26)
 *   - Marcos & Wendy stacked on right (rows 11-17, rows 20-26)
 *   - Gap/corridor between upper and lower side offices at rows 18-19
 *   - 2-tile wide corridors between sections
 *   - VOID headroom above top rooms
 *   - VOID border around perimeter
 *
 * Column layout:
 *   Cols 0:      VOID border
 *   Cols 1-7:    Left offices (Patrik, Isaac)
 *   Cols 8-9:    Left vertical corridor
 *   Cols 9-15:   BILLY's Office (top row, center-left)
 *   Cols 10-21:  War Room (center, 12 wide x 11 tall)
 *   Cols 17-23:  Sandra's Office (top row, center-right)
 *   Cols 22-23:  Right vertical corridor
 *   Cols 24-30:  Right offices (Marcos, Wendy)
 *   Col  31:     VOID border
 *
 * Row layout:
 *   Rows 0-1:    VOID headroom
 *   Rows 2-8:    Top offices (BILLY, Sandra) -- 7 tall, centered
 *   Rows 9-10:   Horizontal corridor
 *   Rows 11-17:  Upper side offices (Patrik left, Marcos right)
 *   Rows 12-22:  War Room (center) -- 11 tall, centered between corridors
 *   Rows 18-19:  Corridor between upper/lower side offices (War Room continues)
 *   Rows 20-26:  Lower side offices (Isaac left, Wendy right)
 *   Rows 27-28:  Horizontal corridor below side offices
 *   Row  29:     VOID border
 *
 * Recreation Area (open-plan, no walls):
 *   Cols 10-21, Rows 23-26 — open break area below War Room south wall
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

  // Sandra's Office (top, center-right): cols 17-23, rows 2-8
  room(17, 2, 7, 7);

  // Doors (south wall -> upper horizontal corridor)
  map[8]![12] = D;  // BILLY door at south wall center
  map[8]![20] = D;  // Sandra door at south wall center

  // ============================================================================
  // UPPER HORIZONTAL CORRIDOR (rows 9-10, cols 1-30)
  // ============================================================================
  fill(1, 9, 30, 2, F);

  // ============================================================================
  // SIDE OFFICES + WAR ROOM (rows 11-26)
  // ============================================================================

  // Patrik's Office (upper-left): cols 1-7, rows 11-17
  room(1, 11, 7, 7);

  // Marcos's Office (upper-right): cols 24-30, rows 11-17
  room(24, 11, 7, 7);

  // War Room (center): cols 10-21, rows 12-22 (12 wide, 11 tall)
  room(10, 12, 12, 11);

  // Isaac's Office (lower-left): cols 1-7, rows 20-26
  room(1, 20, 7, 7);

  // Wendy's Office (lower-right): cols 24-30, rows 20-26
  room(24, 20, 7, 7);

  // Patrik door on east wall -> left vertical corridor
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
    id: 'sandra',
    name: "Sandra's Office",
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
    id: 'patrik',
    name: "Patrik's Office",
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
    name: "Wendy's Office",
    tileRect: { col: 24, row: 20, width: 7, height: 7 },
    doorTile: { col: 24, row: 23 },
    seatTile: { col: 27, row: 23 },
    billyStandTile: { col: 26, row: 23 },
  },
];

// -- Furniture ----------------------------------------------------------------

export interface FurnitureItem {
  roomId: string;
  type: 'desk' | 'chair' | 'table' | 'bookshelf' | 'plant' | 'water-cooler' | 'artwork' | 'couch';
  col: number;
  row: number;
  width: number;  // in tiles
  height: number; // in tiles
  /** Visual height in tiles for 3/4 perspective (default: height). Tall items (bookshelf=2, whiteboard=2) occlude more. */
  renderHeight?: number;
}

/**
 * Furniture placement data for all rooms and hallway decorations.
 * Each room has at least a desk; hallways have environmental props.
 */
export const FURNITURE: FurnitureItem[] = [
  // BILLY's Office (interior cols 10-14, rows 3-7)
  { roomId: 'billy', type: 'desk', col: 11, row: 3, width: 3, height: 1 },
  { roomId: 'billy', type: 'chair', col: 12, row: 4, width: 1, height: 1 },
  { roomId: 'billy', type: 'bookshelf', col: 10, row: 3, width: 1, height: 2, renderHeight: 2 },

  // Sandra's Office (interior cols 18-22, rows 3-7)
  { roomId: 'sandra', type: 'desk', col: 19, row: 3, width: 2, height: 1 },
  { roomId: 'sandra', type: 'chair', col: 20, row: 4, width: 1, height: 1 },
  { roomId: 'sandra', type: 'artwork', col: 18, row: 3, width: 1, height: 1 },

  // War Room (interior cols 11-20, rows 13-21) -- portrait conference table centered
  { roomId: 'war-room', type: 'table', col: 14, row: 14, width: 4, height: 6 },
  // Chairs around the portrait conference table (cols 14-17, rows 14-19)
  { roomId: 'war-room', type: 'chair', col: 15, row: 13, width: 1, height: 1 }, // north/head (BILLY)
  { roomId: 'war-room', type: 'chair', col: 13, row: 15, width: 1, height: 1 }, // left side, upper (Patrik)
  { roomId: 'war-room', type: 'chair', col: 13, row: 17, width: 1, height: 1 }, // left side, lower (Sandra)
  { roomId: 'war-room', type: 'chair', col: 18, row: 15, width: 1, height: 1 }, // right side, upper (Marcos)
  { roomId: 'war-room', type: 'chair', col: 18, row: 17, width: 1, height: 1 }, // right side, lower (Isaac)
  { roomId: 'war-room', type: 'chair', col: 16, row: 20, width: 1, height: 1 }, // south/foot (Wendy)

  // Patrik's Office (interior cols 2-6, rows 12-16)
  { roomId: 'patrik', type: 'desk', col: 3, row: 13, width: 2, height: 1 },
  { roomId: 'patrik', type: 'chair', col: 4, row: 14, width: 1, height: 1 },
  { roomId: 'patrik', type: 'bookshelf', col: 2, row: 12, width: 1, height: 2, renderHeight: 2 },

  // Marcos's Office (interior cols 25-29, rows 12-16)
  { roomId: 'marcos', type: 'desk', col: 26, row: 13, width: 2, height: 1 },
  { roomId: 'marcos', type: 'chair', col: 27, row: 14, width: 1, height: 1 },
  { roomId: 'marcos', type: 'plant', col: 29, row: 12, width: 1, height: 1 },

  // Isaac's Office (interior cols 2-6, rows 21-25)
  { roomId: 'isaac', type: 'desk', col: 3, row: 22, width: 2, height: 1 },
  { roomId: 'isaac', type: 'chair', col: 4, row: 23, width: 1, height: 1 },
  { roomId: 'isaac', type: 'bookshelf', col: 2, row: 21, width: 1, height: 2, renderHeight: 2 },

  // Wendy's Office (interior cols 25-29, rows 21-25)
  { roomId: 'wendy', type: 'desk', col: 26, row: 22, width: 2, height: 1 },
  { roomId: 'wendy', type: 'chair', col: 27, row: 23, width: 1, height: 1 },
  { roomId: 'wendy', type: 'plant', col: 29, row: 21, width: 1, height: 1 },

  // Hallway decorations
  { roomId: 'hallway', type: 'plant', col: 8, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'water-cooler', col: 15, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 23, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 8, row: 27, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 23, row: 27, width: 1, height: 1 },

  // Recreation area (open-plan break area below War Room, cols 10-21, rows 23-26)
  { roomId: 'hallway', type: 'water-cooler', col: 10, row: 23, width: 1, height: 1 },
  { roomId: 'hallway', type: 'table', col: 14, row: 24, width: 3, height: 1 },  // ping pong table
  { roomId: 'hallway', type: 'couch', col: 18, row: 25, width: 3, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 11, row: 26, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 20, row: 23, width: 1, height: 1 },
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
  billy:     { col: 15, row: 13 }, // head of table (north chair)
  patrik:     { col: 13, row: 15 }, // left side, upper chair
  sandra:     { col: 13, row: 17 }, // left side, lower chair
  marcos:    { col: 18, row: 15 }, // right side, upper chair
  isaac:   { col: 18, row: 17 }, // right side, lower chair
  wendy: { col: 16, row: 20 }, // foot of table (south chair)
};

// -- Decoration Items ---------------------------------------------------------

/**
 * Personality decoration positioned within a room.
 * Keys match existing DECORATION_ATLAS or ENVIRONMENT_ATLAS sprite keys.
 */
export interface DecorationItem {
  roomId: string;
  key: string;
  col: number;
  row: number;
}

/**
 * Centralized decoration data.
 * Previously hardcoded in renderer.ts renderDecorations().
 */
export const DECORATIONS: DecorationItem[] = [
  // Patrik: financial chart on wall + monitor on desk
  { roomId: 'patrik', key: 'patrik-chart', col: 2, row: 12 },
  { roomId: 'patrik', key: 'patrik-monitor', col: 5, row: 13 },

  // Marcos: law books on shelf
  { roomId: 'marcos', key: 'marcos-lawbooks', col: 29, row: 12 },

  // Sandra: 2x2 whiteboard on wall
  { roomId: 'sandra', key: 'sandra-whiteboard-tl', col: 18, row: 3 },
  { roomId: 'sandra', key: 'sandra-whiteboard-tr', col: 19, row: 3 },
  { roomId: 'sandra', key: 'sandra-whiteboard-bl', col: 18, row: 4 },
  { roomId: 'sandra', key: 'sandra-whiteboard-br', col: 19, row: 4 },

  // Isaac: filing cabinet
  { roomId: 'isaac', key: 'filing-cabinet', col: 2, row: 21 },

  // Wendy: post-it clusters + extra plant
  { roomId: 'wendy', key: 'post-it', col: 29, row: 22 },
  { roomId: 'wendy', key: 'post-it', col: 25, row: 23 },
  { roomId: 'wendy', key: 'plant', col: 25, row: 25 },

  // Billy: monitor on desk + small plant
  { roomId: 'billy', key: 'monitor', col: 13, row: 3 },
  { roomId: 'billy', key: 'plant', col: 14, row: 3 },
];

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

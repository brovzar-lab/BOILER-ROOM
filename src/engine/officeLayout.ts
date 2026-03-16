/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * 3x3 grid layout (42 cols x 36 rows):
 *
 *   [Isaac]              [BILLY/CEO]           [Patrik/CFO]     <- top row
 *   [Marcos]             [ WAR ROOM ]          [Sandra]         <- mid row
 *   [Charlie]       [Break Room | WC]          [Wendy]          <- bot row
 *
 * Column layout:
 *   Cols 0:       VOID border
 *   Cols 1-9:     Left offices (Isaac, Marcos, Charlie) — 9 wide
 *   Cols 10-11:   Left vertical corridor — 2 wide
 *   Cols 12-20:   Billy's Office (top) — 9 wide
 *   Cols 12-27:   War Room (center) — 16 wide
 *   Cols 12-21:   Break Room (bot-center-left) — 10 wide
 *   Cols 22-27:   WC (bot-center-right) — 6 wide
 *   Cols 30-31:   Right vertical corridor — 2 wide
 *   Cols 32-40:   Right offices (Patrik, Sandra, Wendy) — 9 wide
 *   Col  41:      VOID border
 *
 * Row layout:
 *   Rows 0-1:     VOID headroom
 *   Rows 2-10:    Top offices (Isaac, Billy, Patrik) — 9 tall
 *   Rows 11-12:   Upper horizontal corridor
 *   Rows 13-21:   Mid side offices (Marcos, Sandra) — 9 tall
 *   Rows 14-26:   War Room — 13 tall
 *   Rows 22-23:   Mid corridor (left/right)
 *   Rows 24-32:   Bot side offices (Charlie, Wendy) — 9 tall
 *   Rows 27-32:   Break Room + WC — 6 tall
 *   Rows 33-34:   Lower horizontal corridor
 *   Row  35:      VOID border
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

// Shorthand aliases for readability
const V = TileType.VOID;
const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

// -- Grid Dimensions ----------------------------------------------------------
const GRID_COLS = 42;
const GRID_ROWS = 36;

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

  // TOP ROW (rows 2-10)
  room(1, 2, 9, 9);    // Isaac's Office: cols 1-9, rows 2-10
  room(16, 2, 9, 9);   // BILLY's Office: cols 16-24, rows 2-10
  room(32, 2, 9, 9);   // Patrik's Office: cols 32-40, rows 2-10

  // MID ROW
  room(1, 13, 9, 9);    // Marcos's Office: cols 1-9, rows 13-21
  room(12, 14, 16, 13); // War Room: cols 12-27, rows 14-26
  room(32, 13, 9, 9);   // Sandra's Office: cols 32-40, rows 13-21

  // BOT ROW
  room(1, 24, 9, 9);    // Charlie's Office: cols 1-9, rows 24-32
  room(12, 27, 10, 6);  // Break Room: cols 12-21, rows 27-32
  room(22, 27, 6, 6);   // WC: cols 22-27, rows 27-32
  room(32, 24, 9, 9);   // Wendy's Office: cols 32-40, rows 24-32

  // ── CORRIDORS (fill AFTER rooms, may overwrite some wall tiles) ──

  // UPPER HORIZONTAL CORRIDOR (rows 11-12, cols 1-40)
  fill(1, 11, 40, 2, F);

  // Left vertical corridor (cols 10-11, rows 2-34) — extended upward from row 2
  fill(10, 2, 2, 33, F);

  // Right vertical corridor (cols 30-31, rows 2-34) — extended upward from row 2
  fill(30, 2, 2, 33, F);

  // Center-left connector (cols 12-15, rows 11-13)
  fill(12, 11, 4, 3, F);

  // Center-right connector (cols 25-29, rows 11-13)
  fill(25, 11, 5, 3, F);

  // Connecting corridor above War Room (row 13, cols 12-27)
  fill(12, 13, 16, 1, F);

  // Mid corridor left (rows 22-23, cols 1-9)
  fill(1, 22, 9, 2, F);

  // Mid corridor right (rows 22-23, cols 32-40)
  fill(32, 22, 9, 2, F);

  // Bottom area corridors — extend vertical corridors through break room/WC area
  fill(10, 27, 2, 6, F);   // Extend left vertical corridor down through break room area
  fill(28, 27, 2, 6, F);   // Corridor connecting WC to right corridor
  fill(30, 27, 2, 6, F);   // Extend right vertical corridor down

  // Connecting corridor below War Room south wall (row 27, cols 12-27)
  // Overwrites break room / WC north wall tiles to create open passage
  fill(12, 27, 16, 1, F);

  // LOWER HORIZONTAL CORRIDOR (rows 33-34, cols 1-40)
  fill(1, 33, 40, 2, F);

  // ── DOORS (set AFTER corridors so they don't get overwritten) ──
  map[10]![5] = D;      // Isaac door at south wall center
  map[10]![20] = D;     // Billy door at south wall center
  map[10]![36] = D;     // Patrik door at south wall center
  map[17]![9] = D;      // Marcos door on east wall
  map[14]![19] = D;     // War Room north door
  map[14]![20] = D;     // War Room north door (double)
  map[26]![19] = D;     // War Room south door
  map[26]![20] = D;     // War Room south door (double)
  map[17]![32] = D;     // Sandra door on west wall
  map[28]![9] = D;      // Charlie door on east wall
  map[27]![17] = D;     // Break Room north door
  map[27]![24] = D;     // WC north door
  map[28]![32] = D;     // Wendy door on west wall

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// -- Room Definitions ---------------------------------------------------------

export const ROOMS: Room[] = [
  {
    id: 'isaac',
    name: "Isaac's Office",
    tileRect: { col: 1, row: 2, width: 9, height: 9 },
    doorTile: { col: 5, row: 10 },
    seatTile: { col: 5, row: 6 },
    billyStandTile: { col: 6, row: 6 },
  },
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 16, row: 2, width: 9, height: 9 },
    doorTile: { col: 20, row: 10 },
    seatTile: { col: 20, row: 6 },
    billyStandTile: { col: 21, row: 6 },
  },
  {
    id: 'patrik',
    name: "Patrik's Office",
    tileRect: { col: 32, row: 2, width: 9, height: 9 },
    doorTile: { col: 36, row: 10 },
    seatTile: { col: 36, row: 6 },
    billyStandTile: { col: 35, row: 6 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 1, row: 13, width: 9, height: 9 },
    doorTile: { col: 9, row: 17 },
    seatTile: { col: 5, row: 17 },
    billyStandTile: { col: 6, row: 17 },
  },
  {
    id: 'war-room',
    name: 'War Room',
    tileRect: { col: 12, row: 14, width: 16, height: 13 },
    doorTile: { col: 19, row: 14 },
    seatTile: { col: 19, row: 20 },
    billyStandTile: { col: 20, row: 18 },
  },
  {
    id: 'sandra',
    name: "Sandra's Office",
    tileRect: { col: 32, row: 13, width: 9, height: 9 },
    doorTile: { col: 32, row: 17 },
    seatTile: { col: 36, row: 17 },
    billyStandTile: { col: 35, row: 17 },
  },
  {
    id: 'charlie',
    name: "Charlie's Office",
    tileRect: { col: 1, row: 24, width: 9, height: 9 },
    doorTile: { col: 9, row: 28 },
    seatTile: { col: 5, row: 28 },
    billyStandTile: { col: 6, row: 28 },
  },
  {
    id: 'break-room',
    name: 'Break Room',
    tileRect: { col: 12, row: 27, width: 10, height: 6 },
    doorTile: { col: 17, row: 27 },
    seatTile: { col: 17, row: 30 },
    billyStandTile: { col: 16, row: 30 },
  },
  {
    id: 'wc',
    name: 'WC',
    tileRect: { col: 22, row: 27, width: 6, height: 6 },
    doorTile: { col: 24, row: 27 },
    seatTile: { col: 24, row: 30 },
    billyStandTile: { col: 25, row: 30 },
  },
  {
    id: 'wendy',
    name: "Wendy's Coaching Room",
    tileRect: { col: 32, row: 24, width: 9, height: 9 },
    doorTile: { col: 32, row: 28 },
    seatTile: { col: 36, row: 28 },
    billyStandTile: { col: 35, row: 28 },
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
/** All furniture removed — rooms are clean/empty, characters only. */
export const FURNITURE: FurnitureItem[] = [];

// -- War Room Seats -----------------------------------------------------------

/**
 * Conference table seat tiles for BILLY + 6 agents.
 * Positioned at chairs adjacent to the conference table
 * within the War Room interior.
 *
 * Arrangement:
 *   - BILLY at head/north of table
 *   - Patrik & Sandra on left side
 *   - Marcos & Isaac on right side
 *   - Wendy & Charlie at south/foot of table
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  billy:   { col: 19, row: 17 },
  patrik:  { col: 16, row: 19 },
  sandra:  { col: 23, row: 19 },
  marcos:  { col: 16, row: 21 },
  isaac:   { col: 23, row: 21 },
  wendy:   { col: 19, row: 23 },
  charlie: { col: 20, row: 23 },
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
 */
/** All decorations removed — rooms are clean/empty. */
export const DECORATIONS: DecorationItem[] = [];

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

/** All rugs removed — clean floors only. */
export const ROOM_RUGS: RoomRug[] = [];

// -- Recreation Area Bounds ---------------------------------------------------

/** Rec area is now the Break Room — a proper Room in ROOMS.
 *  Kept for backward compat; bounds match break-room tileRect. */
export const REC_AREA_BOUNDS = {
  minCol: 12, maxCol: 21,
  minRow: 27, maxRow: 32,
} as const;

/**
 * Returns true if the tile is within the break room area.
 * Kept for backward compatibility — prefer getRoomAtTile() instead.
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

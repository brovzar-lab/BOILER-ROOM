/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Expanded grid layout (42 cols x 36 rows):
 *
 *            [BILLY] [Patrik]           <- centered, top row (CEO + CFO adjacent)
 *   [Sandra]                [Marcos]    <- upper side offices (Producer left, Lawyer right)
 *            [ WAR ROOM ]             <- center, same height as one side pair
 *   [Isaac]               [Wendy]     <- lower side offices (Development left, Coach right)
 *
 * Column layout:
 *   Cols 0:       VOID border
 *   Cols 1-9:     Left offices (Sandra, Isaac) — 9 wide
 *   Cols 10-11:   Left vertical corridor — 2 wide
 *   Cols 12-20:   Billy's Office — 9 wide
 *   Cols 21-29:   Patrik's Office — 9 wide
 *   Cols 12-27:   War Room — 16 wide
 *   Cols 30-31:   Right vertical corridor — 2 wide
 *   Cols 32-40:   Right offices (Marcos, Wendy) — 9 wide
 *   Col  41:      VOID border
 *
 * Row layout:
 *   Rows 0-1:     VOID headroom
 *   Rows 2-10:    Top offices (Billy, Patrik) — 9 tall
 *   Rows 11-12:   Upper horizontal corridor
 *   Rows 13-21:   Upper side offices (Sandra, Marcos)
 *   Rows 14-26:   War Room — 13 tall
 *   Rows 22-23:   Mid corridor
 *   Rows 24-32:   Lower side offices (Isaac, Wendy)
 *   Rows 27-31:   Rec area below War Room
 *   Rows 33-34:   Lower horizontal corridor
 *   Row  35:      VOID border
 *
 * Recreation Area (open-plan, no walls):
 *   Cols 12-27, Rows 27-31 -- open break area below War Room south wall
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
  room(12, 2, 9, 9);   // BILLY's Office: cols 12-20, rows 2-10
  room(21, 2, 9, 9);   // Patrik's Office: cols 21-29, rows 2-10

  map[10]![16] = D;     // BILLY door at south wall center
  map[10]![25] = D;     // Patrik door at south wall center

  // UPPER HORIZONTAL CORRIDOR (rows 11-12, cols 1-40)
  fill(1, 11, 40, 2, F);

  // SIDE OFFICES + WAR ROOM
  room(1, 13, 9, 9);    // Sandra's Office: cols 1-9, rows 13-21
  room(32, 13, 9, 9);   // Marcos's Office: cols 32-40, rows 13-21
  room(12, 14, 16, 13); // War Room: cols 12-27, rows 14-26

  room(1, 24, 9, 9);    // Isaac's Office: cols 1-9, rows 24-32
  room(32, 24, 9, 9);   // Wendy's Office: cols 32-40, rows 24-32

  map[17]![9] = D;      // Sandra door on east wall
  map[17]![32] = D;     // Marcos door on west wall
  map[28]![9] = D;      // Isaac door on east wall
  map[28]![32] = D;     // Wendy door on west wall

  // Connecting corridor above War Room north door (row 13, cols 12-27)
  fill(12, 13, 16, 1, F);

  map[14]![19] = D;     // War Room north door
  map[14]![20] = D;
  map[26]![19] = D;     // War Room south door
  map[26]![20] = D;

  // Left vertical corridor: cols 10-11, rows 11-34
  fill(10, 11, 2, 24, F);
  // Right vertical corridor: cols 30-31, rows 11-34
  fill(30, 11, 2, 24, F);

  // Recreation area below War Room (open-plan): cols 12-27, rows 27-31
  fill(12, 27, 16, 5, F);

  // Mid corridor left: rows 22-23, cols 1-9
  fill(1, 22, 9, 2, F);
  // Mid corridor right: rows 22-23, cols 32-40
  fill(32, 22, 9, 2, F);

  // LOWER HORIZONTAL CORRIDOR (rows 33-34, cols 1-40)
  fill(1, 33, 40, 2, F);

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// -- Room Definitions ---------------------------------------------------------

export const ROOMS: Room[] = [
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 12, row: 2, width: 9, height: 9 },
    doorTile: { col: 16, row: 10 },
    seatTile: { col: 16, row: 6 },
    billyStandTile: { col: 17, row: 6 },
  },
  {
    id: 'patrik',
    name: "Patrik's Office",
    tileRect: { col: 21, row: 2, width: 9, height: 9 },
    doorTile: { col: 25, row: 10 },
    seatTile: { col: 25, row: 6 },
    billyStandTile: { col: 24, row: 6 },
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
    tileRect: { col: 1, row: 13, width: 9, height: 9 },
    doorTile: { col: 9, row: 17 },
    seatTile: { col: 5, row: 17 },
    billyStandTile: { col: 6, row: 17 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 32, row: 13, width: 9, height: 9 },
    doorTile: { col: 32, row: 17 },
    seatTile: { col: 36, row: 17 },
    billyStandTile: { col: 35, row: 17 },
  },
  {
    id: 'isaac',
    name: "Isaac's Office",
    tileRect: { col: 1, row: 24, width: 9, height: 9 },
    doorTile: { col: 9, row: 28 },
    seatTile: { col: 5, row: 28 },
    billyStandTile: { col: 6, row: 28 },
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
  billy:   { col: 19, row: 17 },
  patrik:  { col: 16, row: 19 },
  sandra:  { col: 16, row: 21 },
  marcos:  { col: 23, row: 19 },
  isaac:   { col: 23, row: 21 },
  wendy:   { col: 19, row: 23 },
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

/** Rec area tile bounds for floor type identification (open-plan, no room walls) */
export const REC_AREA_BOUNDS = {
  minCol: 12, maxCol: 27,
  minRow: 27, maxRow: 31,
} as const;

/**
 * Returns true if the tile is within the recreation area (open-plan break area
 * below War Room south wall, cols 12-27, rows 27-31).
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

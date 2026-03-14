/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Compact grid layout (~31 cols x 28 rows):
 *   - BILLY's office: top-left
 *   - Sasha's office: top-right (closest to CEO)
 *   - War Room: center (large ~12x8 exterior, ~10x6 interior)
 *   - Diana (CFO): bottom-left
 *   - Marcos (Counsel): bottom-center-left
 *   - Roberto (Security): bottom-center-right
 *   - Valentina (Ops): bottom-right
 *   - Corridors: 2 tiles wide, horizontal at rows 9-10 and 19-20,
 *     vertical at cols 8-9 and 22-23
 *   - VOID headroom above top rooms for future 3/4 wall rendering
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

// Shorthand aliases for readability
const V = TileType.VOID;
const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

// ── Grid Dimensions ────────────────────────────────────────────────────────
const GRID_COLS = 31;
const GRID_ROWS = 28;

// ── Tile Map (31 cols x 28 rows) ──────────────────────────────────────────
// Layout reference:
//   Row 0-1:   VOID headroom for top rooms (3/4 wall rendering space)
//   Row 2-8:   BILLY's office (cols 1-7), Sasha's office (cols 24-30)
//   Row 9-10:  Horizontal corridor (cols 1-30) + vertical corridor segments
//   Row 11-18: War Room (cols 10-21), vertical corridors (cols 8-9, 22-23)
//   Row 19-20: Horizontal corridor (cols 1-30)
//   Row 21-27: Diana (cols 1-7), Marcos (cols 10-16),
//              Roberto (cols 17-23), Valentina (cols 24-30)

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

  // ── BILLY's Office (top-left): cols 1-7, rows 2-8 ────────────────────
  room(1, 2, 7, 7); // 5x5 interior

  // ── Sasha's Office (top-right): cols 24-30, rows 2-8 ─────────────────
  room(24, 2, 7, 7); // 5x5 interior

  // ── Horizontal Corridor (upper): cols 1-30, rows 9-10 ────────────────
  fill(1, 9, 30, 2, F);

  // ── Vertical Corridors: cols 8-9 and 22-23, rows 9-20 ────────────────
  fill(8, 9, 2, 12, F);  // left vertical corridor
  fill(22, 9, 2, 12, F); // right vertical corridor

  // Doors from BILLY's office to upper corridor (south wall)
  map[8]![4] = D;

  // Doors from Sasha's office to upper corridor (south wall)
  map[8]![27] = D;

  // ── War Room (center): cols 10-21, rows 11-18 ────────────────────────
  room(10, 11, 12, 8); // 10x6 interior

  // War Room north door (connects to corridor row 10)
  map[11]![15] = D;
  map[11]![16] = D;

  // War Room south door (connects to corridor row 19)
  map[18]![15] = D;
  map[18]![16] = D;

  // ── Horizontal Corridor (lower): cols 1-30, rows 19-20 ───────────────
  fill(1, 19, 30, 2, F);

  // ── Diana's Office (bottom-left): cols 1-7, rows 21-27 ──────────────
  room(1, 21, 7, 7); // 5x5 interior

  // Door from Diana to lower corridor (north wall)
  map[21]![4] = D;

  // ── Marcos's Office (bottom-center-left): cols 10-16, rows 21-27 ─────
  room(10, 21, 7, 7); // 5x5 interior

  // Door from Marcos to lower corridor (north wall)
  map[21]![13] = D;

  // ── Roberto's Office (bottom-center-right): cols 17-23, rows 21-27 ───
  room(17, 21, 7, 7); // 5x5 interior

  // Door from Roberto to lower corridor (north wall)
  map[21]![20] = D;

  // ── Valentina's Office (bottom-right): cols 24-30, rows 21-27 ────────
  room(24, 21, 7, 7); // 5x5 interior

  // Door from Valentina to lower corridor (north wall)
  map[21]![27] = D;

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// ── Room Definitions ────────────────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 1, row: 2, width: 7, height: 7 },
    doorTile: { col: 4, row: 8 },
    seatTile: { col: 4, row: 5 },
    billyStandTile: { col: 5, row: 5 },
  },
  {
    id: 'sasha',
    name: "Sasha's Office",
    tileRect: { col: 24, row: 2, width: 7, height: 7 },
    doorTile: { col: 27, row: 8 },
    seatTile: { col: 27, row: 5 },
    billyStandTile: { col: 26, row: 5 },
  },
  {
    id: 'war-room',
    name: 'War Room',
    tileRect: { col: 10, row: 11, width: 12, height: 8 },
    doorTile: { col: 15, row: 11 },
    seatTile: { col: 15, row: 14 },
    billyStandTile: { col: 15, row: 13 },
  },
  {
    id: 'diana',
    name: "Diana's Office",
    tileRect: { col: 1, row: 21, width: 7, height: 7 },
    doorTile: { col: 4, row: 21 },
    seatTile: { col: 4, row: 24 },
    billyStandTile: { col: 5, row: 24 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 10, row: 21, width: 7, height: 7 },
    doorTile: { col: 13, row: 21 },
    seatTile: { col: 13, row: 24 },
    billyStandTile: { col: 14, row: 24 },
  },
  {
    id: 'roberto',
    name: "Roberto's Office",
    tileRect: { col: 17, row: 21, width: 7, height: 7 },
    doorTile: { col: 20, row: 21 },
    seatTile: { col: 20, row: 24 },
    billyStandTile: { col: 21, row: 24 },
  },
  {
    id: 'valentina',
    name: "Valentina's Office",
    tileRect: { col: 24, row: 21, width: 7, height: 7 },
    doorTile: { col: 27, row: 21 },
    seatTile: { col: 27, row: 24 },
    billyStandTile: { col: 26, row: 24 },
  },
];

// ── Furniture ───────────────────────────────────────────────────────────────

export interface FurnitureItem {
  roomId: string;
  type: 'desk' | 'chair' | 'table' | 'bookshelf' | 'plant' | 'water-cooler' | 'artwork';
  col: number;
  row: number;
  width: number;  // in tiles
  height: number; // in tiles
}

/**
 * Furniture placement data for all rooms and hallway decorations.
 * Each room has at least a desk; hallways have environmental props.
 */
export const FURNITURE: FurnitureItem[] = [
  // BILLY's Office (cols 2-6, rows 3-7 interior)
  { roomId: 'billy', type: 'desk', col: 3, row: 3, width: 3, height: 1 },
  { roomId: 'billy', type: 'chair', col: 4, row: 4, width: 1, height: 1 },
  { roomId: 'billy', type: 'bookshelf', col: 2, row: 3, width: 1, height: 2 },

  // Sasha's Office (cols 25-29, rows 3-7 interior)
  { roomId: 'sasha', type: 'desk', col: 26, row: 3, width: 2, height: 1 },
  { roomId: 'sasha', type: 'chair', col: 27, row: 4, width: 1, height: 1 },
  { roomId: 'sasha', type: 'artwork', col: 25, row: 3, width: 1, height: 1 },

  // War Room (cols 11-20, rows 12-17 interior) -- conference table
  { roomId: 'war-room', type: 'table', col: 13, row: 14, width: 4, height: 2 },

  // Diana's Office (cols 2-6, rows 22-26 interior)
  { roomId: 'diana', type: 'desk', col: 3, row: 23, width: 2, height: 1 },
  { roomId: 'diana', type: 'chair', col: 4, row: 24, width: 1, height: 1 },
  { roomId: 'diana', type: 'bookshelf', col: 2, row: 22, width: 1, height: 2 },

  // Marcos's Office (cols 11-15, rows 22-26 interior)
  { roomId: 'marcos', type: 'desk', col: 12, row: 23, width: 2, height: 1 },
  { roomId: 'marcos', type: 'chair', col: 13, row: 24, width: 1, height: 1 },
  { roomId: 'marcos', type: 'plant', col: 15, row: 22, width: 1, height: 1 },

  // Roberto's Office (cols 18-22, rows 22-26 interior)
  { roomId: 'roberto', type: 'desk', col: 19, row: 23, width: 2, height: 1 },
  { roomId: 'roberto', type: 'chair', col: 20, row: 24, width: 1, height: 1 },
  { roomId: 'roberto', type: 'bookshelf', col: 18, row: 22, width: 1, height: 2 },

  // Valentina's Office (cols 25-29, rows 22-26 interior)
  { roomId: 'valentina', type: 'desk', col: 26, row: 23, width: 2, height: 1 },
  { roomId: 'valentina', type: 'chair', col: 27, row: 24, width: 1, height: 1 },
  { roomId: 'valentina', type: 'plant', col: 29, row: 22, width: 1, height: 1 },

  // Hallway decorations
  { roomId: 'hallway', type: 'plant', col: 8, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'water-cooler', col: 15, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 22, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 8, row: 20, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 22, row: 20, width: 1, height: 1 },
];

// ── War Room Seats ──────────────────────────────────────────────────────────

/**
 * Conference table seat tiles for BILLY + 5 agents.
 * Positioned adjacent to the 4x2 table at (13,14)-(16,15) within
 * the War Room interior (cols 11-20, rows 12-17).
 *
 * Arrangement:
 *   - BILLY at head/north of table
 *   - Diana & Sasha on left side
 *   - Marcos & Roberto on right side
 *   - Valentina at south/foot of table
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  billy:     { col: 15, row: 13 }, // head of table (north)
  diana:     { col: 12, row: 14 }, // left side, top
  sasha:     { col: 12, row: 15 }, // left side, bottom
  marcos:    { col: 17, row: 14 }, // right side, top
  roberto:   { col: 17, row: 15 }, // right side, bottom
  valentina: { col: 15, row: 16 }, // foot of table (south)
};

// ── Decoration Items ────────────────────────────────────────────────────────

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
  // Diana: financial chart on wall + monitor on desk
  { roomId: 'diana', key: 'diana-chart', col: 2, row: 22 },
  { roomId: 'diana', key: 'diana-monitor', col: 5, row: 23 },

  // Marcos: law books on shelf
  { roomId: 'marcos', key: 'marcos-lawbooks', col: 15, row: 22 },

  // Sasha: 2x2 whiteboard on wall
  { roomId: 'sasha', key: 'sasha-whiteboard-tl', col: 25, row: 3 },
  { roomId: 'sasha', key: 'sasha-whiteboard-tr', col: 26, row: 3 },
  { roomId: 'sasha', key: 'sasha-whiteboard-bl', col: 25, row: 4 },
  { roomId: 'sasha', key: 'sasha-whiteboard-br', col: 26, row: 4 },

  // Roberto: filing cabinet
  { roomId: 'roberto', key: 'filing-cabinet', col: 18, row: 22 },

  // Valentina: post-it clusters + extra plant
  { roomId: 'valentina', key: 'post-it', col: 29, row: 23 },
  { roomId: 'valentina', key: 'post-it', col: 25, row: 24 },
  { roomId: 'valentina', key: 'plant', col: 25, row: 26 },

  // Billy: monitor on desk + small plant
  { roomId: 'billy', key: 'monitor', col: 5, row: 3 },
  { roomId: 'billy', key: 'plant', col: 6, row: 3 },
];

// ── Room Lookup ─────────────────────────────────────────────────────────────

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

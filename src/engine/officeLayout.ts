/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Compact 3-row grid layout (32 cols x 30 rows) matching War Room mockup:
 *
 *   [BILLY]       [Sasha]
 *   [Diana] [WAR ROOM] [Marcos]
 *   [Roberto]     [Valentina]
 *
 *   - Top row: BILLY (left), Sasha (right)
 *   - Middle row: Diana (left), War Room (center, 12x9), Marcos (right)
 *   - Bottom row: Roberto (left), Valentina (right)
 *   - 2-tile wide dark corridors between all rows
 *   - VOID headroom above top rooms for future 3/4 wall rendering
 *   - VOID border around perimeter
 *
 * Column layout:
 *   Cols 0:      VOID border
 *   Cols 1-7:    Left offices (BILLY, Diana, Roberto)
 *   Cols 8-9:    Left vertical corridor
 *   Cols 10-21:  War Room (middle row) / horizontal corridor (top/bottom rows)
 *   Cols 22-23:  Right vertical corridor
 *   Cols 24-30:  Right offices (Sasha, Marcos, Valentina)
 *   Col  31:     VOID border
 *
 * Row layout:
 *   Rows 0-1:    VOID headroom
 *   Rows 2-8:    Top offices (BILLY, Sasha) — 7 tall
 *   Rows 9-10:   Horizontal corridor
 *   Rows 11-17:  Diana (left), Marcos (right) — 7 tall
 *   Rows 11-19:  War Room (center) — 9 tall
 *   Rows 18-19:  Corridor space below Diana/Marcos flanking War Room
 *   Rows 20-21:  Horizontal corridor
 *   Rows 22-28:  Bottom offices (Roberto, Valentina) — 7 tall
 *   Row  29:     VOID border
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

// Shorthand aliases for readability
const V = TileType.VOID;
const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

// ── Grid Dimensions ────────────────────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════════════
  // TOP ROW (rows 2-8)
  // ════════════════════════════════════════════════════════════════════════

  // BILLY's Office (top-left): cols 1-7, rows 2-8
  room(1, 2, 7, 7);

  // Sasha's Office (top-right): cols 24-30, rows 2-8
  room(24, 2, 7, 7);

  // Doors (south wall → upper horizontal corridor)
  map[8]![4] = D;   // BILLY door at south wall center
  map[8]![27] = D;  // Sasha door at south wall center

  // ════════════════════════════════════════════════════════════════════════
  // UPPER HORIZONTAL CORRIDOR (rows 9-10, cols 1-30)
  // ════════════════════════════════════════════════════════════════════════
  fill(1, 9, 30, 2, F);

  // ════════════════════════════════════════════════════════════════════════
  // MIDDLE ROW (rows 11-19)
  // ════════════════════════════════════════════════════════════════════════

  // Diana's Office (middle-left): cols 1-7, rows 11-17
  room(1, 11, 7, 7);

  // War Room (center): cols 10-21, rows 11-19 (12 wide, 9 tall)
  room(10, 11, 12, 9);

  // Marcos's Office (middle-right): cols 24-30, rows 11-17
  room(24, 11, 7, 7);

  // Diana door on east wall → left vertical corridor
  map[14]![7] = D;

  // Marcos door on west wall → right vertical corridor
  map[14]![24] = D;

  // War Room north door (connects to upper corridor at row 10)
  map[11]![15] = D;
  map[11]![16] = D;

  // War Room south door (connects to lower corridor at row 20)
  map[19]![15] = D;
  map[19]![16] = D;

  // Left vertical corridor: cols 8-9, spanning from upper corridor to lower corridor
  // rows 9-21 (connecting upper horizontal corridor through middle to lower)
  fill(8, 9, 2, 13, F);

  // Right vertical corridor: cols 22-23, spanning same range
  fill(22, 9, 2, 13, F);

  // Corridor space below Diana (rows 18-19, cols 1-7 area → floor between Diana south wall and lower corridor)
  // Diana ends at row 17 (south wall). Rows 18-19 need floor to connect.
  fill(1, 18, 7, 2, F);

  // Corridor space below Marcos (rows 18-19)
  // Marcos ends at row 17 (south wall). Rows 18-19 need floor to connect.
  fill(24, 18, 7, 2, F);

  // ════════════════════════════════════════════════════════════════════════
  // LOWER HORIZONTAL CORRIDOR (rows 20-21, cols 1-30)
  // ════════════════════════════════════════════════════════════════════════
  fill(1, 20, 30, 2, F);

  // ════════════════════════════════════════════════════════════════════════
  // BOTTOM ROW (rows 22-28)
  // ════════════════════════════════════════════════════════════════════════

  // Roberto's Office (bottom-left): cols 1-7, rows 22-28
  room(1, 22, 7, 7);

  // Valentina's Office (bottom-right): cols 24-30, rows 22-28
  room(24, 22, 7, 7);

  // Doors (north wall → lower horizontal corridor)
  map[22]![4] = D;   // Roberto door at north wall center
  map[22]![27] = D;  // Valentina door at north wall center

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
    tileRect: { col: 10, row: 11, width: 12, height: 9 },
    doorTile: { col: 15, row: 11 },
    seatTile: { col: 15, row: 15 },
    billyStandTile: { col: 15, row: 13 },
  },
  {
    id: 'diana',
    name: "Diana's Office",
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
    id: 'roberto',
    name: "Roberto's Office",
    tileRect: { col: 1, row: 22, width: 7, height: 7 },
    doorTile: { col: 4, row: 22 },
    seatTile: { col: 4, row: 25 },
    billyStandTile: { col: 5, row: 25 },
  },
  {
    id: 'valentina',
    name: "Valentina's Office",
    tileRect: { col: 24, row: 22, width: 7, height: 7 },
    doorTile: { col: 27, row: 22 },
    seatTile: { col: 27, row: 25 },
    billyStandTile: { col: 26, row: 25 },
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
  // BILLY's Office (interior cols 2-6, rows 3-7)
  { roomId: 'billy', type: 'desk', col: 3, row: 3, width: 3, height: 1 },
  { roomId: 'billy', type: 'chair', col: 4, row: 4, width: 1, height: 1 },
  { roomId: 'billy', type: 'bookshelf', col: 2, row: 3, width: 1, height: 2 },

  // Sasha's Office (interior cols 25-29, rows 3-7)
  { roomId: 'sasha', type: 'desk', col: 26, row: 3, width: 2, height: 1 },
  { roomId: 'sasha', type: 'chair', col: 27, row: 4, width: 1, height: 1 },
  { roomId: 'sasha', type: 'artwork', col: 25, row: 3, width: 1, height: 1 },

  // War Room (interior cols 11-20, rows 12-18) — conference table
  { roomId: 'war-room', type: 'table', col: 14, row: 14, width: 4, height: 2 },

  // Diana's Office (interior cols 2-6, rows 12-16)
  { roomId: 'diana', type: 'desk', col: 3, row: 13, width: 2, height: 1 },
  { roomId: 'diana', type: 'chair', col: 4, row: 14, width: 1, height: 1 },
  { roomId: 'diana', type: 'bookshelf', col: 2, row: 12, width: 1, height: 2 },

  // Marcos's Office (interior cols 25-29, rows 12-16)
  { roomId: 'marcos', type: 'desk', col: 26, row: 13, width: 2, height: 1 },
  { roomId: 'marcos', type: 'chair', col: 27, row: 14, width: 1, height: 1 },
  { roomId: 'marcos', type: 'plant', col: 29, row: 12, width: 1, height: 1 },

  // Roberto's Office (interior cols 2-6, rows 23-27)
  { roomId: 'roberto', type: 'desk', col: 3, row: 24, width: 2, height: 1 },
  { roomId: 'roberto', type: 'chair', col: 4, row: 25, width: 1, height: 1 },
  { roomId: 'roberto', type: 'bookshelf', col: 2, row: 23, width: 1, height: 2 },

  // Valentina's Office (interior cols 25-29, rows 23-27)
  { roomId: 'valentina', type: 'desk', col: 26, row: 24, width: 2, height: 1 },
  { roomId: 'valentina', type: 'chair', col: 27, row: 25, width: 1, height: 1 },
  { roomId: 'valentina', type: 'plant', col: 29, row: 23, width: 1, height: 1 },

  // Hallway decorations
  { roomId: 'hallway', type: 'plant', col: 8, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'water-cooler', col: 15, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 23, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 8, row: 20, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 23, row: 20, width: 1, height: 1 },
];

// ── War Room Seats ──────────────────────────────────────────────────────────

/**
 * Conference table seat tiles for BILLY + 5 agents.
 * Positioned adjacent to the 4x2 table at (14,14)-(17,15) within
 * the War Room interior (cols 11-20, rows 12-18).
 *
 * Arrangement:
 *   - BILLY at head/north of table
 *   - Diana & Sasha on left side
 *   - Marcos & Roberto on right side
 *   - Valentina at south/foot of table
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  billy:     { col: 16, row: 13 }, // head of table (north)
  diana:     { col: 13, row: 14 }, // left side, top
  sasha:     { col: 13, row: 15 }, // left side, bottom
  marcos:    { col: 18, row: 14 }, // right side, top
  roberto:   { col: 18, row: 15 }, // right side, bottom
  valentina: { col: 16, row: 16 }, // foot of table (south)
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
  { roomId: 'diana', key: 'diana-chart', col: 2, row: 12 },
  { roomId: 'diana', key: 'diana-monitor', col: 5, row: 13 },

  // Marcos: law books on shelf
  { roomId: 'marcos', key: 'marcos-lawbooks', col: 29, row: 12 },

  // Sasha: 2x2 whiteboard on wall
  { roomId: 'sasha', key: 'sasha-whiteboard-tl', col: 25, row: 3 },
  { roomId: 'sasha', key: 'sasha-whiteboard-tr', col: 26, row: 3 },
  { roomId: 'sasha', key: 'sasha-whiteboard-bl', col: 25, row: 4 },
  { roomId: 'sasha', key: 'sasha-whiteboard-br', col: 26, row: 4 },

  // Roberto: filing cabinet
  { roomId: 'roberto', key: 'filing-cabinet', col: 2, row: 23 },

  // Valentina: post-it clusters + extra plant
  { roomId: 'valentina', key: 'post-it', col: 29, row: 24 },
  { roomId: 'valentina', key: 'post-it', col: 25, row: 25 },
  { roomId: 'valentina', key: 'plant', col: 25, row: 27 },

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

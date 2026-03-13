/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Hub-and-spoke layout (~42 cols x 34 rows):
 *   - BILLY's corner office: top-center
 *   - War Room: center (large ~8x8 interior)
 *   - Diana's office: left of War Room
 *   - Marcos's office: right of War Room
 *   - Sasha's office: bottom-left
 *   - Roberto's office: bottom-right
 *   - Valentina's office: bottom-center
 *   - Hallways: 2-3 tiles wide connecting all rooms
 *   - VOID outside office perimeter
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

// Shorthand aliases for readability
const V = TileType.VOID;
const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

// ── Tile Map (42 cols x 34 rows) ───────────────────────────────────────────
// Each row is 42 tiles wide.
// Layout reference:
//   Row 0-1:   VOID / top border
//   Row 2-8:   BILLY's office (cols 16-25) with hallway below
//   Row 9-10:  Hallway connecting BILLY to Diana/War Room/Marcos
//   Row 11-12: Diana(left) / War Room (center) / Marcos(right) top walls
//   Row 13-20: Diana / War Room interior / Marcos
//   Row 21-22: Hallway connecting rooms to bottom offices
//   Row 23-24: Sasha(left) / Valentina(center) / Roberto(right) top walls
//   Row 25-31: Sasha / Valentina / Roberto interiors
//   Row 32-33: Bottom border / VOID

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function buildTileMap(): TileType[][] {
  // Initialize with VOID
  const rows = 34;
  const cols = 42;
  const map: TileType[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < cols; c++) {
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

  // ── BILLY's Office (top-center): cols 16-25, rows 2-8 ──────────────────
  room(16, 2, 10, 7); // 8x5 interior

  // ── Main Horizontal Hallway (upper): cols 4-37, rows 9-10 ──────────────
  fill(4, 9, 34, 2, F);

  // Door from BILLY's office to hallway
  map[8]![20] = D;
  map[8]![21] = D;

  // ── Diana's Office (left): cols 4-13, rows 11-20 ───────────────────────
  room(4, 11, 10, 10); // 8x8 interior

  // Door from Diana to upper hallway
  map[11]![8] = D;
  map[11]![9] = D;

  // ── War Room (center): cols 16-25, rows 11-20 ──────────────────────────
  room(16, 11, 10, 10); // 8x8 interior

  // Doors from War Room to upper hallway
  map[11]![20] = D;
  map[11]![21] = D;

  // ── Marcos's Office (right): cols 28-37, rows 11-20 ────────────────────
  room(28, 11, 10, 10); // 8x8 interior

  // Door from Marcos to upper hallway
  map[11]![32] = D;
  map[11]![33] = D;

  // ── Vertical Hallways connecting Diana/War Room/Marcos areas ────────────
  // Left vertical hallway (between Diana and upper hallway): cols 8-9
  // Already covered by upper hallway row, but also connect down to lower
  // Right vertical hallway (between Marcos and upper hallway): cols 32-33
  // Already covered

  // ── Main Horizontal Hallway (lower): cols 4-37, rows 21-22 ─────────────
  fill(4, 21, 34, 2, F);

  // Doors from Diana to lower hallway
  map[20]![8] = D;
  map[20]![9] = D;

  // Doors from War Room to lower hallway
  map[20]![20] = D;
  map[20]![21] = D;

  // Doors from Marcos to lower hallway
  map[20]![32] = D;
  map[20]![33] = D;

  // ── Left Vertical Hallway: cols 8-9, rows 9-22 (connect everything) ────
  // Upper hallway and lower hallway already have floor at these cols.
  // Fill vertical sections between rooms.
  fill(8, 9, 2, 2, F); // top section (already filled by upper hallway)
  fill(8, 21, 2, 2, F); // bottom section (already filled by lower hallway)

  // ── Right Vertical Hallway: cols 32-33, rows 9-22 ─────────────────────
  fill(32, 9, 2, 2, F); // top section
  fill(32, 21, 2, 2, F); // bottom section

  // ── Center Vertical Hallway: cols 20-21, rows 9-22 ────────────────────
  // Connects BILLY -> upper hallway -> War Room -> lower hallway
  // Already covered by horizontal hallways and doors

  // ── Sasha's Office (bottom-left): cols 4-13, rows 23-32 ───────────────
  room(4, 23, 10, 10); // 8x8 interior

  // Door from Sasha to lower hallway
  map[23]![8] = D;
  map[23]![9] = D;

  // ── Valentina's Office (bottom-center): cols 16-25, rows 23-32 ────────
  room(16, 23, 10, 10); // 8x8 interior

  // Door from Valentina to lower hallway
  map[23]![20] = D;
  map[23]![21] = D;

  // ── Roberto's Office (bottom-right): cols 28-37, rows 23-32 ───────────
  room(28, 23, 10, 10); // 8x8 interior

  // Door from Roberto to lower hallway
  map[23]![32] = D;
  map[23]![33] = D;

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// ── Room Definitions ────────────────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 16, row: 2, width: 10, height: 7 },
    doorTile: { col: 20, row: 8 },
    seatTile: { col: 20, row: 4 },
    billyStandTile: { col: 21, row: 5 },
  },
  {
    id: 'diana',
    name: "Diana's Office",
    tileRect: { col: 4, row: 11, width: 10, height: 10 },
    doorTile: { col: 8, row: 11 },
    seatTile: { col: 8, row: 15 },
    billyStandTile: { col: 9, row: 15 },
  },
  {
    id: 'war-room',
    name: 'War Room',
    tileRect: { col: 16, row: 11, width: 10, height: 10 },
    doorTile: { col: 20, row: 11 },
    seatTile: { col: 20, row: 13 },
    billyStandTile: { col: 20, row: 13 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 28, row: 11, width: 10, height: 10 },
    doorTile: { col: 32, row: 11 },
    seatTile: { col: 32, row: 15 },
    billyStandTile: { col: 33, row: 15 },
  },
  {
    id: 'sasha',
    name: "Sasha's Office",
    tileRect: { col: 4, row: 23, width: 10, height: 10 },
    doorTile: { col: 8, row: 23 },
    seatTile: { col: 8, row: 27 },
    billyStandTile: { col: 9, row: 27 },
  },
  {
    id: 'valentina',
    name: "Valentina's Office",
    tileRect: { col: 16, row: 23, width: 10, height: 10 },
    doorTile: { col: 20, row: 23 },
    seatTile: { col: 20, row: 27 },
    billyStandTile: { col: 21, row: 27 },
  },
  {
    id: 'roberto',
    name: "Roberto's Office",
    tileRect: { col: 28, row: 23, width: 10, height: 10 },
    doorTile: { col: 32, row: 23 },
    seatTile: { col: 32, row: 27 },
    billyStandTile: { col: 33, row: 27 },
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
 * Phase 8 will replace placeholder rendering with sprite-based furniture.
 */
export const FURNITURE: FurnitureItem[] = [
  // BILLY's Office (cols 17-24, rows 3-7 interior)
  { roomId: 'billy', type: 'desk', col: 19, row: 3, width: 3, height: 1 },
  { roomId: 'billy', type: 'chair', col: 20, row: 4, width: 1, height: 1 },
  { roomId: 'billy', type: 'bookshelf', col: 17, row: 3, width: 1, height: 2 },

  // Diana's Office (cols 5-12, rows 12-19 interior)
  { roomId: 'diana', type: 'desk', col: 7, row: 14, width: 2, height: 1 },
  { roomId: 'diana', type: 'chair', col: 8, row: 15, width: 1, height: 1 },
  { roomId: 'diana', type: 'bookshelf', col: 5, row: 12, width: 1, height: 2 },

  // War Room (cols 17-24, rows 12-19 interior) -- large conference table
  { roomId: 'war-room', type: 'table', col: 18, row: 14, width: 5, height: 3 },

  // Marcos's Office (cols 29-36, rows 12-19 interior)
  { roomId: 'marcos', type: 'desk', col: 31, row: 14, width: 2, height: 1 },
  { roomId: 'marcos', type: 'chair', col: 32, row: 15, width: 1, height: 1 },
  { roomId: 'marcos', type: 'plant', col: 36, row: 12, width: 1, height: 1 },

  // Sasha's Office (cols 5-12, rows 24-31 interior)
  { roomId: 'sasha', type: 'desk', col: 7, row: 26, width: 2, height: 1 },
  { roomId: 'sasha', type: 'chair', col: 8, row: 27, width: 1, height: 1 },
  { roomId: 'sasha', type: 'artwork', col: 5, row: 24, width: 1, height: 1 },

  // Valentina's Office (cols 17-24, rows 24-31 interior)
  { roomId: 'valentina', type: 'desk', col: 19, row: 26, width: 2, height: 1 },
  { roomId: 'valentina', type: 'chair', col: 20, row: 27, width: 1, height: 1 },
  { roomId: 'valentina', type: 'plant', col: 24, row: 24, width: 1, height: 1 },

  // Roberto's Office (cols 29-36, rows 24-31 interior)
  { roomId: 'roberto', type: 'desk', col: 31, row: 26, width: 2, height: 1 },
  { roomId: 'roberto', type: 'chair', col: 32, row: 27, width: 1, height: 1 },
  { roomId: 'roberto', type: 'bookshelf', col: 29, row: 24, width: 1, height: 2 },

  // Hallway decorations
  { roomId: 'hallway', type: 'plant', col: 6, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'water-cooler', col: 15, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'artwork', col: 27, row: 9, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 6, row: 22, width: 1, height: 1 },
  { roomId: 'hallway', type: 'plant', col: 36, row: 22, width: 1, height: 1 },
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

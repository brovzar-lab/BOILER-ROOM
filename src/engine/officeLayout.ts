/**
 * Office floor plan data: room definitions, tile map array, room metadata.
 *
 * Layout (42 cols × 36 rows) — all offices 12×10, no VOID tiles.
 * Entire grid is FLOOR first, then rooms stamp walls+interiors on top.
 *
 *   [Isaac 12×10]   [Billy 12×10]   [Patrik 12×10]     <- rows 0-9
 *                  [ corridor rows 10-11 ]
 *   [Marcos 12×10]  [BOARD ROOM 14×14]  [Sandra 12×10]  <- rows 12-21
 *                   [  (portrait)  ]                     <- rows 22-25
 *                  [ corridor rows 22-23 sides ]
 *   [Charlie 12×10]  [ open floor ]  [Wendy 12×10]      <- rows 24-33
 *                  [ corridor rows 34-35 ]
 */
import { TileType } from './types';
import type { Room, TileCoord } from './types';

const F = TileType.FLOOR;
const W = TileType.WALL;
const D = TileType.DOOR;

const GRID_COLS = 42;
const GRID_ROWS = 36;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function buildTileMap(): TileType[][] {
  // Start with ALL FLOOR — no VOID/black tiles anywhere
  const map: TileType[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push(F);
    }
    map.push(row);
  }

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

  // Room: stamp walls then interior floor (corridor floor underneath is preserved outside)
  const room = (col: number, row: number, w: number, h: number): void => {
    fill(col, row, w, h, W);
    fill(col + 1, row + 1, w - 2, h - 2, F);
  };

  // ── ROOMS (all offices 12 wide × 10 tall) ────────────────────────────────

  // TOP ROW (rows 0-9)
  room(0, 0, 12, 10);      // Isaac: cols 0-11
  room(15, 0, 12, 10);     // Billy: cols 15-26 (centered in 18-wide center)
  room(30, 0, 12, 10);     // Patrik: cols 30-41

  // MID ROW (rows 12-21)
  room(0, 12, 12, 10);     // Marcos: cols 0-11
  room(30, 12, 12, 10);    // Sandra: cols 30-41

  // CENTER — Board Room portrait (rows 12-25, 14 wide × 14 tall)
  room(14, 12, 14, 14);    // Board Room: cols 14-27, rows 12-25

  // BOT ROW (rows 24-33)
  room(0, 24, 12, 10);     // Charlie: cols 0-11
  room(30, 24, 12, 10);    // Wendy: cols 30-41

  // ── DOORS (2 tiles wide) ──────────────────────────────────────────────────

  // Top row: south wall doors → corridor at rows 10-11
  map[9]![5] = D; map[9]![6] = D;         // Isaac
  map[9]![20] = D; map[9]![21] = D;       // Billy
  map[9]![35] = D; map[9]![36] = D;       // Patrik

  // Mid row: east/west wall doors → vertical corridor cols 12-13 / 28-29
  map[16]![11] = D; map[17]![11] = D;     // Marcos east
  map[16]![30] = D; map[17]![30] = D;     // Sandra west

  // Board Room: north door 4 tiles wide (row 12) → corridor at row 11
  map[12]![19] = D; map[12]![20] = D; map[12]![21] = D; map[12]![22] = D;

  // Bot row: east/west wall doors → vertical corridor
  map[28]![11] = D; map[29]![11] = D;     // Charlie east
  map[28]![30] = D; map[29]![30] = D;     // Wendy west

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// -- Room Definitions ---------------------------------------------------------

export const ROOMS: Room[] = [
  {
    id: 'isaac',
    name: "Isaac's Office",
    tileRect: { col: 0, row: 0, width: 12, height: 10 },
    doorTile: { col: 5, row: 9 },
    seatTile: { col: 5, row: 5 },
    billyStandTile: { col: 6, row: 5 },
  },
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 15, row: 0, width: 12, height: 10 },
    doorTile: { col: 20, row: 9 },
    seatTile: { col: 20, row: 5 },
    billyStandTile: { col: 21, row: 5 },
  },
  {
    id: 'patrik',
    name: "Patrik's Office",
    tileRect: { col: 30, row: 0, width: 12, height: 10 },
    doorTile: { col: 35, row: 9 },
    seatTile: { col: 35, row: 5 },
    billyStandTile: { col: 34, row: 5 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 0, row: 12, width: 12, height: 10 },
    doorTile: { col: 11, row: 16 },
    seatTile: { col: 5, row: 16 },
    billyStandTile: { col: 6, row: 16 },
  },
  {
    id: 'war-room',
    name: 'Board Room',
    tileRect: { col: 14, row: 12, width: 14, height: 14 },
    doorTile: { col: 19, row: 12 },
    seatTile: { col: 20, row: 19 },
    billyStandTile: { col: 21, row: 17 },
  },
  {
    id: 'sandra',
    name: "Sandra's Office",
    tileRect: { col: 30, row: 12, width: 12, height: 10 },
    doorTile: { col: 30, row: 16 },
    seatTile: { col: 36, row: 16 },
    billyStandTile: { col: 35, row: 16 },
  },
  {
    id: 'charlie',
    name: "Charlie's Office",
    tileRect: { col: 0, row: 24, width: 12, height: 10 },
    doorTile: { col: 11, row: 28 },
    seatTile: { col: 5, row: 28 },
    billyStandTile: { col: 6, row: 28 },
  },
  {
    id: 'wendy',
    name: "Wendy's Coaching Room",
    tileRect: { col: 30, row: 24, width: 12, height: 10 },
    doorTile: { col: 30, row: 28 },
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
  width: number;
  height: number;
  renderHeight?: number;
  atlasKey?: string;
}

export const FURNITURE: FurnitureItem[] = [];

// -- War Room Seats -----------------------------------------------------------

/**
 * Board Room interior: cols 15-26, rows 13-24 (portrait 12×12 interior).
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  billy:   { col: 20, row: 15 },
  patrik:  { col: 17, row: 17 },
  sandra:  { col: 24, row: 17 },
  marcos:  { col: 17, row: 20 },
  isaac:   { col: 24, row: 20 },
  wendy:   { col: 20, row: 23 },
  charlie: { col: 21, row: 23 },
};

// -- Decoration Items ---------------------------------------------------------

export interface DecorationItem {
  roomId: string;
  key: string;
  col: number;
  row: number;
}

export const DECORATIONS: DecorationItem[] = [];

// -- Room Rugs ----------------------------------------------------------------

export interface RoomRug {
  roomId: string;
  col: number;
  row: number;
  w: number;
  h: number;
  color: string;
  borderColor: string;
}

export const ROOM_RUGS: RoomRug[] = [];

// -- Recreation Area Bounds ---------------------------------------------------

export const REC_AREA_BOUNDS = {
  minCol: 14, maxCol: 27,
  minRow: 26, maxRow: 35,
} as const;

export function isRecAreaTile(col: number, row: number): boolean {
  return (
    col >= REC_AREA_BOUNDS.minCol && col <= REC_AREA_BOUNDS.maxCol &&
    row >= REC_AREA_BOUNDS.minRow && row <= REC_AREA_BOUNDS.maxRow
  );
}

// -- Room Lookup --------------------------------------------------------------

// ── Mutable Setters (used by layout editor) ─────────────────────────────────

/** Set a single tile type in the map. */
export function setTile(col: number, row: number, type: TileType): void {
  if (row >= 0 && row < OFFICE_TILE_MAP.length && col >= 0 && col < OFFICE_TILE_MAP[0]!.length) {
    OFFICE_TILE_MAP[row]![col] = type;
  }
}

/** Add a furniture item, optionally at a specific index (for undo). */
export function addFurniture(item: FurnitureItem, atIndex?: number): void {
  if (atIndex !== undefined && atIndex >= 0 && atIndex <= FURNITURE.length) {
    FURNITURE.splice(atIndex, 0, item);
  } else {
    FURNITURE.push(item);
  }
}

/** Remove furniture at a specific array index. */
export function removeFurnitureAt(index: number): void {
  if (index >= 0 && index < FURNITURE.length) {
    FURNITURE.splice(index, 1);
  }
}

/** Find furniture at a tile position, returning its array index or null. */
export function getFurnitureAt(col: number, row: number): number | null {
  for (let i = FURNITURE.length - 1; i >= 0; i--) {
    const f = FURNITURE[i]!;
    if (col >= f.col && col < f.col + f.width && row >= f.row && row < f.row + f.height) {
      return i;
    }
  }
  return null;
}

/** Add a decoration item. */
export function addDecoration(item: DecorationItem): void {
  DECORATIONS.push(item);
}

/** Remove a decoration by index. */
export function removeDecorationAt(index: number): void {
  if (index >= 0 && index < DECORATIONS.length) {
    DECORATIONS.splice(index, 1);
  }
}

// ── Room Lookup ─────────────────────────────────────────────────────────────

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

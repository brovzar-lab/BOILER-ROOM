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

const GRID_COLS = 45;
const GRID_ROWS = 38;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
function buildTileMap(): TileType[][] {
  const map: TileType[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < GRID_COLS; c++) row.push(F);
    map.push(row);
  }

  const fill = (startCol: number, startRow: number, w: number, h: number, tile: TileType): void => {
    for (let r = startRow; r < startRow + h; r++)
      for (let c = startCol; c < startCol + w; c++)
        map[r]![c] = tile;
  };

  const room = (col: number, row: number, w: number, h: number): void => {
    fill(col, row, w, h, W);
    fill(col + 1, row + 1, w - 2, h - 2, F);
  };

  // ── ROOMS — lemon-office-layout NW.json (45×38) ──────────────────────────────────
  // TOP ROW (rows 2–11)
  room(2, 2, 13, 10);  // Isaac:  cols  2-14
  room(16, 2, 15, 10);  // Billy:  cols 16-30
  room(32, 2, 11, 10);  // Patrik: cols 32-42

  // MID (rows 14–23)
  room(2, 14, 12, 10); // Marcos: cols  2-13
  room(32, 14, 11, 10); // Sandra: cols 32-42
  room(16, 14, 14, 15); // Board Room: cols 16-29, rows 14-28

  // BOT ROW (rows 26–35)
  room(2, 26, 12, 10); // Charlie: cols  2-13
  room(32, 26, 11, 10); // Wendy:   cols 32-42

  // ── DOORS — all 13 from NW JSON ────────────────────────────────────────────────
  // Top row south wall → corridor row 11
  map[11]![8] = D;                    // Isaac  (col 8)
  map[11]![22] = D; map[11]![23] = D;  // Billy  (cols 22-23)
  map[11]![37] = D; map[11]![38] = D;  // Patrik (cols 37-38)

  // Mid row east/west walls
  map[18]![13] = D; map[19]![13] = D;  // Marcos east  (col 13, rows 18-19)
  map[18]![32] = D; map[19]![32] = D;  // Sandra west  (col 32, rows 18-19)

  // Board Room: no north door in JSON — use row 14 center
  map[14]![21] = D; map[14]![22] = D;  // Board Room north (cols 21-22)

  // Bot row east/west walls
  map[30]![13] = D; map[31]![13] = D;  // Charlie east (col 13, rows 30-31)
  map[30]![32] = D; map[31]![32] = D;  // Wendy west   (col 32, rows 30-31)

  return map;
}

export const OFFICE_TILE_MAP: TileType[][] = buildTileMap();

// -- Room Definitions ---------------------------------------------------------

export const ROOMS: Room[] = [
  {
    id: 'isaac',
    name: "Isaac's Office",
    tileRect: { col: 2, row: 2, width: 13, height: 10 },
    doorTile: { col: 8, row: 11 },
    seatTile: { col: 8, row: 6 },
    billyStandTile: { col: 9, row: 6 },
  },
  {
    id: 'billy',
    name: "BILLY's Office",
    tileRect: { col: 16, row: 2, width: 15, height: 10 },
    doorTile: { col: 22, row: 11 },
    seatTile: { col: 22, row: 6 },
    billyStandTile: { col: 23, row: 6 },
  },
  {
    id: 'patrik',
    name: "Patrik's Office",
    tileRect: { col: 32, row: 2, width: 11, height: 10 },
    doorTile: { col: 37, row: 11 },
    seatTile: { col: 37, row: 6 },
    billyStandTile: { col: 36, row: 6 },
  },
  {
    id: 'marcos',
    name: "Marcos's Office",
    tileRect: { col: 2, row: 14, width: 12, height: 10 },
    doorTile: { col: 13, row: 18 },
    seatTile: { col: 7, row: 18 },
    billyStandTile: { col: 8, row: 18 },
  },
  {
    id: 'war-room',
    name: 'Board Room',
    tileRect: { col: 16, row: 14, width: 14, height: 15 },
    doorTile: { col: 21, row: 14 },
    seatTile: { col: 22, row: 22 },
    billyStandTile: { col: 23, row: 20 },
  },
  {
    id: 'sandra',
    name: "Sandra's Office",
    tileRect: { col: 32, row: 14, width: 11, height: 10 },
    doorTile: { col: 32, row: 18 },
    seatTile: { col: 37, row: 18 },
    billyStandTile: { col: 36, row: 18 },
  },
  {
    id: 'charlie',
    name: "Charlie's Office",
    tileRect: { col: 2, row: 26, width: 12, height: 10 },
    doorTile: { col: 13, row: 30 },
    seatTile: { col: 7, row: 30 },
    billyStandTile: { col: 8, row: 30 },
  },
  {
    id: 'wendy',
    name: "Wendy's Coaching Room",
    tileRect: { col: 32, row: 26, width: 11, height: 10 },
    doorTile: { col: 32, row: 30 },
    seatTile: { col: 37, row: 30 },
    billyStandTile: { col: 36, row: 30 },
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

export const FURNITURE: FurnitureItem[] = [
  // lemon-office-layout NW.json — 9 corridor plants
  { roomId: 'hallway', type: 'plant', col: 17, row: 9, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 3, row: 9, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 3, row: 21, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 33, row: 9, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 33, row: 15, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 33, row: 27, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 11, row: 27, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 19, row: 29, width: 1, height: 1, atlasKey: 'plant-large' },
  { roomId: 'hallway', type: 'plant', col: 25, row: 29, width: 1, height: 1, atlasKey: 'plant-large' },
];


// -- War Room Seats -----------------------------------------------------------

/**
 * Board Room interior: cols 15-26, rows 13-24 (portrait 12×12 interior).
 */
export const WAR_ROOM_SEATS: Record<string, TileCoord> = {
  // Board Room interior: cols 17-28, rows 15-27 (NW JSON layout)
  billy: { col: 22, row: 17 },
  patrik: { col: 19, row: 19 },
  sandra: { col: 26, row: 19 },
  marcos: { col: 19, row: 22 },
  isaac: { col: 26, row: 22 },
  wendy: { col: 22, row: 25 },
  charlie: { col: 23, row: 25 },
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
  // Open floor area below Board Room south wall (rows 29+, cols 15-28)
  minCol: 15, maxCol: 28,
  minRow: 29, maxRow: 37,
} as const;

export function isRecAreaTile(col: number, row: number): boolean {
  return (
    col >= REC_AREA_BOUNDS.minCol && col <= REC_AREA_BOUNDS.maxCol &&
    row >= REC_AREA_BOUNDS.minRow && row <= REC_AREA_BOUNDS.maxRow
  );
}

// -- Per-tile style overrides (set by editor) ---------------------------------

/** Maps "col,row" → atlas key for custom floor/wall styles painted by the editor. */
export const TILE_STYLES: Map<string, string> = new Map();

/** Set a custom atlas style for a tile. */
export function setTileStyle(col: number, row: number, atlasKey: string): void {
  TILE_STYLES.set(`${col},${row}`, atlasKey);
}

/** Get the custom atlas style for a tile, or null if using default. */
export function getTileStyle(col: number, row: number): string | null {
  return TILE_STYLES.get(`${col},${row}`) ?? null;
}

/** Clear a tile's custom style. */
export function clearTileStyle(col: number, row: number): void {
  TILE_STYLES.delete(`${col},${row}`);
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

/**
 * Expand or shrink the tile map from a specific edge.
 * Positive amount = add tiles, negative = remove tiles.
 * Shifts all room/furniture/decoration positions when adding to top or left.
 */
export function resizeGridEdge(edge: 'top' | 'bottom' | 'left' | 'right', amount: number): void {
  if (amount === 0) return;

  const oldRows = OFFICE_TILE_MAP.length;
  const oldCols = oldRows > 0 ? OFFICE_TILE_MAP[0]!.length : 0;

  if (edge === 'bottom') {
    if (amount > 0) {
      for (let i = 0; i < amount; i++) {
        const row: TileType[] = [];
        for (let c = 0; c < oldCols; c++) row.push(F);
        OFFICE_TILE_MAP.push(row);
      }
    } else {
      const remove = Math.min(-amount, oldRows - 1);
      OFFICE_TILE_MAP.length = oldRows - remove;
    }
  } else if (edge === 'top') {
    if (amount > 0) {
      for (let i = 0; i < amount; i++) {
        const row: TileType[] = [];
        for (let c = 0; c < oldCols; c++) row.push(F);
        OFFICE_TILE_MAP.unshift(row);
      }
      // Shift all positioned elements down
      shiftPositions(0, amount);
    } else {
      const remove = Math.min(-amount, oldRows - 1);
      OFFICE_TILE_MAP.splice(0, remove);
      shiftPositions(0, -remove);
    }
  } else if (edge === 'right') {
    if (amount > 0) {
      for (const row of OFFICE_TILE_MAP) {
        for (let i = 0; i < amount; i++) row.push(F);
      }
    } else {
      const remove = Math.min(-amount, oldCols - 1);
      for (const row of OFFICE_TILE_MAP) {
        row.length = row.length - remove;
      }
    }
  } else if (edge === 'left') {
    if (amount > 0) {
      for (const row of OFFICE_TILE_MAP) {
        for (let i = 0; i < amount; i++) row.unshift(F);
      }
      shiftPositions(amount, 0);
    } else {
      const remove = Math.min(-amount, oldCols - 1);
      for (const row of OFFICE_TILE_MAP) {
        row.splice(0, remove);
      }
      shiftPositions(-remove, 0);
    }
  }
}

/** Shift all room, furniture, and decoration positions by (dCol, dRow). */
function shiftPositions(dCol: number, dRow: number): void {
  for (const room of ROOMS) {
    room.tileRect.col += dCol;
    room.tileRect.row += dRow;
    room.doorTile.col += dCol;
    room.doorTile.row += dRow;
    room.seatTile.col += dCol;
    room.seatTile.row += dRow;
    room.billyStandTile.col += dCol;
    room.billyStandTile.row += dRow;
  }
  for (const f of FURNITURE) {
    f.col += dCol;
    f.row += dRow;
  }
  for (const d of DECORATIONS) {
    d.col += dCol;
    d.row += dRow;
  }
  for (const key of Object.keys(WAR_ROOM_SEATS)) {
    WAR_ROOM_SEATS[key]!.col += dCol;
    WAR_ROOM_SEATS[key]!.row += dRow;
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

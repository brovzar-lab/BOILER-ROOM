import { describe, it, expect } from 'vitest';
import { TileType } from '../types';
import {
  ROOMS,
  getRoomAtTile,
  FURNITURE,
  OFFICE_TILE_MAP,
  WAR_ROOM_SEATS,
  DECORATIONS,
} from '../officeLayout';
import type { FurnitureItem } from '../officeLayout';
import { isWalkable, findPath, getTileAt } from '../tileMap';

// ── Room Furniture Tests ─────────────────────────────────────────────────────

describe('office furniture', () => {
  it('each room has at least 1 furniture item (desk at minimum)', () => {
    for (const room of ROOMS) {
      const roomFurniture = FURNITURE.filter((f) => f.roomId === room.id);
      expect(
        roomFurniture.length,
        `${room.id} should have at least 1 furniture item`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('furniture positions are inside their room tileRect', () => {
    for (const item of FURNITURE) {
      if (item.roomId === 'hallway') continue; // Hallway items are not in rooms
      const room = ROOMS.find((r) => r.id === item.roomId);
      if (!room) continue;
      const r = room.tileRect;
      expect(
        item.col >= r.col && item.col < r.col + r.width,
        `Furniture "${item.type}" in ${item.roomId} col ${item.col} should be inside room (${r.col}-${r.col + r.width})`,
      ).toBe(true);
      expect(
        item.row >= r.row && item.row < r.row + r.height,
        `Furniture "${item.type}" in ${item.roomId} row ${item.row} should be inside room (${r.row}-${r.row + r.height})`,
      ).toBe(true);
    }
  });

  it('War Room has a conference table furniture item', () => {
    const warRoomFurniture = FURNITURE.filter((f) => f.roomId === 'war-room');
    const hasTable = warRoomFurniture.some((f) => f.type === 'table');
    expect(hasTable, 'War Room should have a conference table').toBe(true);
  });

  it("BILLY's office has a desk", () => {
    const billyFurniture = FURNITURE.filter((f) => f.roomId === 'billy');
    const hasDesk = billyFurniture.some((f) => f.type === 'desk');
    expect(hasDesk, "BILLY's office should have a desk").toBe(true);
  });
});

// ── Room Layout Tests ───────────────────────────────────────────────────────

describe('room layout', () => {
  it('hallway tiles are not inside any room tileRect', () => {
    // Corridor tiles in the horizontal corridors
    const hallwayTiles = [
      { col: 8, row: 9 },
      { col: 15, row: 9 },
      { col: 23, row: 10 },
    ];
    for (const tile of hallwayTiles) {
      const room = getRoomAtTile(tile.col, tile.row);
      expect(
        room,
        `Tile (${tile.col}, ${tile.row}) should be hallway (null room)`,
      ).toBeNull();
    }
  });

  it('all rooms have unique IDs', () => {
    const ids = ROOMS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('room names are human-readable display names', () => {
    for (const room of ROOMS) {
      expect(room.name.length).toBeGreaterThanOrEqual(3);
      expect(room.name).not.toBe(room.id);
      expect(/[A-Z\s]/.test(room.name)).toBe(true);
    }
  });
});

// ── Compact Grid Invariant Tests ────────────────────────────────────────────

describe('compact grid invariants', () => {
  it('grid dimensions are compact', () => {
    // Rows
    expect(
      OFFICE_TILE_MAP.length,
      `Grid should have <= 30 rows (got ${OFFICE_TILE_MAP.length})`,
    ).toBeLessThanOrEqual(30);
    // Cols
    expect(
      OFFICE_TILE_MAP[0]!.length,
      `Grid should have <= 32 cols (got ${OFFICE_TILE_MAP[0]!.length})`,
    ).toBeLessThanOrEqual(32);
  });

  it('all room seatTile positions are FLOOR tiles', () => {
    for (const room of ROOMS) {
      const tileType = getTileAt(
        room.seatTile.col,
        room.seatTile.row,
        OFFICE_TILE_MAP,
      );
      expect(
        tileType,
        `${room.id} seatTile (${room.seatTile.col},${room.seatTile.row}) should be FLOOR`,
      ).toBe(TileType.FLOOR);
    }
  });

  it('all room billyStandTile positions are FLOOR tiles', () => {
    for (const room of ROOMS) {
      const tileType = getTileAt(
        room.billyStandTile.col,
        room.billyStandTile.row,
        OFFICE_TILE_MAP,
      );
      expect(
        tileType,
        `${room.id} billyStandTile (${room.billyStandTile.col},${room.billyStandTile.row}) should be FLOOR`,
      ).toBe(TileType.FLOOR);
    }
  });

  it('all room doorTile positions are DOOR tiles', () => {
    for (const room of ROOMS) {
      const tileType = getTileAt(
        room.doorTile.col,
        room.doorTile.row,
        OFFICE_TILE_MAP,
      );
      expect(
        tileType,
        `${room.id} doorTile (${room.doorTile.col},${room.doorTile.row}) should be DOOR`,
      ).toBe(TileType.DOOR);
    }
  });

  it('BFS connectivity: path exists between every pair of room doors', () => {
    for (const roomA of ROOMS) {
      for (const roomB of ROOMS) {
        if (roomA.id === roomB.id) continue;
        const path = findPath(
          roomA.doorTile.col,
          roomA.doorTile.row,
          roomB.doorTile.col,
          roomB.doorTile.row,
          OFFICE_TILE_MAP,
        );
        expect(
          path.length,
          `Should find path from ${roomA.id} to ${roomB.id}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("BILLY's office is in top center-left region", () => {
    const billy = ROOMS.find((r) => r.id === 'billy')!;
    const gridMidCol = OFFICE_TILE_MAP[0]!.length / 2;
    // BILLY is center-left: starts before midpoint but not at far left
    expect(
      billy.tileRect.col,
      "BILLY's office should start before center",
    ).toBeLessThan(gridMidCol);
    expect(
      billy.tileRect.col,
      "BILLY's office should not be at far left (col > 1)",
    ).toBeGreaterThan(1);
    const gridMidRow = OFFICE_TILE_MAP.length / 2;
    expect(
      billy.tileRect.row,
      "BILLY's office should be in top half",
    ).toBeLessThan(gridMidRow);
  });

  it("Sasha's office is in top center-right region", () => {
    const sasha = ROOMS.find((r) => r.id === 'sasha')!;
    const gridMidCol = OFFICE_TILE_MAP[0]!.length / 2;
    // Sasha is center-right: starts at or after midpoint but not at far right
    expect(
      sasha.tileRect.col,
      "Sasha's office should start at or after center",
    ).toBeGreaterThanOrEqual(gridMidCol);
    expect(
      sasha.tileRect.col,
      "Sasha's office should not be at far right (col < 24)",
    ).toBeLessThan(24);
    const gridMidRow = OFFICE_TILE_MAP.length / 2;
    expect(
      sasha.tileRect.row,
      "Sasha's office should be in top half",
    ).toBeLessThan(gridMidRow);
  });

  it('War Room is in center row, flanked by Diana and Marcos', () => {
    const warRoom = ROOMS.find((r) => r.id === 'war-room')!;
    const diana = ROOMS.find((r) => r.id === 'diana')!;
    const marcos = ROOMS.find((r) => r.id === 'marcos')!;

    // War Room starts at same row as Diana and Marcos
    expect(warRoom.tileRect.row).toBe(diana.tileRect.row);
    expect(warRoom.tileRect.row).toBe(marcos.tileRect.row);

    // War Room is between Diana (left) and Marcos (right)
    expect(warRoom.tileRect.col).toBeGreaterThan(diana.tileRect.col + diana.tileRect.width);
    expect(warRoom.tileRect.col + warRoom.tileRect.width).toBeLessThan(marcos.tileRect.col);

    // War Room is below top rooms
    const topRooms = ROOMS.filter(
      (r) => r.id === 'billy' || r.id === 'sasha',
    );
    const topMax = Math.max(
      ...topRooms.map((r) => r.tileRect.row + r.tileRect.height),
    );
    expect(warRoom.tileRect.row).toBeGreaterThan(topMax - 1);

    // War Room is above bottom rooms
    const bottomRooms = ROOMS.filter(
      (r) => r.id === 'roberto' || r.id === 'valentina',
    );
    const bottomMin = Math.min(...bottomRooms.map((r) => r.tileRect.row));
    expect(warRoom.tileRect.row + warRoom.tileRect.height).toBeLessThan(bottomMin + 1);
  });

  it('middle row has Diana and Marcos flanking War Room', () => {
    const diana = ROOMS.find((r) => r.id === 'diana')!;
    const marcos = ROOMS.find((r) => r.id === 'marcos')!;
    expect(diana).toBeDefined();
    expect(marcos).toBeDefined();
    // Both at same start row
    expect(diana.tileRect.row).toBe(marcos.tileRect.row);
  });

  it('bottom row has Roberto and Valentina offices', () => {
    const bottomRoomIds = ['roberto', 'valentina'];
    for (const id of bottomRoomIds) {
      const room = ROOMS.find((r) => r.id === id);
      expect(room, `${id} should exist in ROOMS`).toBeDefined();
    }
    // All should be at same row (bottom section)
    const bottomRooms = ROOMS.filter((r) => bottomRoomIds.includes(r.id));
    const rows = new Set(bottomRooms.map((r) => r.tileRect.row));
    expect(rows.size, 'All bottom offices should be at same row').toBe(1);
  });

  it('corridors are 2 tiles wide', () => {
    // Check horizontal corridor at rows 9-10 (between top rooms and middle row)
    expect(isWalkable(15, 9, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(15, 10, OFFICE_TILE_MAP)).toBe(true);

    // Check horizontal corridor at rows 20-21 (between middle row and bottom rooms)
    expect(isWalkable(15, 20, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(15, 21, OFFICE_TILE_MAP)).toBe(true);

    // Check vertical corridor at cols 8-9 (left side)
    expect(isWalkable(8, 15, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(9, 15, OFFICE_TILE_MAP)).toBe(true);

    // Check vertical corridor at cols 22-23 (right side)
    expect(isWalkable(22, 15, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(23, 15, OFFICE_TILE_MAP)).toBe(true);
  });
});

// ── WAR_ROOM_SEATS Tests ────────────────────────────────────────────────────

describe('WAR_ROOM_SEATS', () => {
  it('has 6 entries including billy', () => {
    const keys = Object.keys(WAR_ROOM_SEATS);
    expect(keys.length).toBe(6);
    expect(keys).toContain('billy');
    expect(keys).toContain('diana');
    expect(keys).toContain('marcos');
    expect(keys).toContain('sasha');
    expect(keys).toContain('roberto');
    expect(keys).toContain('valentina');
  });

  it('all seats are within War Room interior', () => {
    const warRoom = ROOMS.find((r) => r.id === 'war-room')!;
    const interior = {
      minCol: warRoom.tileRect.col + 1,
      maxCol: warRoom.tileRect.col + warRoom.tileRect.width - 2,
      minRow: warRoom.tileRect.row + 1,
      maxRow: warRoom.tileRect.row + warRoom.tileRect.height - 2,
    };

    for (const [agent, seat] of Object.entries(WAR_ROOM_SEATS)) {
      expect(
        seat.col,
        `${agent} col should be >= ${interior.minCol}`,
      ).toBeGreaterThanOrEqual(interior.minCol);
      expect(
        seat.col,
        `${agent} col should be <= ${interior.maxCol}`,
      ).toBeLessThanOrEqual(interior.maxCol);
      expect(
        seat.row,
        `${agent} row should be >= ${interior.minRow}`,
      ).toBeGreaterThanOrEqual(interior.minRow);
      expect(
        seat.row,
        `${agent} row should be <= ${interior.maxRow}`,
      ).toBeLessThanOrEqual(interior.maxRow);
    }
  });

  it('all seats are FLOOR tiles (walkable)', () => {
    for (const [agent, seat] of Object.entries(WAR_ROOM_SEATS)) {
      const tileType = getTileAt(seat.col, seat.row, OFFICE_TILE_MAP);
      expect(
        tileType,
        `${agent} seat (${seat.col},${seat.row}) should be FLOOR`,
      ).toBe(TileType.FLOOR);
    }
  });

  it('no seat position overlaps with conference table', () => {
    // Find the conference table from FURNITURE
    const table = FURNITURE.find(
      (f) => f.roomId === 'war-room' && f.type === 'table',
    )!;
    expect(table).toBeDefined();

    for (const [agent, seat] of Object.entries(WAR_ROOM_SEATS)) {
      const onTable =
        seat.col >= table.col &&
        seat.col < table.col + table.width &&
        seat.row >= table.row &&
        seat.row < table.row + table.height;
      expect(onTable, `${agent} should NOT be on the table`).toBe(false);
    }
  });
});

// ── DECORATIONS Tests ───────────────────────────────────────────────────────

describe('DECORATIONS', () => {
  it('all decoration items are within their room boundaries', () => {
    for (const deco of DECORATIONS) {
      const room = ROOMS.find((r) => r.id === deco.roomId);
      expect(room, `Room ${deco.roomId} should exist for decoration ${deco.key}`).toBeDefined();
      if (!room) continue;
      const r = room.tileRect;
      expect(
        deco.col >= r.col && deco.col < r.col + r.width,
        `Decoration "${deco.key}" in ${deco.roomId} col ${deco.col} should be inside room (${r.col}-${r.col + r.width})`,
      ).toBe(true);
      expect(
        deco.row >= r.row && deco.row < r.row + r.height,
        `Decoration "${deco.key}" in ${deco.roomId} row ${deco.row} should be inside room (${r.row}-${r.row + r.height})`,
      ).toBe(true);
    }
  });

  it('has decorations for all expected rooms', () => {
    const roomsWithDecos = new Set(DECORATIONS.map((d) => d.roomId));
    expect(roomsWithDecos.has('diana')).toBe(true);
    expect(roomsWithDecos.has('marcos')).toBe(true);
    expect(roomsWithDecos.has('sasha')).toBe(true);
    expect(roomsWithDecos.has('roberto')).toBe(true);
    expect(roomsWithDecos.has('valentina')).toBe(true);
    expect(roomsWithDecos.has('billy')).toBe(true);
  });
});

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

// -- Room Furniture Tests -----------------------------------------------------

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

// -- Room Layout Tests --------------------------------------------------------

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

// -- Compact Grid Invariant Tests ---------------------------------------------

describe('compact grid invariants', () => {
  it('grid dimensions are correct', () => {
    // Rows
    expect(
      OFFICE_TILE_MAP.length,
      `Grid should have 30 rows (got ${OFFICE_TILE_MAP.length})`,
    ).toBe(30);
    // Cols
    expect(
      OFFICE_TILE_MAP[0]!.length,
      `Grid should have 32 cols (got ${OFFICE_TILE_MAP[0]!.length})`,
    ).toBe(32);
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

  it("Sandra's office is in top center-right region", () => {
    const sandra = ROOMS.find((r) => r.id === 'sandra')!;
    const gridMidCol = OFFICE_TILE_MAP[0]!.length / 2;
    // Sandra is center-right: starts at or after midpoint but not at far right
    expect(
      sandra.tileRect.col,
      "Sandra's office should start at or after center",
    ).toBeGreaterThanOrEqual(gridMidCol);
    expect(
      sandra.tileRect.col,
      "Sandra's office should not be at far right (col < 24)",
    ).toBeLessThan(24);
    const gridMidRow = OFFICE_TILE_MAP.length / 2;
    expect(
      sandra.tileRect.row,
      "Sandra's office should be in top half",
    ).toBeLessThan(gridMidRow);
  });

  it('War Room is in center, vertically centered between corridors', () => {
    const warRoom = ROOMS.find((r) => r.id === 'war-room')!;
    const patrik = ROOMS.find((r) => r.id === 'patrik')!;
    const marcos = ROOMS.find((r) => r.id === 'marcos')!;

    // War Room is between Patrik (left) and Marcos (right)
    expect(warRoom.tileRect.col).toBeGreaterThan(patrik.tileRect.col + patrik.tileRect.width);
    expect(warRoom.tileRect.col + warRoom.tileRect.width).toBeLessThan(marcos.tileRect.col);

    // War Room is 11 tiles tall (roughly same height as one side office pair)
    expect(warRoom.tileRect.height).toBe(11);

    // War Room is 12 tiles wide
    expect(warRoom.tileRect.width).toBe(12);

    // War Room is below top rooms
    const topRooms = ROOMS.filter(
      (r) => r.id === 'billy' || r.id === 'sandra',
    );
    const topMax = Math.max(
      ...topRooms.map((r) => r.tileRect.row + r.tileRect.height),
    );
    expect(warRoom.tileRect.row).toBeGreaterThan(topMax - 1);
  });

  it('upper side offices: Patrik and Marcos at same row', () => {
    const patrik = ROOMS.find((r) => r.id === 'patrik')!;
    const marcos = ROOMS.find((r) => r.id === 'marcos')!;
    expect(patrik).toBeDefined();
    expect(marcos).toBeDefined();
    expect(patrik.tileRect.row).toBe(marcos.tileRect.row);
  });

  it('lower side offices: Isaac and Wendy at same row', () => {
    const isaac = ROOMS.find((r) => r.id === 'isaac')!;
    const wendy = ROOMS.find((r) => r.id === 'wendy')!;
    expect(isaac).toBeDefined();
    expect(wendy).toBeDefined();
    expect(isaac.tileRect.row).toBe(wendy.tileRect.row);
  });

  it('corridors are 2 tiles wide', () => {
    // Check horizontal corridor at rows 9-10 (below top offices)
    expect(isWalkable(15, 9, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(15, 10, OFFICE_TILE_MAP)).toBe(true);

    // Check horizontal corridor at rows 27-28 (below War Room)
    expect(isWalkable(15, 27, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(15, 28, OFFICE_TILE_MAP)).toBe(true);

    // Check vertical corridor at cols 8-9 (left side)
    expect(isWalkable(8, 15, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(9, 15, OFFICE_TILE_MAP)).toBe(true);

    // Check vertical corridor at cols 22-23 (right side)
    expect(isWalkable(22, 15, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(23, 15, OFFICE_TILE_MAP)).toBe(true);

    // Check gap corridor between upper/lower side offices (rows 18-19)
    expect(isWalkable(4, 18, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(4, 19, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(27, 18, OFFICE_TILE_MAP)).toBe(true);
    expect(isWalkable(27, 19, OFFICE_TILE_MAP)).toBe(true);
  });
});

// -- WAR_ROOM_SEATS Tests -----------------------------------------------------

describe('WAR_ROOM_SEATS', () => {
  it('has 6 entries including billy', () => {
    const keys = Object.keys(WAR_ROOM_SEATS);
    expect(keys.length).toBe(6);
    expect(keys).toContain('billy');
    expect(keys).toContain('patrik');
    expect(keys).toContain('marcos');
    expect(keys).toContain('sandra');
    expect(keys).toContain('isaac');
    expect(keys).toContain('wendy');
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

// -- DECORATIONS Tests --------------------------------------------------------

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
    expect(roomsWithDecos.has('patrik')).toBe(true);
    expect(roomsWithDecos.has('marcos')).toBe(true);
    expect(roomsWithDecos.has('sandra')).toBe(true);
    expect(roomsWithDecos.has('isaac')).toBe(true);
    expect(roomsWithDecos.has('wendy')).toBe(true);
    expect(roomsWithDecos.has('billy')).toBe(true);
  });
});

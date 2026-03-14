import { describe, it, expect } from 'vitest';
import { TileType } from '../types';
import { isWalkable, findPath, getTileAt, createTileMap } from '../tileMap';
import { OFFICE_TILE_MAP, ROOMS, getRoomAtTile } from '../officeLayout';

// ── getTileAt ───────────────────────────────────────────────────────────────

describe('getTileAt', () => {
  const map = createTileMap(3, 3, TileType.FLOOR);

  it('returns tile at valid position', () => {
    expect(getTileAt(1, 1, map)).toBe(TileType.FLOOR);
  });

  it('returns VOID for negative col', () => {
    expect(getTileAt(-1, 0, map)).toBe(TileType.VOID);
  });

  it('returns VOID for negative row', () => {
    expect(getTileAt(0, -1, map)).toBe(TileType.VOID);
  });

  it('returns VOID for col out of bounds', () => {
    expect(getTileAt(3, 0, map)).toBe(TileType.VOID);
  });

  it('returns VOID for row out of bounds', () => {
    expect(getTileAt(0, 3, map)).toBe(TileType.VOID);
  });
});

// ── isWalkable ──────────────────────────────────────────────────────────────

describe('isWalkable', () => {
  // Build a small map with all tile types
  const map: TileType[][] = [
    [TileType.FLOOR, TileType.WALL, TileType.DOOR, TileType.VOID],
  ];

  it('returns true for FLOOR', () => {
    expect(isWalkable(0, 0, map)).toBe(true);
  });

  it('returns false for WALL', () => {
    expect(isWalkable(1, 0, map)).toBe(false);
  });

  it('returns true for DOOR', () => {
    expect(isWalkable(2, 0, map)).toBe(true);
  });

  it('returns false for VOID', () => {
    expect(isWalkable(3, 0, map)).toBe(false);
  });

  it('returns false for out-of-bounds', () => {
    expect(isWalkable(-1, 0, map)).toBe(false);
    expect(isWalkable(0, -1, map)).toBe(false);
    expect(isWalkable(4, 0, map)).toBe(false);
    expect(isWalkable(0, 1, map)).toBe(false);
  });
});

// ── findPath ────────────────────────────────────────────────────────────────

describe('findPath', () => {
  it('finds shortest path on a simple 5x5 grid', () => {
    const map = createTileMap(5, 5, TileType.FLOOR);
    const path = findPath(0, 0, 4, 4, map);
    // Manhattan distance is 8, so path length should be 8
    expect(path.length).toBe(8);
    // End should be the last tile
    expect(path[path.length - 1]).toEqual({ col: 4, row: 4 });
  });

  it('returns empty array when no path exists (blocked by walls)', () => {
    // Create a 5x5 map with a wall barrier across the middle
    const map = createTileMap(5, 5, TileType.FLOOR);
    for (let c = 0; c < 5; c++) {
      map[2]![c] = TileType.WALL;
    }
    const path = findPath(0, 0, 0, 4, map);
    expect(path).toEqual([]);
  });

  it('navigates around walls', () => {
    // 5x5 grid with partial wall
    const map = createTileMap(5, 5, TileType.FLOOR);
    // Wall from col 0-3 at row 2 (leaving col 4 open)
    for (let c = 0; c < 4; c++) {
      map[2]![c] = TileType.WALL;
    }
    const path = findPath(0, 0, 0, 4, map);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ col: 0, row: 4 });
    // Path must go around the wall through col 4
    const goesRight = path.some((p) => p.col === 4);
    expect(goesRight).toBe(true);
  });

  it('returns empty array when destination is a wall', () => {
    const map = createTileMap(3, 3, TileType.FLOOR);
    map[2]![2] = TileType.WALL;
    const path = findPath(0, 0, 2, 2, map);
    expect(path).toEqual([]);
  });

  it('returns empty array when start equals end', () => {
    const map = createTileMap(3, 3, TileType.FLOOR);
    const path = findPath(1, 1, 1, 1, map);
    expect(path).toEqual([]);
  });

  it('can navigate through DOOR tiles', () => {
    const map = createTileMap(5, 1, TileType.FLOOR);
    map[0]![2] = TileType.DOOR;
    const path = findPath(0, 0, 4, 0, map);
    expect(path.length).toBe(4);
    expect(path[1]).toEqual({ col: 2, row: 0 }); // Goes through the door
  });
});

// ── Office Layout ───────────────────────────────────────────────────────────

describe('OFFICE_TILE_MAP', () => {
  it('has exactly 7 rooms', () => {
    expect(ROOMS.length).toBe(7);
  });

  it('has expected room IDs', () => {
    const ids = ROOMS.map((r) => r.id).sort();
    expect(ids).toEqual([
      'billy',
      'patrik',
      'marcos',
      'isaac',
      'sandra',
      'wendy',
      'war-room',
    ]);
  });

  it('every room doorTile is walkable', () => {
    for (const room of ROOMS) {
      const walkable = isWalkable(
        room.doorTile.col,
        room.doorTile.row,
        OFFICE_TILE_MAP,
      );
      expect(walkable, `${room.id} doorTile should be walkable`).toBe(true);
    }
  });

  it('every room seatTile is inside the room tileRect', () => {
    for (const room of ROOMS) {
      const r = room.tileRect;
      const s = room.seatTile;
      expect(
        s.col >= r.col && s.col < r.col + r.width,
        `${room.id} seatTile col should be inside tileRect`,
      ).toBe(true);
      expect(
        s.row >= r.row && s.row < r.row + r.height,
        `${room.id} seatTile row should be inside tileRect`,
      ).toBe(true);
    }
  });

  it('every room seatTile is walkable', () => {
    for (const room of ROOMS) {
      const walkable = isWalkable(
        room.seatTile.col,
        room.seatTile.row,
        OFFICE_TILE_MAP,
      );
      expect(walkable, `${room.id} seatTile should be walkable`).toBe(true);
    }
  });

  it('findPath can reach every room doorTile from BILLY starting position', () => {
    const billyRoom = ROOMS.find((r) => r.id === 'billy')!;
    const billySeat = billyRoom.seatTile;

    for (const room of ROOMS) {
      if (room.id === 'billy') continue;
      const path = findPath(
        billySeat.col,
        billySeat.row,
        room.doorTile.col,
        room.doorTile.row,
        OFFICE_TILE_MAP,
      );
      expect(
        path.length,
        `Should find path from BILLY to ${room.id} door`,
      ).toBeGreaterThan(0);
    }
  });

  it('findPath can navigate between all room pairs', () => {
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
});

// ── getRoomAtTile ───────────────────────────────────────────────────────────

describe('getRoomAtTile', () => {
  it('returns correct room for a tile inside each room', () => {
    for (const room of ROOMS) {
      const r = room.tileRect;
      // Check center tile of each room
      const centerCol = r.col + Math.floor(r.width / 2);
      const centerRow = r.row + Math.floor(r.height / 2);
      const found = getRoomAtTile(centerCol, centerRow);
      expect(found?.id, `Center of ${room.id} should map back`).toBe(room.id);
    }
  });

  it('returns null for hallway tiles', () => {
    // Upper corridor at col 15, row 9 (between top rooms and War Room area)
    const result = getRoomAtTile(15, 9);
    expect(result).toBeNull();
  });

  it('returns null for VOID tiles outside the office', () => {
    const result = getRoomAtTile(0, 0);
    expect(result).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { ROOMS, getRoomAtTile, FURNITURE } from '../officeLayout';
import type { FurnitureItem } from '../officeLayout';

// ── Room Furniture Tests (ENGN-03 coverage) ─────────────────────────────────

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
    // Known hallway tiles from the layout: row 9-10 cols 14-15 (between BILLY and Diana)
    const hallwayTiles = [
      { col: 14, row: 9 },
      { col: 15, row: 9 },
      { col: 14, row: 10 },
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
      // Name should have at least 3 characters
      expect(room.name.length).toBeGreaterThanOrEqual(3);
      // Name should not be just an ID slug
      expect(room.name).not.toBe(room.id);
      // Name should contain at least one uppercase letter or space
      expect(/[A-Z\s]/.test(room.name)).toBe(true);
    }
  });
});

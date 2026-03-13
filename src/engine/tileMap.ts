/**
 * Tile map operations: walkability checks, BFS pathfinding, tile access.
 * Pure functions operating on 2D tile arrays.
 */
import { TileType } from './types';
import type { TileCoord } from './types';

/**
 * Creates a 2D tile array filled with the given type.
 */
export function createTileMap(
  width: number,
  height: number,
  fill: TileType,
): TileType[][] {
  const map: TileType[][] = [];
  for (let row = 0; row < height; row++) {
    const rowArr: TileType[] = [];
    for (let col = 0; col < width; col++) {
      rowArr.push(fill);
    }
    map.push(rowArr);
  }
  return map;
}

/**
 * Returns the TileType at the given position, or VOID if out of bounds.
 */
export function getTileAt(
  col: number,
  row: number,
  tileMap: TileType[][],
): TileType {
  if (row < 0 || row >= tileMap.length) return TileType.VOID;
  const rowArr = tileMap[row];
  if (!rowArr || col < 0 || col >= rowArr.length) return TileType.VOID;
  return rowArr[col] ?? TileType.VOID;
}

/**
 * Checks if a tile is walkable (FLOOR or DOOR, within bounds).
 */
export function isWalkable(
  col: number,
  row: number,
  tileMap: TileType[][],
): boolean {
  const tile = getTileAt(col, row, tileMap);
  return tile === TileType.FLOOR || tile === TileType.DOOR;
}

/**
 * BFS pathfinding on a 4-connected tile grid.
 * Returns array of TileCoord from start to end (excluding start).
 * Returns empty array if no path exists or destination is not walkable.
 */
export function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  tileMap: TileType[][],
): TileCoord[] {
  // Early out: destination must be walkable
  if (!isWalkable(endCol, endRow, tileMap)) return [];

  // Early out: start equals end
  if (startCol === endCol && startRow === endRow) return [];

  const key = (c: number, r: number): string => `${c},${r}`;
  const startKey = key(startCol, startRow);
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, string>();
  const queue: [number, number][] = [[startCol, startRow]];

  // 4-connected neighbors: up, down, left, right
  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const [col, row] = current;

    if (col === endCol && row === endRow) {
      // Reconstruct path from end to start
      const path: TileCoord[] = [];
      let k = key(endCol, endRow);
      while (k !== startKey) {
        const parts = k.split(',');
        path.unshift({ col: Number(parts[0]), row: Number(parts[1]) });
        k = parent.get(k)!;
      }
      return path;
    }

    for (const [dc, dr] of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      const nk = key(nc, nr);
      if (!visited.has(nk) && isWalkable(nc, nr, tileMap)) {
        visited.add(nk);
        parent.set(nk, key(col, row));
        queue.push([nc, nr]);
      }
    }
  }

  return []; // No path found
}

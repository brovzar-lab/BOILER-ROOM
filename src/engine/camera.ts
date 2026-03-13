/**
 * Camera system with integer zoom, smooth follow, and coordinate conversion.
 * Supports zoom level 1 (overview: whole floor visible) and 2 (follow: tracks target).
 */
import { TILE_SIZE } from './types';
import type { Camera, TileCoord } from './types';
import { OFFICE_TILE_MAP } from './officeLayout';

/**
 * Creates a camera centered on BILLY's starting room with default zoom=2.
 */
export function createCamera(): Camera {
  return {
    x: 0,
    y: 0,
    zoom: 2,
    targetX: 0,
    targetY: 0,
    followTarget: 'billy',
  };
}

/**
 * Smoothly lerps camera toward targetX/targetY. Uses Math.round for pixel-perfect alignment.
 * The lerp factor (0.1) provides a smooth follow feel without being sluggish.
 */
export function updateCamera(
  camera: Camera,
  _dt: number,
  _canvasWidth: number,
  _canvasHeight: number,
): void {
  // Lerp toward target
  camera.x = camera.x + (camera.targetX - camera.x) * 0.1;
  camera.y = camera.y + (camera.targetY - camera.y) * 0.1;

  // Snap to integers for pixel-perfect rendering
  camera.x = Math.round(camera.x);
  camera.y = Math.round(camera.y);
}

/**
 * Converts CSS click coordinates to tile col/row.
 * Accounts for zoom, camera offset, and map centering.
 * Returns null if the click is outside the tile map bounds.
 */
export function screenToTile(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
): TileCoord | null {
  const tileSize = TILE_SIZE * camera.zoom;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  const mapRows = OFFICE_TILE_MAP.length;
  const mapW = mapCols * tileSize;
  const mapH = mapRows * tileSize;

  // Map is centered in the canvas, then shifted by camera offset
  const offsetX = Math.floor((canvasWidth - mapW) / 2) - camera.x;
  const offsetY = Math.floor((canvasHeight - mapH) / 2) - camera.y;

  const col = Math.floor((screenX - offsetX) / tileSize);
  const row = Math.floor((screenY - offsetY) / tileSize);

  if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return null;
  return { col, row };
}

/**
 * Converts a tile col/row to screen pixel coordinates.
 * Used for rendering UI overlays at tile positions.
 */
export function tileToScreen(
  col: number,
  row: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  const tileSize = TILE_SIZE * camera.zoom;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  const mapRows = OFFICE_TILE_MAP.length;
  const mapW = mapCols * tileSize;
  const mapH = mapRows * tileSize;

  const offsetX = Math.floor((canvasWidth - mapW) / 2) - camera.x;
  const offsetY = Math.floor((canvasHeight - mapH) / 2) - camera.y;

  return {
    x: col * tileSize + offsetX,
    y: row * tileSize + offsetY,
  };
}

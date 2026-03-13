/**
 * Layered Canvas 2D rendering pipeline.
 *
 * Draw order per frame:
 *   Layer 1: Clear canvas with background color
 *   Layer 2: Floor tiles (with viewport culling)
 *   Layer 3: Furniture placeholders
 *   Layer 4: Characters (Y-sorted for depth)
 *   Layer 5: UI overlays (room labels, selection highlights)
 *
 * All positions use integer math for pixel-perfect rendering.
 * Phase 2 uses colored rectangles; Phase 8 replaces with sprites.
 */
import { TileType, TILE_SIZE } from './types';
import type { Camera, Character } from './types';
import { OFFICE_TILE_MAP, ROOMS, getRoomAtTile } from './officeLayout';
import { PLACEHOLDER_COLORS } from './spriteSheet';

/** Dark background matching the app dark theme */
const BG_COLOR = '#0d0b09';

/** Font for room labels */
const LABEL_FONT_SIZE = 10;

// ── Main Render Function ────────────────────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  characters: Character[],
  activeRoomId: string | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // Pixel-perfect rendering: disable anti-aliasing every frame
  ctx.imageSmoothingEnabled = false;

  const zoom = camera.zoom;
  const tileSize = TILE_SIZE * zoom;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  const mapRows = OFFICE_TILE_MAP.length;
  const mapW = mapCols * tileSize;
  const mapH = mapRows * tileSize;

  // Center the map in the canvas, shifted by camera offset
  const offsetX = Math.floor((canvasWidth - mapW) / 2) - Math.round(camera.x);
  const offsetY = Math.floor((canvasHeight - mapH) / 2) - Math.round(camera.y);

  // Viewport culling bounds (which tiles are visible)
  const minCol = Math.max(0, Math.floor(-offsetX / tileSize));
  const maxCol = Math.min(mapCols - 1, Math.floor((canvasWidth - offsetX) / tileSize));
  const minRow = Math.max(0, Math.floor(-offsetY / tileSize));
  const maxRow = Math.min(mapRows - 1, Math.floor((canvasHeight - offsetY) / tileSize));

  // ── Layer 1: Clear ──────────────────────────────────────────────────────
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ── Layer 2: Floor Tiles ────────────────────────────────────────────────
  for (let row = minRow; row <= maxRow; row++) {
    const tileRow = OFFICE_TILE_MAP[row];
    if (!tileRow) continue;
    for (let col = minCol; col <= maxCol; col++) {
      const tile = tileRow[col];
      if (tile === undefined || tile === TileType.VOID) continue;

      const x = Math.floor(col * tileSize + offsetX);
      const y = Math.floor(row * tileSize + offsetY);

      ctx.fillStyle = getTileColor(tile, col, row);
      ctx.fillRect(x, y, tileSize, tileSize);

      // Subtle grid lines for visual separation (1px darker)
      if (tile === TileType.FLOOR || tile === TileType.DOOR) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
      }
    }
  }

  // ── Layer 3: Furniture Placeholders ─────────────────────────────────────
  renderFurniture(ctx, tileSize, offsetX, offsetY, minCol, maxCol, minRow, maxRow);

  // ── Layer 4: Characters (Y-sorted for depth) ───────────────────────────
  const sortedChars = [...characters].sort((a, b) => a.y - b.y);
  for (const ch of sortedChars) {
    renderCharacter(ctx, ch, tileSize, offsetX, offsetY, zoom);
  }

  // ── Layer 5: UI Overlays ────────────────────────────────────────────────
  if (activeRoomId) {
    renderRoomLabel(ctx, activeRoomId, tileSize, offsetX, offsetY, zoom);
  }
}

// ── Tile Color Mapping ──────────────────────────────────────────────────────

function getTileColor(tile: TileType, col: number, row: number): string {
  switch (tile) {
    case TileType.WALL:
      return PLACEHOLDER_COLORS['wall']!;
    case TileType.DOOR:
      return PLACEHOLDER_COLORS['door']!;
    case TileType.FLOOR: {
      // Check if this tile is in the War Room for cool tones
      const room = getRoomAtTile(col, row);
      if (room?.id === 'war-room') return PLACEHOLDER_COLORS['war-room-floor']!;
      // Hallway tiles (not in any room) get a distinct hallway color
      if (!room) return PLACEHOLDER_COLORS['hallway']!;
      // Office floors get warm color
      return PLACEHOLDER_COLORS['floor']!;
    }
    default:
      return BG_COLOR;
  }
}

// ── Furniture Rendering ─────────────────────────────────────────────────────

function renderFurniture(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  _minCol: number,
  _maxCol: number,
  _minRow: number,
  _maxRow: number,
): void {
  // Draw simple desk and chair placeholders in each room
  for (const room of ROOMS) {
    const seat = room.seatTile;
    const deskX = Math.floor(seat.col * tileSize + offsetX);
    const deskY = Math.floor(seat.row * tileSize + offsetY);

    // Desk: brown rectangle slightly larger than a tile, offset behind the seat
    ctx.fillStyle = '#5c3d2e';
    if (room.id !== 'war-room') {
      // Desk behind the seat tile (one tile above)
      ctx.fillRect(
        deskX - Math.floor(tileSize * 0.1),
        deskY - tileSize,
        Math.floor(tileSize * 1.2),
        Math.floor(tileSize * 0.8),
      );
    } else {
      // War Room: large conference table in center
      const r = room.tileRect;
      const tableX = Math.floor((r.col + 2) * tileSize + offsetX);
      const tableY = Math.floor((r.row + 3) * tileSize + offsetY);
      ctx.fillStyle = '#4a3528';
      ctx.fillRect(tableX, tableY, tileSize * 6, tileSize * 4);
    }
  }
}

// ── Character Rendering ─────────────────────────────────────────────────────

function renderCharacter(
  ctx: CanvasRenderingContext2D,
  ch: Character,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const x = Math.floor(ch.x * zoom + offsetX);
  const y = Math.floor(ch.y * zoom + offsetY);
  const size = Math.floor(TILE_SIZE * zoom * 0.8);
  const pad = Math.floor(TILE_SIZE * zoom * 0.1);

  // Character body: colored rectangle
  const color = PLACEHOLDER_COLORS[ch.id] ?? '#888888';
  ctx.fillStyle = color;
  ctx.fillRect(x + pad, y + pad, size, size);

  // Direction indicator: small triangle pointing in walk direction
  ctx.fillStyle = '#ffffff';
  const cx = x + pad + size / 2;
  const cy = y + pad + size / 2;
  const indicatorSize = Math.max(2, zoom * 2);

  ctx.beginPath();
  switch (ch.direction) {
    case 'up':
      ctx.moveTo(cx, cy - indicatorSize);
      ctx.lineTo(cx - indicatorSize, cy + indicatorSize);
      ctx.lineTo(cx + indicatorSize, cy + indicatorSize);
      break;
    case 'down':
      ctx.moveTo(cx, cy + indicatorSize);
      ctx.lineTo(cx - indicatorSize, cy - indicatorSize);
      ctx.lineTo(cx + indicatorSize, cy - indicatorSize);
      break;
    case 'left':
      ctx.moveTo(cx - indicatorSize, cy);
      ctx.lineTo(cx + indicatorSize, cy - indicatorSize);
      ctx.lineTo(cx + indicatorSize, cy + indicatorSize);
      break;
    case 'right':
      ctx.moveTo(cx + indicatorSize, cy);
      ctx.lineTo(cx - indicatorSize, cy - indicatorSize);
      ctx.lineTo(cx - indicatorSize, cy + indicatorSize);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

// ── Room Label Overlay ──────────────────────────────────────────────────────

function renderRoomLabel(
  ctx: CanvasRenderingContext2D,
  roomId: string,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return;

  const r = room.tileRect;
  const labelX = Math.floor((r.col + r.width / 2) * tileSize + offsetX);
  const labelY = Math.floor(r.row * tileSize + offsetY - 4 * zoom);

  const fontSize = LABEL_FONT_SIZE * zoom;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Background pill
  const text = room.name;
  const metrics = ctx.measureText(text);
  const padX = 4 * zoom;
  const padY = 2 * zoom;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(
    labelX - metrics.width / 2 - padX,
    labelY - fontSize - padY,
    metrics.width + padX * 2,
    fontSize + padY * 2,
  );

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, labelX, labelY);
}

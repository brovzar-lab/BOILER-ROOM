/**
 * Layered Canvas 2D rendering pipeline.
 *
 * Draw order per frame:
 *   Layer 1: Clear canvas with background color
 *   Layer 2: Floor tiles (with viewport culling)
 *   Layer 3: Furniture placeholders
 *   Layer 3b: Drop zone highlight (amber dashed border on desk area)
 *   Layer 4: Characters (Y-sorted for depth)
 *   Layer 4b: Status Overlays (speech bubbles, thinking dots)
 *   Layer 4c: File icons on agent desks
 *   Layer 5: UI overlays (room labels, selection highlights)
 *   Layer 5b: Invalid drop tooltip + file hover tooltip
 *
 * All positions use integer math for pixel-perfect rendering.
 * Phase 2 uses colored rectangles; Phase 8 replaces with sprites.
 */
import { TileType, TILE_SIZE } from './types';
import type { Camera, Character } from './types';
import { OFFICE_TILE_MAP, ROOMS, getRoomAtTile } from './officeLayout';
import { PLACEHOLDER_COLORS } from './spriteSheet';
import { useFileStore } from '@/store/fileStore';
import { dragOverRoomId, invalidDropMessage, invalidDropX, invalidDropY, hoverTileCol, hoverTileRow } from './input';

/** Dark background matching the app dark theme */
const BG_COLOR = '#0d0b09';

/** Font for room labels */
const LABEL_FONT_SIZE = 10;

/** Agent room IDs (excludes war-room and billy) */
const AGENT_ROOM_IDS = new Set<string>(['diana', 'marcos', 'sasha', 'roberto', 'valentina']);

/** Currently hovered file ID -- set during renderFileIcons, read by input.ts */
export let hoveredFileId: string | null = null;

// ── Main Render Function ────────────────────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  characters: Character[],
  activeRoomId: string | null,
  canvasWidth: number,
  canvasHeight: number,
  agentStatuses: Record<string, string>,
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

  // ── Layer 3b: Drop Zone Highlight ───────────────────────────────────────
  renderDropZoneHighlight(ctx, tileSize, offsetX, offsetY, canvasWidth, canvasHeight);

  // ── Layer 4: Characters (Y-sorted for depth) ───────────────────────────
  const sortedChars = [...characters].sort((a, b) => a.y - b.y);
  for (const ch of sortedChars) {
    renderCharacter(ctx, ch, tileSize, offsetX, offsetY, zoom);
  }

  // ── Layer 4b: Status Overlays (speech bubbles, thinking dots) ─────────
  renderStatusOverlays(ctx, characters, agentStatuses, tileSize, offsetX, offsetY, zoom);

  // ── Layer 4c: File Icons on Desks ───────────────────────────────────────
  renderFileIcons(ctx, tileSize, offsetX, offsetY, zoom);

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

// ── Drop Zone Highlight ─────────────────────────────────────────────────────

/**
 * Draws amber dashed border on the desk area when dragging files over a valid agent room.
 * Draws an invalid-drop tooltip when dragging over war-room, billy, or hallway.
 */
export function renderDropZoneHighlight(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (dragOverRoomId) {
    const room = ROOMS.find(r => r.id === dragOverRoomId);
    if (room) {
      // Desk area: 2 tiles wide, 1 tile tall, centered on seatTile.col, 1 row above seat
      const deskCol = room.seatTile.col;
      const deskRow = room.seatTile.row - 1;
      const deskW = 2; // tiles
      const deskH = 1; // tile

      const x = Math.floor(deskCol * tileSize + offsetX);
      const y = Math.floor(deskRow * tileSize + offsetY);
      const w = deskW * tileSize;
      const h = deskH * tileSize;

      // Semi-transparent amber fill
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fillRect(x, y, w, h);

      // Amber dashed border
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  if (invalidDropMessage) {
    // Render tooltip near cursor. Convert CSS coords to canvas-relative.
    // invalidDropX/Y are client coords; we draw relative to canvas.
    const tooltipX = Math.min(invalidDropX, canvasWidth - 200);
    const tooltipY = Math.max(invalidDropY - 30, 10);

    const text = invalidDropMessage;
    ctx.font = '12px monospace';
    const metrics = ctx.measureText(text);
    const padX = 8;
    const padY = 4;
    const tw = metrics.width + padX * 2;
    const th = 16 + padY * 2;

    // Black rounded rectangle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tw, th, 4);
    ctx.fill();

    // White text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tooltipX + padX, tooltipY + th / 2);
  }
}

// ── File Icon Rendering ─────────────────────────────────────────────────────

/** Returns the desk rectangle for an agent room (col, row, width, height in tiles) */
export function getDeskRect(room: typeof ROOMS[number]): { col: number; row: number; width: number; height: number } {
  return {
    col: room.seatTile.col,
    row: room.seatTile.row - 1,
    width: 2,
    height: 1,
  };
}

/**
 * Renders file icons on each agent's desk. Up to 5 icons with "+N" badge for overflow.
 * PDF icons get a red header bar, DOCX get blue.
 */
export function renderFileIcons(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const { files } = useFileStore.getState();
  hoveredFileId = null; // Reset each frame

  for (const room of ROOMS) {
    if (!AGENT_ROOM_IDS.has(room.id)) continue;

    const agentFiles = files.filter(f => f.agentId === room.id);
    if (agentFiles.length === 0) continue;

    const desk = getDeskRect(room);
    const deskX = Math.floor(desk.col * tileSize + offsetX);
    const deskY = Math.floor(desk.row * tileSize + offsetY);

    const iconW = Math.floor(tileSize * 0.35);
    const iconH = Math.floor(tileSize * 0.45);

    const visibleFiles = agentFiles.slice(0, 5);

    for (let i = 0; i < visibleFiles.length; i++) {
      const file = visibleFiles[i]!;

      // Deterministic scatter for "messy desk" feel
      const scatterX = ((i * 7 + 3) % 5) - 2;
      const scatterY = ((i * 3 + 1) % 3) - 1;

      const ix = deskX + Math.floor((i % 3) * iconW * 1.3) + scatterX * zoom;
      const iy = deskY + Math.floor(Math.floor(i / 3) * iconH * 1.2) + scatterY * zoom;

      // White paper background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ix, iy, iconW, iconH);

      // Folded corner (top-right triangle)
      const foldSize = Math.max(2, Math.floor(zoom * 2));
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.moveTo(ix + iconW - foldSize, iy);
      ctx.lineTo(ix + iconW, iy + foldSize);
      ctx.lineTo(ix + iconW, iy);
      ctx.closePath();
      ctx.fill();

      // Header bar: red for PDF, blue for DOCX
      ctx.fillStyle = file.type === 'pdf' ? '#ef4444' : '#3b82f6';
      ctx.fillRect(ix, iy, iconW, Math.max(2, Math.floor(zoom)));

      // Tiny text lines inside for realism
      ctx.fillStyle = '#cccccc';
      const lineH = Math.max(1, Math.floor(zoom * 0.5));
      const lineW = iconW - 4;
      for (let l = 0; l < 3; l++) {
        const ly = iy + Math.floor(zoom) + 2 + l * (lineH + 2);
        if (ly + lineH < iy + iconH - 1) {
          ctx.fillRect(ix + 2, ly, lineW * (l === 2 ? 0.6 : 1), lineH);
        }
      }

      // Border
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix + 0.5, iy + 0.5, iconW - 1, iconH - 1);

      // Check hover
      if (hoverTileCol >= 0 && hoverTileRow >= 0) {
        const hoverX = Math.floor(hoverTileCol * tileSize + offsetX);
        const hoverY = Math.floor(hoverTileRow * tileSize + offsetY);
        if (
          hoverX >= ix - tileSize / 2 && hoverX <= ix + iconW + tileSize / 2 &&
          hoverY >= iy - tileSize / 2 && hoverY <= iy + iconH + tileSize / 2
        ) {
          hoveredFileId = file.id;

          // Hover tooltip: filename above icon
          const name = file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name;
          ctx.font = `${Math.max(8, 8 * zoom / 2)}px monospace`;
          const tm = ctx.measureText(name);
          const tpx = 4;
          const tpy = 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.beginPath();
          ctx.roundRect(ix - tpx, iy - 14 * zoom / 2, tm.width + tpx * 2, 12 * zoom / 2, 3);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(name, ix, iy - 8 * zoom / 2);
        }
      }
    }

    // "+N" badge if more than 5 files
    if (agentFiles.length > 5) {
      const overflow = agentFiles.length - 5;
      const badgeText = `+${overflow}`;
      const bx = deskX + desk.width * tileSize - Math.floor(tileSize * 0.4);
      const by = deskY + Math.floor(tileSize * 0.1);

      ctx.font = `bold ${Math.max(8, 8 * zoom / 2)}px monospace`;
      const bm = ctx.measureText(badgeText);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bm.width + 6, 12 * zoom / 2, 3);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bx + 3, by + 6 * zoom / 2);
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

// ── Status Overlays (speech bubbles, thinking dots) ─────────────────────────

function renderStatusOverlays(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  agentStatuses: Record<string, string>,
  _tileSize: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  for (const ch of characters) {
    if (ch.id === 'billy') continue;
    const status = agentStatuses[ch.id];

    if (status === 'needs-attention') {
      // Speech bubble above character head
      const cx = Math.floor(ch.x * zoom + offsetX + (TILE_SIZE * zoom) / 2);
      const bubbleY = Math.floor(ch.y * zoom + offsetY - 4 * zoom);
      const bw = Math.floor(6 * zoom);
      const bh = Math.floor(5 * zoom);
      const radius = Math.max(1, Math.floor(zoom));

      // Bubble body (white rounded rect)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, bubbleY - bh, bw, bh, radius);
      ctx.fill();

      // Small triangle pointer
      const triSize = Math.max(1, Math.floor(zoom));
      ctx.beginPath();
      ctx.moveTo(cx - triSize, bubbleY);
      ctx.lineTo(cx + triSize, bubbleY);
      ctx.lineTo(cx, bubbleY + triSize);
      ctx.closePath();
      ctx.fill();

      // Red notification dot inside bubble
      ctx.fillStyle = '#f87171';
      const dotR = Math.max(1, Math.floor(zoom * 0.8));
      ctx.beginPath();
      ctx.arc(cx, bubbleY - bh / 2, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (status === 'thinking') {
      // Amber dots ("...") above character head
      const cx = Math.floor(ch.x * zoom + offsetX + (TILE_SIZE * zoom) / 2);
      const dotsY = Math.floor(ch.y * zoom + offsetY - 2 * zoom);
      const dotR = Math.max(1, Math.floor(zoom * 0.6));
      const spacing = Math.floor(2.5 * zoom);

      ctx.fillStyle = '#fbbf24';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * spacing, dotsY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
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

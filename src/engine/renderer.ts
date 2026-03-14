/**
 * Layered Canvas 2D rendering pipeline using ctx.setTransform().
 *
 * Draw order per frame (6-layer):
 *   Layer 1: Clear canvas at identity transform
 *   Layer 2: Floor tiles at world transform (with viewport culling)
 *   Layer 3: 3/4 perspective wall strips + shadows at world transform
 *   Layer 3b: Drop zone highlight at world transform
 *   Layer 4: Y-sorted renderables (furniture + decorations + characters merged) at world transform
 *   --- Reset to identity transform ---
 *   Layer 5: Status overlays (speech bubbles, thinking dots) at screen coords
 *   Layer 5b: File icons on agent desks at screen coords
 *   Layer 6: UI overlays (room labels) at screen coords
 *   Layer 6b: Invalid drop tooltip at screen coords
 *
 * World-space layers use ctx.setTransform(zoom, 0, 0, zoom, tx, ty) so all
 * drawing happens at world coordinates (col * TILE_SIZE). The transform handles
 * zoom scaling uniformly, eliminating tile gaps at fractional zoom levels.
 *
 * UI overlays reset to identity and use worldToScreen() for positioning.
 */
import { TileType, TILE_SIZE, CHAR_SPRITE_W, CHAR_SPRITE_H } from './types';
import type { Camera, Character } from './types';
import type { FurnitureItem, DecorationItem } from './officeLayout';
import { OFFICE_TILE_MAP, ROOMS, getRoomAtTile } from './officeLayout';
import { PLACEHOLDER_COLORS, getCharacterSheet, getEnvironmentSheet } from './spriteSheet';
import { CHARACTER_FRAMES, ENVIRONMENT_ATLAS, DECORATION_ATLAS } from './spriteAtlas';
import { buildRenderables } from './depthSort';
import { useFileStore } from '@/store/fileStore';
import { dragOverRoomId, invalidDropMessage, invalidDropX, invalidDropY, hoverTileCol, hoverTileRow } from './input';

/** Dark background matching the app dark theme */
const BG_COLOR = '#0d0b09';

/** Font for room labels */
const LABEL_FONT_SIZE = 10;

/** Agent room IDs (excludes war-room and billy) */
const AGENT_ROOM_IDS = new Set<string>(['patrik', 'marcos', 'sandra', 'isaac', 'wendy']);

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
  const zoom = camera.zoom;
  const dpr = window.devicePixelRatio || 1;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  const mapRows = OFFICE_TILE_MAP.length;
  const mapWorldW = mapCols * TILE_SIZE;
  const mapWorldH = mapRows * TILE_SIZE;

  // Compute transform: world point (wx, wy) -> screen (wx * zoom + tx, wy * zoom + ty)
  const tx = (canvasWidth - mapWorldW * zoom) / 2 - camera.x;
  const ty = (canvasHeight - mapWorldH * zoom) / 2 - camera.y;

  // Viewport culling: compute visible world rect from screen bounds
  const worldLeft = -tx / zoom;
  const worldTop = -ty / zoom;
  const worldRight = (canvasWidth - tx) / zoom;
  const worldBottom = (canvasHeight - ty) / zoom;
  const minCol = Math.max(0, Math.floor(worldLeft / TILE_SIZE));
  const maxCol = Math.min(mapCols - 1, Math.floor(worldRight / TILE_SIZE));
  const minRow = Math.max(0, Math.floor(worldTop / TILE_SIZE));
  const maxRow = Math.min(mapRows - 1, Math.floor(worldBottom / TILE_SIZE));

  const envSheet = getEnvironmentSheet();

  // Helper: convert world coordinates to screen coordinates (for UI overlays)
  function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return { x: worldX * zoom + tx, y: worldY * zoom + ty };
  }

  // ── Layer 1: Clear (identity transform) ────────────────────────────────
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ── Apply world transform ──────────────────────────────────────────────
  ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, tx * dpr, ty * dpr);
  ctx.imageSmoothingEnabled = false;

  // ── Layer 2: Floor Tiles ───────────────────────────────────────────────
  for (let row = minRow; row <= maxRow; row++) {
    const tileRow = OFFICE_TILE_MAP[row];
    if (!tileRow) continue;
    for (let col = minCol; col <= maxCol; col++) {
      const tile = tileRow[col];
      if (tile === undefined || tile === TileType.VOID) continue;

      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (envSheet) {
        const atlasKey = getTileAtlasKey(tile, col, row);
        const frame = ENVIRONMENT_ATLAS[atlasKey];
        if (frame) {
          ctx.drawImage(
            envSheet,
            frame.x, frame.y, frame.w, frame.h,
            x, y, TILE_SIZE, TILE_SIZE,
          );
          continue;
        }
      }

      // Fallback: colored rectangles
      ctx.fillStyle = getTileColor(tile, col, row);
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  // ── Layer 3: 3/4 Wall Strips + Shadows ───────────────────────────────
  renderWalls(ctx, minCol, maxCol, minRow, maxRow);

  // ── Layer 3b: Drop Zone Highlight ──────────────────────────────────────
  renderDropZoneHighlight(ctx, zoom, tx, ty, canvasWidth, canvasHeight, dpr);

  // ── Layer 4: Y-sorted Renderables (furniture + decorations + characters) ──
  const renderables = buildRenderables(
    characters,
    (rCtx, ch) => renderCharacterWorld(rCtx, ch, zoom, agentStatuses),
    (rCtx, item) => renderFurnitureItemWorld(rCtx, item, envSheet),
    (rCtx, dec) => renderDecorationWorld(rCtx, dec, envSheet),
  );
  for (const r of renderables) {
    r.draw(ctx);
  }

  // ── Reset to identity for UI overlays ──────────────────────────────────
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // ── Layer 5: Status Overlays (speech bubbles, thinking dots) ──────────
  renderStatusOverlays(ctx, characters, agentStatuses, zoom, worldToScreen);

  // ── Layer 5b: File Icons on Desks ──────────────────────────────────────
  renderFileIcons(ctx, zoom, worldToScreen);

  // ── Layer 6: UI Overlays ───────────────────────────────────────────────
  if (activeRoomId) {
    renderRoomLabel(ctx, activeRoomId, zoom, worldToScreen);
  }
}

// ── Tile Atlas Key Mapping ───────────────────────────────────────────────────

function getTileAtlasKey(tile: TileType, col: number, row: number): string {
  switch (tile) {
    case TileType.WALL:
      return 'wall-top';
    case TileType.DOOR:
      return 'door';
    case TileType.FLOOR: {
      const room = getRoomAtTile(col, row);
      if (room?.id === 'war-room') return 'floor-warroom';
      if (!room) return 'floor-hallway';
      return 'floor-office';
    }
    default:
      return 'floor-office';
  }
}

// ── Tile Color Mapping (fallback) ────────────────────────────────────────────

function getTileColor(tile: TileType, col: number, row: number): string {
  switch (tile) {
    case TileType.WALL:
      return PLACEHOLDER_COLORS['wall']!;
    case TileType.DOOR:
      return PLACEHOLDER_COLORS['door']!;
    case TileType.FLOOR: {
      const room = getRoomAtTile(col, row);
      if (room?.id === 'war-room') return PLACEHOLDER_COLORS['war-room-floor']!;
      if (!room) return PLACEHOLDER_COLORS['hallway']!;
      return PLACEHOLDER_COLORS['floor']!;
    }
    default:
      return BG_COLOR;
  }
}

// ── 3/4 Wall Rendering ─────────────────────────────────────────────────────

/** Wall strip colors */
const WALL_COLOR_OFFICE = '#d4c8a8';   // cream/beige for office walls
const WALL_COLOR_WAR_ROOM = '#6b7280'; // slate gray for War Room walls
const WALL_SHADOW = 'rgba(0, 0, 0, 0.15)';

/**
 * Renders 3/4 perspective wall strips by checking tile neighbors.
 * North walls: 3px colored strip at bottom of wall tile + 2px shadow on floor below.
 * East/west walls: 2px colored strip on the inner edge facing the room.
 */
function renderWalls(
  ctx: CanvasRenderingContext2D,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number,
): void {
  const mapRows = OFFICE_TILE_MAP.length;
  const mapCols = OFFICE_TILE_MAP[0]!.length;

  for (let row = minRow; row <= maxRow; row++) {
    const tileRow = OFFICE_TILE_MAP[row];
    if (!tileRow) continue;
    for (let col = minCol; col <= maxCol; col++) {
      const tile = tileRow[col];
      if (tile !== TileType.WALL) continue;

      // Check south neighbor — north wall face (visible from below)
      if (row + 1 < mapRows) {
        const south = OFFICE_TILE_MAP[row + 1]![col];
        if (south === TileType.FLOOR || south === TileType.DOOR) {
          const wallColor = getWallColor(col, row + 1);
          // 3px strip at bottom of wall tile
          ctx.fillStyle = wallColor;
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE + TILE_SIZE - 3, TILE_SIZE, 3);
          // 2px shadow on floor tile below
          ctx.fillStyle = WALL_SHADOW;
          ctx.fillRect(col * TILE_SIZE, (row + 1) * TILE_SIZE, TILE_SIZE, 2);
        }
      }

      // Check west neighbor — east wall face (left edge visible from room to the left)
      if (col - 1 >= 0) {
        const west = OFFICE_TILE_MAP[row]![col - 1];
        if (west === TileType.FLOOR || west === TileType.DOOR) {
          ctx.fillStyle = getWallColor(col - 1, row);
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, 2, TILE_SIZE);
        }
      }

      // Check east neighbor — west wall face (right edge visible from room to the right)
      if (col + 1 < mapCols) {
        const east = OFFICE_TILE_MAP[row]![col + 1];
        if (east === TileType.FLOOR || east === TileType.DOOR) {
          ctx.fillStyle = getWallColor(col + 1, row);
          ctx.fillRect(col * TILE_SIZE + TILE_SIZE - 2, row * TILE_SIZE, 2, TILE_SIZE);
        }
      }
    }
  }
}

/**
 * Determines wall strip color based on which room the adjacent floor tile belongs to.
 * War Room floors -> slate gray; all others (offices, corridors) -> cream.
 */
function getWallColor(floorCol: number, floorRow: number): string {
  const room = getRoomAtTile(floorCol, floorRow);
  if (room?.id === 'war-room') return WALL_COLOR_WAR_ROOM;
  return WALL_COLOR_OFFICE;
}

// ── Individual Item Rendering (for Y-sort) ──────────────────────────────────

/**
 * Renders a single furniture item at world coordinates.
 * Called by buildRenderables via callback.
 */
function renderFurnitureItemWorld(
  ctx: CanvasRenderingContext2D,
  item: FurnitureItem,
  envSheet: HTMLImageElement | null,
): void {
  const x = item.col * TILE_SIZE;
  const y = item.row * TILE_SIZE;

  if (envSheet) {
    renderFurnitureSprite(ctx, envSheet, item.type, x, y, item.width, item.height);
  } else {
    // Fallback: brown rectangles (world coordinates)
    ctx.fillStyle = item.type === 'table' ? '#4a3528' : '#5c3d2e';
    ctx.fillRect(x, y, item.width * TILE_SIZE, item.height * TILE_SIZE);
  }
}

/**
 * Renders a single decoration item at world coordinates.
 * Called by buildRenderables via callback.
 */
function renderDecorationWorld(
  ctx: CanvasRenderingContext2D,
  dec: DecorationItem,
  envSheet: HTMLImageElement | null,
): void {
  if (!envSheet) return;
  const frame = DECORATION_ATLAS[dec.key] ?? ENVIRONMENT_ATLAS[dec.key];
  if (!frame) return;
  const x = dec.col * TILE_SIZE;
  const y = dec.row * TILE_SIZE;
  ctx.drawImage(envSheet, frame.x, frame.y, frame.w, frame.h, x, y, TILE_SIZE, TILE_SIZE);
}

function renderFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  type: string,
  x: number,
  y: number,
  widthTiles: number,
  heightTiles: number,
): void {
  switch (type) {
    case 'desk': {
      const leftFrame = ENVIRONMENT_ATLAS['desk-left'];
      const rightFrame = ENVIRONMENT_ATLAS['desk-right'];
      if (leftFrame && rightFrame && widthTiles >= 2) {
        for (let t = 0; t < widthTiles; t++) {
          const frame = t < widthTiles - 1 ? leftFrame : rightFrame;
          ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x + t * TILE_SIZE, y, TILE_SIZE, TILE_SIZE);
        }
      } else if (leftFrame) {
        for (let t = 0; t < widthTiles; t++) {
          ctx.drawImage(sheet, leftFrame.x, leftFrame.y, leftFrame.w, leftFrame.h, x + t * TILE_SIZE, y, TILE_SIZE, TILE_SIZE);
        }
      }
      break;
    }
    case 'chair': {
      const frame = ENVIRONMENT_ATLAS['chair'];
      if (frame) ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x, y, TILE_SIZE, TILE_SIZE);
      break;
    }
    case 'bookshelf': {
      const topFrame = ENVIRONMENT_ATLAS['bookshelf-top'];
      const bottomFrame = ENVIRONMENT_ATLAS['bookshelf-bottom'];
      if (topFrame) ctx.drawImage(sheet, topFrame.x, topFrame.y, topFrame.w, topFrame.h, x, y, TILE_SIZE, TILE_SIZE);
      if (bottomFrame && heightTiles >= 2) {
        ctx.drawImage(sheet, bottomFrame.x, bottomFrame.y, bottomFrame.w, bottomFrame.h, x, y + TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
      break;
    }
    case 'table': {
      const frame = ENVIRONMENT_ATLAS['table-segment'];
      if (frame) {
        for (let ty = 0; ty < heightTiles; ty++) {
          for (let tx = 0; tx < widthTiles; tx++) {
            ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x + tx * TILE_SIZE, y + ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      break;
    }
    case 'plant': {
      const frame = ENVIRONMENT_ATLAS['plant'];
      if (frame) ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x, y, TILE_SIZE, TILE_SIZE);
      break;
    }
    case 'water-cooler': {
      const frame = ENVIRONMENT_ATLAS['water-cooler'];
      if (frame) ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x, y, TILE_SIZE, TILE_SIZE);
      break;
    }
    case 'artwork': {
      const frame = ENVIRONMENT_ATLAS['artwork'];
      if (frame) ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x, y, TILE_SIZE, TILE_SIZE);
      break;
    }
    case 'couch': {
      // Render couch segments using table-segment atlas (fallback) or a dedicated couch sprite
      const frame = ENVIRONMENT_ATLAS['couch'] ?? ENVIRONMENT_ATLAS['table-segment'];
      if (frame) {
        for (let t = 0; t < widthTiles; t++) {
          ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, x + t * TILE_SIZE, y, TILE_SIZE, TILE_SIZE);
        }
      }
      break;
    }
    default:
      break;
  }
}

// ── Drop Zone Highlight ─────────────────────────────────────────────────────

/**
 * Draws amber dashed border on the desk area when dragging files over a valid agent room.
 * Drop zone is drawn in world transform. Invalid-drop tooltip is drawn at screen coords.
 */
export function renderDropZoneHighlight(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  tx: number,
  ty: number,
  canvasWidth: number,
  canvasHeight: number,
  dpr: number = 1,
): void {
  if (dragOverRoomId) {
    const room = ROOMS.find(r => r.id === dragOverRoomId);
    if (room) {
      // Desk area in world coordinates
      const deskCol = room.seatTile.col;
      const deskRow = room.seatTile.row - 1;
      const deskW = 2;
      const deskH = 1;

      const x = deskCol * TILE_SIZE;
      const y = deskRow * TILE_SIZE;
      const w = deskW * TILE_SIZE;
      const h = deskH * TILE_SIZE;

      // Semi-transparent amber fill
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.fillRect(x, y, w, h);

      // Amber dashed border (lineWidth is in world units, scale it)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 3 / zoom]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  if (invalidDropMessage) {
    // Tooltip renders at screen coords — switch to identity
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const tooltipX = Math.min(invalidDropX, canvasWidth - 200);
    const tooltipY = Math.max(invalidDropY - 30, 10);

    const text = invalidDropMessage;
    ctx.font = '12px monospace';
    const metrics = ctx.measureText(text);
    const padX = 8;
    const padY = 4;
    const tw = metrics.width + padX * 2;
    const th = 16 + padY * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tw, th, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tooltipX + padX, tooltipY + th / 2);

    // Restore world transform
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, tx * dpr, ty * dpr);
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
 * Renders file icons on each agent's desk at screen coordinates.
 * Up to 5 icons with "+N" badge for overflow.
 * PDF icons get a red header bar, DOCX get blue.
 */
export function renderFileIcons(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
): void {
  const { files } = useFileStore.getState();
  hoveredFileId = null; // Reset each frame

  const tileSize = TILE_SIZE * zoom;

  for (const room of ROOMS) {
    if (!AGENT_ROOM_IDS.has(room.id)) continue;

    const agentFiles = files.filter(f => f.agentId === room.id);
    if (agentFiles.length === 0) continue;

    const desk = getDeskRect(room);
    const deskScreen = worldToScreen(desk.col * TILE_SIZE, desk.row * TILE_SIZE);
    const deskX = Math.floor(deskScreen.x);
    const deskY = Math.floor(deskScreen.y);

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
        const hoverScreen = worldToScreen(hoverTileCol * TILE_SIZE, hoverTileRow * TILE_SIZE);
        const hoverX = Math.floor(hoverScreen.x);
        const hoverY = Math.floor(hoverScreen.y);
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

/**
 * Renders a single character at world coordinates.
 * Called by buildRenderables via callback.
 */
function renderCharacterWorld(
  ctx: CanvasRenderingContext2D,
  ch: Character,
  zoom: number,
  agentStatuses: Record<string, string>,
): void {
  // ch.x, ch.y are already in world pixels — draw directly in world transform
  const x = ch.x;
  const y = ch.y;

  // Foot-center anchor: sprite centered horizontally on tile, feet at tile bottom
  const drawX = x - (CHAR_SPRITE_W - TILE_SIZE) / 2;  // x - 4
  const drawY = y - (CHAR_SPRITE_H - TILE_SIZE);       // y - 16

  // Drop shadow: dark ellipse at feet (draw before character so sprite overlaps it)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  const shadowCx = x + TILE_SIZE / 2;       // center of tile
  const shadowCy = y + TILE_SIZE - 1;        // just above tile bottom
  const shadowRx = TILE_SIZE * 0.4;          // horizontal radius
  const shadowRy = TILE_SIZE * 0.15;         // vertical radius (flat ellipse)
  ctx.ellipse(shadowCx, shadowCy, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Try sprite-based rendering
  const sheet = getCharacterSheet(ch.id);
  if (sheet) {
    let spriteState: 'idle' | 'walk' | 'work' | 'talk' = ch.state;
    const status = agentStatuses[ch.id];
    if (status === 'needs-attention' && ch.state === 'idle') {
      spriteState = 'talk';
    }

    const frames = CHARACTER_FRAMES[spriteState]?.[ch.direction];
    if (frames && frames.length > 0) {
      const frameIdx = Math.min(ch.frame, frames.length - 1);
      const frame = frames[frameIdx]!;
      // Draw 24x32 sprite at foot-center anchor position
      ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, drawX, drawY, CHAR_SPRITE_W, CHAR_SPRITE_H);
      return;
    }
  }

  // Fallback: colored rectangle at 24x32 with foot-center anchor
  const padX = CHAR_SPRITE_W * 0.1;
  const padY = CHAR_SPRITE_H * 0.1;

  const color = PLACEHOLDER_COLORS[ch.id] ?? '#888888';
  ctx.fillStyle = color;
  ctx.fillRect(drawX + padX, drawY + padY, CHAR_SPRITE_W - padX * 2, CHAR_SPRITE_H - padY * 2);

  // Direction indicator: small triangle
  ctx.fillStyle = '#ffffff';
  const cx = drawX + CHAR_SPRITE_W / 2;
  const cy = drawY + CHAR_SPRITE_H / 2;
  const indicatorSize = Math.max(2 / zoom, 2);

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
  zoom: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
): void {
  for (const ch of characters) {
    if (ch.id === 'billy') continue;
    const status = agentStatuses[ch.id];

    if (status === 'needs-attention') {
      // Speech bubble above character head (screen coordinates)
      // With 24x32 sprites, visual top is at ch.y - (CHAR_SPRITE_H - TILE_SIZE)
      const charScreen = worldToScreen(ch.x + TILE_SIZE / 2, ch.y - (CHAR_SPRITE_H - TILE_SIZE));
      const cx = Math.floor(charScreen.x);
      const bubbleY = Math.floor(charScreen.y - 4 * zoom);
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
      // Amber dots ("...") above character head (screen coordinates)
      // With 24x32 sprites, visual top is at ch.y - (CHAR_SPRITE_H - TILE_SIZE)
      const charScreen = worldToScreen(ch.x + TILE_SIZE / 2, ch.y - (CHAR_SPRITE_H - TILE_SIZE));
      const cx = Math.floor(charScreen.x);
      const dotsY = Math.floor(charScreen.y - 2 * zoom);
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
  zoom: number,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
): void {
  const room = ROOMS.find((r) => r.id === roomId);
  if (!room) return;

  const r = room.tileRect;
  const labelScreen = worldToScreen(
    (r.col + r.width / 2) * TILE_SIZE,
    r.row * TILE_SIZE,
  );
  const labelX = Math.floor(labelScreen.x);
  const labelY = Math.floor(labelScreen.y - 4 * zoom);

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

/**
 * Generates pixel art sprite sheet PNGs for all characters and environment tiles.
 * Uses node-canvas to draw Stardew Valley-style top-down 16x16 pixel art.
 *
 * Run: npx tsx scripts/generateSprites.ts
 * Output: public/sprites/{billy,diana,marcos,sasha,roberto,valentina,environment}.png
 */
import { createCanvas, type Canvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const TILE = 16;
const SPRITE_DIR = resolve(dirname(import.meta.url.replace('file://', '')), '../public/sprites');

mkdirSync(SPRITE_DIR, { recursive: true });

// ── Character Color Definitions ──────────────────────────────────────────────

interface CharacterColors {
  skin: string;
  skinDark: string;
  hair: string;
  clothing: string;
  clothingDark: string;
  accent: string;
  shoes: string;
}

const CHARACTERS: Record<string, CharacterColors> = {
  billy: {
    skin: '#f5c8a0',
    skinDark: '#d4a87a',
    hair: '#2c2020',
    clothing: '#e8a838',
    clothingDark: '#c48a20',
    accent: '#d4940c',
    shoes: '#3a3028',
  },
  diana: {
    skin: '#e8bc96',
    skinDark: '#c89a70',
    hair: '#1a1218',
    clothing: '#c084fc',
    clothingDark: '#9b5de5',
    accent: '#7b3fd4',
    shoes: '#2a2028',
  },
  marcos: {
    skin: '#d4a87a',
    skinDark: '#b88a5c',
    hair: '#1c1610',
    clothing: '#60a5fa',
    clothingDark: '#3b82f6',
    accent: '#93c5fd',
    shoes: '#2c2828',
  },
  sasha: {
    skin: '#f0d0b0',
    skinDark: '#d4b090',
    hair: '#b8a060',
    clothing: '#34d399',
    clothingDark: '#10b981',
    accent: '#6ee7b7',
    shoes: '#3a3830',
  },
  roberto: {
    skin: '#dca87c',
    skinDark: '#bc8a5e',
    hair: '#201816',
    clothing: '#f87171',
    clothingDark: '#dc2626',
    accent: '#991b1b',
    shoes: '#2e2424',
  },
  valentina: {
    skin: '#e8bc96',
    skinDark: '#c89a70',
    hair: '#8b4513',
    clothing: '#fb923c',
    clothingDark: '#ea580c',
    accent: '#fed7aa',
    shoes: '#3c3028',
  },
};

// ── Pixel Drawing Helpers ────────────────────────────────────────────────────

function px(
  ctx: ReturnType<Canvas['getContext']>,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function drawHead(
  ctx: ReturnType<Canvas['getContext']>,
  ox: number,
  oy: number,
  c: CharacterColors,
  dir: 'down' | 'left' | 'right' | 'up',
  bobY: number = 0,
): void {
  const hy = oy + 1 + bobY;
  // Hair base (top of head)
  for (let dx = 5; dx <= 10; dx++) px(ctx, ox + dx, hy, c.hair);
  for (let dx = 5; dx <= 10; dx++) px(ctx, ox + dx, hy + 1, c.hair);

  if (dir === 'down') {
    // Face visible
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 2, c.skin);
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 3, c.skin);
    // Eyes
    px(ctx, ox + 7, hy + 2, '#222');
    px(ctx, ox + 9, hy + 2, '#222');
    // Hair sides
    px(ctx, ox + 5, hy + 2, c.hair);
    px(ctx, ox + 10, hy + 2, c.hair);
  } else if (dir === 'up') {
    // Back of head -- all hair
    for (let dx = 5; dx <= 10; dx++) px(ctx, ox + dx, hy + 2, c.hair);
    for (let dx = 5; dx <= 10; dx++) px(ctx, ox + dx, hy + 3, c.hair);
  } else if (dir === 'left') {
    px(ctx, ox + 5, hy + 2, c.hair);
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 2, c.skin);
    px(ctx, ox + 10, hy + 2, c.hair);
    px(ctx, ox + 5, hy + 3, c.hair);
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 3, c.skin);
    // Eye on left side
    px(ctx, ox + 7, hy + 2, '#222');
  } else {
    // right
    px(ctx, ox + 5, hy + 2, c.hair);
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 2, c.skin);
    px(ctx, ox + 10, hy + 2, c.hair);
    px(ctx, ox + 5, hy + 3, c.hair);
    for (let dx = 6; dx <= 9; dx++) px(ctx, ox + dx, hy + 3, c.skin);
    // Eye on right side
    px(ctx, ox + 9, hy + 2, '#222');
  }
}

function drawBody(
  ctx: ReturnType<Canvas['getContext']>,
  ox: number,
  oy: number,
  c: CharacterColors,
  bobY: number = 0,
): void {
  const by = oy + 5 + bobY;
  // Torso (6 wide, 4 tall)
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 5; dx <= 10; dx++) {
      px(ctx, ox + dx, by + dy, dy < 2 ? c.clothing : c.clothingDark);
    }
  }
  // Accent stripe
  for (let dx = 6; dx <= 9; dx++) {
    px(ctx, ox + dx, by + 1, c.accent);
  }
}

function drawLegsStanding(
  ctx: ReturnType<Canvas['getContext']>,
  ox: number,
  oy: number,
  c: CharacterColors,
): void {
  const ly = oy + 9;
  // Left leg
  for (let dy = 0; dy < 4; dy++) {
    px(ctx, ox + 6, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
    px(ctx, ox + 7, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
  }
  // Right leg
  for (let dy = 0; dy < 4; dy++) {
    px(ctx, ox + 8, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
    px(ctx, ox + 9, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
  }
}

function drawLegsWalk(
  ctx: ReturnType<Canvas['getContext']>,
  ox: number,
  oy: number,
  c: CharacterColors,
  frame: number,
  dir: 'down' | 'left' | 'right' | 'up',
): void {
  const ly = oy + 9;
  // frame 0,2 = standing, 1 = left step, 3 = right step
  const leftOffset = frame === 1 ? -1 : 0;
  const rightOffset = frame === 3 ? 1 : 0;
  const leftStride = frame === 1 ? 1 : 0;
  const rightStride = frame === 3 ? 1 : 0;

  if (dir === 'left' || dir === 'right') {
    // Side view -- offset along x
    for (let dy = 0; dy < 4; dy++) {
      px(ctx, ox + 6 + leftOffset, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
      px(ctx, ox + 7 + leftOffset, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
      px(ctx, ox + 8 + rightOffset, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
      px(ctx, ox + 9 + rightOffset, ly + dy, dy < 2 ? c.clothingDark : c.shoes);
    }
  } else {
    // Front/back view -- offset along y for stride effect
    for (let dy = 0; dy < 4; dy++) {
      const ldy = dy + leftStride;
      if (ly + ldy < oy + TILE) {
        px(ctx, ox + 6, ly + ldy, dy < 2 ? c.clothingDark : c.shoes);
        px(ctx, ox + 7, ly + ldy, dy < 2 ? c.clothingDark : c.shoes);
      }
      const rdy = dy + rightStride;
      if (ly + rdy < oy + TILE) {
        px(ctx, ox + 8, ly + rdy, dy < 2 ? c.clothingDark : c.shoes);
        px(ctx, ox + 9, ly + rdy, dy < 2 ? c.clothingDark : c.shoes);
      }
    }
  }
}

function drawWorkArms(
  ctx: ReturnType<Canvas['getContext']>,
  ox: number,
  oy: number,
  c: CharacterColors,
  frame: number,
): void {
  // Arms reaching forward (typing). frame 0,1,2 have slightly different arm positions
  const armY = oy + 6;
  const armOffsets = [0, -1, 1]; // frame-based arm height variation
  const off = armOffsets[frame] ?? 0;
  // Left arm
  px(ctx, ox + 4, armY + off, c.skin);
  px(ctx, ox + 3, armY + 1 + off, c.skin);
  // Right arm
  px(ctx, ox + 11, armY + off, c.skin);
  px(ctx, ox + 12, armY + 1 + off, c.skin);
}

// ── Character Sheet Generation ───────────────────────────────────────────────

type DirType = 'down' | 'left' | 'right' | 'up';
const DIRECTIONS: DirType[] = ['down', 'left', 'right', 'up'];

/**
 * Generates a single character sprite sheet.
 * Layout: 10 columns (frames) x 4 rows (directions)
 * Cols: 0=idle(1), 1-4=walk(4), 5-7=work(3), 8-9=talk(2)
 * Rows: 0=down, 1=left, 2=right, 3=up
 * Size: 160x64 pixels
 */
function generateCharacterSheet(charId: string): Buffer {
  const cols = 10;
  const rows = 4;
  const canvas = createCanvas(cols * TILE, rows * TILE);
  const ctx = canvas.getContext('2d');

  const c = CHARACTERS[charId]!;

  for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
    const dir = DIRECTIONS[dirIdx]!;
    const rowY = dirIdx * TILE;

    // Col 0: Idle
    {
      const ox = 0;
      drawHead(ctx, ox, rowY, c, dir);
      drawBody(ctx, ox, rowY, c);
      drawLegsStanding(ctx, ox, rowY, c);
    }

    // Cols 1-4: Walk (4 frames)
    for (let f = 0; f < 4; f++) {
      const ox = (f + 1) * TILE;
      drawHead(ctx, ox, rowY, c, dir);
      drawBody(ctx, ox, rowY, c);
      drawLegsWalk(ctx, ox, rowY, c, f, dir);
    }

    // Cols 5-7: Work (3 frames)
    for (let f = 0; f < 3; f++) {
      const ox = (f + 5) * TILE;
      drawHead(ctx, ox, rowY, c, dir);
      drawBody(ctx, ox, rowY, c);
      drawLegsStanding(ctx, ox, rowY, c);
      drawWorkArms(ctx, ox, rowY, c, f);
    }

    // Cols 8-9: Talk (2 frames) -- head bob
    for (let f = 0; f < 2; f++) {
      const ox = (f + 8) * TILE;
      const bobY = f === 1 ? -1 : 0;
      drawHead(ctx, ox, rowY, c, dir, bobY);
      drawBody(ctx, ox, rowY, c, bobY);
      drawLegsStanding(ctx, ox, rowY, c);
    }
  }

  return canvas.toBuffer('image/png');
}

// ── Environment Sheet Generation ─────────────────────────────────────────────

function generateEnvironmentSheet(): Buffer {
  const cols = 16;
  const rows = 8;
  const canvas = createCanvas(cols * TILE, rows * TILE);
  const ctx = canvas.getContext('2d');

  // Helper to fill a tile at (col, row) with solid color
  function fillTile(col: number, row: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
  }

  // Helper to draw a pixel relative to tile origin
  function tilePx(col: number, row: number, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(col * TILE + x, row * TILE + y, 1, 1);
  }

  // ── Row 0: Floor tiles ──

  // (0,0) Office floor -- warm wood planks
  fillTile(0, 0, '#8b7355');
  for (let y = 0; y < TILE; y += 4) {
    ctx.fillStyle = '#7a6548';
    ctx.fillRect(0, y, TILE, 1);
  }
  // Wood grain variation
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if ((x + y * 3) % 11 === 0) tilePx(0, 0, x, y, '#9a8265');
    }
  }

  // (1,0) Hallway floor -- stone/carpet
  fillTile(1, 0, '#6a6258');
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if ((x * 7 + y * 5) % 13 === 0) tilePx(1, 0, x, y, '#7a7268');
    }
  }

  // (2,0) War room floor -- cool blue-gray
  fillTile(2, 0, '#4a5568');
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if ((x * 3 + y * 7) % 11 === 0) tilePx(2, 0, x, y, '#556678');
    }
  }

  // (3,0) Door tile
  fillTile(3, 0, '#a08060');
  ctx.fillStyle = '#8a6a48';
  ctx.fillRect(3 * TILE + 2, 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(3 * TILE + 4, 4, TILE - 8, TILE - 8);
  // Door handle
  tilePx(3, 0, 11, 8, '#d4b896');
  tilePx(3, 0, 11, 9, '#d4b896');

  // ── Row 1: Wall tiles ──

  // (0,1) Top wall
  fillTile(0, 1, '#504840');
  ctx.fillStyle = '#605850';
  ctx.fillRect(0, TILE + 12, TILE, 4);
  // Brick-like pattern
  for (let y = 0; y < TILE; y += 4) {
    for (let x = 0; x < TILE; x += 8) {
      const xOff = (y / 4) % 2 === 0 ? 0 : 4;
      ctx.fillStyle = '#585048';
      ctx.fillRect(x + xOff, TILE + y, 7, 3);
    }
  }

  // (1,1) Side wall
  fillTile(1, 1, '#484038');
  for (let y = 0; y < TILE; y += 4) {
    ctx.fillStyle = '#3e3630';
    ctx.fillRect(TILE, TILE + y, TILE, 1);
  }

  // (2,1) Wall with window
  fillTile(2, 1, '#504840');
  ctx.fillStyle = '#88b0d8';
  ctx.fillRect(2 * TILE + 3, TILE + 3, 10, 8);
  ctx.fillStyle = '#6090b8';
  ctx.fillRect(2 * TILE + 4, TILE + 4, 8, 6);
  // Window frame
  ctx.fillStyle = '#605850';
  ctx.fillRect(2 * TILE + 7, TILE + 3, 2, 8);
  ctx.fillRect(2 * TILE + 3, TILE + 6, 10, 2);

  // ── Row 2: Furniture ──

  // (0,2) Desk left half
  fillTile(0, 2, '#6b4226');
  ctx.fillStyle = '#7c5030';
  ctx.fillRect(0, 2 * TILE + 2, TILE, TILE - 4);
  ctx.fillStyle = '#8a5c38';
  ctx.fillRect(1, 2 * TILE + 3, TILE - 2, 2); // desk surface highlight

  // (1,2) Desk right half
  fillTile(1, 2, '#6b4226');
  ctx.fillStyle = '#7c5030';
  ctx.fillRect(TILE, 2 * TILE + 2, TILE, TILE - 4);
  ctx.fillStyle = '#8a5c38';
  ctx.fillRect(TILE + 1, 2 * TILE + 3, TILE - 2, 2);

  // (2,2) Chair
  fillTile(2, 2, 'transparent');
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(2 * TILE + 4, 2 * TILE + 2, 8, 10);
  ctx.fillStyle = '#7a5040';
  ctx.fillRect(2 * TILE + 5, 2 * TILE + 3, 6, 4);
  // Chair back
  ctx.fillStyle = '#4a2e1e';
  ctx.fillRect(2 * TILE + 4, 2 * TILE + 2, 8, 2);

  // (3,2) Bookshelf top
  fillTile(3, 2, '#5c3d2e');
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(3 * TILE + 1, 2 * TILE + 1, TILE - 2, TILE - 2);
  // Books
  const bookColors = ['#c04040', '#4040c0', '#40a040', '#c0a040'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bookColors[i]!;
    ctx.fillRect(3 * TILE + 2 + i * 3, 2 * TILE + 2, 2, 6);
  }
  // Lower shelf
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(3 * TILE + 1, 2 * TILE + 8, TILE - 2, 1);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = bookColors[(i + 2) % 4]!;
    ctx.fillRect(3 * TILE + 2 + i * 4, 2 * TILE + 9, 3, 5);
  }

  // (4,2) Bookshelf bottom
  fillTile(4, 2, '#5c3d2e');
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(4 * TILE + 1, 2 * TILE + 1, TILE - 2, TILE - 2);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bookColors[(i + 1) % 4]!;
    ctx.fillRect(4 * TILE + 2 + i * 3, 2 * TILE + 2, 2, 12);
  }

  // (5,2) Conference table segment
  fillTile(5, 2, '#4a3528');
  ctx.fillStyle = '#5c4230';
  ctx.fillRect(5 * TILE + 1, 2 * TILE + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(5 * TILE + 2, 2 * TILE + 2, TILE - 4, 2); // surface highlight

  // ── Row 3: Decorations ──

  // (0,3) Plant
  fillTile(0, 3, 'transparent');
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(5, 3 * TILE + 10, 6, 5); // Pot
  ctx.fillStyle = '#8a5c38';
  ctx.fillRect(4, 3 * TILE + 10, 8, 2); // Pot rim
  ctx.fillStyle = '#2d8b4e';
  for (const [lx, ly] of [[6, 4], [4, 6], [8, 5], [5, 8], [9, 7], [7, 3], [3, 5]]) {
    ctx.fillRect(lx!, 3 * TILE + ly!, 3, 3);
  }
  ctx.fillStyle = '#1a6b3a';
  for (const [lx, ly] of [[7, 5], [5, 7], [9, 6]]) {
    ctx.fillRect(lx!, 3 * TILE + ly!, 2, 2);
  }

  // (1,3) Water cooler
  fillTile(1, 3, 'transparent');
  ctx.fillStyle = '#8ca0b8';
  ctx.fillRect(TILE + 4, 3 * TILE + 2, 8, 12); // Body
  ctx.fillStyle = '#a0b8d0';
  ctx.fillRect(TILE + 5, 3 * TILE + 3, 6, 4); // Water jug
  ctx.fillStyle = '#6888a0';
  ctx.fillRect(TILE + 5, 3 * TILE + 8, 6, 4); // Base
  ctx.fillStyle = '#c8d8e8';
  ctx.fillRect(TILE + 6, 3 * TILE + 4, 4, 2); // Water highlight

  // (2,3) Artwork frame
  fillTile(2, 3, 'transparent');
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(2 * TILE + 2, 3 * TILE + 2, 12, 10); // Frame
  ctx.fillStyle = '#4a6a8a';
  ctx.fillRect(2 * TILE + 3, 3 * TILE + 3, 10, 8); // Canvas
  ctx.fillStyle = '#6a8aaa';
  ctx.fillRect(2 * TILE + 5, 3 * TILE + 5, 6, 4); // Painting detail

  // (3,3) Whiteboard
  fillTile(3, 3, 'transparent');
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(3 * TILE + 1, 3 * TILE + 1, 14, 12); // Frame
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(3 * TILE + 2, 3 * TILE + 2, 12, 10); // Surface
  // Scribbles
  ctx.fillStyle = '#333';
  ctx.fillRect(3 * TILE + 3, 3 * TILE + 4, 8, 1);
  ctx.fillRect(3 * TILE + 4, 3 * TILE + 6, 6, 1);
  ctx.fillStyle = '#d44';
  ctx.fillRect(3 * TILE + 3, 3 * TILE + 8, 5, 1);

  // (4,3) Post-it cluster
  fillTile(4, 3, 'transparent');
  ctx.fillStyle = '#fff44f';
  ctx.fillRect(4 * TILE + 1, 3 * TILE + 1, 5, 5);
  ctx.fillStyle = '#ff9966';
  ctx.fillRect(4 * TILE + 5, 3 * TILE + 3, 5, 5);
  ctx.fillStyle = '#77dd77';
  ctx.fillRect(4 * TILE + 3, 3 * TILE + 7, 5, 5);
  ctx.fillStyle = '#aec6cf';
  ctx.fillRect(4 * TILE + 8, 3 * TILE + 1, 5, 5);
  ctx.fillStyle = '#ff6961';
  ctx.fillRect(4 * TILE + 9, 3 * TILE + 7, 5, 5);

  // (5,3) Filing cabinet
  fillTile(5, 3, 'transparent');
  ctx.fillStyle = '#707880';
  ctx.fillRect(5 * TILE + 3, 3 * TILE + 1, 10, 14); // Body
  ctx.fillStyle = '#808890';
  ctx.fillRect(5 * TILE + 4, 3 * TILE + 2, 8, 3); // Drawer 1
  ctx.fillRect(5 * TILE + 4, 3 * TILE + 6, 8, 3); // Drawer 2
  ctx.fillRect(5 * TILE + 4, 3 * TILE + 10, 8, 3); // Drawer 3
  // Handles
  ctx.fillStyle = '#a0a8b0';
  ctx.fillRect(5 * TILE + 7, 3 * TILE + 3, 2, 1);
  ctx.fillRect(5 * TILE + 7, 3 * TILE + 7, 2, 1);
  ctx.fillRect(5 * TILE + 7, 3 * TILE + 11, 2, 1);

  // (6,3) Monitor/screen glow
  fillTile(6, 3, 'transparent');
  ctx.fillStyle = '#303030';
  ctx.fillRect(6 * TILE + 3, 3 * TILE + 2, 10, 8); // Monitor body
  ctx.fillStyle = '#1a3a2a';
  ctx.fillRect(6 * TILE + 4, 3 * TILE + 3, 8, 6); // Screen
  ctx.fillStyle = '#33cc66';
  ctx.fillRect(6 * TILE + 5, 3 * TILE + 4, 3, 1); // Green text lines
  ctx.fillRect(6 * TILE + 5, 3 * TILE + 6, 5, 1);
  ctx.fillStyle = '#505050';
  ctx.fillRect(6 * TILE + 6, 3 * TILE + 10, 4, 3); // Stand
  ctx.fillRect(6 * TILE + 5, 3 * TILE + 13, 6, 1); // Base

  // ── Row 4: Personality items ──

  // (0,4) Financial chart (Diana)
  fillTile(0, 4, 'transparent');
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(1, 4 * TILE + 1, 14, 12); // Paper bg
  ctx.fillStyle = '#333';
  ctx.fillRect(2, 4 * TILE + 12, 12, 1); // X axis
  ctx.fillRect(2, 4 * TILE + 3, 1, 9); // Y axis
  // Bar chart
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(4, 4 * TILE + 8, 2, 4);
  ctx.fillRect(7, 4 * TILE + 5, 2, 7);
  ctx.fillRect(10, 4 * TILE + 6, 2, 6);
  ctx.fillStyle = '#cc4444';
  ctx.fillRect(12, 4 * TILE + 9, 2, 3);

  // (1,4) Law books (Marcos)
  fillTile(1, 4, 'transparent');
  ctx.fillStyle = '#3a2820';
  ctx.fillRect(TILE + 2, 4 * TILE + 4, 12, 10); // Shelf
  const lawColors = ['#1a2a4a', '#2a1a1a', '#1a3a2a', '#3a2a1a'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = lawColors[i]!;
    ctx.fillRect(TILE + 3 + i * 3, 4 * TILE + 1, 2, 12);
    ctx.fillStyle = '#c0b0a0';
    ctx.fillRect(TILE + 3 + i * 3, 4 * TILE + 2, 2, 1); // Title band
  }

  // (2,4) Sasha whiteboard (2x2 top-left)
  fillTile(2, 4, 'transparent');
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(2 * TILE + 0, 4 * TILE + 0, TILE, TILE); // Frame
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(2 * TILE + 1, 4 * TILE + 1, TILE - 2, TILE - 2);
  // Strategy notes
  ctx.fillStyle = '#2266aa';
  ctx.fillRect(2 * TILE + 2, 4 * TILE + 3, 10, 1);
  ctx.fillRect(2 * TILE + 3, 4 * TILE + 5, 8, 1);
  ctx.fillStyle = '#cc3333';
  ctx.fillRect(2 * TILE + 2, 4 * TILE + 8, 6, 1);
  ctx.fillStyle = '#22aa44';
  ctx.fillRect(2 * TILE + 4, 4 * TILE + 10, 7, 1);

  // (3,4) Sasha whiteboard (2x2 top-right)
  fillTile(3, 4, 'transparent');
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(3 * TILE, 4 * TILE, TILE, TILE);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(3 * TILE + 1, 4 * TILE + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#2266aa';
  ctx.fillRect(3 * TILE + 2, 4 * TILE + 3, 8, 1);
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(3 * TILE + 3, 4 * TILE + 6, 10, 1);
  ctx.fillRect(3 * TILE + 2, 4 * TILE + 9, 6, 1);

  // ── Row 5: More personality items ──

  // (0,5) Sasha whiteboard (2x2 bottom-left)
  fillTile(0, 5, 'transparent');
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 5 * TILE, TILE, TILE);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(1, 5 * TILE + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = '#333';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(2, 5 * TILE + 3 + i * 4, 10, 1);
  }

  // (1,5) Sasha whiteboard (2x2 bottom-right)
  fillTile(1, 5, 'transparent');
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(TILE, 5 * TILE, TILE, TILE);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(TILE + 1, 5 * TILE + 1, TILE - 2, TILE - 2);
  // Diagram/flowchart
  ctx.fillStyle = '#4488cc';
  ctx.fillRect(TILE + 3, 5 * TILE + 3, 4, 3);
  ctx.fillRect(TILE + 9, 5 * TILE + 3, 4, 3);
  ctx.fillRect(TILE + 6, 5 * TILE + 9, 4, 3);
  ctx.fillStyle = '#333';
  ctx.fillRect(TILE + 7, 5 * TILE + 6, 1, 3); // Arrow

  // (2,5) Monitor with green numbers (Diana desk)
  fillTile(2, 5, 'transparent');
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(2 * TILE + 2, 5 * TILE + 1, 12, 9);
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(2 * TILE + 3, 5 * TILE + 2, 10, 7);
  ctx.fillStyle = '#33ff66';
  ctx.fillRect(2 * TILE + 4, 5 * TILE + 3, 4, 1);
  ctx.fillRect(2 * TILE + 4, 5 * TILE + 5, 6, 1);
  ctx.fillRect(2 * TILE + 4, 5 * TILE + 7, 3, 1);
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(2 * TILE + 9, 5 * TILE + 3, 3, 1);
  ctx.fillStyle = '#404040';
  ctx.fillRect(2 * TILE + 6, 5 * TILE + 10, 4, 3);
  ctx.fillRect(2 * TILE + 5, 5 * TILE + 13, 6, 1);

  return canvas.toBuffer('image/png');
}

// ── Main Generation ──────────────────────────────────────────────────────────

function main(): void {
  console.log('Generating sprite sheets...');

  // Generate individual character sheets
  for (const charId of Object.keys(CHARACTERS)) {
    const buffer = generateCharacterSheet(charId);
    const path = resolve(SPRITE_DIR, `${charId}.png`);
    writeFileSync(path, buffer);
    console.log(`  Created: ${path} (${buffer.length} bytes)`);
  }

  // Generate environment sheet
  const envBuffer = generateEnvironmentSheet();
  const envPath = resolve(SPRITE_DIR, 'environment.png');
  writeFileSync(envPath, envBuffer);
  console.log(`  Created: ${envPath} (${envBuffer.length} bytes)`);

  console.log('Done! All sprite sheets generated.');
}

main();

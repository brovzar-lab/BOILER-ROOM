import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TILE_SIZE } from '../types';
import type { Camera, Character } from '../types';

// ── Mock stores ──────────────────────────────────────────────────────────────

let mockFiles: Array<{
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'docx';
  agentId: string;
  dealId: string;
  extractedText: string;
  uploadedAt: number;
}> = [];

vi.mock('@/store/fileStore', () => ({
  useFileStore: {
    getState: () => ({
      files: mockFiles,
    }),
  },
}));

// ── Mock input module state ─────────────────────────────────────────────────

let mockDragOverRoomId: string | null = null;
let mockInvalidDropMessage: string | null = null;
let mockInvalidDropX = 0;
let mockInvalidDropY = 0;
let mockHoverTileCol = -1;
let mockHoverTileRow = -1;

vi.mock('../input', () => ({
  get dragOverRoomId() { return mockDragOverRoomId; },
  get invalidDropMessage() { return mockInvalidDropMessage; },
  get invalidDropX() { return mockInvalidDropX; },
  get invalidDropY() { return mockInvalidDropY; },
  get hoverTileCol() { return mockHoverTileCol; },
  get hoverTileRow() { return mockHoverTileRow; },
}));

import { renderFrame, renderDropZoneHighlight, renderFileIcons, hoveredFileId } from '../renderer';

function createMockCtx() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '' as CanvasTextAlign,
    textBaseline: '' as CanvasTextBaseline,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    roundRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createCamera(zoom: number): Camera {
  return {
    x: 0,
    y: 0,
    zoom,
    targetX: 0,
    targetY: 0,
    followTarget: null,
  };
}

function createCharacter(id: string, col: number, row: number): Character {
  return {
    id,
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    tileCol: col,
    tileRow: row,
    state: 'idle',
    direction: 'down',
    frame: 0,
    frameTimer: 0,
    path: [],
    moveProgress: 0,
    speed: 0,
  };
}

describe('renderFrame', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
    mockFiles = [];
    mockDragOverRoomId = null;
    mockInvalidDropMessage = null;
    mockHoverTileCol = -1;
    mockHoverTileRow = -1;
  });

  it('sets imageSmoothingEnabled to false', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600, {});
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it('calls fillRect for background clear', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600, {});
    // First fillRect call should be the background clear
    const firstCall = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall).toEqual([0, 0, 800, 600]);
  });

  it('renders tiles using fillRect', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600, {});
    // Should have many fillRect calls (background + tiles)
    const callCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCount).toBeGreaterThan(1);
  });

  it('renders characters', () => {
    const camera = createCamera(2);
    const billy = createCharacter('billy', 20, 4);
    renderFrame(ctx, camera, [billy], null, 800, 600, {});

    // Should call beginPath for direction indicator triangle
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders room label when activeRoomId is set', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], 'billy', 800, 600, {});
    // Should call fillText for room name
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('does not render room label when activeRoomId is null', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600, {});
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('zoom=1 and zoom=2 produce different tile sizes in draw calls', () => {
    // Render at zoom 1
    const ctx1 = createMockCtx();
    renderFrame(ctx1, createCamera(1), [], null, 800, 600, {});
    const calls1 = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls;

    // Render at zoom 2
    const ctx2 = createMockCtx();
    renderFrame(ctx2, createCamera(2), [], null, 800, 600, {});
    const calls2 = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls;

    // At zoom 2, tile sizes in fillRect should be double zoom 1.
    const tileCall1 = calls1.find(
      (c: number[]) => c[2] === TILE_SIZE * 1 && c[3] === TILE_SIZE * 1,
    );
    const tileCall2 = calls2.find(
      (c: number[]) => c[2] === TILE_SIZE * 2 && c[3] === TILE_SIZE * 2,
    );

    expect(tileCall1).toBeDefined();
    expect(tileCall2).toBeDefined();
  });

  it('viewport culling: only visible tiles are drawn', () => {
    // Render with a small canvas so many tiles are outside the viewport
    const ctx1 = createMockCtx();
    renderFrame(ctx1, createCamera(2), [], null, 100, 100, {});
    const smallCount = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

    // Render with a large canvas so more tiles are visible
    const ctx2 = createMockCtx();
    renderFrame(ctx2, createCamera(2), [], null, 2000, 2000, {});
    const largeCount = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

    // Large canvas should render more tiles
    expect(largeCount).toBeGreaterThan(smallCount);
  });
});

describe('renderDropZoneHighlight', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
    mockDragOverRoomId = null;
    mockInvalidDropMessage = null;
  });

  it('draws amber dashed border on desk area when dragOverRoomId is set to valid agent', () => {
    mockDragOverRoomId = 'diana';

    const tileSize = TILE_SIZE * 2;
    renderDropZoneHighlight(ctx, tileSize, 0, 0, 800, 600);

    // Should call setLineDash for dashed border
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 3]);
    // Should reset line dash
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    // Should draw desk area fill (amber semi-transparent)
    const fillCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
    // Should draw desk area stroke
    const strokeCalls = (ctx.strokeRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(strokeCalls.length).toBeGreaterThan(0);
  });

  it('does NOT draw highlight when dragOverRoomId is null', () => {
    mockDragOverRoomId = null;

    const tileSize = TILE_SIZE * 2;
    renderDropZoneHighlight(ctx, tileSize, 0, 0, 800, 600);

    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('renders tooltip when invalidDropMessage is set', () => {
    mockInvalidDropMessage = "Drop files on an agent's desk";
    mockInvalidDropX = 400;
    mockInvalidDropY = 300;

    const tileSize = TILE_SIZE * 2;
    renderDropZoneHighlight(ctx, tileSize, 0, 0, 800, 600);

    // Should render tooltip text
    expect(ctx.fillText).toHaveBeenCalledWith(
      "Drop files on an agent's desk",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('does NOT render tooltip when invalidDropMessage is null', () => {
    mockInvalidDropMessage = null;

    const tileSize = TILE_SIZE * 2;
    renderDropZoneHighlight(ctx, tileSize, 0, 0, 800, 600);

    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});

describe('renderFileIcons', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
    mockFiles = [];
    mockHoverTileCol = -1;
    mockHoverTileRow = -1;
  });

  it('renders file icons when files exist for an agent', () => {
    mockFiles = [
      { id: 'f1', name: 'contract.pdf', size: 1000, type: 'pdf', agentId: 'diana', dealId: 'deal-1', extractedText: 'text', uploadedAt: 1000 },
    ];

    const tileSize = TILE_SIZE * 2;
    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // Should draw paper background (white fillRect) and border (strokeRect)
    const fillCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    const strokeCalls = (ctx.strokeRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
    expect(strokeCalls.length).toBeGreaterThan(0);
  });

  it('does not render icons when no files exist', () => {
    mockFiles = [];

    const tileSize = TILE_SIZE * 2;
    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // No fillRect calls for file icons (no files to render)
    const fillCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBe(0);
  });

  it('PDF icons get red header bar color', () => {
    mockFiles = [
      { id: 'f1', name: 'contract.pdf', size: 1000, type: 'pdf', agentId: 'diana', dealId: 'deal-1', extractedText: 'text', uploadedAt: 1000 },
    ];

    const tileSize = TILE_SIZE * 2;
    const fillStyleTracker: string[] = [];
    const origFillRect = ctx.fillRect;
    (ctx as any).fillRect = vi.fn((...args: any[]) => {
      fillStyleTracker.push(ctx.fillStyle as string);
      return (origFillRect as any)(...args);
    });

    // Need to track fillStyle before each fillRect
    Object.defineProperty(ctx, 'fillStyle', {
      set(v: string) { (ctx as any)._fillStyle = v; },
      get() { return (ctx as any)._fillStyle || ''; },
    });

    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // Red color #ef4444 should appear in fillStyle history
    const allFillStyles: string[] = [];
    // Re-render with simple tracking
    const ctx2 = createMockCtx();
    const styles: string[] = [];
    const origFR = ctx2.fillRect;
    (ctx2 as any).fillRect = vi.fn(function (this: any) {
      styles.push(this.fillStyle);
      return (origFR as any).apply(this, arguments);
    }.bind(ctx2));

    renderFileIcons(ctx2, tileSize, 0, 0, 2);
    expect(styles).toContain('#ef4444');
  });

  it('DOCX icons get blue header bar color', () => {
    mockFiles = [
      { id: 'f1', name: 'report.docx', size: 1000, type: 'docx', agentId: 'diana', dealId: 'deal-1', extractedText: 'text', uploadedAt: 1000 },
    ];

    const tileSize = TILE_SIZE * 2;
    const ctx2 = createMockCtx();
    const styles: string[] = [];
    const origFR = ctx2.fillRect;
    (ctx2 as any).fillRect = vi.fn(function (this: any) {
      styles.push(this.fillStyle);
      return (origFR as any).apply(this, arguments);
    }.bind(ctx2));

    renderFileIcons(ctx2, tileSize, 0, 0, 2);
    expect(styles).toContain('#3b82f6');
  });

  it('renders at most 5 icons per desk with +N badge for overflow', () => {
    // Create 8 files for one agent
    mockFiles = [];
    for (let i = 0; i < 8; i++) {
      mockFiles.push({
        id: `f${i}`,
        name: `doc${i}.pdf`,
        size: 1000,
        type: 'pdf',
        agentId: 'diana',
        dealId: 'deal-1',
        extractedText: 'text',
        uploadedAt: i * 1000,
      });
    }

    const tileSize = TILE_SIZE * 2;
    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // Should render "+3" badge text
    expect(ctx.fillText).toHaveBeenCalledWith('+3', expect.any(Number), expect.any(Number));
  });

  it('does not render +N badge when 5 or fewer files', () => {
    mockFiles = [];
    for (let i = 0; i < 5; i++) {
      mockFiles.push({
        id: `f${i}`,
        name: `doc${i}.pdf`,
        size: 1000,
        type: 'pdf',
        agentId: 'diana',
        dealId: 'deal-1',
        extractedText: 'text',
        uploadedAt: i * 1000,
      });
    }

    const tileSize = TILE_SIZE * 2;
    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // Should NOT render any "+N" badge
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const badgeCalls = fillTextCalls.filter((c: any[]) => typeof c[0] === 'string' && c[0].startsWith('+'));
    expect(badgeCalls.length).toBe(0);
  });

  it('skips war-room and billy rooms', () => {
    mockFiles = [
      { id: 'f1', name: 'doc.pdf', size: 1000, type: 'pdf', agentId: 'war-room', dealId: 'deal-1', extractedText: 'text', uploadedAt: 1000 },
      { id: 'f2', name: 'doc.pdf', size: 1000, type: 'pdf', agentId: 'billy', dealId: 'deal-1', extractedText: 'text', uploadedAt: 1000 },
    ];

    const tileSize = TILE_SIZE * 2;
    renderFileIcons(ctx, tileSize, 0, 0, 2);

    // No icons rendered (no fillRect calls)
    const fillCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBe(0);
  });
});

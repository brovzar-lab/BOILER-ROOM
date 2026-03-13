import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderFrame } from '../renderer';
import { TILE_SIZE } from '../types';
import type { Camera, Character } from '../types';

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
    measureText: vi.fn(() => ({ width: 50 })),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
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
  });

  it('sets imageSmoothingEnabled to false', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600);
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it('calls fillRect for background clear', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600);
    // First fillRect call should be the background clear
    const firstCall = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall).toEqual([0, 0, 800, 600]);
  });

  it('renders tiles using fillRect', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600);
    // Should have many fillRect calls (background + tiles)
    const callCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCount).toBeGreaterThan(1);
  });

  it('renders characters', () => {
    const camera = createCamera(2);
    const billy = createCharacter('billy', 20, 4);
    renderFrame(ctx, camera, [billy], null, 800, 600);

    // Should call beginPath for direction indicator triangle
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('renders room label when activeRoomId is set', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], 'billy', 800, 600);
    // Should call fillText for room name
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('does not render room label when activeRoomId is null', () => {
    const camera = createCamera(2);
    renderFrame(ctx, camera, [], null, 800, 600);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('zoom=1 and zoom=2 produce different tile sizes in draw calls', () => {
    // Render at zoom 1
    const ctx1 = createMockCtx();
    renderFrame(ctx1, createCamera(1), [], null, 800, 600);
    const calls1 = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls;

    // Render at zoom 2
    const ctx2 = createMockCtx();
    renderFrame(ctx2, createCamera(2), [], null, 800, 600);
    const calls2 = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls;

    // At zoom 2, tile sizes in fillRect should be double zoom 1.
    // Find a tile fillRect call (not the background clear which is [0,0,800,600]).
    // The 2nd call onward should be tile draws. Compare the width (4th arg).
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
    renderFrame(ctx1, createCamera(2), [], null, 100, 100);
    const smallCount = (ctx1.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

    // Render with a large canvas so more tiles are visible
    const ctx2 = createMockCtx();
    renderFrame(ctx2, createCamera(2), [], null, 2000, 2000);
    const largeCount = (ctx2.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;

    // Large canvas should render more tiles
    expect(largeCount).toBeGreaterThan(smallCount);
  });
});

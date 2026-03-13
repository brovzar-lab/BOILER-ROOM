/**
 * Sprite loading, caching, and Phase 2 placeholder colors.
 *
 * For Phase 2: The renderer draws colored rectangles instead of sprite sheets.
 * This module provides the caching infrastructure that Phase 8 will use for
 * real sprite sheet assets. The PLACEHOLDER_COLORS map uses the project's
 * warm/cool palette.
 */
import type { SpriteFrame } from './types';

// ── Placeholder Colors (Phase 2) ───────────────────────────────────────────
// Warm tones in offices, cool tones in hallways and War Room
export const PLACEHOLDER_COLORS: Record<string, string> = {
  floor: '#6e665e',
  wall: '#453e38',
  door: '#7a7268',
  hallway: '#584f48',
  billy: '#e8a838',
  diana: '#c084fc',
  marcos: '#60a5fa',
  sasha: '#34d399',
  roberto: '#f87171',
  valentina: '#fb923c',
  'war-room-floor': '#4a5060',
};

// ── Sprite Sheet Loading ────────────────────────────────────────────────────

/**
 * Loads a sprite sheet image from a URL. Returns a promise that resolves
 * when the image is loaded.
 */
export function loadSpriteSheet(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${src}`));
    img.src = src;
  });
}

/**
 * Loads all required sprite sheets. For Phase 2, this is a no-op since we
 * use placeholder colored rectangles. Phase 8 will add real sprite loading here.
 */
export async function loadAllAssets(): Promise<void> {
  // Phase 2: No sprite sheets to load. Renderer uses PLACEHOLDER_COLORS.
  // Phase 8 will add: await Promise.all([loadSpriteSheet('tiles.png'), ...])
}

// ── Sprite Cache ────────────────────────────────────────────────────────────
// Caches pre-scaled canvas elements per zoom level for fast rendering.

const spriteCache = new Map<number, Map<string, HTMLCanvasElement>>();

/**
 * Extracts a frame from a sprite sheet and returns a pre-scaled cached canvas.
 * Sets imageSmoothingEnabled=false for pixel-perfect scaling.
 */
export function getCachedSprite(
  sheet: HTMLImageElement,
  frame: SpriteFrame,
  zoom: number,
): HTMLCanvasElement {
  let zoomCache = spriteCache.get(zoom);
  if (!zoomCache) {
    zoomCache = new Map();
    spriteCache.set(zoom, zoomCache);
  }

  const key = `${frame.x},${frame.y},${frame.w},${frame.h}`;
  let cached = zoomCache.get(key);
  if (!cached) {
    cached = document.createElement('canvas');
    cached.width = frame.w * zoom;
    cached.height = frame.h * zoom;
    const cctx = cached.getContext('2d')!;
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(
      sheet,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      0,
      0,
      cached.width,
      cached.height,
    );
    zoomCache.set(key, cached);
  }

  return cached;
}

/**
 * Clears all cached sprites. Should be called on zoom level change.
 */
export function clearSpriteCache(): void {
  spriteCache.clear();
}

/**
 * Sprite loading, caching, and Phase 2 placeholder colors (fallback).
 *
 * Phase 8: Loads real PNG sprite sheets for characters and environment.
 * Falls back to PLACEHOLDER_COLORS if sheets haven't loaded yet.
 */
import type { SpriteFrame } from './types';
import { CHARACTER_SHEET_NAMES } from './spriteAtlas';

// ── Placeholder Colors (Phase 2 fallback) ────────────────────────────────────
// Warm tones in offices, cool tones in hallways and War Room
export const PLACEHOLDER_COLORS: Record<string, string> = {
  floor: '#6e665e',
  wall: '#453e38',
  door: '#7a7268',
  hallway: '#584f48',
  billy: '#e8a838',
  patrik: '#8B5CF6',
  marcos: '#3B82F6',
  sandra: '#10B981',
  isaac: '#F59E0B',
  wendy: '#EC4899',
  'war-room-floor': '#4a5060',
};

// ── Sprite Sheet Storage ─────────────────────────────────────────────────────

const characterSheets: Map<string, HTMLImageElement> = new Map();
let environmentSheet: HTMLImageElement | null = null;

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
 * Loads all required sprite sheets: 6 character sheets + 1 environment sheet.
 * Called during app initialization. Renderer falls back to colored rectangles
 * if this hasn't completed yet.
 */
export async function loadAllAssets(): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const name of CHARACTER_SHEET_NAMES) {
    promises.push(
      loadSpriteSheet(`/sprites/${name}.png`).then((img) => {
        characterSheets.set(name, img);
      }),
    );
  }

  promises.push(
    loadSpriteSheet('/sprites/environment.png').then((img) => {
      environmentSheet = img;
    }),
  );

  await Promise.all(promises);
}

// ── Sheet Getters ────────────────────────────────────────────────────────────

/**
 * Returns the loaded sprite sheet for a character, or null if not yet loaded.
 */
export function getCharacterSheet(characterId: string): HTMLImageElement | null {
  return characterSheets.get(characterId) ?? null;
}

/**
 * Returns the loaded environment sprite sheet, or null if not yet loaded.
 */
export function getEnvironmentSheet(): HTMLImageElement | null {
  return environmentSheet;
}

// ── Sprite Cache ────────────────────────────────────────────────────────────
// Caches pre-scaled canvas elements per quantized zoom level for fast rendering.
// Zoom is quantized to nearest 0.5 to prevent cache explosion at fractional values.

const spriteCache = new Map<number, Map<string, HTMLCanvasElement>>();

/**
 * Quantizes zoom to nearest 0.5 increment (e.g. 1.0, 1.5, 2.0, 2.5).
 * Prevents cache explosion when zoom is a continuous float.
 */
function getQuantizedZoom(zoom: number): number {
  return Math.round(zoom * 2) / 2;
}

/**
 * Extracts a frame from a sprite sheet and returns a pre-scaled cached canvas.
 * Uses quantized zoom for both cache key and canvas dimensions.
 * Sets imageSmoothingEnabled=false for pixel-perfect scaling.
 */
export function getCachedSprite(
  sheet: HTMLImageElement,
  frame: SpriteFrame,
  zoom: number,
): HTMLCanvasElement {
  const cacheZoom = getQuantizedZoom(zoom);

  let zoomCache = spriteCache.get(cacheZoom);
  if (!zoomCache) {
    zoomCache = new Map();
    spriteCache.set(cacheZoom, zoomCache);
  }

  // Include sheet src in cache key so different sheets with same frame coords don't collide
  const key = `${sheet.src}:${frame.x},${frame.y},${frame.w},${frame.h}`;
  let cached = zoomCache.get(key);
  if (!cached) {
    cached = document.createElement('canvas');
    cached.width = frame.w * cacheZoom;
    cached.height = frame.h * cacheZoom;
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

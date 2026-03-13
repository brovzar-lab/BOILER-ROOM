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
  diana: '#c084fc',
  marcos: '#60a5fa',
  sasha: '#34d399',
  roberto: '#f87171',
  valentina: '#fb923c',
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

  // Include sheet src in cache key so different sheets with same frame coords don't collide
  const key = `${sheet.src}:${frame.x},${frame.y},${frame.w},${frame.h}`;
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

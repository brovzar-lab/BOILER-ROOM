/**
 * Depth sorting for unified Y-sorted rendering.
 *
 * Merges furniture, decorations, and characters into a single sorted
 * draw list ordered back-to-front by their bottom tile row (baseRow).
 * At the same row, furniture draws before characters (priority tie-break).
 */
import { TILE_SIZE } from './types';
import type { Character } from './types';
import type { FurnitureItem, DecorationItem } from './officeLayout';
import { FURNITURE, DECORATIONS } from './officeLayout';

export interface Renderable {
  /** Y-sort key: bottom tile row of this object's footprint */
  baseRow: number;
  /** Tie-breaking: 0 = furniture/decoration (behind), 1 = character (in front) at same row */
  priority: number;
  /** Draw this renderable -- assumes ctx already has setTransform applied */
  draw(ctx: CanvasRenderingContext2D): void;
}

/**
 * Build a sorted list of all renderables (furniture + decorations + characters)
 * for back-to-front Y-sorted drawing.
 *
 * @param characters - Active characters to include
 * @param renderCharacterFn - Callback to draw a single character
 * @param renderFurnitureItemFn - Callback to draw a single furniture item
 * @param renderDecorationFn - Callback to draw a single decoration item
 * @returns Sorted array of Renderables (back-to-front)
 */
export function buildRenderables(
  characters: Character[],
  renderCharacterFn: (ctx: CanvasRenderingContext2D, ch: Character) => void,
  renderFurnitureItemFn: (ctx: CanvasRenderingContext2D, item: FurnitureItem) => void,
  renderDecorationFn: (ctx: CanvasRenderingContext2D, dec: DecorationItem) => void,
): Renderable[] {
  const list: Renderable[] = [];

  for (const item of FURNITURE) {
    list.push({
      baseRow: item.row + item.height - 1, // bottom edge of footprint
      priority: 0,
      draw: (ctx) => renderFurnitureItemFn(ctx, item),
    });
  }

  for (const dec of DECORATIONS) {
    list.push({
      baseRow: dec.row + 1, // decorations occupy 1 tile, bottom edge
      priority: 0,
      draw: (ctx) => renderDecorationFn(ctx, dec),
    });
  }

  for (const ch of characters) {
    // Character foot is at bottom of their occupied tile (ch.y + TILE_SIZE).
    // baseRow uses foot position for Y-sort. The 24x32 sprite extends 16px
    // above ch.y but sorting is by feet, not head — correct for JRPG 3/4 depth.
    const footRow = ch.y / TILE_SIZE;
    list.push({
      baseRow: footRow + 1, // bottom edge (foot) is one tile below ch.y origin
      priority: 1,
      draw: (ctx) => renderCharacterFn(ctx, ch),
    });
  }

  // Sort by baseRow ascending (back to front), then priority (furniture before character at same row)
  list.sort((a, b) => a.baseRow - b.baseRow || a.priority - b.priority);
  return list;
}

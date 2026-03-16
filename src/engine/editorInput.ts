/**
 * Editor-mode input handlers for the layout editor.
 *
 * When editor mode is active, these handlers intercept canvas clicks
 * and keyboard events to paint tiles, place furniture, etc.
 */
import { useEditorStore } from '@/store/editorStore';
import { useOfficeStore } from '@/store/officeStore';
import { screenToTile } from './camera';
import { setTile, addFurniture, removeFurnitureAt, getFurnitureAt, OFFICE_TILE_MAP, FURNITURE } from './officeLayout';
import { TileType, TILE_SIZE } from './types';
import type { EditorAction } from '@/store/editorStore';
import { saveLayoutToIDB } from './layoutSerializer';

// ── Drag-paint state ────────────────────────────────────────────────────────

let isPainting = false;
let paintBatch: Array<{ col: number; row: number; oldType: TileType; newType: TileType }> = [];

// ── Setup ───────────────────────────────────────────────────────────────────

/**
 * Sets up editor-specific input handlers on the canvas.
 * Returns a cleanup function. Only active when editorMode is true.
 */
export function setupEditorInputHandlers(canvas: HTMLCanvasElement): () => void {

  function getClickTile(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const state = useOfficeStore.getState();
    return screenToTile(cssX, cssY, state.camera, rect.width, rect.height);
  }

  function handleMouseDown(e: MouseEvent): void {
    if (!useEditorStore.getState().editorMode) return;
    if (e.button !== 0) return;

    const tile = getClickTile(e);
    if (!tile) return;

    const { activeTool } = useEditorStore.getState();

    if (activeTool === 'wall' || activeTool === 'floor' || activeTool === 'eraser') {
      isPainting = true;
      paintBatch = [];
      applyPaintAt(tile.col, tile.row, activeTool);
    } else if (activeTool === 'door') {
      applyDoor(tile.col, tile.row);
    } else if (activeTool === 'furniture') {
      handleFurniturePlacement(tile.col, tile.row);
    } else if (activeTool === 'select') {
      handleSelect(tile.col, tile.row);
    } else if (activeTool === 'eyedropper') {
      handleEyedropper(tile.col, tile.row);
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!useEditorStore.getState().editorMode) return;
    if (!isPainting) return;

    const tile = getClickTile(e);
    if (!tile) return;

    const { activeTool } = useEditorStore.getState();
    if (activeTool === 'wall' || activeTool === 'floor' || activeTool === 'eraser') {
      applyPaintAt(tile.col, tile.row, activeTool);
    }
  }

  function handleMouseUp(_e: MouseEvent): void {
    if (!isPainting) return;
    isPainting = false;

    // Commit drag-paint batch as a single undo action
    if (paintBatch.length > 0) {
      const batch = [...paintBatch];
      const action: EditorAction = {
        description: `Paint ${batch.length} tiles`,
        apply() {
          for (const { col, row, newType } of batch) {
            setTile(col, row, newType);
          }
        },
        revert() {
          for (const { col, row, oldType } of batch) {
            setTile(col, row, oldType);
          }
        },
      };
      useEditorStore.getState().pushAction(action);
      paintBatch = [];
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!useEditorStore.getState().editorMode) return;

    // Don't intercept when typing in inputs
    const tag = document.activeElement?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;

    const store = useEditorStore.getState();

    // Tool shortcuts
    const toolKeys: Record<string, Parameters<typeof store.setActiveTool>[0]> = {
      'v': 'select',
      'w': 'wall',
      'f': 'floor',
      'd': 'door',
      'e': 'eraser',
      'i': 'eyedropper',
      'r': 'room-template',
      'g': 'grid-resize',
      ' ': 'furniture',
    };

    const tool = toolKeys[e.key.toLowerCase()];
    if (tool) {
      e.preventDefault();
      store.setActiveTool(tool);
      return;
    }

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      store.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      store.redo();
      return;
    }

    // Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      void saveLayoutToIDB();
      return;
    }

    // Exit editor
    if (e.key === 'Escape') {
      e.preventDefault();
      store.setEditorMode(false);
      return;
    }

    // Delete selected furniture
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const idx = store.selectedCanvasFurnitureIdx;
      if (idx !== null && idx >= 0 && idx < FURNITURE.length) {
        const item = FURNITURE[idx]!;
        const action: EditorAction = {
          description: `Remove ${item.type}`,
          apply() { removeFurnitureAt(idx); },
          revert() { addFurniture(item, idx); },
        };
        action.apply();
        store.pushAction(action);
        store.setSelectedCanvasFurniture(null);
      }
      return;
    }
  }

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
  };
}

// ── Tool Implementations ────────────────────────────────────────────────────

function applyPaintAt(col: number, row: number, tool: 'wall' | 'floor' | 'eraser'): void {
  const mapRows = OFFICE_TILE_MAP.length;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return;

  const oldType = OFFICE_TILE_MAP[row]![col]!;
  let newType: TileType;

  if (tool === 'wall') {
    newType = TileType.WALL;
  } else if (tool === 'floor') {
    newType = TileType.FLOOR;
  } else {
    // eraser: wall/door → floor
    newType = TileType.FLOOR;
  }

  if (oldType === newType) return;

  // Check if already in this batch (avoid duplicates during drag)
  if (paintBatch.some((b) => b.col === col && b.row === row)) return;

  setTile(col, row, newType);
  paintBatch.push({ col, row, oldType, newType });
}

function applyDoor(col: number, row: number): void {
  const mapRows = OFFICE_TILE_MAP.length;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return;

  const oldType = OFFICE_TILE_MAP[row]![col]!;

  // Doors can only be placed on walls
  if (oldType !== TileType.WALL) return;

  const newType = TileType.DOOR;
  setTile(col, row, newType);

  const action: EditorAction = {
    description: 'Place door',
    apply() { setTile(col, row, newType); },
    revert() { setTile(col, row, oldType); },
  };
  useEditorStore.getState().pushAction(action);
}

function handleSelect(col: number, row: number): void {
  // Check if clicking on furniture
  const idx = getFurnitureAt(col, row);
  useEditorStore.getState().setSelectedCanvasFurniture(idx);
}

function handleFurniturePlacement(col: number, row: number): void {
  const store = useEditorStore.getState();
  const furnitureId = store.selectedFurnitureId;
  if (!furnitureId) return; // No furniture selected in catalog

  // Default furniture size: 1x1 (can be extended per furniture type later)
  const item = {
    roomId: '',
    type: 'desk' as const,
    col,
    row,
    width: 1,
    height: 1,
    atlasKey: furnitureId,
  };

  const insertIdx = FURNITURE.length;
  addFurniture(item);

  const action: EditorAction = {
    description: `Place ${furnitureId}`,
    apply() { addFurniture(item, insertIdx); },
    revert() { removeFurnitureAt(insertIdx); },
  };
  store.pushAction(action);
}

function handleEyedropper(col: number, row: number): void {
  const mapRows = OFFICE_TILE_MAP.length;
  const mapCols = OFFICE_TILE_MAP[0]!.length;
  if (col < 0 || col >= mapCols || row < 0 || row >= mapRows) return;

  const tileType = OFFICE_TILE_MAP[row]![col]!;
  const store = useEditorStore.getState();

  if (tileType === TileType.WALL) {
    store.setActiveTool('wall');
  } else if (tileType === TileType.DOOR) {
    store.setActiveTool('door');
  } else {
    store.setActiveTool('floor');
  }
}

/**
 * Canvas input handling for room click navigation, zoom toggle, and hover tracking.
 *
 * Attaches event listeners to the canvas element. On click, converts screen
 * coordinates to tile coordinates and triggers BILLY walking to the clicked room.
 * Zoom toggles between overview (1) and follow (2) via keyboard 'z' or double-click.
 */
import { useOfficeStore } from '@/store/officeStore';
import { screenToTile } from './camera';
import { getRoomAtTile, OFFICE_TILE_MAP } from './officeLayout';
import { startWalk } from './characters';

/** Module-level hover position for renderer to read */
export let hoverTileCol = -1;
export let hoverTileRow = -1;

/**
 * Sets up all input event handlers on the canvas.
 * Returns a cleanup function that removes all listeners.
 */
export function setupInputHandlers(canvas: HTMLCanvasElement): () => void {
  function handleClick(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const state = useOfficeStore.getState();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    const tile = screenToTile(cssX, cssY, state.camera, canvasWidth, canvasHeight);
    if (!tile) return;

    const room = getRoomAtTile(tile.col, tile.row);
    if (!room) return; // Click on hallway/void -- ignore per user decision

    // Only navigate if clicking a different room than current active
    if (room.id === state.activeRoomId) return;

    // Set target room and start BILLY walking
    state.setTargetRoom(room.id);
    startWalk(
      'billy',
      room.billyStandTile.col,
      room.billyStandTile.row,
      OFFICE_TILE_MAP,
    );
  }

  function handleDblClick(_e: MouseEvent): void {
    toggleZoom();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'z' || e.key === 'Z') {
      toggleZoom();
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const state = useOfficeStore.getState();
    const tile = screenToTile(cssX, cssY, state.camera, rect.width, rect.height);

    if (tile) {
      hoverTileCol = tile.col;
      hoverTileRow = tile.row;
    } else {
      hoverTileCol = -1;
      hoverTileRow = -1;
    }
  }

  function handleMouseLeave(): void {
    hoverTileCol = -1;
    hoverTileRow = -1;
  }

  // Attach listeners
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('dblclick', handleDblClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('dblclick', handleDblClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    window.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Removes all input handlers. Alias for calling the cleanup function
 * returned by setupInputHandlers.
 */
export function removeInputHandlers(cleanup: () => void): void {
  cleanup();
}

/**
 * Toggles zoom between overview (1) and follow (2).
 */
function toggleZoom(): void {
  const state = useOfficeStore.getState();
  const newLevel = state.zoomLevel === 1 ? 2 : 1;
  state.setZoomLevel(newLevel);
}

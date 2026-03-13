/**
 * Canvas input handling for room click navigation, zoom toggle, and hover tracking.
 *
 * Attaches event listeners to the canvas element. On click, converts screen
 * coordinates to tile coordinates and triggers BILLY walking to the clicked room.
 * Zoom toggles between overview (1) and follow (2) via keyboard 'z' or double-click.
 */
import { useOfficeStore } from '@/store/officeStore';
import { screenToTile } from './camera';
import { getRoomAtTile, ROOMS, OFFICE_TILE_MAP } from './officeLayout';
import { startWalk } from './characters';

/** Maps number keys to agent room IDs */
const KEY_TO_AGENT: Record<string, string> = {
  '1': 'diana',
  '2': 'marcos',
  '3': 'sasha',
  '4': 'roberto',
  '5': 'valentina',
};

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
    // Don't trigger navigation while typing in chat input
    const tag = document.activeElement?.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') return;

    if (e.key === 'z' || e.key === 'Z') {
      toggleZoom();
      return;
    }

    // Escape: navigate BILLY back to his office
    if (e.key === 'Escape') {
      const state = useOfficeStore.getState();
      if (state.activeRoomId === 'billy') return;

      const billyRoom = ROOMS.find((r) => r.id === 'billy');
      if (!billyRoom) return;

      state.setTargetRoom('billy');
      startWalk(
        'billy',
        billyRoom.billyStandTile.col,
        billyRoom.billyStandTile.row,
        OFFICE_TILE_MAP,
      );
      return;
    }

    // Number keys 1-5: navigate BILLY to agent rooms
    const agentId = KEY_TO_AGENT[e.key];
    if (agentId) {
      const state = useOfficeStore.getState();
      // Ignore if already in that room
      if (state.activeRoomId === agentId) return;

      const room = ROOMS.find((r) => r.id === agentId);
      if (!room) return;

      state.setTargetRoom(room.id);
      startWalk(
        'billy',
        room.billyStandTile.col,
        room.billyStandTile.row,
        OFFICE_TILE_MAP,
      );
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

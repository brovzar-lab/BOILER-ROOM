/**
 * Canvas input handling for room click navigation, zoom toggle, hover tracking,
 * drag-and-drop file upload, and file icon click detection.
 *
 * Attaches event listeners to the canvas element. On click, converts screen
 * coordinates to tile coordinates and triggers BILLY walking to the clicked room.
 * Zoom toggles between overview (1) and follow (2) via keyboard 'z' or double-click.
 * Drag-and-drop routes PDF/DOCX files to the agent under the cursor.
 */
import { useOfficeStore } from '@/store/officeStore';
import { useFileStore } from '@/store/fileStore';
import { screenToTile } from './camera';
import { getRoomAtTile, ROOMS, OFFICE_TILE_MAP } from './officeLayout';
import { startWalk } from './characters';
import type { AgentId } from '@/types/agent';

/** Valid agent room IDs (excludes war-room and billy) */
const AGENT_ROOM_IDS = new Set<string>(['diana', 'marcos', 'sasha', 'roberto', 'valentina']);

/** Valid file extensions for drag-and-drop */
const VALID_EXTENSIONS = new Set(['.pdf', '.docx']);

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

/** Module-level drag state for renderer to read */
export let dragOverRoomId: string | null = null;

/** Message to show as tooltip when dragging over invalid area */
export let invalidDropMessage: string | null = null;

/** CSS coordinates for invalid drop tooltip positioning */
export let invalidDropX = 0;
export let invalidDropY = 0;

/** Callback for file icon clicks -- set by React to consume clicked file ID */
export let onFileClickCallback: ((fileId: string) => void) | null = null;

/**
 * Sets the file click callback. Called from React to wire up file viewer.
 */
export function setOnFileClick(cb: ((fileId: string) => void) | null): void {
  onFileClickCallback = cb;
}

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

    // Check for file icon click before room navigation
    if (onFileClickCallback) {
      const fileId = getFileIconAtTile(tile.col, tile.row);
      if (fileId) {
        onFileClickCallback(fileId);
        return;
      }
    }

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

    // 'w' key: navigate BILLY to the War Room
    if (e.key === 'w' || e.key === 'W') {
      const state = useOfficeStore.getState();
      if (state.activeRoomId === 'war-room') return;

      const warRoom = ROOMS.find((r) => r.id === 'war-room');
      if (!warRoom) return;

      state.setTargetRoom('war-room');
      startWalk(
        'billy',
        warRoom.billyStandTile.col,
        warRoom.billyStandTile.row,
        OFFICE_TILE_MAP,
      );
      return;
    }

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

  // ── Drag-and-Drop Handlers ──────────────────────────────────────────────

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const state = useOfficeStore.getState();
    const tile = screenToTile(cssX, cssY, state.camera, rect.width, rect.height);

    if (tile) {
      const room = getRoomAtTile(tile.col, tile.row);
      if (room && AGENT_ROOM_IDS.has(room.id)) {
        // Valid agent room -- show drop zone highlight
        dragOverRoomId = room.id;
        invalidDropMessage = null;
      } else {
        // Invalid area (war-room, billy, hallway, or no room)
        dragOverRoomId = null;
        invalidDropMessage = "Drop files on an agent's desk";
        invalidDropX = e.clientX;
        invalidDropY = e.clientY;
      }
    } else {
      dragOverRoomId = null;
      invalidDropMessage = "Drop files on an agent's desk";
      invalidDropX = e.clientX;
      invalidDropY = e.clientY;
    }
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const state = useOfficeStore.getState();
    const tile = screenToTile(cssX, cssY, state.camera, rect.width, rect.height);

    // Reset drag state
    dragOverRoomId = null;
    invalidDropMessage = null;

    if (!tile) return;

    const room = getRoomAtTile(tile.col, tile.row);
    if (!room || !AGENT_ROOM_IDS.has(room.id)) return;

    const files = e.dataTransfer?.files;
    if (!files) return;

    const fileStore = useFileStore.getState();
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (VALID_EXTENSIONS.has(ext)) {
        fileStore.addFile(file, room.id as AgentId);
      }
    }
  }

  function handleDragLeave(_e: DragEvent): void {
    dragOverRoomId = null;
    invalidDropMessage = null;
  }

  // Attach listeners
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('dblclick', handleDblClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('dragover', handleDragOver);
  canvas.addEventListener('drop', handleDrop);
  canvas.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('dblclick', handleDblClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    canvas.removeEventListener('dragover', handleDragOver);
    canvas.removeEventListener('drop', handleDrop);
    canvas.removeEventListener('dragleave', handleDragLeave);
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

/**
 * Checks if a tile position overlaps a file icon on any agent's desk.
 * Returns the file ID if found, null otherwise.
 *
 * File icons are placed on the desk tile (1 row above the seat).
 * Up to 5 icons per desk, scattered using deterministic offsets.
 */
function getFileIconAtTile(col: number, row: number): string | null {
  const { files } = useFileStore.getState();

  for (const room of ROOMS) {
    if (!AGENT_ROOM_IDS.has(room.id)) continue;

    // Desk is 1 row above the seat tile, matching renderer placement
    const deskRow = room.seatTile.row - 1;
    const deskCol = room.seatTile.col;

    // Check if the click is on or near the desk area (2 tiles wide)
    if (row !== deskRow || col < deskCol || col > deskCol + 1) continue;

    const agentFiles = files.filter(f => f.agentId === room.id);
    const visibleFiles = agentFiles.slice(0, 5);

    for (let i = 0; i < visibleFiles.length; i++) {
      // Icon position uses same scatter logic as renderer
      const scatterCol = ((i * 7 + 3) % 5) - 2;
      const iconCol = deskCol + (i % 2) + (scatterCol > 0 ? 1 : 0);

      if (col === iconCol || col === iconCol + 1) {
        return visibleFiles[i]!.id;
      }
    }
  }

  return null;
}

/**
 * Layout serialization, IndexedDB persistence, and JSON export/import.
 *
 * Serializes the current tile map, furniture, decorations, and room definitions
 * into a portable LayoutData format. Supports auto-save to IndexedDB on editor
 * "Done" and manual JSON export/import for backup and sharing.
 */
import { TileType } from './types';
import { OFFICE_TILE_MAP, FURNITURE, DECORATIONS, ROOMS, ROOM_RUGS, setTile } from './officeLayout';
import type { FurnitureItem, DecorationItem, RoomRug } from './officeLayout';
import type { Room } from './types';

// ── Layout Data Format ──────────────────────────────────────────────────────

export interface LayoutData {
  version: number;
  gridCols: number;
  gridRows: number;
  tileMap: number[][];
  furniture: SerializedFurniture[];
  decorations: SerializedDecoration[];
  rooms: SerializedRoom[];
  rugs: SerializedRug[];
}

interface SerializedFurniture {
  roomId: string;
  type: string;
  col: number;
  row: number;
  width: number;
  height: number;
  atlasKey?: string;
}

interface SerializedDecoration {
  roomId: string;
  key: string;
  col: number;
  row: number;
}

interface SerializedRoom {
  id: string;
  name: string;
  col: number;
  row: number;
  width: number;
  height: number;
  doorCol: number;
  doorRow: number;
  seatCol: number;
  seatRow: number;
  billyStandCol: number;
  billyStandRow: number;
}

interface SerializedRug {
  roomId: string;
  col: number;
  row: number;
  w: number;
  h: number;
  color: string;
  borderColor: string;
}

const LAYOUT_VERSION = 1;
const IDB_DB_NAME = 'boiler-room-layout';
const IDB_STORE_NAME = 'layouts';
const IDB_KEY = 'current';

// ── Serialize ───────────────────────────────────────────────────────────────

export function serializeLayout(): LayoutData {
  const gridRows = OFFICE_TILE_MAP.length;
  const gridCols = gridRows > 0 ? OFFICE_TILE_MAP[0]!.length : 0;

  // Convert tile map to plain numbers
  const tileMap: number[][] = [];
  for (let r = 0; r < gridRows; r++) {
    const row: number[] = [];
    for (let c = 0; c < gridCols; c++) {
      row.push(OFFICE_TILE_MAP[r]![c]! as number);
    }
    tileMap.push(row);
  }

  const furniture: SerializedFurniture[] = FURNITURE.map((f) => ({
    roomId: f.roomId,
    type: f.type,
    col: f.col,
    row: f.row,
    width: f.width,
    height: f.height,
    atlasKey: f.atlasKey,
  }));

  const decorations: SerializedDecoration[] = DECORATIONS.map((d) => ({
    roomId: d.roomId,
    key: d.key,
    col: d.col,
    row: d.row,
  }));

  const rooms: SerializedRoom[] = ROOMS.map((r) => ({
    id: r.id,
    name: r.name,
    col: r.tileRect.col,
    row: r.tileRect.row,
    width: r.tileRect.width,
    height: r.tileRect.height,
    doorCol: r.doorTile.col,
    doorRow: r.doorTile.row,
    seatCol: r.seatTile.col,
    seatRow: r.seatTile.row,
    billyStandCol: r.billyStandTile.col,
    billyStandRow: r.billyStandTile.row,
  }));

  const rugs: SerializedRug[] = ROOM_RUGS.map((r) => ({
    roomId: r.roomId,
    col: r.col,
    row: r.row,
    w: r.w,
    h: r.h,
    color: r.color,
    borderColor: r.borderColor,
  }));

  return {
    version: LAYOUT_VERSION,
    gridCols,
    gridRows,
    tileMap,
    furniture,
    decorations,
    rooms,
    rugs,
  };
}

// ── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeLayout(data: LayoutData): void {
  // Apply tile map
  for (let r = 0; r < data.gridRows && r < OFFICE_TILE_MAP.length; r++) {
    for (let c = 0; c < data.gridCols && c < OFFICE_TILE_MAP[0]!.length; c++) {
      setTile(c, r, data.tileMap[r]![c]! as TileType);
    }
  }

  // Apply furniture
  FURNITURE.length = 0;
  for (const f of data.furniture) {
    FURNITURE.push({
      roomId: f.roomId,
      type: f.type as FurnitureItem['type'],
      col: f.col,
      row: f.row,
      width: f.width,
      height: f.height,
      atlasKey: f.atlasKey,
    });
  }

  // Apply decorations
  DECORATIONS.length = 0;
  for (const d of data.decorations) {
    DECORATIONS.push({
      roomId: d.roomId,
      key: d.key,
      col: d.col,
      row: d.row,
    });
  }

  // Apply rugs
  ROOM_RUGS.length = 0;
  for (const r of data.rugs) {
    ROOM_RUGS.push({
      roomId: r.roomId,
      col: r.col,
      row: r.row,
      w: r.w,
      h: r.h,
      color: r.color,
      borderColor: r.borderColor,
    });
  }

  // Apply room definitions (update in place to preserve references)
  for (const sr of data.rooms) {
    const existing = ROOMS.find((r) => r.id === sr.id);
    if (existing) {
      existing.name = sr.name;
      existing.tileRect = { col: sr.col, row: sr.row, width: sr.width, height: sr.height };
      existing.doorTile = { col: sr.doorCol, row: sr.doorRow };
      existing.seatTile = { col: sr.seatCol, row: sr.seatRow };
      existing.billyStandTile = { col: sr.billyStandCol, row: sr.billyStandRow };
    }
  }
}

// ── JSON Export/Import ──────────────────────────────────────────────────────

export function exportLayoutJSON(): string {
  return JSON.stringify(serializeLayout(), null, 2);
}

export function importLayoutJSON(json: string): LayoutData {
  const data = JSON.parse(json) as LayoutData;
  if (!data.version || !data.tileMap || !Array.isArray(data.tileMap)) {
    throw new Error('Invalid layout file');
  }
  return data;
}

export function downloadLayoutJSON(): void {
  const json = exportLayoutJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lemon-office-layout.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── IndexedDB Persistence ───────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLayoutToIDB(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
  const store = tx.objectStore(IDB_STORE_NAME);
  const data = serializeLayout();
  store.put(data, IDB_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLayoutFromIDB(): Promise<LayoutData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(IDB_STORE_NAME, 'readonly');
    const store = tx.objectStore(IDB_STORE_NAME);
    const request = store.get(IDB_KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as LayoutData | null ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

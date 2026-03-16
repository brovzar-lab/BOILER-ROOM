/**
 * Layout editor toolbar — horizontal bar overlaid on the canvas in edit mode.
 *
 * Slate + Electric Blue palette, distinct from the main amber/gold theme.
 * Shows tools, undo/redo, grid size, save/done buttons.
 */
import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { EditorTool } from '@/store/editorStore';
import { saveLayoutToIDB, downloadLayoutJSON } from '@/engine/layoutSerializer';
import { resizeGridEdge } from '@/engine/officeLayout';
import { LIMEZU_ATLAS } from '@/engine/limeZuAtlas';
import { getEnvironmentSheetById } from '@/engine/spriteSheet';

// ── Furniture Catalog ───────────────────────────────────────────────────────

interface FurnitureCatalogItem {
  id: string; // atlas key
  label: string;
}

const FURNITURE_CATEGORIES: Record<string, FurnitureCatalogItem[]> = {
  Desks: [
    { id: 'desk-wood-2wide', label: 'Wood Desk (2w)' },
    { id: 'desk-wood-3wide', label: 'Wood Desk (3w)' },
    { id: 'desk-study', label: 'Study Desk' },
    { id: 'desk-lamp', label: 'Desk Lamp' },
    { id: 'keyboard', label: 'Keyboard' },
    { id: 'phone-desk', label: 'Desk Phone' },
    { id: 'monitor', label: 'Monitor' },
  ],
  Chairs: [
    { id: 'chair-office', label: 'Office Chair' },
    { id: 'conf-chair', label: 'Conference Chair' },
    { id: 'director-chair', label: 'Director Chair' },
    { id: 'armchair', label: 'Armchair' },
  ],
  Tables: [
    { id: 'conf-table', label: 'Conference Table' },
    { id: 'coffee-table', label: 'Coffee Table' },
  ],
  Shelves: [
    { id: 'bookshelf-2tall', label: 'Bookshelf' },
    { id: 'bookshelf-library', label: 'Library Shelf' },
    { id: 'cabinet-2wide', label: 'Cabinet' },
    { id: 'filing-cabinet', label: 'Filing Cabinet' },
    { id: 'shelf-wall', label: 'Wall Shelf' },
  ],
  Tech: [
    { id: 'studio-monitor', label: 'Studio Monitor' },
    { id: 'camera', label: 'Camera' },
    { id: 'studio-light', label: 'Studio Light' },
    { id: 'clapboard', label: 'Clapboard' },
    { id: 'film-reel', label: 'Film Reel' },
    { id: 'conf-projector', label: 'Projector' },
  ],
  Plants: [
    { id: 'plant-potted', label: 'Potted Plant' },
    { id: 'plant-large', label: 'Large Plant' },
    { id: 'desk-plant', label: 'Desk Plant' },
  ],
  Decor: [
    { id: 'whiteboard', label: 'Whiteboard' },
    { id: 'chalkboard', label: 'Chalkboard' },
    { id: 'couch-2wide', label: 'Couch' },
    { id: 'cushion', label: 'Cushion' },
    { id: 'floor-lamp', label: 'Floor Lamp' },
    { id: 'water-cooler', label: 'Water Cooler' },
    { id: 'conf-podium', label: 'Podium' },
    { id: 'coffee-mug', label: 'Coffee Mug' },
    { id: 'pen-holder', label: 'Pen Holder' },
    { id: 'photo-frame', label: 'Photo Frame' },
    { id: 'figurine', label: 'Figurine' },
    { id: 'candle', label: 'Candle' },
    { id: 'papers', label: 'Papers' },
    { id: 'postit-note', label: 'Post-it' },
  ],
  Characters: [
    { id: 'metro-char-light', label: 'Character (Light)' },
    { id: 'metro-char-medium', label: 'Character (Medium)' },
    { id: 'metro-char-dark', label: 'Character (Dark)' },
    { id: 'metro-hair-brown', label: 'Hair (Brown)' },
    { id: 'metro-hair-blonde', label: 'Hair (Blonde)' },
    { id: 'metro-hair-red', label: 'Hair (Red)' },
    { id: 'metro-hair-orange', label: 'Hair (Orange)' },
    { id: 'metro-hair-black', label: 'Hair (Black)' },
    { id: 'metro-outfit-1', label: 'Outfit 1' },
    { id: 'metro-outfit-2', label: 'Outfit 2' },
    { id: 'metro-outfit-3', label: 'Outfit 3' },
    { id: 'metro-outfit-4', label: 'Outfit 4' },
    { id: 'metro-outfit-5', label: 'Outfit 5' },
    { id: 'metro-outfit-6', label: 'Outfit 6' },
    { id: 'metro-suit', label: 'Suit' },
  ],
};

// ── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  bg: '#151a24',
  accent: '#3b82f6',
  accentDim: 'rgba(59,130,246,0.25)',
  border: 'rgba(59,130,246,0.33)',
  statusBg: '#0c0f14',
  statusText: 'rgba(59,130,246,0.4)',
} as const;

// ── Tool definitions ────────────────────────────────────────────────────────

interface ToolDef {
  id: EditorTool;
  icon: string;
  label: string;
  shortcut: string;
  group: 'primary' | 'advanced';
}

const TOOLS: ToolDef[] = [
  { id: 'select',        icon: '🖱', label: 'Select',        shortcut: 'V', group: 'primary' },
  { id: 'wall',          icon: '🧱', label: 'Wall',          shortcut: 'W', group: 'primary' },
  { id: 'floor',         icon: '🟫', label: 'Floor',         shortcut: 'F', group: 'primary' },
  { id: 'door',          icon: '🚪', label: 'Door',          shortcut: 'D', group: 'primary' },
  { id: 'furniture',     icon: '🪑', label: 'Furniture',     shortcut: '⎵', group: 'primary' },
  { id: 'eraser',        icon: '🗑', label: 'Eraser',        shortcut: 'E', group: 'primary' },
  { id: 'eyedropper',    icon: '💧', label: 'Eyedropper',    shortcut: 'I', group: 'advanced' },
  { id: 'room-template', icon: '📋', label: 'Room Template', shortcut: 'R', group: 'advanced' },
  { id: 'grid-resize',   icon: '📐', label: 'Resize Grid',  shortcut: 'G', group: 'advanced' },
];

// ── Floor Styles ────────────────────────────────────────────────────────────

interface TileStyleItem {
  id: string;
  label: string;
}

const FLOOR_STYLES: TileStyleItem[] = [
  // Band 0 — Neutral/warm
  { id: 'floor-b0-white', label: 'White' },
  { id: 'floor-b0-cream', label: 'Cream' },
  { id: 'floor-b0-yellow', label: 'Yellow' },
  { id: 'floor-b0-gold', label: 'Gold' },
  { id: 'floor-b0-brown', label: 'Brown' },
  { id: 'floor-b0-tan', label: 'Tan' },
  { id: 'floor-b0-sand', label: 'Sand' },
  { id: 'floor-b0-grey', label: 'Grey' },
  { id: 'floor-b0-slate', label: 'Slate' },
  { id: 'floor-b0-wood', label: 'Wood' },
  { id: 'floor-b0-dark-wood', label: 'Dark Wood' },
  { id: 'floor-b0-plank', label: 'Plank' },
  // Band 1 — Patterns
  { id: 'floor-b1-white', label: 'White Tile' },
  { id: 'floor-b1-cream', label: 'Cream Tile' },
  { id: 'floor-b1-pattern', label: 'Pattern' },
  { id: 'floor-b1-checker', label: 'Checker' },
  { id: 'floor-b1-brown', label: 'Brown Tile' },
  { id: 'floor-b1-brick', label: 'Brick' },
  { id: 'floor-b1-herring', label: 'Herringbone' },
  { id: 'floor-b1-stone', label: 'Stone' },
  { id: 'floor-b1-tile', label: 'Tile' },
  { id: 'floor-b1-wood', label: 'Wood Tile' },
  { id: 'floor-b1-dark', label: 'Dark Tile' },
  { id: 'floor-b1-parquet', label: 'Parquet' },
  // Band 2 — Red/warm
  { id: 'floor-b2-pink', label: 'Pink' },
  { id: 'floor-b2-rose', label: 'Rose' },
  { id: 'floor-b2-red', label: 'Red' },
  { id: 'floor-b2-orange', label: 'Orange' },
  { id: 'floor-b2-terra', label: 'Terracotta' },
  { id: 'floor-b2-clay', label: 'Clay' },
  { id: 'floor-b2-mosaic', label: 'Mosaic' },
  { id: 'floor-b2-blue-tile', label: 'Blue Tile' },
  { id: 'floor-b2-diamond', label: 'Diamond' },
  { id: 'floor-b2-marble', label: 'Marble' },
  { id: 'floor-b2-granite', label: 'Granite' },
  { id: 'floor-b2-concrete', label: 'Concrete' },
  // Band 3 — Grey/dark
  { id: 'floor-b3-grey', label: 'Light Grey' },
  { id: 'floor-b3-steel', label: 'Steel' },
  { id: 'floor-b3-silver', label: 'Silver' },
  { id: 'floor-b3-dark-grey', label: 'Dark Grey' },
  { id: 'floor-b3-charcoal', label: 'Charcoal' },
  { id: 'floor-b3-cement', label: 'Cement' },
  { id: 'floor-b3-grid', label: 'Grid' },
  { id: 'floor-b3-checker', label: 'Grey Check' },
  { id: 'floor-b3-tile', label: 'Grey Tile' },
  { id: 'floor-b3-dark-tile', label: 'Dark Tile' },
  { id: 'floor-b3-cobble', label: 'Cobble' },
  { id: 'floor-b3-industrial', label: 'Industrial' },
  // Band 4 — Cool/green/blue
  { id: 'floor-b4-teal', label: 'Teal' },
  { id: 'floor-b4-seafoam', label: 'Seafoam' },
  { id: 'floor-b4-green', label: 'Green' },
  { id: 'floor-b4-olive', label: 'Olive' },
  { id: 'floor-b4-wood-green', label: 'Green Wood' },
  { id: 'floor-b4-aqua', label: 'Aqua' },
  { id: 'floor-b4-sky-tile', label: 'Sky Tile' },
  { id: 'floor-b4-blue', label: 'Blue' },
  { id: 'floor-b4-white-tile', label: 'White Tile' },
  { id: 'floor-b4-light-blue', label: 'Light Blue' },
  { id: 'floor-b4-pastel', label: 'Pastel' },
  { id: 'floor-b4-mint', label: 'Mint' },
  // Existing named
  { id: 'floor-office', label: 'Office' },
  { id: 'floor-warroom', label: 'War Room' },
  { id: 'floor-hallway', label: 'Hallway' },
  { id: 'floor-rec', label: 'Break Room' },
];

// ── Wall Styles ─────────────────────────────────────────────────────────────

const WALL_STYLES: TileStyleItem[] = [
  // Solid fills
  { id: 'wall-white', label: 'White' },
  { id: 'wall-cream', label: 'Cream' },
  { id: 'wall-beige', label: 'Beige' },
  { id: 'wall-yellow', label: 'Yellow' },
  { id: 'wall-brown', label: 'Brown' },
  { id: 'wall-dark-brown', label: 'Dark Brown' },
  { id: 'wall-grey', label: 'Grey' },
  { id: 'wall-dark-grey', label: 'Dark Grey' },
  // Brick
  { id: 'wall-white-brick', label: 'White Brick' },
  { id: 'wall-cream-brick', label: 'Cream Brick' },
  { id: 'wall-beige-brick', label: 'Beige Brick' },
  { id: 'wall-yellow-brick', label: 'Yellow Brick' },
  { id: 'wall-brown-brick', label: 'Brown Brick' },
  { id: 'wall-dark-brown-brick', label: 'Dk Brown Brick' },
  { id: 'wall-grey-brick', label: 'Grey Brick' },
  { id: 'wall-dark-grey-brick', label: 'Dk Grey Brick' },
  // Panel
  { id: 'wall-white-panel', label: 'White Panel' },
  { id: 'wall-cream-panel', label: 'Cream Panel' },
  { id: 'wall-beige-panel', label: 'Beige Panel' },
  { id: 'wall-yellow-panel', label: 'Yellow Panel' },
  { id: 'wall-brown-panel', label: 'Brown Panel' },
  { id: 'wall-dark-brown-panel', label: 'Dk Brown Panel' },
  { id: 'wall-grey-panel', label: 'Grey Panel' },
  { id: 'wall-dark-grey-panel', label: 'Dk Grey Panel' },
  // Alt style
  { id: 'wall-white-alt', label: 'White Alt' },
  { id: 'wall-cream-alt', label: 'Cream Alt' },
  { id: 'wall-beige-alt', label: 'Beige Alt' },
  { id: 'wall-yellow-alt', label: 'Yellow Alt' },
  { id: 'wall-brown-alt', label: 'Brown Alt' },
  { id: 'wall-dark-brown-alt', label: 'Dk Brown Alt' },
  { id: 'wall-grey-alt', label: 'Grey Alt' },
  { id: 'wall-dark-grey-alt', label: 'Dk Grey Alt' },
];

// ── Component ───────────────────────────────────────────────────────────────

export function EditorToolbar() {
  const editorMode = useEditorStore((s) => s.editorMode);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const gridDimensions = useEditorStore((s) => s.gridDimensions);
  const setEditorMode = useEditorStore((s) => s.setEditorMode);
  const furnitureCategory = useEditorStore((s) => s.furnitureCategory);
  const setFurnitureCategory = useEditorStore((s) => s.setFurnitureCategory);
  const selectedFurnitureId = useEditorStore((s) => s.selectedFurnitureId);
  const setSelectedFurniture = useEditorStore((s) => s.setSelectedFurniture);

  const setGridDimensions = useEditorStore((s) => s.setGridDimensions);

  const selectedFloorStyle = useEditorStore((s) => s.selectedFloorStyle);
  const setSelectedFloorStyle = useEditorStore((s) => s.setSelectedFloorStyle);
  const selectedWallStyle = useEditorStore((s) => s.selectedWallStyle);
  const setSelectedWallStyle = useEditorStore((s) => s.setSelectedWallStyle);

  if (!editorMode) return null;

  const showFurnitureDropdown = activeTool === 'furniture';
  const showGridResize = activeTool === 'grid-resize';
  const showFloorPicker = activeTool === 'floor';
  const showWallPicker = activeTool === 'wall';

  const primaryTools = TOOLS.filter((t) => t.group === 'primary');
  const advancedTools = TOOLS.filter((t) => t.group === 'advanced');

  return (
    <div className="flex flex-col shrink-0">
      {/* Main toolbar */}
      <div
        className="flex items-center gap-1.5 px-3"
        style={{
          height: 52,
          background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0f1319 100%)`,
          borderBottom: `2px solid ${COLORS.accent}`,
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        {/* Edit mode badge */}
        <div
          className="px-2.5 py-1 rounded font-bold tracking-wider mr-1.5"
          style={{ background: COLORS.accent, color: '#fff', fontSize: 9 }}
        >
          ✏️ EDIT MODE
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: COLORS.border }} />

        {/* Primary tools */}
        {primaryTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
          />
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: COLORS.border }} />

        {/* Advanced tools */}
        {advancedTools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
          />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Grid size */}
        <span style={{ color: 'rgba(59,130,246,0.5)', fontSize: 9, marginRight: 8 }}>
          {gridDimensions.cols}×{gridDimensions.rows}
        </span>

        {/* Undo/Redo */}
        <div className="flex gap-1 mr-2">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="px-2.5 py-1.5 rounded transition-colors"
            style={{
              background: undoStack.length > 0 ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              color: undoStack.length > 0 ? COLORS.accent : 'rgba(59,130,246,0.3)',
              fontSize: 10,
              cursor: undoStack.length > 0 ? 'pointer' : 'not-allowed',
            }}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="px-2.5 py-1.5 rounded transition-colors"
            style={{
              background: redoStack.length > 0 ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              color: redoStack.length > 0 ? COLORS.accent : 'rgba(59,130,246,0.3)',
              fontSize: 10,
              cursor: redoStack.length > 0 ? 'pointer' : 'not-allowed',
            }}
            title="Redo (Ctrl+Y)"
          >
            ↪ Redo
          </button>
        </div>

        {/* Save / Done */}
        <div className="flex gap-1">
          <button
            onClick={() => void saveLayoutToIDB()}
            className="px-2.5 py-1.5 rounded transition-colors"
            style={{
              background: 'rgba(59,130,246,0.2)',
              color: COLORS.accent,
              fontSize: 10,
            }}
            title="Save layout (Ctrl+S)"
          >
            💾 Save
          </button>
          <button
            onClick={downloadLayoutJSON}
            className="px-2.5 py-1.5 rounded transition-colors"
            style={{
              background: 'rgba(59,130,246,0.2)',
              color: COLORS.accent,
              fontSize: 10,
            }}
            title="Export layout as JSON"
          >
            📥 Export
          </button>
          <button
            onClick={() => {
              void saveLayoutToIDB();
              setEditorMode(false);
            }}
            className="px-2.5 py-1.5 rounded font-bold transition-colors"
            style={{
              background: COLORS.accent,
              color: '#fff',
              fontSize: 10,
            }}
            title="Save and exit editor (Esc)"
          >
            ✓ Done
          </button>
        </div>
      </div>

      {/* Furniture category dropdown */}
      {showFurnitureDropdown && (
        <div
          className="flex flex-col"
          style={{
            background: `${COLORS.bg}ee`,
            borderBottom: `1px solid ${COLORS.border}`,
            fontFamily: 'monospace',
            maxHeight: 220,
          }}
        >
          {/* Category tabs */}
          <div className="flex gap-1 px-3 pt-2 pb-1.5 flex-wrap">
            {Object.keys(FURNITURE_CATEGORIES).map((cat) => (
              <button
                key={cat}
                onClick={() => setFurnitureCategory(furnitureCategory === cat ? null : cat)}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  background: furnitureCategory === cat ? COLORS.accent : 'rgba(59,130,246,0.2)',
                  color: furnitureCategory === cat ? '#fff' : COLORS.accent,
                  fontWeight: furnitureCategory === cat ? 'bold' : 'normal',
                  fontSize: 9,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items grid */}
          {furnitureCategory && FURNITURE_CATEGORIES[furnitureCategory] && (
            <div className="grid gap-1.5 px-3 pb-2 overflow-y-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))' }}>
              {FURNITURE_CATEGORIES[furnitureCategory]!.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedFurniture(item.id);
                  }}
                  className="flex flex-col items-center gap-1 p-1.5 rounded transition-colors"
                  style={{
                    background: selectedFurnitureId === item.id ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.08)',
                    border: selectedFurnitureId === item.id ? `2px solid ${COLORS.accent}` : '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <SpritePreview atlasKey={item.id} size={28} />
                  <span style={{ fontSize: 7, color: selectedFurnitureId === item.id ? '#93c5fd' : '#999', textAlign: 'center', lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floor style picker */}
      {showFloorPicker && (
        <TileStylePicker
          title="FLOOR STYLE"
          items={FLOOR_STYLES}
          selectedId={selectedFloorStyle}
          onSelect={setSelectedFloorStyle}
        />
      )}

      {/* Wall style picker */}
      {showWallPicker && (
        <TileStylePicker
          title="WALL STYLE"
          items={WALL_STYLES}
          selectedId={selectedWallStyle}
          onSelect={setSelectedWallStyle}
        />
      )}

      {/* Grid resize dialog */}
      {showGridResize && (
        <GridResizePanel
          gridDimensions={gridDimensions}
          setGridDimensions={setGridDimensions}
        />
      )}

      {/* Status bar */}
      <EditorStatusBar activeTool={activeTool} undoCount={undoStack.length} redoCount={redoStack.length} />
    </div>
  );
}

// ── Tool Button ─────────────────────────────────────────────────────────────

function ToolButton({
  tool,
  isActive,
  onClick,
}: {
  tool: ToolDef;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-md transition-all"
      style={{
        width: tool.id === 'furniture' ? 44 : 36,
        height: 36,
        background: isActive ? COLORS.accent : COLORS.accentDim,
        border: isActive ? 'none' : `1px solid ${COLORS.border}`,
        boxShadow: isActive ? `0 0 10px rgba(59,130,246,0.27)` : 'none',
        fontSize: 16,
        cursor: 'pointer',
      }}
      title={`${tool.label} (${tool.shortcut})`}
    >
      {tool.icon}
      {tool.id === 'furniture' && (
        <span style={{ fontSize: 8, color: COLORS.accent, marginLeft: 2 }}>▼</span>
      )}
    </button>
  );
}

// ── Sprite Preview ──────────────────────────────────────────────────────────

/** Renders a sprite frame from the atlas onto a small canvas. */
function SpritePreview({ atlasKey, size = 28 }: { atlasKey: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const entry = LIMEZU_ATLAS[atlasKey];
    if (!entry) {
      // Fallback: draw a placeholder
      ctx.fillStyle = 'rgba(59,130,246,0.2)';
      ctx.fillRect(0, 0, size, size);
      return;
    }

    const sheet = getEnvironmentSheetById(entry.sheetId);
    if (!sheet) {
      // Sheet not loaded yet — draw placeholder
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(59,130,246,0.4)';
      ctx.font = `${size * 0.4}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', size / 2, size / 2);
      return;
    }

    // Draw the sprite frame scaled to the preview size
    const { x, y, w, h } = entry.frame;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(sheet, x, y, w, h, 0, 0, size, size);
  }, [atlasKey, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, imageRendering: 'pixelated', borderRadius: 3 }}
    />
  );
}

// ── Tile Style Picker ───────────────────────────────────────────────────────

function TileStylePicker({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: TileStyleItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: `${COLORS.bg}ee`,
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: 'monospace',
        maxHeight: 180,
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <span style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 9, letterSpacing: 1 }}>{title}</span>
        <span style={{ color: '#555', fontSize: 9 }}>({items.length} styles)</span>
      </div>
      <div
        className="grid gap-1 px-3 pb-2 overflow-y-auto"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(65px, 1fr))' }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="flex flex-col items-center gap-0.5 p-1 rounded transition-colors"
            style={{
              background: selectedId === item.id ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.06)',
              border: selectedId === item.id ? `2px solid ${COLORS.accent}` : '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <SpritePreview atlasKey={item.id} size={24} />
            <span style={{ fontSize: 7, color: selectedId === item.id ? '#93c5fd' : '#888', textAlign: 'center', lineHeight: 1.1 }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Grid Resize Panel ───────────────────────────────────────────────────────

function GridResizePanel({
  gridDimensions,
  setGridDimensions,
}: {
  gridDimensions: { cols: number; rows: number };
  setGridDimensions: (cols: number, rows: number) => void;
}) {
  const handleResize = (edge: 'top' | 'bottom' | 'left' | 'right', amount: number) => {
    resizeGridEdge(edge, amount);
    // Recalculate dimensions from actual map
    const newRows = (window as Record<string, unknown>).__tileMapRef
      ? 0 // fallback
      : amount !== 0
        ? edge === 'top' || edge === 'bottom'
          ? gridDimensions.rows + amount
          : gridDimensions.rows
        : gridDimensions.rows;
    const newCols = edge === 'left' || edge === 'right'
      ? gridDimensions.cols + amount
      : gridDimensions.cols;
    setGridDimensions(
      Math.max(1, newCols),
      Math.max(1, newRows),
    );
  };

  const btnStyle = (color: string) => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    width: 28,
    height: 28,
    fontSize: 14,
    cursor: 'pointer' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  const addBtn = btnStyle('rgba(59,130,246,0.4)');
  const removeBtn = btnStyle('rgba(239,68,68,0.4)');

  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{
        background: `${COLORS.bg}ee`,
        borderBottom: `1px solid ${COLORS.border}`,
        fontFamily: 'monospace',
      }}
    >
      <span style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 9, letterSpacing: 1 }}>RESIZE GRID</span>

      {/* Visual directional controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {/* Top row */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => handleResize('top', -1)} style={removeBtn} title="Remove row from top">−</button>
          <button onClick={() => handleResize('top', 1)} style={addBtn} title="Add row to top">+</button>
        </div>
        <span style={{ color: '#555', fontSize: 8 }}>TOP</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Left controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => handleResize('left', -1)} style={removeBtn} title="Remove column from left">−</button>
            <button onClick={() => handleResize('left', 1)} style={addBtn} title="Add column to left">+</button>
          </div>
          <span style={{ color: '#555', fontSize: 8 }}>LEFT</span>
        </div>

        {/* Grid preview */}
        <div
          style={{
            width: 64,
            height: 48,
            background: 'rgba(59,130,246,0.1)',
            border: `2px solid ${COLORS.accent}`,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.accent,
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {gridDimensions.cols}×{gridDimensions.rows}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => handleResize('right', -1)} style={removeBtn} title="Remove column from right">−</button>
            <button onClick={() => handleResize('right', 1)} style={addBtn} title="Add column to right">+</button>
          </div>
          <span style={{ color: '#555', fontSize: 8 }}>RIGHT</span>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ color: '#555', fontSize: 8 }}>BOTTOM</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => handleResize('bottom', -1)} style={removeBtn} title="Remove row from bottom">−</button>
          <button onClick={() => handleResize('bottom', 1)} style={addBtn} title="Add row to bottom">+</button>
        </div>
      </div>

      <span style={{ color: '#555', fontSize: 9, marginLeft: 8 }}>Click +/− to add or remove rows/columns from any edge</span>
    </div>
  );
}

// ── Status Bar ──────────────────────────────────────────────────────────────

function EditorStatusBar({
  activeTool,
  undoCount,
  redoCount,
}: {
  activeTool: EditorTool;
  undoCount: number;
  redoCount: number;
}) {
  const toolLabel = TOOLS.find((t) => t.id === activeTool)?.label ?? activeTool;

  return (
    <div
      className="flex items-center px-3"
      style={{
        height: 22,
        background: COLORS.statusBg,
        borderBottom: `1px solid rgba(59,130,246,0.13)`,
        fontFamily: 'monospace',
        fontSize: 9,
        color: COLORS.statusText,
      }}
    >
      <span>Tool: {toolLabel}</span>
      <span className="mx-2">|</span>
      <span>Undo: {undoCount} | Redo: {redoCount}</span>
      <span className="flex-1" />
      <span>Ctrl+Z: Undo | Ctrl+Y: Redo | Esc: Exit</span>
    </div>
  );
}

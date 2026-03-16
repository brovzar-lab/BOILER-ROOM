/**
 * Layout editor toolbar — horizontal bar overlaid on the canvas in edit mode.
 *
 * Slate + Electric Blue palette, distinct from the main amber/gold theme.
 * Shows tools, undo/redo, grid size, save/done buttons.
 */
import { useEditorStore } from '@/store/editorStore';
import type { EditorTool } from '@/store/editorStore';
import { saveLayoutToIDB, downloadLayoutJSON } from '@/engine/layoutSerializer';

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

  if (!editorMode) return null;

  const showFurnitureDropdown = activeTool === 'furniture';

  const primaryTools = TOOLS.filter((t) => t.group === 'primary');
  const advancedTools = TOOLS.filter((t) => t.group === 'advanced');

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex flex-col" style={{ pointerEvents: 'auto' }}>
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
                  <div
                    className="rounded"
                    style={{
                      width: 28,
                      height: 28,
                      background: 'rgba(59,130,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    🪑
                  </div>
                  <span style={{ fontSize: 7, color: selectedFurnitureId === item.id ? '#93c5fd' : '#999', textAlign: 'center', lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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

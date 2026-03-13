# Phase 6: File Handling - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

User can drag-and-drop PDF and DOCX files onto agent desks (canvas or chat panel), with text extracted and injected into the agent's conversation context. Files appear as pixel document icons on desks and can be clicked to view their contents in a slide-out panel.

**Delivers:** Drag-and-drop file upload (canvas + chat panel drop zones), PDF text extraction via pdfjs-dist Web Worker, DOCX text extraction via mammoth, extracted text storage in IndexedDB `files` store (deal-scoped), Layer 4 context injection in `buildContext()`, canvas file icon rendering with hover tooltips, file viewer slide-out panel with rich preview, file deletion, agent-specific file scoping with share option.

**Does NOT deliver:** Agent memory extraction from file content (Phase 7), polished sprites or sound (Phase 8). File storage infrastructure (IndexedDB `files` store, `dealId`/`agentId` indexes) already exists from Phase 1 scaffolding.

</domain>

<decisions>
## Implementation Decisions

### Drop Zone UX
- **Canvas drop target:** Desk area only highlights (not full room) when dragging files over a valid agent room
- **Invalid drop areas:** War Room, BILLY's office, and hallways show no highlight + a small tooltip: "Drop files on an agent's desk"
- **Upload progress:** Document icon on the desk pulses/animates until extraction completes. No toast notification
- **Dual drop targets:** Files can be dropped on the canvas (agent desk) OR dragged onto the open chat panel. Both routes associate the file with the currently active agent

### File Viewer Interaction
- **Panel type:** Slide-out panel (same position/style as chat panel) with rich preview
- **Content display:** Header with file name, size, upload date, agent name. Below: extracted text rendered with markdown-style formatting (headers, bold, lists detected from source)
- **Actions:** Close button and delete/remove file button only. No copy or re-extract
- **Panel overlap:** File viewer overlays the chat panel (higher z-index). Chat remains open underneath. Closing the viewer reveals the chat

### Canvas File Icons
- **Max visible:** Up to 5 document icons per desk. If more, show the 5 most recent + a small badge (e.g., "+2")
- **Visual distinction:** PDF and DOCX have distinct pixel icons -- PDF with red header bar, DOCX with blue header bar
- **Arrangement:** Icons scattered at slightly random positions on the desk surface (realistic "messy desk" feel)
- **Hover behavior:** Small tooltip above the icon showing the filename when hovering

### Context Injection Limits
- **Large file handling:** Silent truncation with marker appended: "[... truncated, showing first N pages]". No upfront warning to user
- **Context visibility:** Chat panel header shows a small icon + count (e.g., "3 files") next to the agent name. Clicking opens the file list
- **File scope:** Agent-specific by default (file dropped on Diana is only in Diana's context). A "share with all agents" action lets the user broadcast a file to all 5 agents within the same deal
- **Delete behavior:** File is removed from desk/storage but stays in agent context until the conversation is cleared or summarized. Avoids mid-conversation confusion where agent suddenly "forgets" a file

### Claude's Discretion
- Exact token budget per file and total cap (research recommends ~2000/file, ~8000 total)
- File icon pixel art details (size, exact scatter algorithm, folded corner style)
- Tooltip styling and positioning
- Extraction loading animation specifics (pulse speed, opacity range)
- Chat panel drop zone visual feedback design
- "Share with all agents" UI mechanism (button in viewer, context menu, etc.)
- File count badge styling in chat header
- How to handle unsupported file types (silently ignore or show brief error)
- File viewer panel width and scroll behavior

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`fileStore.ts`** (`src/store/fileStore.ts`): Stub exists with empty `FileState`. Ready for full expansion with file list, CRUD actions, loading states
- **IndexedDB `files` store** (`src/services/persistence/indexedDB.ts`): Already created with `agentId` and `dealId` indexes. Zero schema changes needed
- **`buildContext()` Layer 4 placeholder** (`src/services/context/builder.ts`): Comment says "// Layers 4-5: Reserved for future phases (file summaries, memory)". Phase 6 fills Layer 4
- **`screenToTile()` + `getRoomAtTile()`** (`src/engine/input.ts`, `src/engine/officeLayout.ts`): Canvas coordinate-to-room mapping ready for drop event handling
- **`estimateTokens()`** (`src/services/context/tokenCounter.ts`): 4 chars/token estimation for budget enforcement
- **`PersistenceAdapter.query()`** (`src/types/persistence.ts`): Ready to query files by `agentId` and `dealId` indexes
- **`renderer.ts`** (`src/engine/renderer.ts`): Rendering pipeline with layer system. File icons would be a new render layer

### Established Patterns
- Zustand store pattern: flat state + actions, persist to IndexedDB via `getPersistence()`
- Hook encapsulation: `useChat`, `useWarRoom` patterns for component orchestration
- Canvas input handling: `setupInputHandlers()` in `input.ts` attaches event listeners to canvas element
- React overlays on top of canvas: RoomLabel, ZoomControls patterns for DOM elements positioned over canvas

### Integration Points
- `input.ts`: Add `dragover` and `drop` event handlers alongside existing click handlers
- `renderer.ts`: Add file icon rendering as a new layer after furniture/characters
- `builder.ts`: Insert file text as Layer 4 between deal context (Layer 3) and memory (Layer 5)
- `App.tsx` / `ChatPanel.tsx`: Add drop zone to chat panel, file count indicator in header
- `officeStore` or `fileStore`: Track which files belong to which agent/deal for canvas rendering

</code_context>

<specifics>
## Specific Ideas

- Scattered file icons should feel like a real messy producer's desk -- not grid-aligned
- The file viewer overlay-on-chat pattern means the user never loses their place in the conversation
- "Share with all agents" is important for contracts and deal memos that all advisors need to see
- Deleted files staying in context until conversation reset prevents the confusing "agent amnesia" mid-conversation

</specifics>

<deferred>
## Deferred Ideas

- Drag files from one agent's desk to another (reassign) -- future enhancement
- File search/filter within a deal -- future enhancement
- OCR for scanned PDFs (image-based PDFs) -- V2
- Excel/CSV file support -- V2
- File versioning (replace a file, keep history) -- future enhancement

</deferred>

---

*Phase: 06-file-handling*
*Context gathered: 2026-03-13 via discuss-phase*

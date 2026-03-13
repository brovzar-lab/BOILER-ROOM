# Phase 6: File Handling - Research

**Researched:** 2026-03-13
**Domain:** PDF/DOCX text extraction, drag-and-drop file upload, Canvas rendering, context injection
**Confidence:** HIGH

## Summary

Phase 6 adds drag-and-drop PDF and DOCX file handling to agent desks. Users drop files onto the Canvas, text is extracted in a Web Worker (non-blocking), stored in IndexedDB (which already has a `files` store with `agentId` and `dealId` indexes), and injected into the agent's system prompt as a file summary layer. Document icons render on agent desks in the Canvas.

The two extraction libraries are well-established: **pdfjs-dist** for PDF text extraction and **mammoth** for DOCX-to-text conversion. The main technical challenge is configuring pdfjs-dist's Web Worker correctly in Vite 6, which requires explicit `workerSrc` configuration using Vite's `?url` import suffix. Mammoth works out of the box with no worker needed (it is fast enough for typical DOCX files).

**Primary recommendation:** Use `pdfjs-dist` with `?url` worker import for PDFs, `mammoth` with `extractRawText` for DOCX. Store extracted text (not raw file blobs) in IndexedDB. Inject file text as a system prompt layer in `buildContext()` with a per-file token cap of ~2000 tokens (truncate longer documents). Run PDF extraction in a dedicated Web Worker to avoid main thread blocking.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FILE-01 | User can drag-and-drop PDF files onto an agent's room/desk | HTML5 Drag and Drop API on canvas element + room hit-testing via existing `getRoomAtTile()` |
| FILE-02 | User can drag-and-drop DOCX files onto an agent's room/desk | Same drag-and-drop infrastructure as FILE-01, file type detection by extension/MIME |
| FILE-03 | Extracted text from files is injected into the agent's conversation context | `buildContext()` Layer 4 (file summaries) with token-budgeted text insertion |
| FILE-04 | Uploaded files appear as pixel document icons on the agent's desk | Canvas renderer Layer 3 extension, file icons rendered at desk-adjacent tile positions |
| FILE-05 | User can click a file on a desk to view its contents | Canvas click handler extension with file icon hit-testing, React modal/panel for content display |
| FILE-06 | File metadata is stored: name, size, date, associated agent, associated deal | IndexedDB `files` store (already exists with `agentId`/`dealId` indexes), FileRecord type |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfjs-dist | ^4.x | PDF text extraction via `getDocument()` + `getTextContent()` | Mozilla's official PDF.js, 2600+ npm dependents, the only serious browser PDF parser |
| mammoth | ^1.8 | DOCX to plain text via `extractRawText()` | De facto standard for DOCX text extraction in browser, pure JS, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | Drag-and-drop | Use native HTML5 Drag and Drop API -- no library needed |
| (none) | - | Web Worker | Use native `new Worker()` with Vite's built-in worker support |
| idb | ^8 (existing) | IndexedDB wrapper | Already installed, files store already exists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfjs-dist | unpdf | unpdf wraps pdfjs-dist anyway, adds unnecessary layer |
| mammoth | docx-preview | docx-preview is for rendering, not text extraction |
| Native DnD | react-dnd | Overkill -- we only need file drop, not reordering/dragging |

**Installation:**
```bash
npm install pdfjs-dist mammoth
```

Note: `@types/mammoth` is not needed -- mammoth ships its own TypeScript declarations.

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    files/
      extractPdf.ts        # PDF.js wrapper: ArrayBuffer -> extracted text
      extractDocx.ts        # mammoth wrapper: ArrayBuffer -> extracted text
      extractionWorker.ts   # Web Worker entry: dispatches to PDF/DOCX extractor
      fileService.ts        # Orchestrator: accepts File, runs extraction, stores result
  types/
    file.ts                 # FileRecord interface
  store/
    fileStore.ts            # Zustand store (expand existing stub)
  engine/
    input.ts                # Extend: add dragover/drop handlers
    renderer.ts             # Extend: render file icons on desks
  components/
    FileViewer.tsx           # Modal/panel to display extracted file text
```

### Pattern 1: Drag-and-Drop onto Canvas with Room Detection
**What:** The canvas element receives HTML5 drag events. On `drop`, screen coordinates are converted to tile coordinates via the existing `screenToTile()` function, then `getRoomAtTile()` identifies which agent's room was targeted.
**When to use:** Always -- this is the only way to map file drops to specific agents.
**Example:**
```typescript
// Attach to canvas element (in setupInputHandlers or OfficeCanvas component)
function handleDrop(e: DragEvent): void {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;

  const state = useOfficeStore.getState();
  const tile = screenToTile(cssX, cssY, state.camera, rect.width, rect.height);
  if (!tile) return;

  const room = getRoomAtTile(tile.col, tile.row);
  if (!room || room.id === 'war-room' || room.id === 'billy') return;

  // room.id is the agentId -- process each dropped file
  for (const file of Array.from(files)) {
    processFile(file, room.id as AgentId);
  }
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault(); // Required to allow drop
  e.dataTransfer!.dropEffect = 'copy';
}
```

### Pattern 2: PDF Text Extraction with Web Worker
**What:** PDF.js runs in a Web Worker to avoid blocking the main thread. The worker receives an ArrayBuffer, uses `getDocument()` and iterates pages calling `getTextContent()`.
**When to use:** Always for PDFs. PDF parsing can take seconds for large documents.
**Example:**
```typescript
// src/services/files/extractPdf.ts
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is { str: string } => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}
```

### Pattern 3: DOCX Text Extraction (Main Thread OK)
**What:** mammoth.extractRawText is fast enough to run on main thread for typical DOCX files. No worker needed.
**When to use:** All DOCX files. Mammoth processes even large DOCX files in <100ms.
**Example:**
```typescript
// src/services/files/extractDocx.ts
import mammoth from 'mammoth';

export async function extractDocxText(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}
```

### Pattern 4: File Context Injection in System Prompt
**What:** Extracted file text is injected as Layer 4 in `buildContext()`, between persona prompt and memory. Each file's text is truncated to a token budget to avoid blowing context.
**When to use:** Every API call when the agent has associated files.
**Example:**
```typescript
// In buildContext() -- Layer 4: File summaries
const FILE_TOKEN_CAP = 2000; // ~8000 chars per file
const TOTAL_FILE_TOKEN_CAP = 8000; // Max tokens for all files combined

if (fileTexts && fileTexts.length > 0) {
  let fileBlock = '## Uploaded Documents\n\n';
  let usedTokens = 0;

  for (const file of fileTexts) {
    const truncated = file.text.slice(0, FILE_TOKEN_CAP * 4); // rough 4 chars/token
    const tokens = estimateTokens(truncated);
    if (usedTokens + tokens > TOTAL_FILE_TOKEN_CAP) break;
    fileBlock += `### ${file.name}\n${truncated}\n\n`;
    usedTokens += tokens;
  }

  layers.push(fileBlock);
}
```

### Pattern 5: FileRecord Type and IndexedDB Storage
**What:** Store extracted text (not raw binary) plus metadata in IndexedDB `files` store.
**When to use:** Always -- extracted text is what's needed for context injection, and it's much smaller than raw PDF/DOCX binaries.
**Example:**
```typescript
// src/types/file.ts
export interface FileRecord {
  id: string;          // UUID
  name: string;        // Original filename
  size: number;        // Original file size in bytes
  type: 'pdf' | 'docx';
  agentId: string;     // Which agent's desk
  dealId: string;      // Which deal (from dealStore)
  extractedText: string;
  uploadedAt: number;  // Date.now()
}
```

### Anti-Patterns to Avoid
- **Storing raw file blobs in IndexedDB:** Wastes storage, never needed again after extraction. Store only extracted text + metadata.
- **Running PDF.js on main thread without worker:** Will freeze the UI for large PDFs. Always configure workerSrc.
- **Injecting full file text into context without truncation:** A 50-page PDF could be 50K+ tokens. Always cap per-file and total file tokens.
- **Using react-dnd for file drops:** The native Drag and Drop API handles file drops perfectly. react-dnd is for drag-and-drop between DOM elements.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | pdfjs-dist `getDocument()` + `getTextContent()` | PDFs have 15+ text encoding formats, font subsetting, content streams |
| DOCX text extraction | Custom OOXML parser | mammoth `extractRawText()` | DOCX is a zip of XML files with complex relationships |
| Token estimation | tiktoken / cl100k | Existing `estimateTokens()` (4 chars/token) | Already in codebase, good enough for budgeting |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Built into all modern browsers, already used in project |
| File type detection | MIME sniffing | Check file extension (.pdf / .docx) | MIME types from OS can be unreliable; extension check is sufficient for 2 known types |

**Key insight:** The extraction problem is the hard part and it's already solved by pdfjs-dist and mammoth. Everything else (DnD, storage, rendering) uses patterns already established in the codebase.

## Common Pitfalls

### Pitfall 1: PDF.js Worker Not Loading in Vite
**What goes wrong:** `getDocument()` silently falls back to main-thread parsing or throws worker errors.
**Why it happens:** Vite 6 cannot resolve `pdfjs-dist/build/pdf.worker.min.mjs` through normal imports. The module needs special URL handling.
**How to avoid:** Use Vite's `?url` import suffix: `import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` and set `pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker`. This tells Vite to emit the file and return its URL.
**Warning signs:** Console warnings about "Setting up fake worker" or main thread blocking during PDF load.

### Pitfall 2: Drag-and-Drop Requires dragover preventDefault
**What goes wrong:** Drop events never fire on the canvas.
**Why it happens:** The HTML5 DnD spec requires `preventDefault()` on `dragover` to signal the element accepts drops. Without it, the browser treats the element as a non-drop-target.
**How to avoid:** Always attach both `dragover` (with `e.preventDefault()`) and `drop` handlers.
**Warning signs:** The dragover cursor shows "not allowed" icon.

### Pitfall 3: Context Window Overflow from File Content
**What goes wrong:** Agent responses degrade or API returns errors because file content consumes most of the context window.
**Why it happens:** A single PDF can contain 50K+ tokens of text. Multiple files compound.
**How to avoid:** Cap per-file text at ~2000 tokens (~8000 chars). Cap total file block at ~8000 tokens. The existing `estimateTokens()` at 4 chars/token works for budgeting. Consider truncating with a "[... truncated]" marker.
**Warning signs:** Token count shown in UI spikes dramatically after file upload.

### Pitfall 4: pdfjs-dist CMap/Standard Font Warnings
**What goes wrong:** Console fills with warnings about missing CMaps or standard fonts for PDFs with non-Latin text.
**Why it happens:** pdfjs-dist needs character map files for certain font encodings.
**How to avoid:** For text extraction (not rendering), these warnings are non-fatal and can be ignored. The text extraction still works. If they become problematic, configure `cMapUrl` and `standardFontDataUrl` pointing to the pdfjs-dist assets.
**Warning signs:** Console warnings mentioning "cMap" or "standardFont".

### Pitfall 5: DOCX Files with Complex Formatting Produce Poor Text
**What goes wrong:** Tables, embedded images, and complex layouts in DOCX produce garbled text output.
**Why it happens:** `extractRawText()` strips all formatting, so table structure is lost.
**How to avoid:** This is acceptable for the use case (injecting context into AI). The agent can work with imperfect text. If table preservation becomes important, use `mammoth.convertToHtml()` instead and strip HTML tags while preserving table structure.
**Warning signs:** Users report agent responses about tabular data are confused.

## Code Examples

### Complete File Processing Flow
```typescript
// src/services/files/fileService.ts
import { extractPdfText } from './extractPdf';
import { extractDocxText } from './extractDocx';
import { getPersistence } from '@/services/persistence/adapter';
import type { FileRecord } from '@/types/file';
import type { AgentId } from '@/types/agent';

export async function processDroppedFile(
  file: File,
  agentId: AgentId,
  dealId: string,
): Promise<FileRecord> {
  const arrayBuffer = await file.arrayBuffer();

  let extractedText: string;
  let fileType: 'pdf' | 'docx';

  if (file.name.toLowerCase().endsWith('.pdf')) {
    fileType = 'pdf';
    extractedText = await extractPdfText(arrayBuffer);
  } else if (file.name.toLowerCase().endsWith('.docx')) {
    fileType = 'docx';
    extractedText = await extractDocxText(arrayBuffer);
  } else {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  const record: FileRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: fileType,
    agentId,
    dealId,
    extractedText,
    uploadedAt: Date.now(),
  };

  const db = getPersistence();
  await db.set('files', record.id, record);

  return record;
}
```

### Canvas File Icon Rendering
```typescript
// Extension to renderer.ts -- render file icons on agent desks
function renderFileIcons(
  ctx: CanvasRenderingContext2D,
  filesByRoom: Record<string, number>, // roomId -> file count
  tileSize: number,
  offsetX: number,
  offsetY: number,
): void {
  for (const room of ROOMS) {
    const count = filesByRoom[room.id] ?? 0;
    if (count === 0 || room.id === 'war-room' || room.id === 'billy') continue;

    // Place file icons on the desk (desk is at seatTile - 1 row)
    const deskCol = room.seatTile.col;
    const deskRow = room.seatTile.row - 1;

    for (let i = 0; i < Math.min(count, 3); i++) {
      const x = Math.floor((deskCol + i * 0.4) * tileSize + offsetX);
      const y = Math.floor(deskRow * tileSize + offsetY);
      const w = Math.floor(tileSize * 0.35);
      const h = Math.floor(tileSize * 0.45);

      // Paper icon: white rectangle with folded corner
      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(x, y, w, h);

      // Folded corner triangle
      const foldSize = Math.floor(w * 0.3);
      ctx.fillStyle = '#d4d4c8';
      ctx.beginPath();
      ctx.moveTo(x + w - foldSize, y);
      ctx.lineTo(x + w, y + foldSize);
      ctx.lineTo(x + w - foldSize, y + foldSize);
      ctx.closePath();
      ctx.fill();

      // Tiny text lines
      ctx.fillStyle = '#888';
      const lineY = y + Math.floor(h * 0.4);
      ctx.fillRect(x + 1, lineY, w - 3, 1);
      ctx.fillRect(x + 1, lineY + 2, w - 5, 1);
    }
  }
}
```

### Drag Overlay Visual Feedback
```typescript
// Visual indicator when dragging files over the canvas
function renderDropZone(
  ctx: CanvasRenderingContext2D,
  room: Room,
  tileSize: number,
  offsetX: number,
  offsetY: number,
): void {
  const r = room.tileRect;
  const x = Math.floor(r.col * tileSize + offsetX);
  const y = Math.floor(r.row * tileSize + offsetY);
  const w = r.width * tileSize;
  const h = r.height * tileSize;

  ctx.strokeStyle = '#fbbf24'; // Amber highlight
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
  ctx.fillRect(x, y, w, h);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdfjs-dist v3 CommonJS | pdfjs-dist v4+ ESM with `.mjs` entry points | 2024 | Must use `pdf.worker.min.mjs` not `pdf.worker.js` |
| mammoth via CDN/UMD | mammoth via npm ESM import | mammoth 1.6+ | Clean `import mammoth from 'mammoth'` works |
| FileReader API for reading files | `file.arrayBuffer()` promise | Modern browsers | Cleaner async API, no callback mess |
| Storing blobs in IndexedDB | Store extracted text only | Best practice | Saves storage, extracted text is all that is needed |

**Deprecated/outdated:**
- `pdfjs-dist/build/pdf.worker.js` (non-ESM): Use `pdf.worker.min.mjs` instead
- `FileReader.readAsArrayBuffer()`: Use `File.arrayBuffer()` (promise-based, cleaner)
- `mammoth.browser.js` standalone file: Use npm import instead

## Open Questions

1. **Optimal per-file token cap**
   - What we know: Claude 3.5 Sonnet context is 200K tokens. System prompt + persona + history already use a significant chunk.
   - What is unclear: Exact optimal cap depends on typical file sizes users will upload.
   - Recommendation: Start with 2000 tokens/file, 8000 tokens total file budget. These are configurable constants, easy to tune later.

2. **pdfjs-dist v4 vs v5 for Vite 6**
   - What we know: v5.5 is latest. v4.x is widely used and tested with Vite.
   - What is unclear: Whether v5's worker setup has improved Vite compatibility.
   - Recommendation: Use `pdfjs-dist@^4.8` (latest v4.x) for maximum stability. v4 is better documented for Vite integration. Upgrade to v5 later if needed.

3. **File drop on War Room or BILLY's office**
   - What we know: Files are agent-scoped. War Room has no single agent. BILLY's office is the overview.
   - What is unclear: Should drops on non-agent rooms be silently ignored or show a toast?
   - Recommendation: Silently ignore drops on War Room, BILLY's office, and hallways. Only agent rooms (5 agents) accept file drops.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILE-01 | PDF drag-drop triggers extraction and storage | unit | `npx vitest run src/services/files/__tests__/fileService.test.ts -t "pdf" -x` | Wave 0 |
| FILE-02 | DOCX drag-drop triggers extraction and storage | unit | `npx vitest run src/services/files/__tests__/fileService.test.ts -t "docx" -x` | Wave 0 |
| FILE-03 | File text appears in buildContext Layer 4 | unit | `npx vitest run src/services/context/__tests__/builder.test.ts -t "file" -x` | Wave 0 |
| FILE-04 | File icons rendered on canvas desk | unit | `npx vitest run src/engine/__tests__/renderer.test.ts -t "file icon" -x` | Wave 0 |
| FILE-05 | Click on file icon shows content viewer | integration | Manual -- requires canvas click + React modal interaction | N/A |
| FILE-06 | FileRecord stored with correct metadata | unit | `npx vitest run src/store/__tests__/fileStore.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/files/__tests__/fileService.test.ts` -- covers FILE-01, FILE-02
- [ ] `src/services/context/__tests__/builder.test.ts` -- covers FILE-03 (extend existing)
- [ ] `src/store/__tests__/fileStore.test.ts` -- covers FILE-06
- [ ] `src/engine/__tests__/renderer.test.ts` -- extend for FILE-04
- [ ] Mock for `pdfjs-dist` in tests (Worker is not available in jsdom/vitest)
- [ ] Mock for `mammoth` in tests

## Sources

### Primary (HIGH confidence)
- [pdfjs-dist npm page](https://www.npmjs.com/package/pdfjs-dist) - version 5.5.207 latest, v4.x widely stable
- [mammoth GitHub](https://github.com/mwilliamson/mammoth.js/) - extractRawText API, browser ArrayBuffer support
- [mozilla/pdf.js Discussion #19520](https://github.com/mozilla/pdf.js/discussions/19520) - Vite worker configuration
- Existing codebase: `src/services/persistence/indexeddb.ts` (files store already exists), `src/services/context/builder.ts` (Layer 4 reserved), `src/engine/input.ts` (input handler pattern), `src/engine/renderer.ts` (rendering pipeline)

### Secondary (MEDIUM confidence)
- [Vite worker import pattern](https://github.com/vitejs/vite/issues/10837) - `?url` suffix for worker imports
- [PDF.js text extraction guide](https://www.nutrient.io/blog/how-to-extract-text-from-a-pdf-using-javascript/) - getDocument/getTextContent pattern
- [Medium: PDF.js + Vite fix](https://medium.com/@prospercoded/how-i-fixed-the-it-works-on-my-machine-pdf-js-nightmare-in-vite-54adfe92e7f2) - production build considerations

### Tertiary (LOW confidence)
- Token budget recommendations (2000/file, 8000 total) -- educated estimate, needs tuning based on actual usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pdfjs-dist and mammoth are uncontested in their niches, well-documented
- Architecture: HIGH - follows patterns already established in the codebase (input.ts, renderer.ts, builder.ts)
- Pitfalls: HIGH - Vite + PDF.js worker is a well-documented pain point with verified solutions
- Token budgets: MEDIUM - reasonable defaults but may need tuning

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable libraries, unlikely to change)

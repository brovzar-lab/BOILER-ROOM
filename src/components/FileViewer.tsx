import { useFileStore } from '@/store/fileStore';
import { getAgent } from '@/config/agents';
import type { AgentId } from '@/types/agent';

interface FileViewerProps {
  fileId: string | null;
  onClose: () => void;
}

/**
 * Formats bytes to human-readable KB/MB string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Slide-out panel that displays file metadata and extracted text.
 *
 * Overlays the chat panel with higher z-index. Shows file name, size,
 * upload date, agent name, type badge, extracted text body, and
 * close/delete action buttons. Slides in from the right with a 200ms
 * translate-x transition.
 *
 * Per locked user decision: only Close and Delete buttons -- no Share,
 * no Copy, no Re-extract.
 */
export function FileViewer({ fileId, onClose }: FileViewerProps) {
  const file = useFileStore((s) => s.files.find((f) => f.id === fileId) ?? null);

  if (!fileId || !file) return null;

  const agent = getAgent(file.agentId as AgentId);
  const agentName = agent?.name ?? file.agentId;
  const uploadDate = new Date(file.uploadedAt).toLocaleDateString();
  const typeBadgeColor = file.type === 'pdf' ? 'bg-red-600' : 'bg-blue-600';
  const typeBadgeLabel = file.type.toUpperCase();

  function handleDelete(): void {
    useFileStore.getState().removeFile(fileId!);
    onClose();
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100
        animate-[slideInRight_200ms_ease-out]"
      data-testid="file-viewer"
    >
      {/* Header: file metadata */}
      <div className="px-4 py-3 border-b border-neutral-700 space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold truncate flex-1">{file.name}</h2>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${typeBadgeColor} text-white`}>
            {typeBadgeLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span>{formatFileSize(file.size)}</span>
          <span>{uploadDate}</span>
          <span>{agentName}</span>
        </div>
      </div>

      {/* Body: extracted text */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <pre className="whitespace-pre-wrap text-sm text-neutral-200 font-sans leading-relaxed">
          {file.extractedText}
        </pre>
      </div>

      {/* Footer: action buttons */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-neutral-700">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 text-sm font-medium rounded
            bg-neutral-700 hover:bg-neutral-600 text-neutral-100 transition-colors"
        >
          Close
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 text-sm font-medium rounded
            bg-red-700 hover:bg-red-600 text-white transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

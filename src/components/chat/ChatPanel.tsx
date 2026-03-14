import { useEffect, useState, useCallback, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useOfficeStore } from '@/store/officeStore';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';
import { useMemoryStore } from '@/store/memoryStore';
import { getAgent } from '@/config/agents';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TokenCounter } from './TokenCounter';
import { ErrorBanner } from './ErrorBanner';
import { OverviewPanel } from './OverviewPanel';
import { WarRoomPanel } from './WarRoomPanel';
import { MemoryPanel } from '@/components/memory/MemoryPanel';
import type { AgentId } from '@/types/agent';

/** Valid agent room IDs (excludes 'billy' and 'war-room') */
const AGENT_ROOM_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy'];

/** Valid file extensions for chat panel drop zone */
const VALID_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.xls']);

function isAgentRoom(id: string | null): id is AgentId {
  return id !== null && AGENT_ROOM_IDS.includes(id as AgentId);
}

/**
 * Main chat container component.
 *
 * Reads activeRoomId from officeStore to determine which agent to chat with.
 * When BILLY is in an agent's room, renders AgentChatPanel for that agent.
 * When at BILLY's office or war-room, shows a placeholder (Plan 03 adds overview).
 * Agent rooms include a drop zone for PDF/DOCX file uploads.
 */
export function ChatPanel() {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);
  const activeDealId = useDealStore((s) => s.activeDealId);
  const isProcessing = useFileStore((s) => s.isProcessing);
  const factCount = useMemoryStore((s) =>
    isAgentRoom(activeRoomId) && activeDealId
      ? s.getFactsForAgent(activeRoomId, activeDealId).length
      : 0
  );
  const [fadeClass, setFadeClass] = useState('opacity-100 transition-opacity duration-200');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAgentRoom(activeRoomId)) return;
      const files = e.target.files;
      if (!files) return;
      const fileStore = useFileStore.getState();
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (VALID_EXTENSIONS.has(ext)) {
          fileStore.addFile(file, activeRoomId);
        }
      }
      // Reset input so the same file can be re-uploaded if needed
      e.target.value = '';
    },
    [activeRoomId],
  );

  // Reset memory panel when switching rooms or deals
  useEffect(() => {
    setShowMemory(false);
  }, [activeRoomId, activeDealId]);

  // Fade out and back in when the active deal changes
  useEffect(() => {
    setFadeClass('opacity-0 transition-opacity duration-150');
    const timer = setTimeout(() => {
      setFadeClass('opacity-100 transition-opacity duration-200');
    }, 150);
    return () => clearTimeout(timer);
  }, [activeDealId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set false if actually leaving the container (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isAgentRoom(activeRoomId)) return;

    const files = e.dataTransfer?.files;
    if (!files) return;

    const fileStore = useFileStore.getState();
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (VALID_EXTENSIONS.has(ext)) {
        fileStore.addFile(file, activeRoomId);
      }
    }
  }, [activeRoomId]);

  if (activeRoomId === 'war-room') {
    return (
      <div className={`flex flex-col flex-1 min-h-0 bg-[--color-surface-bg] ${fadeClass}`}>
        <WarRoomPanel />
      </div>
    );
  }

  if (isAgentRoom(activeRoomId)) {
    const agent = getAgent(activeRoomId);

    return (
      <div
        className={`flex flex-col flex-1 min-h-0 bg-[--color-surface-bg] relative ${fadeClass}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Agent identity header */}
        {agent && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[--color-border]">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: agent.color }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[--color-text]">
                {agent.name}
              </span>
              <span className="text-xs text-[--color-text-muted]">
                {agent.title}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Processing indicator */}
              {isProcessing && (
                <span className="text-xs text-amber-400 animate-pulse">
                  Processing file...
                </span>
              )}
              {/* Attach file button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach PDF, DOCX or Excel file"
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
                  bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Attach
              </button>
              {/* Memory button */}
              <button
                onClick={() => setShowMemory(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
                  bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-neutral-100 transition-colors"
              >
                Memory
                {factCount > 0 && (
                  <span className="bg-neutral-600 text-neutral-200 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                    {factCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
        <AgentChatPanel key={`${activeRoomId}-${activeDealId}`} agentId={activeRoomId} />

        {/* Memory panel overlay */}
        {showMemory && (
          <MemoryPanel agentId={activeRoomId} onClose={() => setShowMemory(false)} />
        )}

        {/* Hidden file input for attach button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Drop zone overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center
            border-2 border-dashed border-amber-400 bg-amber-400/10 pointer-events-none">
            <span className="text-amber-400 text-sm font-medium">Drop PDF, DOCX or Excel here</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 bg-[--color-surface-bg] ${fadeClass}`}>
      <OverviewPanel />
    </div>
  );
}

/**
 * Inner chat panel that manages a single agent conversation.
 * Uses key prop on mount to ensure clean useChat initialization per agent.
 * Clears 'needs-attention' status when the user enters the room.
 */
function AgentChatPanel({ agentId }: { agentId: AgentId }) {
  const agent = getAgent(agentId);
  const agentName = agent?.name ?? agentId;

  const {
    messages,
    isStreaming,
    error,
    tokenCount,
    streamingContent,
    sendMessage,
    cancelStream,
    retryLastMessage,
    clearError,
  } = useChat(agentId);

  // Clear needs-attention when user enters the room
  useEffect(() => {
    useOfficeStore.getState().setAgentStatus(agentId, 'idle');
  }, [agentId]);

  return (
    <>
      {/* Message list: scrollable flex-1 */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        agentName={agentName}
      />

      {/* Token counter bar */}
      <TokenCounter
        tokenCount={tokenCount}
        isSummarizing={false}
      />

      {/* Error banner (if error) */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={retryLastMessage}
          onDismiss={clearError}
        />
      )}

      {/* Input area */}
      <ChatInput
        onSend={sendMessage}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        placeholder={`Ask ${agentName} something...`}
      />
    </>
  );
}

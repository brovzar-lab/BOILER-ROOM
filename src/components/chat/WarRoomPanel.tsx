import { useEffect, useRef } from 'react';
import type { AgentId } from '@/types/agent';
import { useChatStore } from '@/store/chatStore';
import { useWarRoom } from '@/hooks/useWarRoom';
import { WarRoomMessage } from './WarRoomMessage';
import { ChatInput } from './ChatInput';

/** Agent display order (consistent with codebase conventions) */
const AGENT_ORDER: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

/**
 * War Room chat panel with multi-stream display.
 *
 * Shows 5 stacked agent response sections (WarRoomMessage), a shared
 * ChatInput for broadcasting, and a cancel button when streams are active.
 * Chat input is disabled during agent gathering.
 */
export function WarRoomPanel() {
  const { sendBroadcast, cancelAll, isGathering, warRoomRound } = useWarRoom();
  const warRoomStreaming = useChatStore((s) => s.warRoomStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if any stream is currently active
  const isAnyStreaming = AGENT_ORDER.some(
    (id) => warRoomStreaming[id]?.status === 'streaming' || warRoomStreaming[id]?.status === 'retrying',
  );

  // Check if any agent has content (to show the response area)
  const hasAnyContent = AGENT_ORDER.some(
    (id) => warRoomStreaming[id]?.currentContent || warRoomStreaming[id]?.status !== 'idle',
  );

  // Auto-scroll when content updates
  useEffect(() => {
    if (hasAnyContent) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hasAnyContent, warRoomStreaming]);

  const handleSend = (content: string) => {
    void sendBroadcast(content);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Response area: scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {/* Gathering state */}
          {isGathering && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[--color-text-muted] text-lg animate-pulse">
                Agents are gathering at the table...
              </p>
            </div>
          )}

          {/* War Room intro when no content yet */}
          {!isGathering && !hasAnyContent && warRoomRound === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[--color-text-muted] text-lg">
                Ask the team a question -- all 5 agents will respond simultaneously
              </p>
            </div>
          )}

          {/* Agent response sections */}
          {hasAnyContent && (
            <div className="space-y-1">
              {AGENT_ORDER.map((agentId) => (
                <WarRoomMessage key={agentId} agentId={agentId} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Cancel button when streaming */}
      {isAnyStreaming && (
        <div className="flex justify-center py-2 border-t border-[--color-surface-border] bg-[--color-surface-card]">
          <button
            type="button"
            onClick={cancelAll}
            className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-6 py-2 text-sm font-medium transition-colors"
          >
            Cancel All
          </button>
        </div>
      )}

      {/* Chat input */}
      <ChatInput
        onSend={handleSend}
        onCancel={cancelAll}
        isStreaming={isGathering || isAnyStreaming}
        placeholder={isGathering ? 'Waiting for agents...' : 'Ask the team...'}
      />
    </div>
  );
}

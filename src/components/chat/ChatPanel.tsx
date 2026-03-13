import { useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useOfficeStore } from '@/store/officeStore';
import { getAgent } from '@/config/agents';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TokenCounter } from './TokenCounter';
import { ErrorBanner } from './ErrorBanner';
import type { AgentId } from '@/types/agent';

/** Valid agent room IDs (excludes 'billy' and 'war-room') */
const AGENT_ROOM_IDS: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

function isAgentRoom(id: string | null): id is AgentId {
  return id !== null && AGENT_ROOM_IDS.includes(id as AgentId);
}

/**
 * Main chat container component.
 *
 * Reads activeRoomId from officeStore to determine which agent to chat with.
 * When BILLY is in an agent's room, renders AgentChatPanel for that agent.
 * When at BILLY's office or war-room, shows a placeholder (Plan 03 adds overview).
 */
export function ChatPanel() {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);

  if (isAgentRoom(activeRoomId)) {
    const agent = getAgent(activeRoomId);
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[--color-surface-bg]">
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
          </div>
        )}
        <AgentChatPanel key={activeRoomId} agentId={activeRoomId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[--color-surface-bg]">
      <div className="flex-1 flex items-center justify-center text-[--color-text-muted]">
        Visit an agent's office to start chatting
      </div>
    </div>
  );
}

/**
 * Inner chat panel that manages a single agent conversation.
 * Uses key prop on mount to ensure clean useChat initialization per agent.
 * Clears 'needs-attention' status when the user enters the room.
 */
function AgentChatPanel({ agentId }: { agentId: AgentId }) {
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
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useOfficeStore } from '@/store/officeStore';
import { useDealStore } from '@/store/dealStore';
import { getAgent } from '@/config/agents';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TokenCounter } from './TokenCounter';
import { ErrorBanner } from './ErrorBanner';
import { OverviewPanel } from './OverviewPanel';
import { WarRoomPanel } from './WarRoomPanel';
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
  const activeDealId = useDealStore((s) => s.activeDealId);
  const [fadeClass, setFadeClass] = useState('opacity-100 transition-opacity duration-200');

  // Fade out and back in when the active deal changes
  useEffect(() => {
    setFadeClass('opacity-0 transition-opacity duration-150');
    const timer = setTimeout(() => {
      setFadeClass('opacity-100 transition-opacity duration-200');
    }, 150);
    return () => clearTimeout(timer);
  }, [activeDealId]);

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
      <div className={`flex flex-col flex-1 min-h-0 bg-[--color-surface-bg] ${fadeClass}`}>
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
        <AgentChatPanel key={`${activeRoomId}-${activeDealId}`} agentId={activeRoomId} />
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

import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

/**
 * Scrollable message container. Stub for Task 1 typecheck.
 * Full implementation in Task 2.
 */
export function MessageList({ messages, isStreaming, streamingContent }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full">
          <p className="text-[--color-text-muted]">Start a conversation with Diana</p>
        </div>
      )}
    </div>
  );
}

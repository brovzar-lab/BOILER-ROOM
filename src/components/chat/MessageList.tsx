import { useEffect, useRef } from 'react';
import type { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  agentName?: string;
}

/**
 * Scrollable message container with auto-scroll-to-bottom
 * on new messages and during streaming.
 */
export function MessageList({ messages, isStreaming, streamingContent, agentName = 'your agent' }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <p className="text-[--color-text-muted] text-lg">Start a conversation with {agentName}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} agentName={agentName} />
        ))}

        {isStreaming && <StreamingIndicator content={streamingContent} />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

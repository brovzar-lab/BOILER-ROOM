import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { TokenCounter } from './TokenCounter';
import { ErrorBanner } from './ErrorBanner';

/**
 * Main chat container component.
 *
 * Full-height flex column: Header area (agent name), MessageList (scrollable),
 * TokenCounter, optional ErrorBanner, and ChatInput pinned at the bottom.
 */
export function ChatPanel() {
  const {
    messages,
    isStreaming,
    error,
    tokenCount,
    streamingContent,
    conversation,
    sendMessage,
    cancelStream,
    retryLastMessage,
    clearError,
  } = useChat('diana');

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[--color-surface-bg]">
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
    </div>
  );
}

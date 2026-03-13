import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { AgentId } from '@/types/agent';
import { useChatStore } from '@/store/chatStore';
import { useDealStore } from '@/store/dealStore';
import { useOfficeStore } from '@/store/officeStore';
import { sendStreamingMessage } from '@/services/anthropic/stream';
import { buildContext } from '@/services/context/builder';
import { summarizeConversation } from '@/services/context/summarizer';
import { extractAndStoreMemory } from '@/services/memory/extractMemory';
import { SUMMARIZE_THRESHOLD, TOKEN_LIMITS, DEFAULT_MODEL } from '@/services/context/tokenCounter';

/**
 * Orchestration hook that wires store, API streaming, and context management.
 *
 * Returns everything the ChatPanel needs: messages, streaming state,
 * error state, and action handlers (send, cancel, retry, clearError).
 */
export function useChat(agentId: AgentId = 'diana') {
  const initializedRef = useRef(false);
  const prevKeyRef = useRef<string>('');

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const streaming = useChatStore((s) => s.streaming);
  const storeError = useChatStore((s) => s.error);
  const activeDealId = useDealStore((s) => s.activeDealId);

  // Initialize on mount and re-initialize when agentId or activeDealId changes.
  // loadConversations is already called once in App.tsx on mount.
  useEffect(() => {
    const key = `${agentId}:${activeDealId}`;
    if (prevKeyRef.current !== key) {
      // Reset initialized flag when agent or deal changes
      initializedRef.current = false;
      prevKeyRef.current = key;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    void useChatStore.getState().getOrCreateConversation(agentId);
  }, [agentId, activeDealId]);

  // Derive active conversation
  const conversation = activeConversationId
    ? conversations[activeConversationId] ?? null
    : null;

  const messages = conversation?.messages ?? [];
  const isStreaming = streaming.isStreaming;
  const tokenCount = conversation?.totalTokens ?? 0;
  const error = storeError;

  /**
   * Send a user message and stream Diana's response.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const store = useChatStore.getState();
      const convId = store.activeConversationId;
      if (!convId) return;

      // 1. Clear any existing error
      store.setError(null);

      // 2. Add user message to store
      await store.addMessage(convId, {
        conversationId: convId,
        role: 'user',
        content,
      });

      // 3. Get current conversation from store (with the new user message)
      const currentConversation = useChatStore.getState().conversations[convId];
      if (!currentConversation) return;

      // 4. Create AbortController and start streaming
      const abortController = new AbortController();
      store.startStreaming(abortController);

      // Mark agent as 'thinking' on canvas
      useOfficeStore.getState().setAgentStatus(agentId, 'thinking');

      // 5. Build messages array for the API
      const apiMessages = currentConversation.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Track accumulated content for streaming display
      let accumulated = '';

      await sendStreamingMessage(
        agentId,
        apiMessages,
        {
          onToken: (token: string) => {
            accumulated += token;
            useChatStore.getState().updateStreamingContent(accumulated);
          },
          onComplete: async (fullContent: string, _usage) => {
            const s = useChatStore.getState();
            s.stopStreaming();

            // Update agent status: 'idle' if user is in the room, 'needs-attention' otherwise
            const officeState = useOfficeStore.getState();
            officeState.setAgentStatus(
              agentId,
              officeState.activeRoomId === agentId ? 'idle' : 'needs-attention',
            );

            // Add assistant message
            await s.addMessage(convId, {
              conversationId: convId,
              role: 'assistant',
              content: fullContent,
            });

            // Fire-and-forget memory extraction (non-blocking, non-fatal)
            const currentDealId = useDealStore.getState().activeDealId ?? 'default';
            void extractAndStoreMemory(agentId, content, fullContent, currentDealId);

            // Update token count from context builder
            const updatedConversation = useChatStore.getState().conversations[convId];
            if (updatedConversation) {
              const ctx = buildContext(
                agentId,
                updatedConversation.messages.map((m) => ({ role: m.role, content: m.content })),
                updatedConversation,
              );
              s.updateConversationTokens(convId, ctx.totalTokens);

              // Check if summarization is needed
              const limit = TOKEN_LIMITS[DEFAULT_MODEL];
              const latestConv = useChatStore.getState().conversations[convId];
              if (latestConv && latestConv.totalTokens > SUMMARIZE_THRESHOLD * limit) {
                await summarizeConversation(latestConv, {
                  onComplete: (summary, summaryTokens) => {
                    useChatStore.getState().setConversationSummary(convId, summary, summaryTokens);
                  },
                  onError: (err) => {
                    // Summarization failure is non-fatal; log and continue
                    console.warn('Auto-summarization failed:', err.message);
                  },
                });
              }
            }
          },
          onError: (err: Error) => {
            useChatStore.getState().stopStreaming();
            // Error means no unread content, set back to idle
            useOfficeStore.getState().setAgentStatus(agentId, 'idle');
            useChatStore.getState().setError(
              err.message || 'An unexpected error occurred. Please try again.',
            );
          },
        },
        abortController.signal,
        currentConversation,
      );
    },
    [agentId],
  );

  /**
   * Cancel the currently streaming response. Partial content is preserved.
   */
  const cancelStream = useCallback(() => {
    const store = useChatStore.getState();
    store.streaming.abortController?.abort();
    store.stopStreaming();
  }, []);

  /**
   * Retry the last exchange: remove the failed assistant message (if any)
   * and re-send the most recent user message.
   */
  const retryLastMessage = useCallback(async () => {
    const store = useChatStore.getState();
    const convId = store.activeConversationId;
    if (!convId) return;

    const conv = store.conversations[convId];
    if (!conv || conv.messages.length === 0) return;

    // Find the last user message
    let lastUserContent: string | null = null;
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      const msg = conv.messages[i];
      if (msg && msg.role === 'user') {
        lastUserContent = msg.content;
        break;
      }
    }

    if (!lastUserContent) return;

    // Clear the error
    store.setError(null);

    // Re-send the message
    await sendMessage(lastUserContent);
  }, [sendMessage]);

  /**
   * Clear the current error without retrying.
   */
  const clearError = useCallback(() => {
    useChatStore.getState().setError(null);
  }, []);

  return useMemo(
    () => ({
      messages,
      isStreaming,
      error,
      tokenCount,
      streamingContent: streaming.currentContent,
      conversation,
      sendMessage,
      cancelStream,
      retryLastMessage,
      clearError,
    }),
    [messages, isStreaming, error, tokenCount, streaming.currentContent, conversation, sendMessage, cancelStream, retryLastMessage, clearError],
  );
}

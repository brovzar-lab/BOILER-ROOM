import { create } from 'zustand';
import type { AgentId } from '@/types/agent';
import type { Conversation, Message, StreamingState } from '@/types/chat';
import { getPersistence } from '@/services/persistence/adapter';

interface ChatState {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  streaming: StreamingState;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  getOrCreateConversation: (agentId: AgentId) => Promise<string>;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
  updateStreamingContent: (content: string) => void;
  startStreaming: (abortController: AbortController) => void;
  stopStreaming: () => void;
  setError: (error: string | null) => void;
  updateConversationTokens: (conversationId: string, tokens: number) => void;
  setConversationSummary: (conversationId: string, summary: string, summaryTokens: number) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: {},
  activeConversationId: null,
  streaming: {
    isStreaming: false,
    currentContent: '',
    abortController: null,
  },
  error: null,

  loadConversations: async () => {
    const persistence = getPersistence();
    const conversations = await persistence.getAll<Conversation>('conversations');
    const conversationMap: Record<string, Conversation> = {};

    for (const conv of conversations) {
      // Load messages for each conversation
      const messages = await persistence.query<Message>('messages', 'conversationId', conv.id);
      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      conversationMap[conv.id] = { ...conv, messages };
    }

    set({ conversations: conversationMap });
  },

  getOrCreateConversation: async (agentId: AgentId) => {
    const { conversations } = get();

    // Check if a conversation for this agent already exists
    const existing = Object.values(conversations).find(
      (conv) => conv.agentId === agentId
    );
    if (existing) {
      set({ activeConversationId: existing.id });
      return existing.id;
    }

    // Create a new conversation
    const now = Date.now();
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      agentId,
      messages: [],
      totalTokens: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to IndexedDB
    const persistence = getPersistence();
    await persistence.set('conversations', newConversation.id, newConversation);

    set((state) => ({
      conversations: {
        ...state.conversations,
        [newConversation.id]: newConversation,
      },
      activeConversationId: newConversation.id,
    }));

    return newConversation.id;
  },

  addMessage: async (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const fullMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Persist message to IndexedDB
    const persistence = getPersistence();
    await persistence.set('messages', fullMessage.id, fullMessage);

    // Update conversation in state
    set((state) => {
      const conversation = state.conversations[conversationId];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        messages: [...conversation.messages, fullMessage],
        updatedAt: Date.now(),
      };

      // Persist updated conversation metadata (without messages array to avoid duplication)
      const { messages: _messages, ...convMetadata } = updatedConversation;
      void persistence.set('conversations', conversationId, { ...convMetadata, messages: [] });

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: updatedConversation,
        },
      };
    });
  },

  updateStreamingContent: (content: string) => {
    set((state) => ({
      streaming: { ...state.streaming, currentContent: content },
    }));
  },

  startStreaming: (abortController: AbortController) => {
    set({
      streaming: {
        isStreaming: true,
        currentContent: '',
        abortController,
      },
      error: null,
    });
  },

  stopStreaming: () => {
    set((state) => ({
      streaming: {
        ...state.streaming,
        isStreaming: false,
        currentContent: '',
        abortController: null,
      },
    }));
  },

  setError: (error: string | null) => {
    set({ error });
  },

  updateConversationTokens: (conversationId: string, tokens: number) => {
    set((state) => {
      const conversation = state.conversations[conversationId];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        totalTokens: tokens,
      };

      // Persist token count update
      const persistence = getPersistence();
      const { messages: _messages, ...convMetadata } = updatedConversation;
      void persistence.set('conversations', conversationId, { ...convMetadata, messages: [] });

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: updatedConversation,
        },
      };
    });
  },

  setConversationSummary: (conversationId: string, summary: string, summaryTokens: number) => {
    set((state) => {
      const conversation = state.conversations[conversationId];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        summary,
        summaryTokens,
      };

      // Persist summary update
      const persistence = getPersistence();
      const { messages: _messages, ...convMetadata } = updatedConversation;
      void persistence.set('conversations', conversationId, { ...convMetadata, messages: [] });

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: updatedConversation,
        },
      };
    });
  },
}));

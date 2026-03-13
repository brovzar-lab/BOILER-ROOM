import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Conversation, Message } from '@/types/chat';

// Mock persistence layer
const mockPersistence = {
  getAll: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([]),
  bulkSet: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/services/persistence/adapter', () => ({
  getPersistence: () => mockPersistence,
}));

// Mock dealStore to control activeDealId
let mockActiveDealId: string | null = null;

vi.mock('@/store/dealStore', () => ({
  useDealStore: {
    getState: () => ({
      activeDealId: mockActiveDealId,
      deals: [],
    }),
  },
}));

import { useChatStore } from '../chatStore';

describe('chatStore deal-scoped loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveDealId = null;
    useChatStore.setState({
      conversations: {},
      activeConversationId: null,
    });
  });

  it('loadConversations() with activeDealId="deal-1" -> only loads conversations where dealId="deal-1"', async () => {
    mockActiveDealId = 'deal-1';

    const deal1Convs: Conversation[] = [
      { id: 'conv-1', agentId: 'diana', dealId: 'deal-1', messages: [], totalTokens: 0, createdAt: 1000, updatedAt: 1000 },
      { id: 'conv-2', agentId: 'marcos', dealId: 'deal-1', messages: [], totalTokens: 0, createdAt: 1000, updatedAt: 1000 },
    ];

    // query('conversations', 'dealId', 'deal-1') returns only deal-1 conversations
    mockPersistence.query.mockImplementation(async (store: string, indexName: string, value: string) => {
      if (store === 'conversations' && indexName === 'dealId' && value === 'deal-1') {
        return deal1Convs;
      }
      // messages queries return empty
      return [];
    });

    await useChatStore.getState().loadConversations();

    const state = useChatStore.getState();
    expect(Object.keys(state.conversations)).toHaveLength(2);
    expect(state.conversations['conv-1']).toBeDefined();
    expect(state.conversations['conv-2']).toBeDefined();

    // Should have used query with index, not getAll
    expect(mockPersistence.query).toHaveBeenCalledWith('conversations', 'dealId', 'deal-1');
    expect(mockPersistence.getAll).not.toHaveBeenCalled();
  });

  it('loadConversations() with activeDealId=null -> loads nothing (empty state)', async () => {
    mockActiveDealId = null;

    await useChatStore.getState().loadConversations();

    const state = useChatStore.getState();
    expect(Object.keys(state.conversations)).toHaveLength(0);
    expect(mockPersistence.query).not.toHaveBeenCalled();
    expect(mockPersistence.getAll).not.toHaveBeenCalled();
  });

  it('getOrCreateConversation("diana") with activeDealId="deal-1" -> finds existing conv for diana+deal-1', async () => {
    mockActiveDealId = 'deal-1';

    // Pre-populate the store with an existing conversation for diana in deal-1
    useChatStore.setState({
      conversations: {
        'conv-diana-d1': {
          id: 'conv-diana-d1',
          agentId: 'diana',
          dealId: 'deal-1',
          messages: [],
          totalTokens: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    });

    const convId = await useChatStore.getState().getOrCreateConversation('diana');

    expect(convId).toBe('conv-diana-d1');
    // Should NOT have created a new conversation
    expect(mockPersistence.set).not.toHaveBeenCalledWith('conversations', expect.any(String), expect.anything());
  });

  it('getOrCreateConversation("diana") with activeDealId="deal-1" -> creates new conv with dealId="deal-1" if none exists', async () => {
    mockActiveDealId = 'deal-1';

    const convId = await useChatStore.getState().getOrCreateConversation('diana');

    expect(convId).toBeTruthy();

    const state = useChatStore.getState();
    const conv = state.conversations[convId];
    expect(conv).toBeDefined();
    expect(conv.agentId).toBe('diana');
    expect(conv.dealId).toBe('deal-1');
    expect(mockPersistence.set).toHaveBeenCalledWith('conversations', convId, expect.objectContaining({ dealId: 'deal-1', agentId: 'diana' }));
  });

  it('getOrCreateConversation("diana") with deal-2 active -> does NOT find diana conv from deal-1', async () => {
    mockActiveDealId = 'deal-2';

    // Pre-populate with diana conv in deal-1
    useChatStore.setState({
      conversations: {
        'conv-diana-d1': {
          id: 'conv-diana-d1',
          agentId: 'diana',
          dealId: 'deal-1',
          messages: [],
          totalTokens: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    });

    const convId = await useChatStore.getState().getOrCreateConversation('diana');

    // Should NOT return the deal-1 conversation
    expect(convId).not.toBe('conv-diana-d1');
    // Should have created a new conversation with deal-2
    const state = useChatStore.getState();
    const conv = state.conversations[convId];
    expect(conv.dealId).toBe('deal-2');
  });

  it('New conversations created via getOrCreateConversation always have dealId set', async () => {
    mockActiveDealId = 'deal-99';

    const convId = await useChatStore.getState().getOrCreateConversation('sasha');

    const state = useChatStore.getState();
    const conv = state.conversations[convId];
    expect(conv.dealId).toBe('deal-99');
  });
});

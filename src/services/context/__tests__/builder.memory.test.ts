import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Deal } from '@/types/deal';
import type { FileRecord } from '@/types/file';
import type { MemoryFact } from '@/types/memory';
import type { MessageRole } from '@/types/chat';

// Mock state
let mockActiveDealId: string | null = 'deal-1';
let mockDeals: Deal[] = [
  { id: 'deal-1', name: 'Test Deal', status: 'active', createdAt: 1000, updatedAt: 1000 },
];
let mockFiles: FileRecord[] = [];
let mockFacts: MemoryFact[] = [];

vi.mock('@/store/dealStore', () => ({
  useDealStore: {
    getState: () => ({
      activeDealId: mockActiveDealId,
      deals: mockDeals,
    }),
  },
}));

vi.mock('@/store/fileStore', () => ({
  useFileStore: {
    getState: () => ({
      files: mockFiles,
    }),
  },
}));

vi.mock('@/store/memoryStore', () => ({
  useMemoryStore: {
    getState: () => ({
      facts: mockFacts,
    }),
  },
}));

vi.mock('@/config/agents', () => ({
  getAgent: (id: string) => ({
    name: id.charAt(0).toUpperCase() + id.slice(1),
    personaPrompt: `You are ${id}, a trusted advisor.`,
  }),
}));

import { buildContext } from '../builder';

describe('buildContext Layer 5 memory injection', () => {
  const messages: Array<{ role: MessageRole; content: string }> = [
    { role: 'user', content: 'What do you recall?' },
  ];

  beforeEach(() => {
    mockActiveDealId = 'deal-1';
    mockDeals = [
      { id: 'deal-1', name: 'Test Deal', status: 'active', createdAt: 1000, updatedAt: 1000 },
    ];
    mockFiles = [];
    mockFacts = [];
  });

  it('includes "## Your Memory" block when agent has facts for current deal', () => {
    mockFacts = [
      {
        id: 'f1',
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'financial',
        content: 'Budget is $2.4M USD',
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];

    const result = buildContext('diana', messages);
    expect(result.systemPrompt).toContain('## Your Memory');
  });

  it('renders each fact as "- [category] content" line', () => {
    mockFacts = [
      {
        id: 'f1',
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'financial',
        content: 'Budget is $2.4M USD',
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'f2',
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'decision',
        content: 'Agreed on 3-tranche waterfall',
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 1500,
      },
    ];

    const result = buildContext('diana', messages);
    expect(result.systemPrompt).toContain('- [financial] Budget is $2.4M USD');
    expect(result.systemPrompt).toContain('- [decision] Agreed on 3-tranche waterfall');
  });

  it('sorts facts by updatedAt descending (most recent first)', () => {
    mockFacts = [
      {
        id: 'f1',
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'financial',
        content: 'Old fact',
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'f2',
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'decision',
        content: 'Recent fact',
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 3000,
      },
    ];

    const result = buildContext('diana', messages);
    const recentIdx = result.systemPrompt.indexOf('Recent fact');
    const oldIdx = result.systemPrompt.indexOf('Old fact');
    expect(recentIdx).toBeGreaterThan(-1);
    expect(oldIdx).toBeGreaterThan(-1);
    expect(recentIdx).toBeLessThan(oldIdx);
  });

  it('caps own-agent memory at ~2000 tokens (excess facts omitted)', () => {
    // Each fact ~200 chars = ~50 tokens. 50 facts = ~2500 tokens, should cap at ~40 facts
    mockFacts = [];
    for (let i = 0; i < 50; i++) {
      mockFacts.push({
        id: `f${i}`,
        agentId: 'diana',
        dealId: 'deal-1',
        category: 'financial',
        content: `Fact number ${i} with some padding text to make it longer for token counting purposes here`,
        confidence: 'high',
        sourceAgentId: 'diana',
        createdAt: 1000,
        updatedAt: 5000 - i, // descending order
      });
    }

    const result = buildContext('diana', messages);
    // Should not contain ALL 50 facts
    const factCount = (result.systemPrompt.match(/- \[financial\]/g) || []).length;
    expect(factCount).toBeLessThan(50);
    expect(factCount).toBeGreaterThan(0);
    // Fact 49 (lowest updatedAt) should be omitted
    expect(result.systemPrompt).not.toContain('Fact number 49');
  });

  it('includes cross-agent facts as "## Other Advisors\' Notes" grouped by agent name', () => {
    mockFacts = [
      {
        id: 'f1',
        agentId: 'marcos',
        dealId: 'deal-1',
        category: 'risk',
        content: 'Currency risk on MXN/USD',
        confidence: 'high',
        sourceAgentId: 'marcos',
        createdAt: 1000,
        updatedAt: 2000,
      },
      {
        id: 'f2',
        agentId: 'sasha',
        dealId: 'deal-1',
        category: 'entity',
        content: 'Co-producer is Videocine',
        confidence: 'high',
        sourceAgentId: 'sasha',
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];

    const result = buildContext('diana', messages);
    expect(result.systemPrompt).toContain("## Other Advisors' Notes");
    expect(result.systemPrompt).toContain('### Marcos');
    expect(result.systemPrompt).toContain('- [risk] Currency risk on MXN/USD');
    expect(result.systemPrompt).toContain('### Sasha');
    expect(result.systemPrompt).toContain('- [entity] Co-producer is Videocine');
  });

  it('caps cross-agent memory at ~2000 tokens independently', () => {
    mockFacts = [];
    // Add many cross-agent facts that exceed 2000 tokens
    for (let i = 0; i < 50; i++) {
      mockFacts.push({
        id: `cf${i}`,
        agentId: 'marcos',
        dealId: 'deal-1',
        category: 'financial',
        content: `Cross fact ${i} with padding text to increase token count for budget testing purposes`,
        confidence: 'high',
        sourceAgentId: 'marcos',
        createdAt: 1000,
        updatedAt: 5000 - i,
      });
    }

    const result = buildContext('diana', messages);
    const crossFactCount = (result.systemPrompt.match(/- \[financial\] Cross fact/g) || []).length;
    expect(crossFactCount).toBeLessThan(50);
    expect(crossFactCount).toBeGreaterThan(0);
  });

  it('includes no memory block when agent has zero facts', () => {
    mockFacts = [];

    const result = buildContext('diana', messages);
    expect(result.systemPrompt).not.toContain('## Your Memory');
    expect(result.systemPrompt).not.toContain("## Other Advisors' Notes");
  });
});

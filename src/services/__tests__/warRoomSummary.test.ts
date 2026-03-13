import { describe, it, expect, vi } from 'vitest';
import { buildCrossVisibilityBlock } from '../context/warRoomSummary';

// Mock the agents config
vi.mock('@/config/agents', () => ({
  getAgent: (id: string) => {
    const agents: Record<string, { name: string; title: string }> = {
      diana: { name: 'Diana', title: 'CFO' },
      marcos: { name: 'Marcos', title: 'Legal Counsel' },
      sasha: { name: 'Sasha', title: 'Head of Deals' },
      roberto: { name: 'Roberto', title: 'Head of Accounting' },
      valentina: { name: 'Valentina', title: 'Head of Development' },
    };
    return agents[id] ?? undefined;
  },
}));

describe('buildCrossVisibilityBlock', () => {
  it('returns summary string excluding the current agent own response', () => {
    const responses: Record<string, string> = {
      diana: 'Diana says something about cash flow projections.',
      marcos: 'Marcos has legal opinions about the contract terms.',
      sasha: 'Sasha discusses deal structure and valuation.',
    };

    const result = buildCrossVisibilityBlock('diana', responses);

    // Should NOT contain Diana's response
    expect(result).not.toContain('Diana says something');
    // Should contain Marcos and Sasha
    expect(result).toContain('Marcos');
    expect(result).toContain('Sasha');
    expect(result).toContain('[War Room Context');
  });

  it('includes other agents truncated responses (max ~160 chars each)', () => {
    const longResponse = 'A'.repeat(250); // 250 chars, should be truncated
    const responses: Record<string, string> = {
      diana: 'Short response.',
      marcos: longResponse,
    };

    const result = buildCrossVisibilityBlock('diana', responses);

    // Marcos's response should be truncated to ~160 chars + ellipsis
    expect(result).toContain('A'.repeat(160));
    expect(result).toContain('...');
    // Should NOT contain the full 250 chars
    expect(result).not.toContain('A'.repeat(200));
  });

  it('returns empty string when no responses exist', () => {
    const result = buildCrossVisibilityBlock('diana', {});

    expect(result).toBe('');
  });

  it('returns empty string when only the current agent has a response', () => {
    const responses: Record<string, string> = {
      diana: 'Only Diana responded.',
    };

    const result = buildCrossVisibilityBlock('diana', responses);

    expect(result).toBe('');
  });

  it('does not add ellipsis for short responses', () => {
    const responses: Record<string, string> = {
      diana: 'Short.',
      marcos: 'Also short.',
    };

    const result = buildCrossVisibilityBlock('diana', responses);

    expect(result).toContain('Also short.');
    // Should NOT have trailing ellipsis for short text
    expect(result).not.toContain('Also short....');
  });
});

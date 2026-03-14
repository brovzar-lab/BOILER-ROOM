import { useState } from 'react';
import { useDealStore } from '@/store/dealStore';
import { useChatStore } from '@/store/chatStore';
import type { AgentId } from '@/types/agent';
import { DealCard } from './DealCard';
import { CreateDealForm } from './CreateDealForm';

const AGENT_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy'];

interface DealSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Collapsible sidebar panel listing all deals.
 *
 * Shows active deals sorted by updatedAt desc, with optional "Show archived"
 * toggle at the bottom. Includes a '+' button to create new deals inline.
 * Width: 240px. Dark background matching app theme with border-right separator.
 */
export function DealSidebar({ isOpen, onClose }: DealSidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const deals = useDealStore((s) => s.deals);
  const activeDealId = useDealStore((s) => s.activeDealId);
  const conversations = useChatStore((s) => s.conversations);

  // Compute agent activity per deal by counting conversations
  function getAgentActivity(dealId: string): Record<string, number> {
    const activity: Record<string, number> = {};
    for (const agentId of AGENT_IDS) {
      const count = Object.values(conversations).filter(
        (conv) => conv.dealId === dealId && conv.agentId === agentId && conv.messages.length > 0,
      ).length;
      activity[agentId] = count;
    }
    return activity;
  }

  // Filter and sort deals
  const activeDeals = deals
    .filter((d) => d.status === 'active')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const archivedDeals = deals
    .filter((d) => d.status === 'archived')
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSwitchDeal = async (dealId: string) => {
    await useDealStore.getState().switchDeal(dealId);
  };

  const handleDealCreated = async (dealId: string) => {
    setShowCreateForm(false);
    await useDealStore.getState().switchDeal(dealId);
  };

  return (
    <div
      className={`
        h-full bg-[--color-surface-bg] border-r border-[--color-border]
        flex flex-col overflow-hidden
        transition-all duration-200
        ${isOpen ? 'w-60 opacity-100' : 'w-0 opacity-0'}
      `}
    >
      {/* Header: "Deals" + add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--color-border] shrink-0">
        <span className="text-xs font-semibold text-[--color-text-muted] uppercase tracking-wider">
          Deals
        </span>
        <button
          className="w-5 h-5 flex items-center justify-center text-[--color-text-muted] hover:text-[--color-lemon-400] transition-colors rounded"
          onClick={() => setShowCreateForm((v) => !v)}
          aria-label="Create deal"
          title="New deal"
        >
          <span className="text-sm leading-none font-bold">+</span>
        </button>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <CreateDealForm
          onCreated={(dealId) => void handleDealCreated(dealId)}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Deal list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeDeals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isActive={deal.id === activeDealId}
            agentActivity={getAgentActivity(deal.id)}
            onSelect={() => void handleSwitchDeal(deal.id)}
          />
        ))}

        {/* Archived deals section */}
        {showArchived &&
          archivedDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isActive={deal.id === activeDealId}
              agentActivity={getAgentActivity(deal.id)}
              onSelect={() => void handleSwitchDeal(deal.id)}
            />
          ))}
      </div>

      {/* Show archived toggle */}
      {archivedDeals.length > 0 && (
        <div className="px-3 py-2 border-t border-[--color-border] shrink-0">
          <button
            className="text-[10px] text-[--color-text-muted] hover:text-[--color-text] transition-colors"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'Hide archived' : `Show archived (${archivedDeals.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

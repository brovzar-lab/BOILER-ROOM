import { useState } from 'react';
import { useDealStore } from '@/store/dealStore';
import { useChatStore } from '@/store/chatStore';
import type { AgentId } from '@/types/agent';
import { DealCard } from './DealCard';
import { CreateDealForm } from './CreateDealForm';

const AGENT_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy'];

/**
 * Always-visible sidebar panel listing all deals.
 *
 * Manages its own collapsed/expanded state internally.
 * Collapsed: 40px thin strip showing active deal name + expand chevron.
 * Expanded: 240px full sidebar with active deal header, deal list, create form.
 */
export function DealSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const deals = useDealStore((s) => s.deals);
  const activeDealId = useDealStore((s) => s.activeDealId);
  const conversations = useChatStore((s) => s.conversations);

  const activeDeal = deals.find((d) => d.id === activeDealId);

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

  // Collapsed strip: 40px wide, full height
  if (collapsed) {
    return (
      <div
        className="h-full w-10 shrink-0 bg-[--color-surface-bg] border-r border-[--color-border]
          flex flex-col items-center cursor-pointer transition-all duration-200"
        onClick={() => setCollapsed(false)}
        title="Expand deals sidebar"
      >
        {/* Expand chevron */}
        <div className="pt-3 pb-2 text-[--color-text-muted] hover:text-[--color-text] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Active deal name, vertical text */}
        {activeDeal && (
          <div
            className="flex-1 flex items-center justify-center overflow-hidden"
          >
            <span
              className="text-[10px] font-semibold text-[--color-lemon-400] whitespace-nowrap"
              style={{ writingMode: 'vertical-rl' }}
            >
              {activeDeal.name}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Expanded sidebar: 240px wide
  return (
    <div
      className="h-full w-60 shrink-0 bg-[--color-surface-bg] border-r border-[--color-border]
        flex flex-col overflow-hidden transition-all duration-200"
    >
      {/* Active deal header */}
      {activeDeal && (
        <div className="px-3 pt-3 pb-2 border-b border-[--color-border] shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wider mb-1">
                Active Deal
              </div>
              <div className="text-lg font-bold text-[--color-text] truncate border-l-2 border-[--color-lemon-400] pl-2">
                {activeDeal.name}
              </div>
            </div>
            {/* Collapse chevron */}
            <button
              className="p-1 text-[--color-text-muted] hover:text-[--color-text] transition-colors mt-0.5"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header: "Deals" + add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--color-border] shrink-0">
        <span className="text-xs font-semibold text-[--color-text-muted] uppercase tracking-wider">
          Deals
        </span>
        <div className="flex items-center gap-1">
          <button
            className="w-5 h-5 flex items-center justify-center text-[--color-text-muted] hover:text-[--color-lemon-400] transition-colors rounded"
            onClick={() => setShowCreateForm((v) => !v)}
            aria-label="Create deal"
            title="New deal"
          >
            <span className="text-sm leading-none font-bold">+</span>
          </button>
          {/* Collapse button (alternate location if no active deal) */}
          {!activeDeal && (
            <button
              className="w-5 h-5 flex items-center justify-center text-[--color-text-muted] hover:text-[--color-text] transition-colors"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
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

import { useState } from 'react';
import type { Deal, DealStatus } from '@/types/deal';
import { agents } from '@/config/agents';
import type { AgentId } from '@/types/agent';
import { DealActions } from './DealActions';

const AGENT_IDS: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

/**
 * Formats a timestamp into a relative time string (e.g., "2m ago", "1h ago").
 * Same inline helper pattern used in OverviewPanel.
 */
function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface DealCardProps {
  deal: Deal;
  isActive: boolean;
  agentActivity: Record<string, number>;
  onSelect: () => void;
}

/**
 * Individual deal card in the sidebar list.
 *
 * Shows deal name, description, 5 agent activity dots, relative timestamp,
 * and a three-dot menu for actions. Active deal gets amber left border accent.
 */
export function DealCard({ deal, isActive, agentActivity, onSelect }: DealCardProps) {
  const [showActions, setShowActions] = useState(false);

  const isArchived = deal.status === 'archived';
  const isDeleted = deal.status === 'deleted';
  const isMuted = isArchived || isDeleted;

  return (
    <div
      className={`
        relative group px-3 py-2 cursor-pointer transition-colors duration-100
        ${isActive
          ? 'border-l-2 border-[--color-lemon-400] bg-[--color-lemon-400]/5'
          : 'border-l-2 border-transparent hover:bg-[--color-text]/5'
        }
        ${isMuted ? 'opacity-50' : ''}
      `}
      onClick={onSelect}
    >
      {/* Three-dot menu button */}
      <button
        className="absolute top-2 right-2 p-1 text-[--color-text-muted] hover:text-[--color-text] opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.stopPropagation();
          setShowActions((v) => !v);
        }}
        aria-label="Deal actions"
      >
        <span className="text-xs leading-none tracking-widest">...</span>
      </button>

      {/* Deal name */}
      <div className={`text-sm font-semibold text-[--color-text] truncate pr-6 ${isMuted ? 'italic' : ''}`}>
        {deal.name}
      </div>

      {/* Description */}
      {deal.description && (
        <div className="text-xs text-[--color-text-muted] truncate mt-0.5">
          {deal.description}
        </div>
      )}

      {/* Agent activity dots + relative time */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1">
          {AGENT_IDS.map((agentId) => {
            const agent = agents[agentId];
            const hasActivity = (agentActivity[agentId] ?? 0) > 0;
            return (
              <span
                key={agentId}
                className={`w-2 h-2 rounded-full ${hasActivity ? 'opacity-100' : 'opacity-30'}`}
                style={{ backgroundColor: agent?.color ?? '#888' }}
                title={agent?.name ?? agentId}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-[--color-text-muted]">
          {relativeTime(deal.updatedAt)}
        </span>
      </div>

      {/* Actions dropdown */}
      {showActions && (
        <DealActions
          dealId={deal.id}
          dealName={deal.name}
          dealStatus={deal.status}
          onClose={() => setShowActions(false)}
        />
      )}
    </div>
  );
}

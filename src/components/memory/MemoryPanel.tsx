import { useMemoryStore } from '@/store/memoryStore';
import { useDealStore } from '@/store/dealStore';
import { getAgent } from '@/config/agents';
import type { AgentId } from '@/types/agent';
import type { MemoryFact, MemoryCategory } from '@/types/memory';

interface MemoryPanelProps {
  agentId: AgentId;
  onClose: () => void;
}

/** Category display config: emoji prefix + label */
const CATEGORY_CONFIG: Record<MemoryCategory, { emoji: string; label: string }> = {
  decision: { emoji: '\u2705', label: 'Decision' },
  financial: { emoji: '\uD83D\uDCB2', label: 'Financial' },
  date: { emoji: '\uD83D\uDCC5', label: 'Date' },
  'action-item': { emoji: '\u27A1\uFE0F', label: 'Action Item' },
  entity: { emoji: '\uD83C\uDFE2', label: 'Entity' },
  assumption: { emoji: '\u2753', label: 'Assumption' },
  risk: { emoji: '\u26A0\uFE0F', label: 'Risk' },
  term: { emoji: '\uD83D\uDCC4', label: 'Term' },
};

/** Confidence badge color classes */
const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-600',
  medium: 'bg-amber-600',
  low: 'bg-red-600',
};

/**
 * Formats a timestamp into a relative time string.
 * Same inline helper pattern as OverviewPanel.
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

/**
 * Groups facts by category into a Map preserving insertion order.
 */
function groupByCategory(facts: MemoryFact[]): Map<MemoryCategory, MemoryFact[]> {
  const groups = new Map<MemoryCategory, MemoryFact[]>();
  for (const fact of facts) {
    const existing = groups.get(fact.category);
    if (existing) {
      existing.push(fact);
    } else {
      groups.set(fact.category, [fact]);
    }
  }
  return groups;
}

/**
 * Slide-over panel displaying agent memory facts.
 *
 * Overlays the chat panel using absolute inset-0 z-50, matching the
 * FileViewer pattern. Shows facts grouped by category with confidence
 * badges, relative timestamps, and delete capability.
 */
export function MemoryPanel({ agentId, onClose }: MemoryPanelProps) {
  const activeDealId = useDealStore((s) => s.activeDealId);
  const facts = useMemoryStore((s) =>
    s.facts.filter((f) => f.agentId === agentId && f.dealId === activeDealId)
  );
  const isExtracting = useMemoryStore((s) => s.isExtracting);

  const agent = getAgent(agentId);
  const agentName = agent?.name ?? agentId;
  const grouped = groupByCategory(facts);

  function handleDelete(factId: string): void {
    useMemoryStore.getState().removeFact(factId);
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-neutral-900 text-neutral-100
        animate-[slideInRight_200ms_ease-out]"
      data-testid="memory-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-700 flex items-center gap-2">
        <h2 className="text-base font-bold flex-1">
          Memory - {agentName}
        </h2>
        {isExtracting && (
          <span className="text-xs text-amber-400 animate-pulse">
            Extracting...
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {facts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm text-center">
            No memories yet. Chat with {agentName} to build knowledge.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([category, categoryFacts]) => {
              const config = CATEGORY_CONFIG[category];
              return (
                <section key={category}>
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    {config.emoji} {config.label}
                  </h3>
                  <div className="space-y-2">
                    {categoryFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="flex items-start gap-2 bg-neutral-800 rounded px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-200">{fact.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white ${CONFIDENCE_COLORS[fact.confidence]}`}
                            >
                              {fact.confidence}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {relativeTime(fact.createdAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(fact.id)}
                          className="text-neutral-500 hover:text-red-400 transition-colors p-1 shrink-0"
                          aria-label="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center px-4 py-3 border-t border-neutral-700">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 text-sm font-medium rounded
            bg-neutral-700 hover:bg-neutral-600 text-neutral-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

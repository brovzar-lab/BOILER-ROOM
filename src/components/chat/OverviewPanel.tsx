import { useOfficeStore } from '@/store/officeStore';
import { useChatStore } from '@/store/chatStore';
import { agents } from '@/config/agents';
import { startWalk } from '@/engine/characters';
import { OFFICE_TILE_MAP, ROOMS } from '@/engine/officeLayout';
import type { AgentStatus } from '@/types/agent';
import type { PersonaConfig } from '@/config/agents';

/**
 * Formats a timestamp into a relative time string (e.g., "2m ago", "1h ago").
 * Simple inline helper -- no library dependency.
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
 * Truncates a string to the given max length, appending ellipsis if needed.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

/**
 * Navigates BILLY to the specified agent's room by triggering
 * setTargetRoom and startWalk via the office store.
 */
function navigateToAgent(agentId: string): void {
  const room = ROOMS.find((r) => r.id === agentId);
  if (!room) return;
  const state = useOfficeStore.getState();
  state.setTargetRoom(room.id);
  startWalk('billy', room.billyStandTile.col, room.billyStandTile.row, OFFICE_TILE_MAP);
}

/**
 * Returns the appropriate CSS classes for a status indicator dot.
 */
function statusDotClasses(status: AgentStatus, agentColor: string): { className: string; style?: React.CSSProperties } {
  switch (status) {
    case 'thinking':
      return {
        className: 'inline-block w-2 h-2 rounded-full animate-pulse',
        style: { backgroundColor: agentColor },
      };
    case 'needs-attention':
      return { className: 'inline-block w-2 h-2 rounded-full bg-red-400' };
    case 'idle':
    default:
      return { className: 'inline-block w-2 h-2 rounded-full bg-green-500' };
  }
}

/**
 * Agent overview panel shown when BILLY is at his own office.
 * Displays a grid of 5 agent cards with status, last message preview,
 * and click-to-navigate functionality.
 */
export function OverviewPanel() {
  const agentStatuses = useOfficeStore((s) => s.agentStatuses);
  const conversations = useChatStore((s) => s.conversations);

  const agentList = Object.values(agents) as PersonaConfig[];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 py-4 gap-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-amber-400 tracking-tight">
          Command Center
        </h2>
        <p className="text-xs text-[--color-text-muted]">
          Your agents are standing by
        </p>
      </div>

      {/* Agent Cards */}
      <div className="flex flex-col gap-2">
        {agentList.map((agent) => {
          const status: AgentStatus = agentStatuses[agent.id] ?? 'idle';
          const dot = statusDotClasses(status, agent.color);

          // Find conversation for this agent
          const conv = Object.values(conversations).find(
            (c) => c.agentId === agent.id,
          );

          // Get last assistant message preview
          let lastPreview = 'No conversation yet';
          let lastPreviewMuted = true;
          let lastTimestamp: number | null = null;

          if (conv && conv.messages.length > 0) {
            // Find the most recent assistant message
            for (let i = conv.messages.length - 1; i >= 0; i--) {
              const msg = conv.messages[i]!;
              if (msg.role === 'assistant') {
                lastPreview = truncate(msg.content, 60);
                lastPreviewMuted = false;
                break;
              }
            }
            lastTimestamp = conv.updatedAt;
          }

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => navigateToAgent(agent.id)}
              className="flex items-stretch gap-3 rounded-lg bg-[--color-surface-bg] border border-[--color-border] hover:border-opacity-60 transition-colors text-left cursor-pointer group"
              style={{
                // Hover border color via CSS custom property
                borderColor: undefined,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = agent.color + '60';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '';
              }}
            >
              {/* Left color accent bar */}
              <div
                className="w-1 rounded-l-lg flex-shrink-0"
                style={{ backgroundColor: agent.color }}
              />

              {/* Card content */}
              <div className="flex-1 flex flex-col gap-0.5 py-2 pr-3 min-w-0">
                {/* Top row: name + status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-[--color-text] truncate">
                      {agent.name}
                    </span>
                    <span className="text-xs text-[--color-text-muted] truncate">
                      {agent.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lastTimestamp && (
                      <span className="text-[10px] text-[--color-text-muted]">
                        {relativeTime(lastTimestamp)}
                      </span>
                    )}
                    <span className={dot.className} style={dot.style} />
                  </div>
                </div>

                {/* Bottom row: last message preview */}
                <p
                  className={`text-xs truncate ${
                    lastPreviewMuted
                      ? 'text-[--color-text-muted] italic'
                      : 'text-[--color-text-muted]'
                  }`}
                >
                  {lastPreview}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-[10px] text-[--color-text-muted] text-center mt-auto">
        Press 1-5 to navigate
      </p>
    </div>
  );
}

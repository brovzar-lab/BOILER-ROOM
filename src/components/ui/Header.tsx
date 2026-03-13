import { useOfficeStore } from '@/store/officeStore';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';
import { useMemoryStore } from '@/store/memoryStore';
import { getAgent } from '@/config/agents';
import type { AgentId, AgentStatus } from '@/types/agent';

/** Agent IDs that correspond to valid agent rooms. */
const AGENT_IDS: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

function isAgentId(id: string | null): id is AgentId {
  return id !== null && AGENT_IDS.includes(id as AgentId);
}

interface HeaderProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

/**
 * App header with Lemon Command Center branding, active deal name badge,
 * sidebar toggle button, and dynamic agent indicator.
 *
 * Shows the current agent's name, title, and status dot when BILLY is
 * in an agent's room. Shows "Command Center" at BILLY's office and
 * "War Room" for the war room.
 */
export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);
  const agentStatuses = useOfficeStore((s) => s.agentStatuses);

  // Read active deal for header display
  const activeDealId = useDealStore((s) => s.activeDealId);
  const deals = useDealStore((s) => s.deals);
  const activeDeal = deals.find((d) => d.id === activeDealId);
  const activeDealName = activeDeal?.name ?? null;

  // File count for current agent
  const files = useFileStore((s) => s.files);
  const fileCount = isAgentId(activeRoomId)
    ? files.filter((f) => f.agentId === activeRoomId && (!activeDealId || f.dealId === activeDealId)).length
    : 0;

  // Memory fact count for current deal (all agents)
  const memoryFacts = useMemoryStore((s) => s.facts);
  const factCount = activeDealId
    ? memoryFacts.filter((f) => f.dealId === activeDealId).length
    : 0;

  // Determine what to display on the right side
  let label: string;
  let sublabel: string | null = null;
  let dotClassName = 'inline-block w-2 h-2 rounded-full bg-green-500';
  let dotStyle: React.CSSProperties | undefined;

  if (isAgentId(activeRoomId)) {
    const agent = getAgent(activeRoomId);
    if (agent) {
      label = agent.name;
      sublabel = agent.title;
      const status: AgentStatus = agentStatuses[activeRoomId] ?? 'idle';

      switch (status) {
        case 'thinking':
          dotClassName = 'inline-block w-2 h-2 rounded-full animate-pulse';
          dotStyle = { backgroundColor: agent.color };
          break;
        case 'needs-attention':
          dotClassName = 'inline-block w-2 h-2 rounded-full bg-red-400';
          break;
        case 'idle':
        default:
          dotClassName = 'inline-block w-2 h-2 rounded-full bg-green-500';
          break;
      }
    } else {
      label = 'Command Center';
    }
  } else if (activeRoomId === 'war-room') {
    label = 'War Room';
    dotClassName = 'inline-block w-2 h-2 rounded-full bg-amber-400';
  } else {
    // billy, null, or any other non-agent room
    label = 'Command Center';
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[--color-lemon-600]/30 bg-[--color-surface-bg]">
      {/* Left: sidebar toggle + app name + deal name */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="text-[--color-text-muted] hover:text-[--color-text] p-1 transition-colors"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {/* Simple panel icon using CSS -- no icon library */}
            <span className="block w-4 h-3 border border-current rounded-sm relative">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-current rounded-l-sm" />
            </span>
          </button>
        )}
        <span className="text-lg font-bold text-[--color-lemon-400] tracking-tight">
          Lemon Command Center
        </span>
        {activeDealName && (
          <>
            <span className="text-[--color-text-muted]">/</span>
            <span className="text-sm font-medium text-[--color-text-secondary] truncate max-w-[200px]">
              {activeDealName}
            </span>
          </>
        )}
      </div>

      {/* Right: agent indicator + file count */}
      <div className="flex items-center gap-2">
        <span className={dotClassName} style={dotStyle} />
        <span className="text-sm text-[--color-text-secondary]">
          {label}
          {sublabel && (
            <span className="text-[--color-text-muted]"> - {sublabel}</span>
          )}
        </span>
        {fileCount > 0 && (
          <span className="text-xs text-neutral-400 bg-neutral-700 px-2 py-0.5 rounded-full">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
        )}
        {factCount > 0 && (
          <span className="text-xs text-neutral-400 bg-neutral-700 px-2 py-0.5 rounded-full">
            {factCount} {factCount === 1 ? 'fact' : 'facts'}
          </span>
        )}
      </div>
    </header>
  );
}

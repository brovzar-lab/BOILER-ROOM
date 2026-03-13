import { useOfficeStore } from '@/store/officeStore';
import { getAgent } from '@/config/agents';
import type { AgentId, AgentStatus } from '@/types/agent';

/** Agent IDs that correspond to valid agent rooms. */
const AGENT_IDS: AgentId[] = ['diana', 'marcos', 'sasha', 'roberto', 'valentina'];

function isAgentId(id: string | null): id is AgentId {
  return id !== null && AGENT_IDS.includes(id as AgentId);
}

/**
 * App header with Lemon Command Center branding and dynamic agent indicator.
 *
 * Shows the current agent's name, title, and status dot when BILLY is
 * in an agent's room. Shows "Command Center" at BILLY's office and
 * "War Room" for the war room.
 */
export function Header() {
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);
  const agentStatuses = useOfficeStore((s) => s.agentStatuses);

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
      {/* Left: app name */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-[--color-lemon-400] tracking-tight">
          Lemon Command Center
        </span>
      </div>

      {/* Right: agent indicator */}
      <div className="flex items-center gap-2">
        <span className={dotClassName} style={dotStyle} />
        <span className="text-sm text-[--color-text-secondary]">
          {label}
          {sublabel && (
            <span className="text-[--color-text-muted]"> - {sublabel}</span>
          )}
        </span>
      </div>
    </header>
  );
}

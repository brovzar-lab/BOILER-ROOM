import { useOfficeStore } from '@/store/officeStore';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';
import { useMemoryStore } from '@/store/memoryStore';
import { useAudioStore } from '@/store/audioStore';
import { getAgent } from '@/config/agents';
import { getAudioManager } from '@/engine/audioManager';
import type { AgentId, AgentStatus } from '@/types/agent';

/** Agent IDs that correspond to valid agent rooms. */
const AGENT_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy'];

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

  // Audio mute state
  const ambientMuted = useAudioStore((s) => s.ambientMuted);
  const sfxMuted = useAudioStore((s) => s.sfxMuted);
  const toggleAmbient = useAudioStore((s) => s.toggleAmbient);
  const toggleSfx = useAudioStore((s) => s.toggleSfx);

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

      {/* Right: audio controls + agent indicator + file count */}
      <div className="flex items-center gap-2">
        {/* Ambient mute toggle */}
        <button
          onClick={() => {
            const newMuted = !ambientMuted;
            toggleAmbient();
            const audio = getAudioManager();
            audio.ensureContext();
            if (newMuted) {
              audio.setAmbientMuted(true);
            } else {
              void audio.playAmbient(activeRoomId);
            }
          }}
          className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
          title={ambientMuted ? 'Unmute ambient' : 'Mute ambient'}
          aria-label={ambientMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
        >
          {ambientMuted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>

        {/* SFX mute toggle */}
        <button
          onClick={() => toggleSfx()}
          className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
          title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
          aria-label={sfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          {sfxMuted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </button>

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

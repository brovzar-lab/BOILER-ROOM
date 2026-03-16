import { useState } from 'react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useOfficeStore } from '@/store/officeStore';
import { useDealStore } from '@/store/dealStore';
import { getAgent } from '@/config/agents';
import type { AgentId, AgentStatus } from '@/types/agent';

const AGENT_IDS: AgentId[] = ['patrik', 'marcos', 'sandra', 'isaac', 'wendy'];
// TODO: Add 'charlie' once persona config exists in src/config/agents/

type Tab = 'chat' | 'rooms';

/**
 * Left sidebar panel combining chat and room/project information.
 *
 * Two tabs: "Rooms" shows agent list with status dots,
 * "Chat" renders the full ChatPanel. A project widget at the
 * bottom always shows the active deal info.
 */
export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const activeDealId = useDealStore((s) => s.activeDealId);
  const deals = useDealStore((s) => s.deals);
  const activeDeal = deals.find((d) => d.id === activeDealId);

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        backgroundColor: '#000000',
        borderRight: '4px solid #c68f6b',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2b2b2b',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#899ab4',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          TEAM &amp; COMMS
        </span>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #2b2b2b',
          flexShrink: 0,
        }}
      >
        <TabButton
          label="Chat"
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
        />
        <TabButton
          label="Rooms"
          active={activeTab === 'rooms'}
          onClick={() => setActiveTab('rooms')}
        />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <ChatPanel />
        ) : (
          <RoomsTab />
        )}
      </div>

      {/* Project widget — always visible */}
      <div
        style={{
          borderTop: '1px solid #2b2b2b',
          padding: '10px 16px',
          flexShrink: 0,
          backgroundColor: '#111118',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            color: '#899ab4',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            marginBottom: 6,
          }}
        >
          PROJECT BOX
        </div>
        {activeDeal ? (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
              {activeDeal.name}
            </div>
            {activeDeal.description && (
              <div style={{ fontSize: 11, color: '#899ab4', marginTop: 2 }}>
                {activeDeal.description}
              </div>
            )}
            <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
              {activeDeal.status === 'active' ? 'Active' : activeDeal.status}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#555' }}>No deal selected</div>
        )}
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'monospace',
        letterSpacing: 1,
        color: active ? '#c68f6b' : '#899ab4',
        backgroundColor: active ? '#111118' : 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #c68f6b' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

function RoomsTab() {
  const agentStatuses = useOfficeStore((s) => s.agentStatuses);
  const activeRoomId = useOfficeStore((s) => s.activeRoomId);

  const statusColor = (status: AgentStatus | undefined): string => {
    switch (status) {
      case 'thinking': return '#e5c04b';
      case 'needs-attention': return '#d94a38';
      case 'idle':
      default: return '#4baf4b';
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {AGENT_IDS.map((id) => {
        const agent = getAgent(id);
        if (!agent) return null;
        const status = agentStatuses[id] as AgentStatus | undefined;
        const isActive = activeRoomId === id;

        return (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              backgroundColor: isActive ? '#111118' : 'transparent',
              borderLeft: isActive ? '3px solid #c68f6b' : '3px solid transparent',
              cursor: 'default',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: statusColor(status),
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: agent.color }}>
                {agent.name}
              </div>
              <div style={{ fontSize: 10, color: '#899ab4' }}>
                {agent.title}
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#555', textTransform: 'capitalize' }}>
              {status ?? 'idle'}
            </span>
          </div>
        );
      })}

      {/* War Room entry */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          backgroundColor: activeRoomId === 'war-room' ? '#111118' : 'transparent',
          borderLeft: activeRoomId === 'war-room' ? '3px solid #c68f6b' : '3px solid transparent',
          marginTop: 8,
          borderTop: '1px solid #2b2b2b',
          paddingTop: 12,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#e5c04b',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e5c04b' }}>
            War Room
          </div>
          <div style={{ fontSize: 10, color: '#899ab4' }}>
            Team coordination
          </div>
        </div>
      </div>
    </div>
  );
}

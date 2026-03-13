// Stub -- will be implemented in GREEN phase
import type { AgentId } from '@/types/agent';
import type { WarRoomAgentStream } from '@/types/chat';

export function useWarRoom() {
  return {
    sendBroadcast: async (_content: string) => {},
    cancelAll: () => {},
    isGathering: false,
    warRoomStreaming: {} as Record<AgentId, WarRoomAgentStream>,
    warRoomRound: 0,
  };
}

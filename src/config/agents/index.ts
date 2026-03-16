import { patrikPersona } from './patrik';
import { marcosPersona } from './marcos';
import { sandraPersona } from './sandra';
import { isaacPersona } from './isaac';
import { wendyPersona } from './wendy';
import type { AgentId } from '@/types/agent';

type PersonaConfig = typeof patrikPersona;

// All 5 core agents registered. Charlie placeholder pending persona config.
export const agents: Partial<Record<AgentId, PersonaConfig>> = {
  patrik: patrikPersona,
  marcos: marcosPersona,
  sandra: sandraPersona,
  isaac: isaacPersona,
  wendy: wendyPersona,
};

/**
 * Retrieves the persona configuration for a given agent.
 * Returns undefined for future-proofing (e.g., dynamic agent IDs).
 */
export function getAgent(id: AgentId): PersonaConfig | undefined {
  return agents[id];
}

export type { PersonaConfig };

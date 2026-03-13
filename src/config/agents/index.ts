import { dianaPersona } from './diana';
import { marcosPersona } from './marcos';
import { sashaPersona } from './sasha';
import { robertoPersona } from './roberto';
import { valentinaPersona } from './valentina';
import type { AgentId } from '@/types/agent';

type PersonaConfig = typeof dianaPersona;

// All 5 agents registered as of Phase 3.
export const agents: Record<AgentId, PersonaConfig> = {
  diana: dianaPersona,
  marcos: marcosPersona,
  sasha: sashaPersona,
  roberto: robertoPersona,
  valentina: valentinaPersona,
};

/**
 * Retrieves the persona configuration for a given agent.
 * Returns undefined for future-proofing (e.g., dynamic agent IDs).
 */
export function getAgent(id: AgentId): PersonaConfig | undefined {
  return agents[id];
}

export type { PersonaConfig };

import { dianaPersona } from './diana';
import type { AgentId } from '@/types/agent';

type PersonaConfig = typeof dianaPersona;

// Only Diana is active in Phase 1. Other agents added in Phase 3.
export const agents: Partial<Record<AgentId, PersonaConfig>> = {
  diana: dianaPersona,
} as const;

/**
 * Retrieves the persona configuration for a given agent.
 * Returns undefined if the agent is not yet registered (Phase 3+).
 */
export function getAgent(id: AgentId): PersonaConfig | undefined {
  return agents[id];
}

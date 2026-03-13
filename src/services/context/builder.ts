import type { AgentId } from '@/types/agent';
import type { MessageRole, Conversation } from '@/types/chat';
import { BASE_SYSTEM_PROMPT } from '@/config/prompts/base';
import { getAgent } from '@/config/agents';
import { estimateTokens } from './tokenCounter';
import { useDealStore } from '@/store/dealStore';

export interface BuiltContext {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  totalTokens: number;
}

/**
 * Assembles the layered system prompt and formats conversation messages
 * for the Anthropic API call.
 *
 * Layers:
 * 1. Base system prompt (shared rules)
 * 2. Agent persona prompt
 * 2.5. (Optional) Cross-visibility block for War Room follow-ups
 * 3. Deal context (name + description of active deal)
 * 4. (Future) File summaries -- Phase 6
 * 5. (Future) Agent memory -- Phase 7
 * 6. Conversation history (with summary support)
 */
export function buildContext(
  agentId: AgentId,
  messages: Array<{ role: MessageRole; content: string }>,
  conversation?: Conversation,
  crossVisibilityBlock?: string,
): BuiltContext {
  // Layer 1: Base system prompt
  const layers: string[] = [BASE_SYSTEM_PROMPT];

  // Layer 2: Agent persona prompt
  const agent = getAgent(agentId);
  if (agent) {
    layers.push(agent.personaPrompt);
  }

  // Layer 2.5: Cross-visibility block for War Room follow-ups (optional)
  if (crossVisibilityBlock) {
    layers.push(crossVisibilityBlock);
  }

  // Layer 3: Deal context
  const { activeDealId, deals } = useDealStore.getState();
  if (activeDealId) {
    const activeDeal = deals.find(d => d.id === activeDealId);
    if (activeDeal) {
      let dealContext = `You are currently advising on the deal: ${activeDeal.name}.`;
      if (activeDeal.description) {
        dealContext += ` Description: ${activeDeal.description}`;
      }
      layers.push(dealContext);
    }
  }

  // Layers 4-5: Reserved for future phases (file summaries, memory)

  const systemPrompt = layers.join('\n\n');

  // Layer 6: Conversation history with summary support
  const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // If the conversation has a summary, prepend it as context
  if (conversation?.summary) {
    formattedMessages.push({
      role: 'assistant',
      content: `[Previous conversation summary]: ${conversation.summary}`,
    });
  }

  // Add the actual messages
  for (const msg of messages) {
    formattedMessages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Calculate total token usage
  let totalTokens = estimateTokens(systemPrompt);
  for (const msg of formattedMessages) {
    totalTokens += estimateTokens(msg.content);
  }

  return {
    systemPrompt,
    messages: formattedMessages,
    totalTokens,
  };
}

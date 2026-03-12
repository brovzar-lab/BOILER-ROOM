import type { AgentId } from '@/types/agent';
import type { MessageRole, Conversation } from '@/types/chat';
import { BASE_SYSTEM_PROMPT } from '@/config/prompts/base';
import { getAgent } from '@/config/agents';
import { estimateTokens } from './tokenCounter';

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
 * 3. (Future) Deal context -- Phase 5
 * 4. (Future) File summaries -- Phase 6
 * 5. (Future) Agent memory -- Phase 7
 * 6. Conversation history (with summary support)
 */
export function buildContext(
  agentId: AgentId,
  messages: Array<{ role: MessageRole; content: string }>,
  conversation?: Conversation,
): BuiltContext {
  // Layer 1: Base system prompt
  const layers: string[] = [BASE_SYSTEM_PROMPT];

  // Layer 2: Agent persona prompt
  const agent = getAgent(agentId);
  if (agent) {
    layers.push(agent.personaPrompt);
  }

  // Layers 3-5: Reserved for future phases (deal context, file summaries, memory)

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

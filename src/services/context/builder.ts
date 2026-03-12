import type { AgentId } from '@/types/agent';
import type { MessageRole, Conversation } from '@/types/chat';

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
 * 3. (Future) Deal context
 * 4. (Future) File summaries
 * 5. (Future) Agent memory
 * 6. Conversation history (with summary support)
 */
export function buildContext(
  agentId: AgentId,
  messages: Array<{ role: MessageRole; content: string }>,
  conversation?: Conversation,
): BuiltContext {
  // Stub: full implementation in Task 2
  void agentId;
  void conversation;

  return {
    systemPrompt: '',
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    totalTokens: 0,
  };
}

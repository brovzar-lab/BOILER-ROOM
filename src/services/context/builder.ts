import type { AgentId } from '@/types/agent';
import type { MessageRole, Conversation } from '@/types/chat';
import { BASE_SYSTEM_PROMPT } from '@/config/prompts/base';
import { getAgent } from '@/config/agents';
import { estimateTokens } from './tokenCounter';
import { useDealStore } from '@/store/dealStore';
import { useFileStore } from '@/store/fileStore';

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
 * 4. File summaries (uploaded documents per agent/deal)
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

  // Layer 4: File summaries
  const FILE_TOKEN_CAP = 2000;       // ~8000 chars per file
  const TOTAL_FILE_TOKEN_CAP = 8000; // max tokens for all files combined

  const { files } = useFileStore.getState();
  const agentFiles = files.filter(f => f.agentId === agentId && f.dealId === activeDealId);

  if (agentFiles.length > 0) {
    let fileBlock = '## Uploaded Documents\n\n';
    let usedTokens = 0;

    for (const file of agentFiles) {
      const maxChars = FILE_TOKEN_CAP * 4;
      let text = file.extractedText;
      if (text.length > maxChars) {
        text = text.slice(0, maxChars) + '\n\n[... truncated, showing first portion of document]';
      }
      const tokens = estimateTokens(text);
      if (usedTokens + tokens > TOTAL_FILE_TOKEN_CAP) break;
      fileBlock += `### ${file.name}\n${text}\n\n`;
      usedTokens += tokens;
    }

    layers.push(fileBlock);
  }

  // Layer 5: Reserved for agent memory (Phase 7)

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

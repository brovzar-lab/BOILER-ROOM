import type { AgentId } from './agent';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  tokenCount?: number;       // Token count for this message
  isSummary?: boolean;       // True if this is a summarization message
}

export interface Conversation {
  id: string;
  agentId: AgentId;
  dealId?: string;            // Future: deal scoping
  messages: Message[];
  totalTokens: number;
  summary?: string;           // Compressed summary of older messages
  summaryTokens?: number;     // Tokens used by the summary
  createdAt: number;
  updatedAt: number;
}

export interface StreamingState {
  isStreaming: boolean;
  currentContent: string;     // Accumulated content during streaming
  abortController: AbortController | null;
}

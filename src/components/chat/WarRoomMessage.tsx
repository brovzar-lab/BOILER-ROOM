import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { AgentId } from '@/types/agent';
import { getAgent } from '@/config/agents';
import { useChatStore } from '@/store/chatStore';

interface WarRoomMessageProps {
  agentId: AgentId;
}

/**
 * Renders one agent's streaming response section within the WarRoomPanel.
 *
 * Uses a fine-grained selector to subscribe only to this agent's stream,
 * preventing re-renders when other agents' content changes (Pitfall 1).
 *
 * Layout: color-coded left border, agent name+title header, streaming content,
 * status indicators for error/retrying states.
 */
export function WarRoomMessage({ agentId }: WarRoomMessageProps) {
  // Fine-grained selector: only this agent's stream (Pitfall 1)
  const stream = useChatStore((s) => s.warRoomStreaming[agentId]);
  const agent = getAgent(agentId);

  if (!agent) return null;

  const { status, currentContent, error } = stream;

  // Pre-stream: show nothing if idle and no content
  if (status === 'idle' && !currentContent) {
    return null;
  }

  return (
    <div
      className="pl-4 py-3 mb-3"
      style={{ borderLeft: `4px solid ${agent.color}` }}
    >
      {/* Header: agent name, title, status */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold" style={{ color: agent.color }}>
          {agent.name}
        </span>
        <span className="text-xs text-[--color-text-muted]">
          {agent.title}
        </span>
        <StatusIndicator status={status} />
      </div>

      {/* Error state */}
      {status === 'error' && error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Retrying state */}
      {status === 'retrying' && (
        <p className="text-sm text-amber-400">Retrying...</p>
      )}

      {/* Streaming/complete content */}
      {currentContent && (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children, ...props }) {
                return (
                  <pre className="rounded-md bg-[#111] p-3 overflow-x-auto text-sm" {...props}>
                    {children}
                  </pre>
                );
              },
              code({ children, className, ...props }) {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="rounded bg-[#222] px-1.5 py-0.5 text-sm text-[--color-lemon-300]" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {currentContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/**
 * Small status indicator dot/text for stream state.
 */
function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'streaming':
      return (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          streaming
        </span>
      );
    case 'complete':
      return (
        <span className="text-[10px] text-[--color-text-muted]">done</span>
      );
    case 'error':
      return (
        <span className="text-[10px] text-red-400">error</span>
      );
    case 'retrying':
      return (
        <span className="flex items-center gap-1 text-[10px] text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          retrying
        </span>
      );
    default:
      return null;
  }
}

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Message } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Individual message display with markdown rendering.
 *
 * User messages: right-aligned with amber tint.
 * Assistant messages: left-aligned on dark card with "Diana" label.
 * Summary messages: collapsed with subtle visual indicator.
 */
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSummary = message.isSummary === true;

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSummary) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%] rounded-lg px-4 py-3 bg-[--color-surface-elevated] border border-[--color-surface-border]">
          <div className="text-xs text-[--color-text-muted] mb-2 font-medium">
            Previous context summary
          </div>
          <div className="prose-sm text-[--color-text-secondary]">
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%]">
          <div className="rounded-lg px-4 py-3 bg-[--color-lemon-600]/20 border border-[--color-lemon-600]/30">
            <p className="text-[--color-text-primary] whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="text-xs text-[--color-text-muted] mt-1 text-right">
            {timestamp}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%]">
        <div className="text-xs text-[--color-lemon-500] mb-1 font-medium">Diana</div>
        <div className="rounded-lg px-4 py-3 bg-[--color-surface-card] border border-[--color-surface-border]">
          <div className="prose prose-invert prose-sm max-w-none">
            <MarkdownContent content={message.content} />
          </div>
        </div>
        <div className="text-xs text-[--color-text-muted] mt-1">
          {timestamp}
        </div>
      </div>
    </div>
  );
});

/**
 * Shared markdown renderer with GFM tables and code highlighting.
 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // Style code blocks with dark background
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
        // Style tables
        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="border-collapse text-sm w-full" {...props}>{children}</table>
            </div>
          );
        },
        th({ children, ...props }) {
          return (
            <th className="border border-[--color-surface-border] px-3 py-1.5 text-left text-[--color-lemon-400] font-medium" {...props}>
              {children}
            </th>
          );
        },
        td({ children, ...props }) {
          return (
            <td className="border border-[--color-surface-border] px-3 py-1.5" {...props}>
              {children}
            </td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

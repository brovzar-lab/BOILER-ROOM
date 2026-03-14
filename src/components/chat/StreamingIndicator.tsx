import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface StreamingIndicatorProps {
  content: string;
  agentName?: string;
}

/**
 * Displays accumulated streaming content with live markdown rendering
 * and a pulsing amber cursor at the end.
 */
export function StreamingIndicator({ content, agentName = 'Patrik' }: StreamingIndicatorProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%]">
        <div className="text-xs text-[--color-lemon-500] mb-1 font-medium">{agentName}</div>
        <div className="rounded-lg px-4 py-3 bg-[--color-surface-card] border border-[--color-surface-border]">
          <div className="prose prose-invert prose-sm max-w-none">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            ) : null}
            <span
              className="inline-block w-2 h-4 bg-[--color-lemon-400] rounded-sm ml-0.5 align-text-bottom animate-pulse"
              aria-label="Streaming..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

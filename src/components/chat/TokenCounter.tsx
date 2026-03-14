import { TOKEN_LIMITS, DEFAULT_MODEL } from '@/services/context/tokenCounter';

interface TokenCounterProps {
  tokenCount: number;
  isSummarizing: boolean;
}

/**
 * Token usage progress bar.
 *
 * Hidden by default. Appears as a thin horizontal bar when context usage
 * exceeds 60%. Color: amber for 60-80%, red for >80%.
 * Renders as a thin strip above the input area.
 */
export function TokenCounter({ tokenCount, isSummarizing }: TokenCounterProps) {
  const limit = TOKEN_LIMITS[DEFAULT_MODEL];
  const percentage = (tokenCount / limit) * 100;

  // Summarizing state: show amber pulse bar
  if (isSummarizing) {
    return (
      <div className="px-4 py-1">
        <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 animate-pulse rounded-full transition-all duration-500"
            style={{ width: '100%' }}
          />
        </div>
        <div className="text-[10px] text-amber-400 text-center mt-0.5 animate-pulse">
          Summarizing context...
        </div>
      </div>
    );
  }

  // Hidden until context > 60%
  if (percentage < 60) {
    return null;
  }

  const barColor = percentage > 80 ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="px-4 py-1" title={`~${tokenCount.toLocaleString()} tokens (${percentage.toFixed(1)}%)`}>
      <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

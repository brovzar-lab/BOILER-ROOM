import { TOKEN_LIMITS, DEFAULT_MODEL } from '@/services/context/tokenCounter';

interface TokenCounterProps {
  tokenCount: number;
  isSummarizing: boolean;
}

/**
 * Token usage display bar.
 *
 * Color thresholds:
 * - Normal (<50%): muted text
 * - Warning (50-80%): amber
 * - Critical (>80%): red
 */
export function TokenCounter({ tokenCount, isSummarizing }: TokenCounterProps) {
  const limit = TOKEN_LIMITS[DEFAULT_MODEL];
  const percentage = (tokenCount / limit) * 100;

  // Don't show if no tokens used yet
  if (tokenCount === 0 && !isSummarizing) {
    return null;
  }

  let colorClass: string;
  if (percentage > 80) {
    colorClass = 'text-red-400';
  } else if (percentage > 50) {
    colorClass = 'text-[--color-lemon-400]';
  } else {
    colorClass = 'text-[--color-text-muted]';
  }

  const formattedCount = tokenCount.toLocaleString();

  return (
    <div className="flex items-center justify-center gap-2 py-1 text-xs">
      {isSummarizing ? (
        <span className="text-[--color-lemon-400] animate-pulse">Summarizing context...</span>
      ) : (
        <span className={colorClass}>
          ~{formattedCount} tokens ({percentage.toFixed(1)}%)
        </span>
      )}
    </div>
  );
}

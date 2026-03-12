interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Error banner displayed between message list and input.
 * Shows error message with Retry and Dismiss buttons.
 */
export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mx-4 mb-2">
      <div className="max-w-3xl mx-auto rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 text-sm text-red-300">{error}</div>
        <button
          type="button"
          onClick={onRetry}
          className="flex-shrink-0 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm px-3 py-1.5 font-medium transition-colors"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 rounded-md border border-[--color-surface-border] hover:bg-[--color-surface-elevated] text-[--color-text-secondary] text-sm px-3 py-1.5 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
